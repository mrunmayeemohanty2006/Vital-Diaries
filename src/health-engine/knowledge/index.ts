/**
 * Local Health Knowledge Registry
 * 
 * Central static registry for bundled health knowledge entries.
 * 100% Client-Side, Deterministic, Static, and Offline-ready.
 */

// CBC
import { hemoglobinKnowledge } from './cbc/hemoglobin';
import { rbcKnowledge } from './cbc/rbc';
import { hematocritKnowledge } from './cbc/hematocrit';
import { mcvKnowledge } from './cbc/mcv';
import { mchKnowledge } from './cbc/mch';
import { mchcKnowledge } from './cbc/mchc';
import { rdwKnowledge } from './cbc/rdw';
import { wbcKnowledge } from './cbc/wbc';
import { neutrophilsKnowledge } from './cbc/neutrophils';
import { lymphocytesKnowledge } from './cbc/lymphocytes';
import { monocytesKnowledge } from './cbc/monocytes';
import { eosinophilsKnowledge } from './cbc/eosinophils';
import { basophilsKnowledge } from './cbc/basophils';
import { plateletsKnowledge } from './cbc/platelets';

// IRON
import { serumIronKnowledge } from './iron/serum-iron';
import { ferritinKnowledge } from './iron/ferritin';
import { tibcKnowledge } from './iron/tibc';
import { uibcKnowledge } from './iron/uibc';
import { transferrinSaturationKnowledge } from './iron/transferrin-saturation';

// VITAMINS
import { vitaminB12Knowledge } from './vitamins/vitamin-b12';
import { folateKnowledge } from './vitamins/folate';
import { vitaminDKnowledge } from './vitamins/vitamin-d';

// METABOLIC
import { fastingGlucoseKnowledge } from './metabolic/fasting-glucose';
import { hba1cKnowledge } from './metabolic/hba1c';
import { calciumKnowledge } from './metabolic/calcium';

// THYROID
import { tshKnowledge } from './thyroid/tsh';

// KIDNEY
import { creatinineKnowledge } from './kidney/creatinine';
import { ureaKnowledge } from './kidney/urea';

import type { HealthKnowledgeEntry } from '../types';

export const BUNDLED_KNOWLEDGE_ENTRIES: Record<string, HealthKnowledgeEntry> = {
  // CBC
  hemoglobin: hemoglobinKnowledge,
  rbc: rbcKnowledge,
  hematocrit: hematocritKnowledge,
  mcv: mcvKnowledge,
  mch: mchKnowledge,
  mchc: mchcKnowledge,
  rdw: rdwKnowledge,
  wbc: wbcKnowledge,
  neutrophils: neutrophilsKnowledge,
  lymphocytes: lymphocytesKnowledge,
  monocytes: monocytesKnowledge,
  eosinophils: eosinophilsKnowledge,
  basophils: basophilsKnowledge,
  platelets: plateletsKnowledge,

  // Iron
  'serum-iron': serumIronKnowledge,
  ferritin: ferritinKnowledge,
  tibc: tibcKnowledge,
  uibc: uibcKnowledge,
  'transferrin-saturation': transferrinSaturationKnowledge,

  // Vitamins
  'vitamin-b12': vitaminB12Knowledge,
  folate: folateKnowledge,
  'vitamin-d': vitaminDKnowledge,

  // Metabolic
  'fasting-glucose': fastingGlucoseKnowledge,
  hba1c: hba1cKnowledge,
  calcium: calciumKnowledge,

  // Thyroid
  tsh: tshKnowledge,

  // Kidney
  creatinine: creatinineKnowledge,
  urea: ureaKnowledge,
};

/**
 * Retrieves a bundled health knowledge entry by canonical ID or alias name.
 * Returns null if no bundled knowledge entry exists for the requested marker.
 */
export function getHealthKnowledgeEntry(nameOrAlias: string): HealthKnowledgeEntry | null {
  if (!nameOrAlias || typeof nameOrAlias !== 'string') return null;

  const normalized = nameOrAlias.trim().toLowerCase();

  // Check direct canonical ID
  if (BUNDLED_KNOWLEDGE_ENTRIES[normalized]) {
    return BUNDLED_KNOWLEDGE_ENTRIES[normalized];
  }

  // Direct mapping shorthand
  const shorthandMap: Record<string, string> = {
    'total rbc': 'rbc',
    'total rbc count': 'rbc',
    'red blood cells': 'rbc',
    'total wbc': 'wbc',
    'total wbc count': 'wbc',
    'white blood cells': 'wbc',
    'platelet count': 'platelets',
    'fasting blood sugar': 'fasting-glucose',
    'fasting blood glucose': 'fasting-glucose',
    'serum calcium': 'calcium',
    'serum iron': 'serum-iron',
    'iron': 'serum-iron',
    'tbc': 'tibc',
    'vitamin d (25-oh)': 'vitamin-d',
    'folate (serum)': 'folate',
    'rdw-cv': 'rdw',
    'hematocrit (pcv)': 'hematocrit',
  };

  if (shorthandMap[normalized] && BUNDLED_KNOWLEDGE_ENTRIES[shorthandMap[normalized]]) {
    return BUNDLED_KNOWLEDGE_ENTRIES[shorthandMap[normalized]];
  }

  // Check aliases across registered entries
  for (const entry of Object.values(BUNDLED_KNOWLEDGE_ENTRIES)) {
    if (entry.id.toLowerCase() === normalized) return entry;
    if (entry.name.toLowerCase() === normalized) return entry;
    if (
      entry.aliases.some(
        (alias) =>
          alias.toLowerCase() === normalized ||
          new RegExp(`(?:^|[\\s_(\\[,.-])${alias.toLowerCase()}(?:[\\s_:=—–\\].,-]|$|(?=\\d))`, 'i').test(normalized)
      )
    ) {
      return entry;
    }
  }

  return null;
}

export {
  hemoglobinKnowledge,
  rbcKnowledge,
  hematocritKnowledge,
  mcvKnowledge,
  mchKnowledge,
  mchcKnowledge,
  rdwKnowledge,
  wbcKnowledge,
  neutrophilsKnowledge,
  lymphocytesKnowledge,
  monocytesKnowledge,
  eosinophilsKnowledge,
  basophilsKnowledge,
  plateletsKnowledge,
  serumIronKnowledge,
  ferritinKnowledge,
  tibcKnowledge,
  uibcKnowledge,
  transferrinSaturationKnowledge,
  vitaminB12Knowledge,
  folateKnowledge,
  vitaminDKnowledge,
  fastingGlucoseKnowledge,
  hba1cKnowledge,
  calciumKnowledge,
  tshKnowledge,
  creatinineKnowledge,
  ureaKnowledge,
};
