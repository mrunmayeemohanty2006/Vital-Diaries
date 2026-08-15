/**
 * OCR Noise Injection Engine
 * Vital Diaries — Phase 2: Dataset Creation
 *
 * Applies controlled, realistic OCR-like corruption to synthetic text.
 *
 * Rules:
 *  - Noise is probabilistic, NOT deterministic — same text with same seed
 *    produces the same corrupted output (reproducible).
 *  - We do NOT corrupt every character — that would be unrealistic.
 *  - Noise is parameterised so each report can have a different noise level.
 *  - Ground truth is always generated from the CLEAN text, so corruption
 *    only affects `ocr_text`, never `clean_text` or `ground_truth`.
 */

import type { NoiseConfig, NoiseLevel } from '../schemas/dataset.types';

// ─────────────────────────────────────────────────────────────────────────────
// NOISE PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const NOISE_PRESETS: Record<NoiseLevel, NoiseConfig> = {
  none: {
    level: 'none',
    char_substitution_prob: 0,
    extra_space_prob: 0,
    missing_space_prob: 0,
    pipe_injection_prob: 0,
    char_deletion_prob: 0,
    char_duplication_prob: 0,
  },
  low: {
    level: 'low',
    char_substitution_prob: 0.01,   // ~1 substitution per 100 characters
    extra_space_prob: 0.02,
    missing_space_prob: 0.01,
    pipe_injection_prob: 0.005,
    char_deletion_prob: 0.005,
    char_duplication_prob: 0.005,
  },
  medium: {
    level: 'medium',
    char_substitution_prob: 0.03,
    extra_space_prob: 0.04,
    missing_space_prob: 0.02,
    pipe_injection_prob: 0.015,
    char_deletion_prob: 0.015,
    char_duplication_prob: 0.01,
  },
  high: {
    level: 'high',
    char_substitution_prob: 0.07,
    extra_space_prob: 0.06,
    missing_space_prob: 0.04,
    pipe_injection_prob: 0.03,
    char_deletion_prob: 0.025,
    char_duplication_prob: 0.02,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VISUALLY SIMILAR CHARACTER SUBSTITUTIONS
// OCR scanners commonly confuse these pairs.
// ─────────────────────────────────────────────────────────────────────────────

const CHAR_SUBSTITUTIONS: Record<string, string[]> = {
  // Lowercase
  'l': ['1', 'I', '|'],
  'o': ['0', 'O'],
  'i': ['1', 'l'],
  'e': ['3'],
  'a': ['@'],
  's': ['5'],
  'g': ['9'],
  // Uppercase
  'O': ['0', 'o'],
  'I': ['l', '1', '|'],
  'L': ['l', '1'],
  'S': ['5'],
  'G': ['6'],
  'B': ['8'],
  // Digits
  '0': ['O', 'o'],
  '1': ['l', 'I', '|'],
  '5': ['S', 's'],
};

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE SEEDED PRNG (Mulberry32)
// Allows reproducible noise without external libraries.
// ─────────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN NOISE INJECTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies OCR-like noise to `cleanText` using the provided config and seed.
 *
 * @param cleanText - The text before noise injection
 * @param config    - Noise configuration (probabilities)
 * @param seed      - Integer seed for reproducible PRNG
 * @returns         - Corrupted text (may equal cleanText when config is 'none')
 */
export function injectNoise(cleanText: string, config: NoiseConfig, seed: number): string {
  if (config.level === 'none') return cleanText;

  const rand = mulberry32(seed);
  const chars = cleanText.split('');
  const result: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    let emitted = false;

    // 1. Character substitution (visually similar OCR swap)
    if (rand() < config.char_substitution_prob) {
      const subs = CHAR_SUBSTITUTIONS[ch];
      if (subs && subs.length > 0) {
        result.push(subs[Math.floor(rand() * subs.length)]);
        emitted = true;
      }
    }

    // 2. Character deletion (skip entirely)
    if (!emitted && rand() < config.char_deletion_prob) {
      // Skip character — do not push anything
      i++;
      continue;
    }

    // 3. Character duplication (push character twice)
    if (!emitted) {
      result.push(ch);
      if (rand() < config.char_duplication_prob) {
        result.push(ch); // duplicate
      }
      emitted = true;
    }

    // 4. Extra space insertion (after a non-space character)
    if (ch !== ' ' && rand() < config.extra_space_prob) {
      result.push(' ');
    }

    // 5. Pipe injection (breaks word visually — common OCR artifact)
    if (ch !== ' ' && rand() < config.pipe_injection_prob) {
      result.push('|');
    }

    i++;
  }

  // 6. Missing space: collapse accidental double-spaces introduced elsewhere,
  //    OR randomly merge a space character with the next character.
  let text = result.join('');
  if (config.missing_space_prob > 0) {
    // Walk through spaces and occasionally remove them
    text = text.replace(/ /g, (match) => {
      return rand() < config.missing_space_prob ? '' : match;
    });
  }

  return text;
}

/**
 * Convenience wrapper: apply a named noise preset to text.
 *
 * @param cleanText  - Source text
 * @param level      - Noise level ('none' | 'low' | 'medium' | 'high')
 * @param seed       - Reproducibility seed
 */
export function applyNoisePreset(cleanText: string, level: NoiseLevel, seed: number): string {
  return injectNoise(cleanText, NOISE_PRESETS[level], seed);
}
