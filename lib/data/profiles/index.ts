import type { BusinessType } from "../types";
import type { Profile } from "./types";
import { beauty } from "./beauty";
import { cafe } from "./cafe";
import { shop } from "./shop";
import { auto } from "./auto";

export const PROFILES: Record<BusinessType, Profile> = { beauty, cafe, shop, auto };

export const BUSINESS_TYPES: BusinessType[] = ["beauty", "cafe", "shop", "auto"];

export type { Profile };
