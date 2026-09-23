"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle, Package, MapPin, CreditCard, Phone, ShieldAlert,
  Printer, Copy, ExternalLink, Link2, ShoppingBag, ArrowRight,
  ShieldCheck, HelpCircle, Mail, Clock, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { getGuestOrders, removeGuestOrder } from "@/lib/guestOrders";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS,
} from "@/lib/constants/site";
import type { Order } from "@/lib/types/order";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CustomerOrderDetailViewProps {
  order: Order;
  success?: string;
  token?: string;
}

export default function CustomerOrderDetailView({
  order,
  success,
  token: initialToken,
}: CustomerOrderDetailViewProps) {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [guestTokenInput, setGuestTokenInput] = useState("");
  const [hasManuallyVerified, setHasManuallyVerified] = useState(false);

  // Check authorization:
  // 1. Logged in owner of order
  // 2. Admin
  // 3. Guest order with valid guestAccessToken matching token in URL, client storage, or manual token input
  const isOwner = Boolean(user && order.userId && user.uid === order.userId);
  const isAdmin = profile?.role === "admin";
  const isGuestOrder = Boolean(order.isGuest || !order.userId || order.userId === "guest");

  const hasDirectGuestAccess = (() => {
    if (!isGuestOrder) return false;
    if (!order.guestAccessToken) return true;
    if (initialToken && initialToken === order.guestAccessToken) return true;
    if (typeof window !== "undefined") {
      const stored = getGuestOrders();
      const found = stored.find((o) => o.orderId === order.id);
      if (found && found.token === order.guestAccessToken) return true;
    }
    return false;
  })();

  const isAuthorized = isOwner || isAdmin || (isGuestOrder && (hasDirectGuestAccess || hasManuallyVerified));

  const handleCopyTrackingLink = () => {
    const token = order.guestAccessToken || initialToken || "";
    const url = `${window.location.origin}/orders/${order.id}${token ? `?token=${token}` : ""}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Order tracking link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleClaimOrder = async () => {
    if (!user) {
      router.push(`/login?redirect=/orders/${order.id}`);
      return;
    }

    const tokenToUse = order.guestAccessToken || initialToken || "";
    setIsClaiming(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/orders/claim-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          token: tokenToUse,
          claims: [{ orderId: order.id, token: tokenToUse }],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.claimedCount === 0) {
        throw new Error(data.error || "Failed to link order");
      }

      removeGuestOrder(order.id);
      toast.success("Order successfully linked to your NexShop account!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to link order";
      toast.error(msg);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVerifyTokenInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestTokenInput.trim()) return;
    if (order.guestAccessToken && guestTokenInput.trim() === order.guestAccessToken) {
      setHasManuallyVerified(true);
      toast.success("Guest order access verified!");
    } else {
      toast.error("Invalid access token for this order");
    }
  };

  // If loading auth state, wait briefly
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Access check
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card className="p-8 space-y-5">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Restricted Order Access</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              To protect customer privacy, order details require authentication or a verified guest access link.
            </p>
          </div>

          {isGuestOrder ? (
            <form onSubmit={handleVerifyTokenInput} className="space-y-3 pt-2 text-left">
              <label className="text-xs font-semibold text-foreground">
                Enter your Guest Access Token (from confirmation receipt)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste guest token"
                  value={guestTokenInput}
                  onChange={(e) => setGuestTokenInput(e.target.value)}
                  className="text-xs"
                />
                <Button type="submit" size="sm">Verify</Button>
              </div>
            </form>
          ) : (
            <div className="pt-2">
              <Button asChild className="w-full">
                <Link href={`/login?redirect=/orders/${order.id}`}>
                  Sign in to view your order
                </Link>
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button variant="outline" asChild className="w-full text-xs">
              <Link href="/help">Contact Customer Support</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Success Confirmation Banner */}
      {success === "true" && (
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-base text-emerald-950">Thank you! Your order has been placed.</p>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                A confirmation has been sent to{" "}
                <span className="font-semibold">{order.userEmail || order.shippingAddress.phone}</span>. We will notify you as your package moves through each stage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTrackingLink}
              className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100/50 text-xs gap-1.5"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? "Link Copied" : "Copy Tracking Link"}
            </Button>
          </div>
        </div>
      )}

      {/* Amazon-style Order Header Banner */}
      <div className="border rounded-2xl overflow-hidden mb-8 shadow-2xs bg-card">
        <div className="bg-muted/40 p-4 sm:p-5 border-b grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">
              Order Placed
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {formatDate(order.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">
              Total
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {formatCurrency(order.total)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">
              Ship To
            </span>
            <span className="font-semibold text-foreground mt-0.5 block truncate" title={order.shippingAddress.fullName}>
              {order.shippingAddress.fullName}
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">
              Order # {order.orderNumber}
            </span>
            <div className="mt-0.5 flex items-center sm:justify-end gap-1.5">
              <Badge className={ORDER_STATUS_COLORS[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="p-3 sm:px-5 flex items-center justify-between flex-wrap gap-2 text-xs bg-card">
          <div className="flex items-center gap-2">
            {isGuestOrder && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 gap-1 font-medium">
                Guest Order
              </Badge>
            )}
            <span className="text-muted-foreground hidden sm:inline">
              Estimated Delivery: 3 to 7 business days
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Printer className="h-3.5 w-3.5" /> Print Invoice
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTrackingLink}
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" /> Share / Copy Link
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
              <Link href="/help">
                <HelpCircle className="h-3.5 w-3.5" /> Help
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Guest Linking Banner */}
      {isGuestOrder && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">
                  {user ? "Link this guest order to your account" : "Save this order to your NexShop account"}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                {user
                  ? "Since you placed this order as a guest, you can connect it to your logged-in profile right now so it appears in your official order history."
                  : "Sign in or create an account with the same email to permanently access tracking, fast reordering, and invoice downloads."}
              </p>
            </div>

            <div className="shrink-0">
              {user ? (
                <Button
                  size="sm"
                  onClick={handleClaimOrder}
                  disabled={isClaiming}
                  className="gap-2 text-xs font-medium"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {isClaiming ? "Linking..." : "Link to My Account"}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="default" className="text-xs font-medium">
                    <Link href={`/login?redirect=/orders/${order.id}`}>
                      Sign In & Link
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/register?redirect=/orders/${order.id}`}>
                      Create Account
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Tracking Timeline (Left) & Order Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Timeline & Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Vertical Tracking Timeline Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Live Tracking Timeline
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Real-time status updates
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>

          {/* Items Purchased Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Items in This Shipment ({order.items.length})</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Fulfilled by NexShop
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl border bg-muted/20"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Link href={`/products/${item.productSlug}`} className="shrink-0">
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted border">
                        <Image
                          src={item.productImage || "/images/placeholder.jpg"}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    </Link>

                    <div className="space-y-1 min-w-0">
                      <Link href={`/products/${item.productSlug}`}>
                        <p className="text-sm font-semibold hover:text-primary transition-colors line-clamp-2">
                          {item.productName}
                        </p>
                      </Link>

                      {item.variant && Object.keys(item.variant).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Unit Price: <span className="font-medium text-foreground">{formatCurrency(item.price)}</span> · Qty: <span className="font-medium text-foreground">{item.quantity}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(item.subtotal)}
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs mt-1">
                      <Link href={`/products/${item.productSlug}`}>
                        Buy It Again
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Delivery Address, Payment & Order Summary */}
        <div className="space-y-6">
          {/* Delivery Address Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="font-semibold text-sm text-foreground">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {order.shippingAddress.phone}
                {order.shippingAddress.alternatePhone && (
                  <span> / {order.shippingAddress.alternatePhone}</span>
                )}
              </p>
              {order.userEmail && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {order.userEmail}
                </p>
              )}
              <div className="pt-2 text-muted-foreground leading-relaxed">
                <p>
                  {order.shippingAddress.streetAddress}
                  {order.shippingAddress.ward ? `, Ward ${order.shippingAddress.ward}` : ""}
                </p>
                {(order.shippingAddress.municipality || order.shippingAddress.district) && (
                  <p>{[order.shippingAddress.municipality, order.shippingAddress.district].filter(Boolean).join(", ")}</p>
                )}
                {order.shippingAddress.province && (
                  <p>{order.shippingAddress.province}, Nepal</p>
                )}
              </div>
              {order.shippingAddress.landmark && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-foreground block">Nearest Landmark:</span>
                  <p className="text-muted-foreground">{order.shippingAddress.landmark}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-semibold text-foreground">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge
                  variant={
                    order.paymentStatus === "paid"
                      ? "success"
                      : order.paymentStatus === "failed"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-[11px] capitalize"
                >
                  {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </Badge>
              </div>
              {order.paymentTransactionId && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-foreground">{order.paymentTransactionId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary Card */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal</span>
                <span className="font-medium text-foreground">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charge</span>
                <span className={order.shippingCharge === 0 ? "text-emerald-600 font-semibold" : "font-medium text-foreground"}>
                  {order.shippingCharge === 0 ? "FREE" : formatCurrency(order.shippingCharge)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-bold">
                <span>Grand Total</span>
                <span className="text-primary">{formatCurrency(order.total)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                Includes all applicable taxes and handling charges.
              </p>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full text-xs" asChild>
            <Link href="/orders">
              ← Back to My Orders
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

