import { describe, expect, it } from "vitest"
import { calcDeliveryCharge, calcSecurityMoney, formatTk } from "@/lib/pricing"

describe("calcDeliveryCharge", () => {
  const base = {
    baseRate: 60,
    extraRatePerKg: 20,
    freeWeightKg: 2,
    maxWeightKg: 30,
  }

  it("returns base rate only when weight is within free allowance", () => {
    const result = calcDeliveryCharge(base, 1)
    expect(result).toEqual({
      baseRate: 60,
      billableExtraKg: 0,
      extraWeightCharge: 0,
      total: 60,
      exceedsMax: false,
    })
  })

  it("charges for extra weight above free allowance", () => {
    const result = calcDeliveryCharge(base, 5)
    expect(result.billableExtraKg).toBe(3)
    expect(result.extraWeightCharge).toBe(60)
    expect(result.total).toBe(120)
    expect(result.exceedsMax).toBe(false)
  })

  it("rounds up partial extra kg", () => {
    const result = calcDeliveryCharge(base, 3.1)
    expect(result.billableExtraKg).toBe(2)
    expect(result.extraWeightCharge).toBe(40)
  })

  it("marks exceedsMax when weight exceeds max", () => {
    const result = calcDeliveryCharge(base, 31)
    expect(result.exceedsMax).toBe(true)
  })

  it("handles zero weight", () => {
    const result = calcDeliveryCharge(base, 0)
    expect(result.total).toBe(60)
    expect(result.billableExtraKg).toBe(0)
  })

  it("handles weight exactly at free allowance", () => {
    const result = calcDeliveryCharge(base, 2)
    expect(result.billableExtraKg).toBe(0)
    expect(result.total).toBe(60)
  })

  it("handles weight exactly at max", () => {
    const result = calcDeliveryCharge(base, 30)
    expect(result.exceedsMax).toBe(false)
    expect(result.billableExtraKg).toBe(28)
    expect(result.total).toBe(620)
  })
})

describe("formatTk", () => {
  it("formats whole numbers", () => {
    expect(formatTk(1234)).toBe("1,234 TK")
  })

  it("formats decimals with up to 2 places", () => {
    expect(formatTk(1234.5)).toBe("1,234.5 TK")
    expect(formatTk(1234.56)).toBe("1,234.56 TK")
    expect(formatTk(1234.567)).toBe("1,234.57 TK")
  })

  it("formats zero", () => {
    expect(formatTk(0)).toBe("0 TK")
  })
})

describe("calcSecurityMoney", () => {
  const config = {
    lowValueThreshold: 500,
    lowValueFlatFee: 30,
    highValuePercentage: 2,
  }

  it("returns flat fee when product cost is below threshold", () => {
    expect(calcSecurityMoney(config, 100)).toBe(30)
  })

  it("returns flat fee when product cost equals threshold", () => {
    expect(calcSecurityMoney(config, 500)).toBe(30)
  })

  it("returns percentage when product cost exceeds threshold", () => {
    expect(calcSecurityMoney(config, 1000)).toBe(20)
  })

  it("rounds percentage result to 2 decimal places", () => {
    expect(calcSecurityMoney(config, 1234)).toBe(24.68)
  })

  it("handles zero product cost", () => {
    expect(calcSecurityMoney(config, 0)).toBe(30)
  })
})
