import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Order } from "@/lib/types/order";

export const dynamic = "force-dynamic";

interface GuestOrderRequestItem {
  orderId: string;
  token: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      orders?: GuestOrderRequestItem[];
      guestOrders?: GuestOrderRequestItem[];
    } | null;

    // Safely accept both body.orders and body.guestOrders, normalizing to one array
    const rawList: GuestOrderRequestItem[] = [];
    if (body) {
      if (Array.isArray(body.orders)) {
        rawList.push(...body.orders);
      }
      if (Array.isArray(body.guestOrders)) {
        rawList.push(...body.guestOrders);
      }
    }

    if (rawList.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Deduplicate by orderId and cap at 50 to prevent abuse
    const seen = new Set<string>();
    const requests: GuestOrderRequestItem[] = [];
    for (const item of rawList) {
      if (item?.orderId && item?.token && !seen.has(item.orderId)) {
        seen.add(item.orderId);
        requests.push({ orderId: item.orderId.trim(), token: item.token.trim() });
        if (requests.length >= 50) break;
      }
    }

    if (requests.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const verifiedOrders: Order[] = [];

    // Fetch and strictly verify each requested order
    for (const item of requests) {
      try {
        const snap = await adminDb.collection(COLLECTIONS.ORDERS).doc(item.orderId).get();
        if (!snap.exists) continue;

        const data = snap.data();
        if (!data) continue;

        // Strict Cryptographic Token Verification
        if (!data.guestAccessToken || data.guestAccessToken !== item.token) {
          // Token does NOT match! Reject silently.
          continue;
        }

        const createdAtStr =
          data.createdAt?.toDate?.()?.toISOString() ||
          (typeof data.createdAt === "string" ? data.createdAt : undefined) ||
          new Date().toISOString();

        const updatedAtStr =
          data.updatedAt?.toDate?.()?.toISOString() ||
          (typeof data.updatedAt === "string" ? data.updatedAt : undefined) ||
          new Date().toISOString();

        // Sanitize sensitive internal keys before sending to browser
        const { guestAccessToken: _token, ...safeData } = data;

        verifiedOrders.push({
          id: snap.id,
          ...safeData,
          createdAt: createdAtStr,
          updatedAt: updatedAtStr,
        } as Order);
      } catch (err) {
        console.warn(`[GuestOrdersListAPI] Error fetching order ${item.orderId}:`, err);
      }
    }

    // Sort newest first
    verifiedOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ orders: verifiedOrders });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GuestOrdersListAPI] Error processing guest orders list:", errorMsg);
    return NextResponse.json({ error: "Failed to retrieve guest orders", orders: [] }, { status: 500 });
  }
}
