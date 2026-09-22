"use client";

import React from "react";
import { CheckCircle2, Clock, PackageCheck, Truck, Home, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types/order";

interface OrderTimelineProps {
  order: Order;
}

interface StepConfig {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_FLOW: StepConfig[] = [
  {
    status: "pending",
    label: "Order Placed",
    description: "We have received your order and payment verification.",
    icon: Clock,
  },
  {
    status: "confirmed",
    label: "Order Confirmed",
    description: "Seller has accepted and confirmed your items.",
    icon: CheckCircle2,
  },
  {
    status: "processing",
    label: "Preparing for Dispatch",
    description: "Your package is being carefully packed and quality checked.",
    icon: PackageCheck,
  },
  {
    status: "shipped",
    label: "Shipped",
    description: "Your package has left the fulfillment facility and is in transit.",
    icon: Truck,
  },
  {
    status: "out-for-delivery",
    label: "Out for Delivery",
    description: "Delivery executive is en route with your package.",
    icon: Truck,
  },
  {
    status: "delivered",
    label: "Delivered",
    description: "Package was safely delivered to your doorstep.",
    icon: Home,
  },
];

export default function OrderTimeline({ order }: OrderTimelineProps) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-start gap-3.5 p-4 bg-red-50/80 rounded-xl border border-red-200 text-red-900">
        <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-red-800">Order Cancelled</p>
          <p className="text-xs text-red-700 leading-relaxed">
            {order.statusHistory[order.statusHistory.length - 1]?.note ||
              "This order has been cancelled. Any pre-paid balance will be refunded per policy."}
          </p>
        </div>
      </div>
    );
  }

  if (order.status === "returned") {
    return (
      <div className="flex items-start gap-3.5 p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900">
        <RotateCcw className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-amber-800">Order Returned</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {order.statusHistory[order.statusHistory.length - 1]?.note ||
              "This order was marked as returned and is being processed by our return inspection team."}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.findIndex((s) => s.status === order.status);

  return (
    <div className="space-y-6">
      {/* Amazon-style Milestone Header Banner */}
      <div className="rounded-xl p-4 border bg-gradient-to-r from-emerald-50/60 to-blue-50/40 border-emerald-200/60 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Tracking Status
          </p>
          <h3 className="text-base font-bold text-foreground">
            {order.status === "delivered"
              ? "Package Delivered"
              : order.status === "out-for-delivery"
              ? "Out for Delivery Today"
              : order.status === "shipped"
              ? "On the Way (Shipped)"
              : order.status === "processing"
              ? "Preparing for Shipment"
              : order.status === "confirmed"
              ? "Order Confirmed"
              : "Order Placed & Processing"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {order.status === "delivered"
              ? "Your package has been delivered."
              : "Estimated delivery: 3 to 7 business days"}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          {order.status === "delivered" ? (
            <Home className="h-5 w-5" />
          ) : order.status === "shipped" || order.status === "out-for-delivery" ? (
            <Truck className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Vertical Tracking Stepper */}
      <div className="relative pl-1 pr-2">
        {STATUS_FLOW.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const historyEntry = order.statusHistory?.find((h) => h.status === step.status);
          const Icon = step.icon;

          return (
            <div key={step.status} className="relative flex items-start gap-4 pb-7 last:pb-0">
              {/* Connecting Line */}
              {index < STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[17px] top-[34px] bottom-0 w-[2px] transition-colors duration-300",
                    index < currentIndex ? "bg-emerald-600" : "bg-muted"
                  )}
                />
              )}

              {/* Node Indicator */}
              <div className="relative z-10 flex items-center justify-center shrink-0">
                {isComplete ? (
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : isCurrent ? (
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center ring-4 ring-primary/20 shadow-xs animate-pulse">
                    <Icon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      isCurrent ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Current Step
                    </span>
                  )}
                  {isComplete && (
                    <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
                      Completed
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {historyEntry?.note || step.description}
                </p>

                {historyEntry && (
                  <p className="text-[11px] font-medium text-foreground/70 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatDateTime(historyEntry.timestamp)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

