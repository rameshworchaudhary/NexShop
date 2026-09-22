"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, ChevronRight, ShoppingBag, Link2, Search,
  User, ShieldCheck, ArrowRight, Clock, AlertCircle, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getOrdersByUser } from "@/lib/firebase/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getGuestOrders, removeGuestOrder, clearGuestOrders } from "@/lib/guestOrders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants/site";
import type { Order } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  // Manual lookup state
  const [lookupOrderId, setLookupOrderId] = useState("");
  const [lookupToken, setLookupToken] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAllOrders() {
      setLoading(true);
      try {
        const storedGuestEntries = getGuestOrders();

        if (user) {
          // Fetch user's registered orders
          const userOrders = await getOrdersByUser(user.uid);
          if (!isMounted) return;
          setOrders(userOrders);

          // If there are guest orders in localStorage not yet linked to this user
          if (storedGuestEntries.length > 0) {
            try {
              const res = await fetch("/api/orders/guest-list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestOrders: storedGuestEntries }),
              });
              if (res.ok) {
                const data = await res.json();
                // Only keep guest orders that are NOT already in userOrders
                const userOrderIds = new Set(userOrders.map((o) => o.id));
                const unlinked = (data.orders || []).filter(
                  (o: Order) => !userOrderIds.has(o.id) && o.userId !== user.uid
                );
                if (isMounted) setGuestOrders(unlinked);
              }
            } catch (err) {
              console.warn("Failed to check guest orders:", err);
            }
          }
        } else {
          // User is a guest. Fetch guest orders from localStorage via guest-list API
          if (storedGuestEntries.length > 0) {
            try {
              const res = await fetch("/api/orders/guest-list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestOrders: storedGuestEntries }),
              });
              if (res.ok) {
                const data = await res.json();
                if (isMounted) setOrders(data.orders || []);
              }
            } catch (err) {
              console.error("Failed to load guest orders:", err);
            }
          } else {
            if (isMounted) setOrders([]);
          }
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        toast.error("Couldn't load your orders. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!authLoading) {
      loadAllOrders();
    }

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const handleLinkAllGuestOrders = async () => {
    if (!user || guestOrders.length === 0) return;
    setIsLinking(true);

    try {
      const idToken = await user.getIdToken();
      let linkedCount = 0;

      for (const gOrder of guestOrders) {
        const stored = getGuestOrders().find((o) => o.orderId === gOrder.id);
        const token = gOrder.guestAccessToken || stored?.token || "";
        try {
          const res = await fetch("/api/orders/claim-guest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              orderId: gOrder.id,
              token,
            }),
          });
          if (res.ok) {
            linkedCount++;
            removeGuestOrder(gOrder.id);
          }
        } catch {
          // ignore individual error and continue
        }
      }

      if (linkedCount > 0) {
        toast.success(`Successfully linked ${linkedCount} guest order(s) to your account!`);
        // Refresh orders
        const updated = await getOrdersByUser(user.uid);
        setOrders(updated);
        setGuestOrders([]);
      } else {
        toast.error("Could not link orders. Please verify tokens or contact support.");
      }
    } catch (err) {
      toast.error("Failed to link guest orders");
    } finally {
      setIsLinking(false);
    }
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderId.trim()) {
      toast.error("Please enter your Order ID");
      return;
    }
    const cleanId = lookupOrderId.trim();
    const cleanToken = lookupToken.trim();
    const url = `/orders/${cleanId}${cleanToken ? `?token=${cleanToken}` : ""}`;
    router.push(url);
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> My Orders
        </h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> My Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {user
              ? `Viewing orders for ${user.email}`
              : "Viewing guest orders placed on this browser"}
          </p>
        </div>

        {!user && (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href="/login?redirect=/orders">Sign In</Link>
            </Button>
            <Button asChild size="sm" variant="default" className="text-xs">
              <Link href="/register?redirect=/orders">Register Account</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Guest Notice for Non-logged-in Users */}
      {!user && orders.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Viewing Guest Orders on This Device
              </p>
              <p className="text-xs text-muted-foreground">
                These orders were placed without an account. Create an account or sign in to permanently link them and view them across all your devices.
              </p>
            </div>
            <Button asChild size="sm" className="text-xs shrink-0">
              <Link href="/login?redirect=/orders">Sign In & Save</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unlinked Guest Orders Banner for Logged-In Users */}
      {user && guestOrders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-amber-700" />
                Found {guestOrders.length} Guest Order(s) on this Browser
              </p>
              <p className="text-xs text-amber-800">
                You placed orders before logging in. Would you like to link them to your account ({user.email})?
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleLinkAllGuestOrders}
              disabled={isLinking}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
            >
              {isLinking ? "Linking..." : `Link ${guestOrders.length} Order(s)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card p-6 shadow-2xs">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No orders found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-sm">
            {user
              ? "You haven't placed any orders with this account yet. Browse our catalog to get started!"
              : "No guest orders were found stored on this browser. If you placed an order from another device, use the lookup below."}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/products">Start Shopping</Link>
            </Button>
            {!user && (
              <Button asChild size="sm" variant="outline">
                <Link href="/login?redirect=/orders">Sign In with Existing Account</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isGuest = Boolean(order.isGuest || !order.userId || order.userId === "guest");
            const tokenParam = order.guestAccessToken ? `?token=${order.guestAccessToken}` : "";

            return (
              <Link key={order.id} href={`/orders/${order.id}${tokenParam}`}>
                <Card className="hover:border-primary hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">Order #{order.orderNumber}</p>
                          {isGuest && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                              Guest Order
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Badge className={ORDER_STATUS_COLORS[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    {/* Item thumbnails */}
                    <div className="flex items-center gap-2 mb-3">
                      {order.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted border flex-shrink-0">
                          <Image
                            src={item.productImage || "/images/placeholder.jpg"}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary">{formatCurrency(order.total)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Manual Guest Order Lookup Card */}
      <Card className="border shadow-2xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Track an Order by ID</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Placed an order on another phone or computer? Enter your Order ID and the Guest Access Token received in your order confirmation to track it right now.
          </p>

          <form onSubmit={handleManualLookup} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3">
              <Input
                placeholder="Order ID (e.g. ord_abc123...)"
                value={lookupOrderId}
                onChange={(e) => setLookupOrderId(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                placeholder="Guest Access Token (Optional)"
                value={lookupToken}
                onChange={(e) => setLookupToken(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="sm:col-span-5 flex justify-end">
              <Button type="submit" size="sm" className="text-xs gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Track Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
