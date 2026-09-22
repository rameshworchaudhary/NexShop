"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getProvinceNames,
  getDistrictsByProvince,
  getMunicipalitiesByDistrict,
  getWardCount,
} from "@/lib/constants/nepal-data";
import { isValidNepaliPhone } from "@/lib/utils";
import type { DeliveryAddress } from "@/lib/types/nepal-address";

const createAddressSchema = (requireEmail: boolean) =>
  z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: requireEmail
      ? z.string().min(1, "Email address is required for guest checkout").email("Please enter a valid email address")
      : z.string().email("Please enter a valid email address").optional().or(z.literal("")),
    phone: z.string().refine(isValidNepaliPhone, "Enter a valid Nepali phone number (98XXXXXXXX)"),
    alternatePhone: z
      .string()
      .optional()
      .refine((v) => !v || isValidNepaliPhone(v), "Enter a valid Nepali phone number"),
    province: z.string().min(1, "Province is required"),
    district: z.string().min(1, "District is required"),
    municipality: z.string().min(1, "Municipality is required"),
    ward: z.coerce.number().min(1, "Ward number is required"),
    streetAddress: z.string().min(5, "Street address is required"),
    landmark: z.string().optional(),
    isDefault: z.boolean().default(false),
  });

export type AddressFormData = {
  fullName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  province: string;
  district: string;
  municipality: string;
  ward: number;
  streetAddress: string;
  landmark?: string;
  isDefault: boolean;
};

interface AddressFormProps {
  defaultValues?: Partial<DeliveryAddress & { email?: string }>;
  onSubmit: (data: AddressFormData) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
  requireEmail?: boolean;
  isGuest?: boolean;
}

export default function AddressForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Address",
  onCancel,
  requireEmail = false,
  isGuest = false,
}: AddressFormProps) {
  const [selectedProvince, setSelectedProvince] = useState(defaultValues?.province || "");
  const [selectedDistrict, setSelectedDistrict] = useState(defaultValues?.district || "");
  const [selectedMunicipality, setSelectedMunicipality] = useState(defaultValues?.municipality || "");
  const [maxWards, setMaxWards] = useState(15);

  const provinces = getProvinceNames();
  const districts = selectedProvince ? getDistrictsByProvince(selectedProvince) : [];
  const municipalities = selectedDistrict ? getMunicipalitiesByDistrict(selectedDistrict) : [];

  const formSchema = React.useMemo(() => createAddressSchema(requireEmail), [requireEmail]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<AddressFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: defaultValues?.fullName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      alternatePhone: defaultValues?.alternatePhone || "",
      province: defaultValues?.province || "",
      district: defaultValues?.district || "",
      municipality: defaultValues?.municipality || "",
      ward: defaultValues?.ward || 1,
      streetAddress: defaultValues?.streetAddress || "",
      landmark: defaultValues?.landmark || "",
      isDefault: defaultValues?.isDefault || false,
    },
  });

  useEffect(() => {
    if (selectedDistrict && selectedMunicipality) {
      const count = getWardCount(selectedDistrict, selectedMunicipality);
      setMaxWards(count);
    }
  }, [selectedDistrict, selectedMunicipality]);

  const handleProvinceChange = (val: string) => {
    setSelectedProvince(val);
    setSelectedDistrict("");
    setSelectedMunicipality("");
    setValue("province", val);
    setValue("district", "");
    setValue("municipality", "");
    setValue("ward", 1);
  };

  const handleDistrictChange = (val: string) => {
    setSelectedDistrict(val);
    setSelectedMunicipality("");
    setValue("district", val);
    setValue("municipality", "");
    setValue("ward", 1);
  };

  const handleMunicipalityChange = (val: string) => {
    setSelectedMunicipality(val);
    setValue("municipality", val);
    setValue("ward", 1);
    const count = getWardCount(selectedDistrict, val);
    setMaxWards(count);
  };

  const isDefault = watch("isDefault");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Full Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" placeholder="Hari Prasad Sharma" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" placeholder="98XXXXXXXX" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      {requireEmail && (
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="customer@example.com"
            {...register("email")}
          />
          <p className="text-xs text-muted-foreground">
            Order confirmation, receipt, and tracking details will be sent to this email.
          </p>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="alternatePhone">Alternate Phone (Optional)</Label>
        <Input id="alternatePhone" placeholder="97XXXXXXXX" {...register("alternatePhone")} />
        {errors.alternatePhone && <p className="text-xs text-destructive">{errors.alternatePhone.message}</p>}
      </div>

      {/* Province */}
      <div className="space-y-1.5">
        <Label>Province *</Label>
        <Select value={selectedProvince} onValueChange={handleProvinceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.province && <p className="text-xs text-destructive">{errors.province.message}</p>}
      </div>

      {/* District */}
      <div className="space-y-1.5">
        <Label>District *</Label>
        <Select value={selectedDistrict} onValueChange={handleDistrictChange} disabled={!selectedProvince}>
          <SelectTrigger>
            <SelectValue placeholder={selectedProvince ? "Select District" : "Select Province first"} />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.district && <p className="text-xs text-destructive">{errors.district.message}</p>}
      </div>

      {/* Municipality */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Municipality / VDC *</Label>
          <Select value={selectedMunicipality} onValueChange={handleMunicipalityChange} disabled={!selectedDistrict}>
            <SelectTrigger>
              <SelectValue placeholder={selectedDistrict ? "Select Municipality" : "Select District first"} />
            </SelectTrigger>
            <SelectContent>
              {municipalities.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.municipality && <p className="text-xs text-destructive">{errors.municipality.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ward">Ward Number *</Label>
          <Select
            value={String(watch("ward") || 1)}
            onValueChange={(v) => setValue("ward", Number(v))}
            disabled={!selectedMunicipality}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Ward" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxWards }, (_, i) => i + 1).map((w) => (
                <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ward && <p className="text-xs text-destructive">{errors.ward.message}</p>}
        </div>
      </div>

      {/* Street Address */}
      <div className="space-y-1.5">
        <Label htmlFor="streetAddress">Street Address / Tole *</Label>
        <Input id="streetAddress" placeholder="House No., Street Name, Tole" {...register("streetAddress")} />
        {errors.streetAddress && <p className="text-xs text-destructive">{errors.streetAddress.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="landmark">Nearest Landmark (Optional)</Label>
        <Input id="landmark" placeholder="Near temple, school, etc." {...register("landmark")} />
      </div>

      {/* Default checkbox */}
      {!isGuest && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="isDefault"
            checked={isDefault}
            onCheckedChange={(v) => setValue("isDefault", Boolean(v))}
          />
          <Label htmlFor="isDefault" className="cursor-pointer">Set as default address</Label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
