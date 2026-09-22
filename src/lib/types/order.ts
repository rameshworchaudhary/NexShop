import type { DeliveryAddress } from "./nepal-address";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "esewa" | "khalti" | "cod";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  productSlug: string;
  variant?: Record<string, string>;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  couponCode?: string;
  total: number;
  shippingAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  notes?: string;
  estimatedDelivery?: string;
  adminNotificationStatus?: "pending" | "sending" | "sent" | "failed";
  adminNotificationSentAt?: string;
  adminNotificationFailedAt?: string;
  adminNotificationLastError?: string;
  adminNotificationResendId?: string;
  isGuest?: boolean;
  guestAccessToken?: string;
  claimedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  userId: string;
  userEmail: string;
  userName: string;
  isGuest?: boolean;
  guestAccessToken?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  couponCode?: string;
  total: number;
  shippingAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
}
