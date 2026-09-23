"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Package, MapPin, CreditCard, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { updateOrderStatus, updateOrderPaymentStatus } from "@/lib/firebase/orders";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS,
} from "@/lib/constants/site";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types/order";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AdminOrderDetailClientProps {
  order: Order;
}

export default function AdminOrderDetailClient({ order: initialOrder }: AdminOrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [newStatus, setNewStatus] = useState<OrderStatus>(initialOrder.status);
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus, statusNote || undefined);
      setOrder({
        ...order,
        status: newStatus,
        statusHistory: [
          ...order.statusHistory,
          { status: newStatus, timestamp: new Date().toISOString(), note: statusNote },
        ],
      });
      setStatusNote("");
      toast.success("Order status updated!");
      router.refresh();
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (status: PaymentStatus) => {
    try {
      await updateOrderPaymentStatus(order.id, status);
      setOrder({ ...order, paymentStatus: status });
      toast.success("Payment status updated!");
      router.refresh();
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <Badge className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status update */}
          <Card>
            <CardHeader><CardTitle className="text-base">Update Order Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={order.paymentStatus} onValueChange={(v) => handleUpdatePaymentStatus(v as PaymentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Add a note about this status change (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
              />
              <Button onClick={handleUpdateStatus} disabled={updating || newStatus === order.status}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Order Timeline</CardTitle></CardHeader>
            <CardContent><OrderTimeline order={order} /></CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Items ({order.items.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted border flex-shrink-0">
                    <Image src={item.productImage || "/images/placeholder.jpg"} alt={item.productName} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-sm font-medium">{order.userName}</p>
              {order.userEmail ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {order.userEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Direct Buyer (No email)</p>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Delivery Address</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {order.shippingAddress.phone}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {[
                  order.shippingAddress.streetAddress,
                  order.shippingAddress.ward ? `Ward ${order.shippingAddress.ward}` : null,
                  order.shippingAddress.municipality,
                  order.shippingAddress.district,
                  order.shippingAddress.province,
                ].filter(Boolean).join(", ")}
              </p>
            </CardContent>
          </Card>

          {/* Payment summary */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Method</span><span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={order.paymentStatus === "paid" ? "success" : "outline"} className="text-xs">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge></div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(order.shippingCharge)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
