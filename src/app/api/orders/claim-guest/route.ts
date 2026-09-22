import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

interface ClaimItem {
  orderId: string;
  token: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized: Invalid token format" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const accountEmail = (decoded.email || "").trim().toLowerCase();

    if (!uid || !accountEmail) {
      return NextResponse.json(
        { error: "A verified email address is required on the user account to claim orders" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      claims?: ClaimItem[];
      orderId?: string;
      token?: string;
    } | null;

    const rawClaims: ClaimItem[] = [];
    if (body) {
      if (Array.isArray(body.claims)) {
        rawClaims.push(...body.claims);
      }
      if (
        typeof body.orderId === "string" &&
        typeof body.token === "string" &&
        body.orderId.trim() &&
        body.token.trim()
      ) {
        rawClaims.push({ orderId: body.orderId.trim(), token: body.token.trim() });
      }
    }

    if (rawClaims.length === 0) {
      return NextResponse.json({ claimedCount: 0, claimedOrderIds: [] });
    }

    // Deduplicate and cap at 50 to prevent abuse
    const seen = new Set<string>();
    const claims: ClaimItem[] = [];
    for (const c of rawClaims) {
      if (c?.orderId && c?.token && !seen.has(c.orderId)) {
        seen.add(c.orderId);
        claims.push({ orderId: c.orderId.trim(), token: c.token.trim() });
        if (claims.length >= 50) break;
      }
    }

    if (claims.length === 0) {
      return NextResponse.json({ claimedCount: 0, claimedOrderIds: [] });
    }

    const isSingle = !body?.claims && Boolean(body?.orderId);
    let singleFailureReason = "";
    const claimedOrderIds: string[] = [];

    const now = new Date().toISOString();

    for (const claim of claims) {
      try {
        const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc(claim.orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
          if (isSingle) singleFailureReason = "Order not found";
          continue;
        }
        const orderData = orderSnap.data();
        if (!orderData) {
          if (isSingle) singleFailureReason = "Order data not found";
          continue;
        }

        // Security check 1: Must be currently marked as a guest order or unowned
        const isGuest = orderData.isGuest === true || orderData.userId === "guest" || !orderData.userId;
        if (!isGuest) {
          // Already claimed or owned by an account
          if (isSingle) singleFailureReason = "This order has already been linked to an account";
          continue;
        }

        // Security check 2: Possession of the secret guest access token
        if (!orderData.guestAccessToken || orderData.guestAccessToken !== claim.token) {
          // Token mismatch!
          if (isSingle) singleFailureReason = "Invalid guest access token";
          continue;
        }

        // Security check 3: Verified customer identity match
        const orderEmail = (orderData.userEmail || "").trim().toLowerCase();
        if (orderEmail !== accountEmail) {
          // Email mismatch! The order was placed under a different email address.
          if (isSingle) {
            singleFailureReason = `Email mismatch: This order was placed under ${orderEmail}, but you are signed in as ${accountEmail}`;
          }
          continue;
        }

        // All checks passed! Associate order with the authenticated account.
        const history = orderData.statusHistory || [];

        await orderRef.update({
          userId: uid,
          isGuest: false,
          claimedAt: now,
          statusHistory: [
            ...history,
            {
              status: orderData.status,
              timestamp: now,
              note: `Order linked to registered account (${accountEmail})`,
            },
          ],
          updatedAt: FieldValue.serverTimestamp(),
        });

        claimedOrderIds.push(claim.orderId);
      } catch (claimErr) {
        console.warn(`[ClaimGuestOrdersAPI] Error claiming order ${claim.orderId}:`, claimErr);
        if (isSingle) singleFailureReason = "Database error while updating order";
      }
    }

    if (claimedOrderIds.length === 0 && isSingle) {
      return NextResponse.json(
        {
          error:
            singleFailureReason ||
            "Failed to claim order. Please ensure your account email matches the order email and the access token is valid.",
          claimedCount: 0,
          claimedOrderIds: [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: claimedOrderIds.length > 0,
      claimedCount: claimedOrderIds.length,
      claimedOrderIds,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ClaimGuestOrdersAPI] Error claiming guest orders:", errorMsg);
    return NextResponse.json({ error: "Failed to claim guest orders", claimedCount: 0, claimedOrderIds: [] }, { status: 500 });
  }
}
