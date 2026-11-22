/**
 * Parameter validation for ABC algorithm settings.
 * Pure functions — no React, no side effects.
 *
 * Rules from ALGORITHM_SPEC.md:
 *   - S must be a positive even integer ≥ 2.
 *   - Np = S / 2 is derived (never entered separately).
 *   - T must be a positive integer ≥ 1.
 *   - limit must be a non-negative integer ≥ 0.
 *   - Bounds: lower[i] < upper[i] for all dimensions.
 *   - seed: any integer (0 is valid).
 */

/**
 * Validate colony size S.
 * Returns { valid: boolean, error: string|null, derived: { Np } }
 */
export function validateS(raw) {
  const val = Number(raw);
  if (!Number.isFinite(val))
    return { valid: false, error: 'Colony size must be a number.', derived: null };
  if (!Number.isInteger(val))
    return { valid: false, error: 'Colony size must be a whole number.', derived: null };
  if (val < 2)
    return { valid: false, error: 'Colony size must be at least 2.', derived: null };
  if (val % 2 !== 0)
    return { valid: false, error: `Colony size must be even (you entered ${val}). Try ${val + 1}.`, derived: null };
  return { valid: true, error: null, derived: { Np: val / 2 } };
}

/**
 * Validate maximum cycles T.
 */
export function validateT(raw) {
  const val = Number(raw);
  if (!Number.isFinite(val))
    return { valid: false, error: 'Max cycles must be a number.' };
  if (!Number.isInteger(val))
    return { valid: false, error: 'Max cycles must be a whole number.' };
  if (val < 1)
    return { valid: false, error: 'Max cycles must be at least 1.' };
  if (val > 1000)
    return { valid: false, error: 'Max cycles must be ≤ 1000 for browser performance.' };
  return { valid: true, error: null };
}

/**
 * Validate abandonment limit.
 */
export function validateLimit(raw) {
  const val = Number(raw);
  if (!Number.isFinite(val))
    return { valid: false, error: 'Limit must be a number.' };
  if (!Number.isInteger(val))
    return { valid: false, error: 'Limit must be a whole number.' };
  if (val < 0)
    return { valid: false, error: 'Limit must be 0 or greater.' };
  return { valid: true, error: null };
}

/**
 * Validate a pair of bounds [lower, upper] for one dimension.
 */
export function validateBounds(lower, upper, dimName = 'variable') {
  const lo = Number(lower);
  const hi = Number(upper);
  if (!Number.isFinite(lo) || !Number.isFinite(hi))
    return { valid: false, error: `Bounds for ${dimName} must be numbers.` };
  if (lo >= hi)
    return { valid: false, error: `Lower bound must be strictly less than upper bound for ${dimName}.` };
  return { valid: true, error: null };
}

/**
 * Validate random seed — any integer is valid.
 */
export function validateSeed(raw) {
  const val = Number(raw);
  if (!Number.isFinite(val))
    return { valid: false, error: 'Seed must be a number.' };
  if (!Number.isInteger(val))
    return { valid: false, error: 'Seed must be a whole number.' };
  return { valid: true, error: null };
}

/**
 * Validate all parameters at once and return a map of field → error.
 * Returns null for a field if it is valid.
 * Also returns derived values when valid.
 */
export function validateAll({ S, T, limit, seed, bounds }) {
  const sResult = validateS(S);
  const tResult = validateT(T);
  const lResult = validateLimit(limit);
  const seedResult = validateSeed(seed);

  const boundsErrors = bounds.map(([lo, hi], idx) =>
    validateBounds(lo, hi, `x${idx + 1}`)
  );

  const errors = {
    S: sResult.error,
    T: tResult.error,
    limit: lResult.error,
    seed: seedResult.error,
    bounds: boundsErrors.map((r) => r.error),
  };

  const hasErrors =
    !sResult.valid ||
    !tResult.valid ||
    !lResult.valid ||
    !seedResult.valid ||
    boundsErrors.some((r) => !r.valid);

  return {
    errors,
    valid: !hasErrors,
    derived: sResult.valid ? sResult.derived : null,
  };
}
