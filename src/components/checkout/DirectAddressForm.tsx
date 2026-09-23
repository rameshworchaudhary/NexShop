"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isValidNepaliPhone } from "@/lib/utils";

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
  submitLabel?: string;
}

export default function DirectAddressForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save & Continue to Payment",
}: DirectAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DirectAddressFormData>({
    resolver: zodResolver(directAddressSchema),
    defaultValues: {
      fullName: defaultValues?.fullName || "",
      phone: defaultValues?.phone || "",
      address: defaultValues?.address || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="direct-fullName" className="text-sm font-medium flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="direct-fullName"
          placeholder="Enter your full name"
          {...register("fullName")}
          aria-invalid={Boolean(errors.fullName)}
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
          placeholder="Enter your contact number"
          {...register("phone")}
          aria-invalid={Boolean(errors.phone)}
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
          placeholder="Enter your complete delivery address"
          {...register("address")}
          aria-invalid={Boolean(errors.address)}
        />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
          {submitLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
