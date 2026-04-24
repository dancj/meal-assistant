export type Store = "safeway" | "aldi";

export type PromoType =
  | "bogo"
  | "multi_buy"
  | "amount_off"
  | "percent_off"
  | "sale";

export interface Deal {
  productName: string;
  brand: string;
  salePrice: string;
  regularPrice: string;
  promoType: PromoType;
  validFrom: string;
  validTo: string;
  store: Store;
}

export interface MerchantConfig {
  token: string;
  displayName: string;
}

export const MERCHANTS: Record<Store, MerchantConfig> = {
  safeway: { token: "safeway", displayName: "Safeway" },
  aldi: { token: "aldi", displayName: "Aldi" },
};

export const STORES: readonly Store[] = ["safeway", "aldi"];

export const DEFAULT_ZIP = "34238";
