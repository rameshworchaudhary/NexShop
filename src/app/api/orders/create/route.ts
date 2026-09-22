import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import { generateOrderId } from "@/lib/utils";
import { sendAdminOrderNotification } from "@/lib/email/adminOrderNotification";
import type { CreateOrderInput } from "@/lib/types/order";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as (CreateOrderInput & { isGuest?: boolean }) | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const {
      items,
      subtotal,
      shippingCharge,
      discount = 0,
      couponCode,
      total,
      shippingAddress,
      paymentMethod,
      notes,
    } = body;

    // Validate essential fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Order must contain at least one item" }, { status: 400 });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.streetAddress) {
      return NextResponse.json({ error: "Complete delivery address is required" }, { status: 400 });
    }

    if (typeof total !== "number" || total <= 0) {
      return NextResponse.json({ error: "Invalid total order amount" }, { status: 400 });
    }

    if (!["cod", "esewa", "khalti"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Determine authentication state
    let isGuest = Boolean(body.isGuest);
    let userId = "guest";
    let userEmail = (body.userEmail || "").trim().toLowerCase();
    let userName = (body.userName || shippingAddress.fullName).trim();
    let guestAccessToken: string | undefined = undefined;

    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded.uid) {
            userId = decoded.uid;
            userEmail = (decoded.email || userEmail).toLowerCase();
            isGuest = false;
          }
        } catch {
          // Token verification failed; if marked as guest proceed as guest, otherwise reject
          if (!isGuest) {
            return NextResponse.json({ error: "Unauthorized: Invalid authentication token" }, { status: 401 });
          }
        }
      }
    }

    if (isGuest || userId === "guest") {
      isGuest = true;
      userId = "guest";
      // Generate a cryptographically secure 48-hex-character token
      guestAccessToken = crypto.randomBytes(24).toString("hex");
      if (!userEmail) {
        return NextResponse.json(
          { error: "Email address is required for guest checkout to send confirmation & tracking" },
          { status: 400 }
        );
      }
    }

    const orderNumber = generateOrderId();
    const now = new Date().toISOString();

    const orderData = {
      orderNumber,
      userId,
      userEmail,
      userName,
      isGuest,
      ...(guestAccessToken ? { guestAccessToken } : {}),
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage || "/images/placeholder.jpg",
        productSlug: item.productSlug,
        variant: item.variant || {},
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      subtotal,
      shippingCharge,
      discount: discount || 0,
      ...(couponCode ? { couponCode: couponCode.toUpperCase() } : {}),
      total,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        alternatePhone: shippingAddress.alternatePhone || "",
        province: shippingAddress.province,
        district: shippingAddress.district,
        municipality: shippingAddress.municipality,
        ward: Number(shippingAddress.ward),
        streetAddress: shippingAddress.streetAddress,
        landmark: shippingAddress.landmark || "",
        isDefault: false,
      },
      paymentMethod,
      paymentStatus: "pending" as const,
      status: "pending" as const,
      statusHistory: [
        {
          status: "pending" as const,
          timestamp: now,
          note: isGuest ? "Guest order placed successfully" : "Order placed successfully",
        },
      ],
      notes: notes || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Save order document
    const docRef = await adminDb.collection(COLLECTIONS.ORDERS).add(orderData);
    const orderId = docRef.id;

    // Decrement stock & increment sold count safely on server
    try {
      const batch = adminDb.batch();
      for (const item of items) {
        const prodRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
        batch.update(prodRef, {
          stock: FieldValue.increment(-item.quantity),
          soldCount: FieldValue.increment(item.quantity),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (stockErr) {
      console.warn(`[CreateOrderAPI] Non-critical stock decrement issue for order ${orderId}:`, stockErr);
    }

    // Increment coupon usage if valid
    if (couponCode) {
      try {
        const couponSnap = await adminDb
          .collection(COLLECTIONS.COUPONS)
          .where("code", "==", couponCode.toUpperCase())
          .limit(1)
          .get();
        if (!couponSnap.empty) {
          await couponSnap.docs[0].ref.update({
            usedCount: FieldValue.increment(1),
          });
        }
      } catch (couponErr) {
        console.warn(`[CreateOrderAPI] Non-critical coupon increment issue for order ${orderId}:`, couponErr);
      }
    }

    // Trigger admin notification if COD
    if (paymentMethod === "cod") {
      sendAdminOrderNotification(orderId).catch((notifErr) => {
        console.error(`[CreateOrderAPI] Admin notification error for COD order ${orderId}:`, notifErr);
      });
    }

    const response = NextResponse.json({
      success: true,
      id: orderId,
      orderNumber,
      isGuest,
      guestAccessToken: guestAccessToken || null,
    });

    // Set cookie for guest orders so Server Components & requests can recognize it
    if (isGuest && guestAccessToken) {
      response.cookies.set(`nexshop_guest_${orderId}`, guestAccessToken, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[CreateOrderAPI] Failed to create order:", errorMsg);
    return NextResponse.json(
      { error: "Failed to create order. Please try again.", details: errorMsg },
      { status: 500 }
    );
  }
}
