"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Phone, MapPin, Loader2, Banknote, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { isValidNepaliPhone, formatCurrency } from "@/lib/utils";

const directAddressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => isValidNepaliPhone(val),
      "Please enter a valid 10-digit mobile number starting with 98 or 97"
    ),
  address: z
    .string()
    .trim()
    .min(5, "Please enter your complete delivery address (at least 5 characters)"),
});

export type DirectAddressFormData = z.infer<typeof directAddressSchema>;

interface DirectAddressFormProps {
  defaultValues?: {
    fullName?: string;
    phone?: string;
    address?: string;
  };
  onSubmit: (data: DirectAddressFormData) => Promise<void> | void;
  isPlacingOrder?: boolean;
  total?: number;
  submitLabel?: string;
}

export default function DirectAddressForm({
  defaultValues,
  onSubmit,
  isPlacingOrder = false,
  total,
  submitLabel,
}: DirectAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DirectAddressFormData>({
    resolver: zodResolver(directAddressSchema),
    defaultValues: {
      fullName: defaultValues?.fullName || "",
      phone: defaultValues?.phone || "",
      address: defaultValues?.address || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="direct-fullName" className="text-sm font-medium flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="direct-fullName"
            placeholder="Enter your full name"
            {...register("fullName")}
            aria-invalid={Boolean(errors.fullName)}
            disabled={isPlacingOrder}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="direct-phone" className="text-sm font-medium flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Contact Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="direct-phone"
            type="tel"
            placeholder="Enter your contact number (e.g. 98XXXXXXXX)"
            {...register("phone")}
            aria-invalid={Boolean(errors.phone)}
            disabled={isPlacingOrder}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="direct-address" className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="direct-address"
            rows={3}
            placeholder="Enter your complete delivery address (street, area, landmark, city)"
            {...register("address")}
            aria-invalid={Boolean(errors.address)}
            disabled={isPlacingOrder}
          />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>
      </div>

      {/* Payment Method Section for Direct Checkout */}
      <div className="pt-3 border-t space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Banknote className="h-4 w-4 text-primary" />
          Payment Method
        </Label>
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Pay on Delivery</p>
              <p className="text-xs text-muted-foreground">
                Pay in cash when your order arrives at your doorstep
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold shrink-0">
            Cash on Delivery
          </Badge>
        </div>
      </div>

      {/* Place Order CTA */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPlacingOrder}
          className="w-full h-12 text-base font-semibold gap-2 shadow-sm"
        >
          {isPlacingOrder ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Placing Order...
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              {submitLabel || (total !== undefined ? `Place Order (${formatCurrency(total)})` : "Place Order")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
