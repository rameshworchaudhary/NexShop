/**
 * Client-side manager for storing and retrieving guest order access credentials.
 *
 * Security note:
 * To view or claim a guest order, the client must present both the `orderId`
 * and the cryptographically secure `token` (generated server-side upon order creation).
 * This prevents any unauthorized access or enumeration of other customers' orders.
 */

export interface StoredGuestOrder {
  orderId: string;
  orderNumber: string;
  token: string;
  email: string;
  createdAt: string;
}

const STORAGE_KEY = "nexshop_guest_orders";

export function getStoredGuestOrders(): StoredGuestOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredGuestOrder =>
        Boolean(item && typeof item === "object" && item.orderId && item.token)
    );
  } catch (err) {
    console.error("Failed to read guest orders from localStorage:", err);
    return [];
  }
}

export function saveGuestOrder(order: {
  orderId: string;
  orderNumber: string;
  token: string;
  email: string;
}): void {
  if (typeof window === "undefined" || !order.orderId || !order.token) return;
  try {
    const existing = getStoredGuestOrders();
    // Filter out if already exists, then prepend newest
    const filtered = existing.filter((o) => o.orderId !== order.orderId);
    const updated: StoredGuestOrder[] = [
      {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        token: order.token,
        email: order.email,
        createdAt: new Date().toISOString(),
      },
      ...filtered,
    ];
    // Keep max 50 recent orders
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error("Failed to save guest order to localStorage:", err);
  }
}

export function getGuestTokenForOrder(orderId: string): string | null {
  if (!orderId) return null;
  const orders = getStoredGuestOrders();
  const match = orders.find((o) => o.orderId === orderId);
  return match?.token || null;
}

export function removeStoredGuestOrder(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const existing = getStoredGuestOrders();
    const updated = existing.filter((o) => o.orderId !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to remove guest order from localStorage:", err);
  }
}

export function clearAllStoredGuestOrders(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear guest orders:", err);
  }
}

export function hasStoredGuestOrders(): boolean {
  return getStoredGuestOrders().length > 0;
}

// Aliases for convenience
export const getGuestOrders = getStoredGuestOrders;
export const removeGuestOrder = removeStoredGuestOrder;
export const clearGuestOrders = clearAllStoredGuestOrders;
