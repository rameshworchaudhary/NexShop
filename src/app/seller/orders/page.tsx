"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  ShoppingCart, Search, Phone, MapPin,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { getAllOrders } from "@/lib/firebase/orders";
import { getProductsBySeller } from "@/lib/firebase/products";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS } from "@/lib/constants/site";
import type { Order } from "@/lib/types/order";
import type { Product } from "@/lib/types/product";

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllOrders(),
      getProductsBySeller(user.uid),
    ]).then(([allOrders, sellerProducts]) => {
      const sellerProductIds = new Set(sellerProducts.map((p) => p.id));
      const sellerOrders = allOrders.filter((o) =>
        o.items.some((item) => sellerProductIds.has(item.productId))
      );
      setMyProducts(sellerProducts);
      setOrders(sellerOrders);
    }).finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q) ||
          o.shippingAddress?.phone?.includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, search]);

  const getSellerItems = (order: Order) => {
    const sellerProductIds = new Set(myProducts.map((p) => p.id));
    return order.items.filter((item) => sellerProductIds.has(item.productId));
  };

  const getSellerEarnings = (order: Order) => {
    return getSellerItems(order).reduce((sum, item) => sum + item.subtotal, 0);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {orders.length} orders containing your products
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order#, name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const myItems = getSellerItems(order);
            const earnings = getSellerEarnings(order);
            const isExpanded = expandedOrder === order.id;

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base">#{order.orderNumber}</p>
                        <Badge className={ORDER_STATUS_COLORS[order.status] + " text-xs"}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Your earnings</p>
                      <p className="font-bold text-green-600 text-lg">{formatCurrency(earnings)}</p>
                    </div>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div className="bg-muted/40 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                      Customer & Delivery Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Customer */}
                      <div>
                        <p className="text-sm font-semibold">{order.userName}</p>
                        <p className="text-xs text-muted-foreground">{order.userEmail}</p>
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          <span className="font-semibold text-green-700">
                            {order.shippingAddress?.phone || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground leading-relaxed">
                            {[
                              order.shippingAddress?.streetAddress,
                              order.shippingAddress?.ward ? `Ward ${order.shippingAddress?.ward}` : null,
                              order.shippingAddress?.municipality,
                              order.shippingAddress?.district,
                              order.shippingAddress?.province,
                            ].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deliver to name if different */}
                    {order.shippingAddress?.fullName &&
                      order.shippingAddress.fullName !== order.userName && (
                        <div className="mt-2 pt-2 border-t border-muted">
                          <p className="text-xs text-muted-foreground">
                            Deliver to:{" "}
                            <span className="font-semibold text-foreground">
                              {order.shippingAddress.fullName}
                            </span>
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Products */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Your Products ({myItems.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5 mr-1" />Hide</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5 mr-1" />View Items</>
                        )}
                      </Button>
                    </div>

                    {/* Collapsed preview */}
                    {!isExpanded && (
                      <div className="flex items-center gap-2">
                        {myItems.slice(0, 4).map((item, i) => (
                          <div
                            key={i}
                            className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted border flex-shrink-0"
                          >
                            <Image
                              src={item.productImage || "/images/placeholder.jpg"}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ))}
                        {myItems.length > 4 && (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            +{myItems.length - 4}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground ml-1">
                          {myItems.reduce((s, i) => s + i.quantity, 0)} units total
                        </p>
                      </div>
                    )}

                    {/* Expanded items */}
                    {isExpanded && (
                      <div className="space-y-3 mt-2">
                        {myItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted border flex-shrink-0">
                              <Image
                                src={item.productImage || "/images/placeholder.jpg"}
                                alt={item.productName}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.price)} × {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-bold flex-shrink-0">
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}