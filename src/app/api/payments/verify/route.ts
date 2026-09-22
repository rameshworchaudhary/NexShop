import { NextRequest, NextResponse } from "next/server";
import {
  decodeEsewaResponseData,
  verifyEsewaResponseSignature,
  checkEsewaTransactionStatus,
} from "@/lib/payments/esewa";
import { lookupKhaltiPayment } from "@/lib/payments/khalti";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import { sendAdminOrderNotification } from "@/lib/email/adminOrderNotification";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const method = searchParams.get("method");
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&reason=missing_order`);
  }

  try {
    if (method === "esewa") {
      return await handleEsewaVerification(request, orderId);
    } else if (method === "khalti") {
      return await handleKhaltiVerification(request, orderId);
    }

    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&reason=unknown_method`);
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
  }
}

async function handleEsewaVerification(request: NextRequest, orderId: string) {
  const dataParam = request.nextUrl.searchParams.get("data");

  if (!dataParam) {
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
  }

  const decoded = decodeEsewaResponseData(dataParam);

  // Verify the signature eSewa sent back matches what we'd expect
  const signatureValid = verifyEsewaResponseSignature(decoded);
  if (!signatureValid || decoded.status !== "COMPLETE") {
    await markOrderPaymentFailed(orderId);
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
  }

  // Double-check directly against eSewa's status API for extra security
  try {
    const statusCheck = await checkEsewaTransactionStatus(
      decoded.product_code,
      decoded.total_amount,
      decoded.transaction_uuid
    );
    if (statusCheck.status !== "COMPLETE") {
      await markOrderPaymentFailed(orderId);
      return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
    }
  } catch {
    // If the status check API fails, fall back to trusting the verified signature
  }

  const paidAmount = Number(decoded.total_amount || 0);
  const result = await markOrderPaymentSuccess(
    orderId,
    decoded.transaction_code || decoded.transaction_uuid,
    paidAmount
  );

  if (!result.success) {
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&reason=amount_mismatch&orderId=${orderId}`);
  }

  const redirectUrl = result.guestAccessToken
    ? `${appUrl}/orders/${orderId}?success=true&token=${result.guestAccessToken}`
    : `${appUrl}/orders/${orderId}?success=true`;
  const response = NextResponse.redirect(redirectUrl);

  if (result.guestAccessToken) {
    response.cookies.set(`nexshop_guest_${orderId}`, result.guestAccessToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

async function handleKhaltiVerification(request: NextRequest, orderId: string) {
  const pidx = request.nextUrl.searchParams.get("pidx");
  const status = request.nextUrl.searchParams.get("status");

  if (!pidx) {
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
  }

  if (status === "User canceled" || status === "Canceled") {
    await markOrderPaymentFailed(orderId);
    return NextResponse.redirect(`${appUrl}/checkout?payment=cancelled&orderId=${orderId}`);
  }

  // Always verify server-side via lookup API — never trust query params alone
  const lookup = await lookupKhaltiPayment(pidx);

  if (lookup.status !== "Completed") {
    await markOrderPaymentFailed(orderId);
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&orderId=${orderId}`);
  }

  // Khalti total_amount is in paisa (1 NPR = 100 paisa)
  const paidAmountNpr = lookup.total_amount ? lookup.total_amount / 100 : 0;
  const result = await markOrderPaymentSuccess(
    orderId,
    lookup.transaction_id || pidx,
    paidAmountNpr
  );

  if (!result.success) {
    return NextResponse.redirect(`${appUrl}/checkout?payment=failed&reason=amount_mismatch&orderId=${orderId}`);
  }

  const redirectUrl = result.guestAccessToken
    ? `${appUrl}/orders/${orderId}?success=true&token=${result.guestAccessToken}`
    : `${appUrl}/orders/${orderId}?success=true`;
  const response = NextResponse.redirect(redirectUrl);

  if (result.guestAccessToken) {
    response.cookies.set(`nexshop_guest_${orderId}`, result.guestAccessToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

async function markOrderPaymentSuccess(
  orderId: string,
  transactionId: string,
  paidAmount?: number
): Promise<{ success: boolean; guestAccessToken?: string }> {
  const ref = adminDb.collection(COLLECTIONS.ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false };

  const data = snap.data();
  const orderTotal = data?.total;
  const guestAccessToken = data?.guestAccessToken;

  // Validate that paid amount matches order total within reasonable margin (< 1 NPR difference)
  if (paidAmount !== undefined && orderTotal !== undefined) {
    if (Math.abs(paidAmount - orderTotal) > 1) {
      console.error(`Payment amount mismatch for order ${orderId}: expected ${orderTotal}, got ${paidAmount}`);
      await markOrderPaymentFailed(orderId);
      return { success: false };
    }
  }

  const history = data?.statusHistory || [];

  await ref.update({
    paymentStatus: "paid",
    paymentTransactionId: transactionId,
    status: "confirmed",
    statusHistory: [
      ...history,
      {
        status: "confirmed",
        timestamp: new Date().toISOString(),
        note: "Payment received and confirmed",
      },
    ],
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Safe, non-blocking admin order notification (idempotent via atomic transaction)
  sendAdminOrderNotification(orderId).catch((notifErr) => {
    console.error(`[PaymentsVerify] Failed to dispatch admin notification for order ${orderId}:`, notifErr);
  });

  return { success: true, guestAccessToken };
}

async function markOrderPaymentFailed(orderId: string) {
  const ref = adminDb.collection(COLLECTIONS.ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return;

  await ref.update({
    paymentStatus: "failed",
    updatedAt: FieldValue.serverTimestamp(),
  });
}
