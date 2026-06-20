import type { Merchant, SecurityMoneyConfig } from "@/lib/types"
import { CURRENCY_SUFFIX } from "@/lib/constants"

export interface DeliveryChargeBreakdown {
  baseRate: number
  billableExtraKg: number
  extraWeightCharge: number
  total: number
  exceedsMax: boolean
}

/**
 * Delivery charge logic (Phase 2/3 pricing rules):
 * - base rate covers the first `freeWeightKg`
 * - any weight above the free allowance is charged at `extraRatePerKg`,
 *   rounded up to the next whole kg
 * - orders above `maxWeightKg` are rejected
 */
export function calcDeliveryCharge(
  pricing: Pick<
    Merchant,
    "baseRate" | "extraRatePerKg" | "freeWeightKg" | "maxWeightKg"
  >,
  weightKg: number,
): DeliveryChargeBreakdown {
  const exceedsMax = weightKg > pricing.maxWeightKg
  const extraKg = Math.max(0, weightKg - pricing.freeWeightKg)
  const billableExtraKg = Math.ceil(extraKg)
  const extraWeightCharge = billableExtraKg * pricing.extraRatePerKg
  const total = pricing.baseRate + extraWeightCharge
  return {
    baseRate: pricing.baseRate,
    billableExtraKg,
    extraWeightCharge,
    total,
    exceedsMax,
  }
}

export function formatTk(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${CURRENCY_SUFFIX}`
}

/**
 * Security money (platform revenue collected on top of every order):
 * - flat fee for orders at or below the low-value threshold
 * - a percentage of product cost for orders above it
 */
export function calcSecurityMoney(
  config: Pick<
    SecurityMoneyConfig,
    "lowValueThreshold" | "lowValueFlatFee" | "highValuePercentage"
  >,
  productCost: number,
): number {
  if (productCost <= config.lowValueThreshold) {
    return config.lowValueFlatFee
  }
  return (
    Math.round(productCost * (config.highValuePercentage / 100) * 100) / 100
  )
}
