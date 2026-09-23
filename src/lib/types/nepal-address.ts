export interface Municipality {
  name: string;
  type: "Metropolitan City" | "Sub-Metropolitan City" | "Municipality" | "Rural Municipality";
  wards: number;
}

export interface District {
  name: string;
  municipalities: Municipality[];
}

export interface Province {
  id: number;
  name: string;
  districts: District[];
}

export interface DeliveryAddress {
  id?: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  province?: string;
  district?: string;
  municipality?: string;
  ward?: number;
  streetAddress: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  districts: string[];
  charge: number;
  freeShippingThreshold?: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface ShippingZoneFormInput {
  name: string;
  districts: string[];
  charge: number;
  freeShippingThreshold?: number;
  estimatedDays: string;
  isActive: boolean;
}
