export const MIN_CONTEXT_PRUNE_TOKENS = 100_000;
export const MAX_CONTEXT_PRUNE_TOKENS = 1_000_000;

export function validatePruneThresholds({ trigger, target }) {
  const normalizedTrigger = Number(trigger);
  const normalizedTarget = Number(target);

  if (
    !Number.isInteger(normalizedTrigger) ||
    !Number.isInteger(normalizedTarget) ||
    normalizedTrigger < MIN_CONTEXT_PRUNE_TOKENS ||
    normalizedTarget < MIN_CONTEXT_PRUNE_TOKENS ||
    normalizedTrigger > MAX_CONTEXT_PRUNE_TOKENS ||
    normalizedTarget > MAX_CONTEXT_PRUNE_TOKENS
  ) {
    return {
      valid: false,
      error: `Thresholds must be between ${MIN_CONTEXT_PRUNE_TOKENS} and ${MAX_CONTEXT_PRUNE_TOKENS} tokens`,
    };
  }

  if (normalizedTarget > normalizedTrigger) {
    return {
      valid: false,
      error: "Target tokens must be less than or equal to trigger tokens",
    };
  }

  return { valid: true, trigger: normalizedTrigger, target: normalizedTarget };
}
