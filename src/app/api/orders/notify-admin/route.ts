import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sendAdminOrderNotification } from "@/lib/email/adminOrderNotification";

export const dynamic = "force-dynamic";

/**
 * Endpoint to trigger admin order notification for Cash on Delivery (COD) orders.
 *
 * Strict Server-Side Validation:
 * 1. Verifies caller is an authenticated Firebase user via ID token.
 * 2. Fetches order from trusted Firestore via adminDb.
 * 3. Verifies order exists in database.
 * 4. Verifies order belongs to the authenticated user (or user is admin).
 * 5. Verifies order.paymentMethod === "cod".
 * 6. Invokes race-safe sendAdminOrderNotification(orderId).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const guestTokenHeader = request.headers.get("x-guest-token");

    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Bad Request: Missing or invalid orderId" }, { status: 400 });
    }

    // Retrieve order directly from trusted server-side Firestore
    const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data();

    // Verify payment method is COD
    if (orderData?.paymentMethod !== "cod") {
      return NextResponse.json(
        { error: "Bad Request: Endpoint only processes Cash on Delivery (COD) orders" },
        { status: 400 }
      );
    }

    // Check Guest Authorization
    const isGuestOrder = orderData?.isGuest === true || orderData?.userId === "guest";
    let isAuthorized = false;

    if (isGuestOrder) {
      const providedGuestToken =
        guestTokenHeader ||
        (authHeader && authHeader.startsWith("Guest ") ? authHeader.split("Guest ")[1]?.trim() : null);

      if (providedGuestToken && orderData?.guestAccessToken && providedGuestToken === orderData.guestAccessToken) {
        isAuthorized = true;
      }
    }

    // If not authorized as guest, check Firebase ID Token
    if (!isAuthorized && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          const uid = decodedToken.uid;
          const isOwner = orderData?.userId === uid;
          const isAdmin = decodedToken.role === "admin" || decodedToken.admin === true;

          if (isOwner || isAdmin) {
            isAuthorized = true;
          }
        } catch (authErr) {
          console.error("[NotifyAdminAPI] Token verification failed:", authErr);
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid credentials for this order" },
        { status: 403 }
      );
    }

    // Trigger race-safe, idempotent notification
    const result = await sendAdminOrderNotification(orderId);

    return NextResponse.json({
      success: result.success,
      skipped: result.skipped ?? false,
      reason: result.reason,
      resendId: result.resendId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[NotifyAdminAPI] Unexpected error in notify-admin route:", errorMsg);
    // Return 500 without crashing
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMsg },
      { status: 500 }
    );
  }
}
