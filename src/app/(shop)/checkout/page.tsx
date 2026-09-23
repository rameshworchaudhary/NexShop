"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CreditCard, CheckCircle, ChevronRight,
  Tag, Truck, ShieldCheck, Banknote, Loader2,
  LogIn, UserCheck, ShoppingBag, ArrowRight, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AddressForm, { type AddressFormData } from "@/components/checkout/AddressForm";
import DirectAddressForm, { type DirectAddressFormData } from "@/components/checkout/DirectAddressForm";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { saveGuestOrder } from "@/lib/guestOrders";
import { validateCoupon } from "@/lib/firebase/coupons";
import { calculateShippingCharge } from "@/lib/firebase/shipping";
import { addUserAddress } from "@/lib/firebase/users";
import type { DeliveryAddress } from "@/lib/types/nepal-address";
import type { PaymentMethod } from "@/lib/types/order";
import type { CouponValidationResult } from "@/lib/types/coupon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["Address", "Payment", "Review"];

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  color: string;
  bg: string;
  logoText: string;
  desc: string;
}[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    color: "text-amber-800",
    bg: "bg-amber-500",
    logoText: "Rs",
    desc: "Pay in cash when your order is delivered to your doorstep",
  },
  {
    id: "esewa",
    label: "eSewa Wallet",
    color: "text-emerald-700",
    bg: "bg-[#60BB46]",
    logoText: "e",
    desc: "Pay instantly & securely with eSewa digital wallet",
  },
  {
    id: "khalti",
    label: "Khalti Wallet",
    color: "text-purple-800",
    bg: "bg-[#5C2D91]",
    logoText: "K",
    desc: "Pay easily with Khalti e-payment service",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const [step, setStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<DeliveryAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(150);
  const [shippingInfo, setShippingInfo] = useState({ estimatedDays: "3-7 days", zoneName: "" });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);

  // Redirect if cart empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items, router]);

  // Recalculate shipping when address changes
  useEffect(() => {
    calculateShippingCharge(shippingAddress?.district || "", subtotal).then((info) => {
      setShippingCharge(info.charge);
      setShippingInfo({ estimatedDays: info.estimatedDays, zoneName: info.zoneName });
    });
  }, [shippingAddress?.district, subtotal]);

  const discount = couponResult?.valid ? couponResult.discountAmount ?? 0 : 0;
  const total = subtotal + shippingCharge - discount;

  // Handler for authenticated user full address form
  const handleAddressSubmit = async (data: AddressFormData) => {
    const address: DeliveryAddress = {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      alternatePhone: data.alternatePhone?.trim() || "",
      province: data.province,
      district: data.district,
      municipality: data.municipality,
      ward: Number(data.ward),
      streetAddress: data.streetAddress.trim(),
      landmark: data.landmark?.trim() || "",
      isDefault: Boolean(data.isDefault),
    };

    setShippingAddress(address);

    if (saveAddress && user) {
      try {
        await addUserAddress(user.uid, address);
      } catch {
        /* non-critical */
      }
    }

    setStep(1);
  };

  // Dedicated single-page order placement for unauthenticated guest direct buyers
  const handleGuestPlaceOrder = async (data: DirectAddressFormData) => {
    setIsPlacingOrder(true);
    try {
      const address: DeliveryAddress = {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        streetAddress: data.address.trim(),
        isDefault: false,
      };
      setShippingAddress(address);

      const orderItems = items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        productImage: item.image,
        productSlug: item.slug,
        variant: item.variant,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "guest",
          userEmail: "",
          userName: address.fullName,
          isGuest: true,
          items: orderItems,
          subtotal,
          shippingCharge,
          discount,
          couponCode: couponResult?.valid ? couponCode.toUpperCase() : undefined,
          total,
          shippingAddress: address,
          paymentMethod: "cod",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create order");
      }

      const { id: orderId, orderNumber, guestAccessToken } = await res.json();

      // Store guest order credentials in browser localStorage for secure My Orders access
      if (guestAccessToken) {
        saveGuestOrder({
          orderId,
          orderNumber,
          token: guestAccessToken,
          email: "",
        });
      }

      clearCart();
      toast.success("Order placed successfully!");

      // DIRECT REDIRECT to existing Order Details page
      const targetUrl = guestAccessToken
        ? `/orders/${orderId}?token=${guestAccessToken}&success=true`
        : `/orders/${orderId}?success=true`;
      router.push(targetUrl);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to place order. Please try again.";
      console.error("Guest order placement failed:", err);
      toast.error(errMsg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode.trim(), subtotal);
      setCouponResult(result);
      if (result.valid) {
        toast.success(`Coupon applied! You save ${formatCurrency(result.discountAmount ?? 0)}`);
      } else {
        toast.error(result.message || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress) return;
    setIsPlacingOrder(true);

    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        productImage: item.image,
        productSlug: item.slug,
        variant: item.variant,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const isGuest = !user;
      const orderEmail = isGuest ? "" : (user?.email || "");
      const orderName = isGuest
        ? shippingAddress.fullName
        : profile?.displayName || user.email || shippingAddress.fullName;

      let idToken: string | undefined = undefined;
      if (user) {
        try {
          idToken = await user.getIdToken();
        } catch (tErr) {
          console.warn("Could not retrieve user idToken:", tErr);
        }
      }

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.uid || "guest",
          userEmail: orderEmail,
          userName: orderName,
          isGuest,
          items: orderItems,
          subtotal,
          shippingCharge,
          discount,
          couponCode: couponResult?.valid ? couponCode.toUpperCase() : undefined,
          total,
          shippingAddress,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create order");
      }

      const { id: orderId, orderNumber, guestAccessToken } = await res.json();

      // Store guest order credentials in browser localStorage for secure My Orders access
      if (isGuest && guestAccessToken) {
        saveGuestOrder({
          orderId,
          orderNumber,
          token: guestAccessToken,
          email: orderEmail,
        });
      }

      if (paymentMethod === "esewa") {
        await initiateEsewaPayment(orderId, total);
      } else if (paymentMethod === "khalti") {
        await initiateKhaltiPayment(orderId, total, orderNumber);
      } else {
        clearCart();
        toast.success("Order placed successfully!");
        const targetUrl = isGuest && guestAccessToken
          ? `/orders/${orderId}?success=true&token=${guestAccessToken}`
          : `/orders/${orderId}?success=true`;
        router.push(targetUrl);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to place order. Please try again.";
      console.error("Order placement failed:", err);
      toast.error(errMsg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const initiateEsewaPayment = async (orderId: string, amount: number) => {
    const response = await fetch("/api/payments/esewa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount }),
    });
    const data = await response.json();
    if (data.formData) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.gatewayUrl;
      Object.entries(data.formData).forEach(([key, val]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(val);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    }
  };

  const initiateKhaltiPayment = async (orderId: string, amount: number, orderNumber: string) => {
    const customerName = user ? (profile?.displayName || user.email) : shippingAddress?.fullName;
    const customerEmail = user?.email || undefined;
    const customerPhone = user ? (profile?.phone || shippingAddress?.phone) : shippingAddress?.phone;

    const response = await fetch("/api/payments/khalti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        amount,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
      }),
    });
    const data = await response.json();
    if (data.payment_url) {
      clearCart();
      window.location.href = data.payment_url;
    } else {
      toast.error("Failed to initiate Khalti payment");
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your order with secure delivery and flexible payment options
          </p>
        </div>
      </div>

      {/* Step Indicator - Only for authenticated users */}
      {user && (
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                    i < step
                      ? "bg-green-500 text-white"
                      : i === step
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    i === step ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mb-4",
                    i < step ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!user ? (
          /* Direct Single-Page Guest Checkout */
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Delivery Address
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-muted/50">
                    Direct Guest Checkout
                  </Badge>
                </div>
                <CardDescription>
                  Enter your name, contact number, and complete delivery address to place your order directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Optional Sign-in Banner for direct unauthenticated buyers */}
                <div className="flex items-center justify-between p-3.5 mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="text-foreground font-medium">
                    Direct purchase — No login or password required.
                  </span>
                  <Link
                    href="/login?redirect=/checkout"
                    className="font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <LogIn className="h-3.5 w-3.5" /> Sign in for saved addresses
                  </Link>
                </div>

                <DirectAddressForm
                  defaultValues={{
                    fullName: shippingAddress?.fullName || "",
                    phone: shippingAddress?.phone || "",
                    address: shippingAddress?.streetAddress || "",
                  }}
                  onSubmit={handleGuestPlaceOrder}
                  isPlacingOrder={isPlacingOrder}
                  total={total}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Left: 3-step flow for authenticated accounts */
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 0: Address */}
              {step === 0 && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" /> Delivery Address
                      </CardTitle>
                      <CardDescription>
                        Confirm or select your delivery address for this order.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Saved addresses for authenticated users */}
                      {profile?.addresses && profile.addresses.length > 0 && (
                        <div className="mb-6">
                          <p className="text-sm font-medium mb-3">Saved Addresses</p>
                          <div className="space-y-2">
                            {profile.addresses.map((addr) => (
                              <div
                                key={addr.id}
                                onClick={() => {
                                  setShippingAddress(addr);
                                  setStep(1);
                                }}
                                className={cn(
                                  "border rounded-lg p-3 cursor-pointer transition-all hover:border-primary",
                                  shippingAddress?.id === addr.id
                                    ? "border-primary bg-primary/5"
                                    : ""
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{addr.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {[
                                        addr.streetAddress,
                                        addr.ward ? `Ward ${addr.ward}` : null,
                                        addr.municipality,
                                        addr.district,
                                        addr.province,
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                  </div>
                                  {addr.isDefault && (
                                    <Badge variant="outline" className="text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <Separator className="my-4" />
                          <p className="text-sm font-medium mb-3">Or enter a new address</p>
                        </div>
                      )}

                      <AddressForm
                        defaultValues={shippingAddress || undefined}
                        onSubmit={handleAddressSubmit}
                        submitLabel="Save & Continue to Payment"
                        requireEmail={false}
                        isGuest={false}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

                {/* Step 1: Payment */}
                {step === 1 && (
                  <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" /> Payment Method
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {PAYMENT_METHODS.map((method) => (
                            <div
                              key={method.id}
                              onClick={() => setPaymentMethod(method.id)}
                              className={cn(
                                "border rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between",
                                paymentMethod === method.id
                                  ? "border-blue-600 bg-blue-50/50 shadow-2xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                              )}
                            >
                              <div className="flex items-center gap-3.5">
                                <div className={cn(
                                  "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                  paymentMethod === method.id ? "border-blue-600 bg-white" : "border-slate-300"
                                )}>
                                  {paymentMethod === method.id && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                  )}
                                </div>
                                
                                <div className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-xl text-white font-extrabold text-sm shadow-2xs shrink-0",
                                  method.bg
                                )}>
                                  {method.logoText}
                                </div>

                                <div>
                                  <p className={cn("font-bold text-sm", method.color)}>{method.label}</p>
                                  <p className="text-xs text-slate-500 font-medium">{method.desc}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Coupon */}
                        <div className="border rounded-xl p-4 space-y-2">
                          <Label className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" /> Apply Coupon
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter coupon code"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className="uppercase"
                            />
                            <Button variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                            </Button>
                          </div>
                          {couponResult?.valid && (
                            <p className="text-xs text-green-600 font-medium">
                              ✓ Coupon applied! You save {formatCurrency(couponResult.discountAmount ?? 0)}
                            </p>
                          )}
                          {couponResult && !couponResult.valid && (
                            <p className="text-xs text-destructive">{couponResult.message}</p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setStep(0)} className="flex-1">← Back</Button>
                          <Button onClick={() => setStep(2)} className="flex-1">Review Order <ChevronRight className="h-4 w-4 ml-1" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Step 2: Review */}
                {step === 2 && shippingAddress && (
                  <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary" /> Review Your Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Address summary */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm">Delivery Address</p>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(0)}>Edit</Button>
                          </div>
                          <p className="text-sm font-medium">{shippingAddress.fullName}</p>
                          <p className="text-sm text-muted-foreground">{shippingAddress.phone}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {[
                              shippingAddress.streetAddress,
                              shippingAddress.ward ? `Ward ${shippingAddress.ward}` : null,
                              shippingAddress.municipality,
                              shippingAddress.district,
                              shippingAddress.province,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {shippingInfo.estimatedDays && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" /> Estimated delivery: {shippingInfo.estimatedDays}
                            </p>
                          )}
                        </div>

                        {/* Payment method */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm">Payment Method</p>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(1)}>Edit</Button>
                          </div>
                          <p className="text-sm font-medium">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
                        </div>

                        {/* Items */}
                        <div>
                          <p className="font-semibold text-sm mb-3">Items ({items.length})</p>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <div key={`${item.productId}-${JSON.stringify(item.variant)}`} className="flex gap-3 items-center">
                                <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  <Image src={item.image || "/images/placeholder.jpg"} alt={item.name} fill className="object-cover" sizes="48px" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                                  {item.variant && (
                                    <p className="text-xs text-muted-foreground">
                                      {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                </div>
                                <p className="text-sm font-semibold flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                          <Button onClick={handlePlaceOrder} className="flex-1 gap-2" disabled={isPlacingOrder}>
                            {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            {isPlacingOrder ? "Placing Order..." : `Place Order • ${formatCurrency(total)}`}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Right: Order Summary */}
          <div>
              <Card className="sticky top-24">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <div key={`${item.productId}-${JSON.stringify(item.variant)}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">
                        {item.name} ×{item.quantity}
                      </span>
                      <span className="font-medium flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className={shippingCharge === 0 ? "text-green-600" : ""}>
                        {shippingCharge === 0 ? "FREE" : formatCurrency(shippingCharge)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon Discount</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                  <div className="text-center text-xs text-muted-foreground pt-1 space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                      <span>100% Secure Checkout</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }