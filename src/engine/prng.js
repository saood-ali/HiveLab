/**
 * Deterministic Pseudo-Random Number Generator (PRNG) for HiveLab.
 * Uses the Mulberry32 algorithm: fast, high quality, 32-bit state, fully serializable.
 *
 * Provides:
 * - next(): float in [0, 1)
 * - nextRange(min, max): float in [min, max]
 * - nextInt(min, max): integer in [min, max] (inclusive)
 * - nextPhi(): float in [-1, 1] for ABC perturbation
 * - getState(): serializable internal state for rewind / history
 * - setState(state): restores state exactly
 */

export class PRNG {
  /**
   * @param {number} seed - Any 32-bit integer
   */
  constructor(seed = 42) {
    this.initialSeed = seed;
    this.state = seed >>> 0; // force unsigned 32-bit
    this.drawCount = 0;
  }

  /**
   * Produce next 32-bit pseudo-random float in [0, 1).
   * Mulberry32 algorithm.
   */
  next() {
    this.drawCount++;
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Random float in [min, max).
   */
  nextRange(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Random integer in [min, max] inclusive.
   */
  nextInt(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }

  /**
   * Random phi parameter in [-1, 1] used in ABC equation:
   * x'_mi = x_mi + phi * (x_mi - x_ki)
   */
  nextPhi() {
    return this.nextRange(-1, 1);
  }

  /**
   * Export snapshot of PRNG state.
   */
  getState() {
    return {
      state: this.state,
      drawCount: this.drawCount,
      initialSeed: this.initialSeed,
    };
  }

  /**
   * Restore PRNG from saved state.
   */
  setState(saved) {
    this.state = saved.state >>> 0;
    this.drawCount = saved.drawCount;
    this.initialSeed = saved.initialSeed;
  }

  /**
   * Reset PRNG back to initial seed.
   */
  reset() {
    this.state = this.initialSeed >>> 0;
    this.drawCount = 0;
  }
}
