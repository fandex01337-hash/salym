import { Car, Coffee, Scissors, Store, type LucideIcon } from "lucide-react";
import type { BusinessType } from "@/lib/data/types";

export const BUSINESS_ICONS: Record<BusinessType, LucideIcon> = { beauty: Scissors, cafe: Coffee, shop: Store, auto: Car };
