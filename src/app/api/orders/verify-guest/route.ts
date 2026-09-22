import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      orderIdentifier?: string;
      emailOrToken?: string;
    } | null;

    const orderIdentifier = (body?.orderIdentifier || "").trim();
    const emailOrToken = (body?.emailOrToken || "").trim().toLowerCase();

    if (!orderIdentifier || !emailOrToken) {
      return NextResponse.json(
        { error: "Order Number / ID and Email or Access Token are required" },
        { status: 400 }
      );
    }

    // Try by document ID first
    let snap = await adminDb.collection(COLLECTIONS.ORDERS).doc(orderIdentifier).get();

    // If not found by doc id, query by orderNumber
    if (!snap.exists) {
      const cleanOrderNumber = orderIdentifier.replace(/^#/, "");
      const qSnap = await adminDb
        .collection(COLLECTIONS.ORDERS)
        .where("orderNumber", "==", cleanOrderNumber)
        .limit(1)
        .get();

      if (!qSnap.empty) {
        snap = qSnap.docs[0];
      }
    }

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Order not found. Please check your order number." },
        { status: 404 }
      );
    }

    const data = snap.data();
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderEmail = (data.userEmail || "").trim().toLowerCase();
    const token = data.guestAccessToken || "";

    const isTokenMatch = Boolean(token && token.toLowerCase() === emailOrToken);
    const cookieToken = request.cookies.get(`nexshop_guest_${snap.id}`)?.value || "";
    const isCookieMatch = Boolean(token && cookieToken && cookieToken === token);
    const isEmailMatch = Boolean(orderEmail && orderEmail === emailOrToken);

    if (!isEmailMatch && !isTokenMatch && !isCookieMatch) {
      return NextResponse.json(
        { error: "Verification failed. The provided email or access token does not match this order." },
        { status: 403 }
      );
    }

    // 1. If legitimate token or existing HTTP-only cookie is verified:
    if (isTokenMatch || isCookieMatch) {
      const response = NextResponse.json({
        success: true,
        orderId: snap.id,
        orderNumber: data.orderNumber,
        token: token,
      });

      // Preserve / refresh secure HTTP-only cookie for this device
      if (token) {
        response.cookies.set(`nexshop_guest_${snap.id}`, token, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }

      return response;
    }

    // 2. Email-only match:
    // CRITICAL: NEVER disclose the secret guestAccessToken or set the cookie for email-only lookup.
    // Return only minimum safe non-sensitive order information.
    return NextResponse.json({
      success: true,
      orderId: snap.id,
      orderNumber: data.orderNumber,
      status: data.status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[VerifyGuestOrderAPI] Error verifying guest order:", errorMsg);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying the order." },
      { status: 500 }
    );
  }
}
