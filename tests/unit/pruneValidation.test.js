import { describe, expect, it } from "vitest";
import { validatePruneThresholds } from "../../src/lib/pruneValidation.js";

describe("validatePruneThresholds", () => {
  it("accepts valid trigger and target thresholds", () => {
    expect(validatePruneThresholds({ trigger: 850_000, target: 800_000 })).toEqual({
      valid: true,
      trigger: 850_000,
      target: 800_000,
    });
  });

  it("accepts target equal to trigger", () => {
    expect(validatePruneThresholds({ trigger: 850_000, target: 850_000 })).toEqual({
      valid: true,
      trigger: 850_000,
      target: 850_000,
    });
  });

  it("rejects target greater than trigger", () => {
    expect(validatePruneThresholds({ trigger: 800_000, target: 850_000 })).toEqual({
      valid: false,
      error: "Target tokens must be less than or equal to trigger tokens",
    });
  });

  it("rejects thresholds below 100,000 or above 1,000,000", () => {
    expect(validatePruneThresholds({ trigger: 50_000, target: 40_000 })).toEqual({
      valid: false,
      error: "Thresholds must be between 100000 and 1000000 tokens",
    });
    expect(validatePruneThresholds({ trigger: 1_100_000, target: 800_000 })).toEqual({
      valid: false,
      error: "Thresholds must be between 100000 and 1000000 tokens",
    });
  });
});
