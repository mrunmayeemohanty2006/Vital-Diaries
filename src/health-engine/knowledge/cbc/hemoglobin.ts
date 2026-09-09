/**
 * Curated Local Health Knowledge Base: Hemoglobin (CBC)
 * 
 * Sourced from reviewed NIH, MedlinePlus, and NHLBI clinical references.
 * 100% Static, Deterministic, and Offline-ready.
 * 
 * Medical Content Rules:
 * - Purely informative & non-diagnostic.
 * - Uses probabilistic phrasing: "can be associated with", "may occur with".
 * - Never presents a single test result as a definitive medical diagnosis.
 */

import type { HealthKnowledgeEntry } from '../../types';

export const hemoglobinKnowledge: HealthKnowledgeEntry = {
  id: 'hemoglobin',
  name: 'Hemoglobin',
  aliases: ['Hb', 'HGB', 'Haemoglobin', 'Hemoglobin'],
  category: 'cbc',

  about: {
    description:
      'Hemoglobin is an iron-rich protein found inside red blood cells responsible for carrying oxygen from the lungs throughout the body and transporting carbon dioxide back to the lungs.',
    whatItMeasures:
      'The concentration of hemoglobin protein in whole blood, representing the blood’s total oxygen-carrying capacity.',
    whyItIsTested:
      'Evaluated as part of a routine Complete Blood Count (CBC) to check general cellular health, assess for potential anemias, monitor chronic conditions, or evaluate symptoms like fatigue or shortness of breath.',
  },

  units: ['g/dL', 'g/L', 'gm/dL', 'g%'],
  primaryUnit: 'g/dL',

  interpretations: {
    low: {
      title: 'Hemoglobin Result Below Laboratory Reference Interval',
      meaning:
        'A hemoglobin measurement below the reporting laboratory’s reference range indicates that red blood cells contain less oxygen-carrying capacity than expected for that reference population. A single lower-than-reference result is not a definitive diagnosis on its own and is typically interpreted in context with red cell indices (MCV, MCH), ferritin, and clinical history.',
      possibleAssociations: [
        'Iron deficiency (diminished iron stores for hemoglobin synthesis)',
        'Nutritional deficiencies involving Vitamin B12 or Folate',
        'Recent acute blood loss or ongoing micro-blood loss (e.g., gastrointestinal, heavy menstrual cycles)',
        'Anemia of chronic disease (e.g., chronic kidney disease, inflammatory conditions)',
        'Bone marrow or production conditions affecting red cell generation',
        'Hemolytic conditions where red cells are broken down more rapidly than normal',
      ],
      nutrition: [
        'Focus on iron-rich foods, including lentils, beans, spinach, fortified grains, pumpkin seeds, and lean meats, as appropriate for your dietary preferences.',
        'Pair plant-based (non-heme) iron sources with vitamin C rich foods (citrus fruits, bell peppers, tomatoes, strawberries) to enhance absorption.',
        'Separate calcium supplements or strong black tea/coffee from iron-rich meals, as tannins and excess calcium can temporarily reduce iron uptake.',
        'Include dietary sources of vitamin B12 (eggs, dairy, fish, fortified plant milks) and folate (leafy greens, asparagus, legumes).',
      ],
      lifestyle: [
        'Allow adequate rest and pacing during physical exertion if experiencing fatigue or lower stamina.',
        'Maintain consistent hydration throughout the day.',
        'Track daily energy levels and any patterns in fatigue to share with your healthcare provider.',
      ],
      cautions: [
        'Do not self-prescribe high-dose iron supplements without medical supervision and ferritin testing, as unneeded iron accumulation can cause adverse health effects.',
        'Avoid intense unaccustomed endurance workouts until your doctor evaluates the cause of low hemoglobin.',
      ],
      monitoring: [
        'Complete Blood Count (CBC) follow-up as recommended by your physician.',
        'Serum Ferritin and Iron Saturation / TIBC testing to assess storage reserves.',
        'Reticulocyte count or Vitamin B12/Folate levels if recommended by your clinician.',
      ],
      whenToSeekPromptCare: [
        'Sudden, severe shortness of breath or chest discomfort',
        'Unexplained fainting, severe dizziness, or lightheadedness upon standing',
        'Noticeable rapid or irregular heart rate (palpitations) at rest',
        'Signs of acute bleeding, black tarry stools, or unusual bruising',
      ],
      sourceIds: ['medlineplus-hemoglobin-test', 'nhlbi-anemia-overview', 'medlineplus-anemia'],
    },

    normal: {
      title: 'Hemoglobin Result Within Laboratory Reference Interval',
      meaning:
        'A hemoglobin measurement within the reporting laboratory’s reference range reflects expected oxygen-carrying capacity for red blood cells in that laboratory’s reference population.',
      possibleAssociations: [
        'Adequate red blood cell production and oxygen-carrying capacity',
        'Balanced nutritional intake of iron, vitamin B12, and folate',
        'Normal bone marrow erythropoiesis',
      ],
      nutrition: [
        'Maintain a balanced, nutrient-dense diet containing diverse whole foods, leafy greens, legumes, and lean proteins.',
        'Ensure steady intake of essential micronutrients including iron, copper, and B vitamins.',
      ],
      lifestyle: [
        'Continue regular cardiovascular exercise and physical activity to support circulation and cardiovascular health.',
        'Stay well hydrated before and after physical exertion.',
      ],
      cautions: [
        'Reference ranges reflect general populations; specific personal targets can vary with high-altitude residence, pregnancy, or athletic training.',
      ],
      monitoring: [
        'Periodic wellness screening and routine Complete Blood Count (CBC) during regular checkups.',
      ],
      sourceIds: ['medlineplus-hemoglobin-test', 'nhlbi-blood-tests'],
    },

    high: {
      title: 'Hemoglobin Result Above Laboratory Reference Interval',
      meaning:
        'A hemoglobin measurement above the reporting laboratory’s reference range indicates a higher concentration of hemoglobin in whole blood than expected. This can occur either from increased red cell mass or from decreased plasma volume (hemoconcentration).',
      possibleAssociations: [
        'Dehydration or reduced fluid intake (causing relative hemoconcentration)',
        'Physiological adaptation to high altitude (low atmospheric oxygen)',
        'Chronic exposure to carbon monoxide (e.g., cigarette smoking)',
        'Chronic respiratory or pulmonary conditions (e.g., COPD, sleep apnea)',
        'Cardiovascular conditions with chronic mild hypoxemia',
        'Rare bone marrow conditions resulting in overproduction of red blood cells (such as polycythemia vera)',
      ],
      nutrition: [
        'Ensure consistent, optimal daily water intake, particularly in warm environments or during exercise.',
        'Limit excessive alcohol and highly caffeinated beverages if they contribute to dehydration.',
      ],
      lifestyle: [
        'If smoking or using tobacco products, discuss cessation support with a healthcare professional.',
        'Evaluate sleep quality and screen for sleep apnea if morning headaches or loud snoring are present.',
        'Avoid unprescribed erythropoietin (EPO) or anabolic performance substances.',
      ],
      cautions: [
        'Elevated blood viscosity can place additional strain on the circulatory system; discuss high readings with your doctor.',
      ],
      monitoring: [
        'Repeat CBC with differential after ensuring proper hydration status.',
        'Pulse oximetry or arterial oxygen evaluation if pulmonary symptoms exist.',
        'Assessment of hematocrit and red blood cell count alongside hemoglobin.',
      ],
      whenToSeekPromptCare: [
        'Sudden severe headache, visual changes, or unexplained neurological symptoms',
        'Shortness of breath, chest pain, or sudden localized leg swelling/pain',
      ],
      sourceIds: ['medlineplus-hemoglobin-test', 'nhlbi-blood-tests'],
    },
  },

  relatedMetrics: [
    'Hematocrit (HCT)',
    'Red Blood Cell Count (RBC)',
    'Mean Corpuscular Volume (MCV)',
    'Mean Corpuscular Hemoglobin (MCH)',
    'Serum Ferritin',
    'Total Iron Binding Capacity (TIBC)',
    'Vitamin B12',
    'Folate',
  ],

  sources: [
    {
      id: 'medlineplus-hemoglobin-test',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Hemoglobin Test: MedlinePlus Medical Test',
      url: 'https://medlineplus.gov/lab-tests/hemoglobin-test/',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
      lastReviewedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-anemia-overview',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI) / NIH',
      title: 'Anemia - Causes and Risk Factors | NHLBI, NIH',
      url: 'https://www.nhlbi.nih.gov/health/anemia/causes',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
      lastReviewedAt: '2026-09-02',
    },
    {
      id: 'medlineplus-anemia',
      organization: 'MedlinePlus / National Library of Medicine',
      title: 'Anemia | MedlinePlus',
      url: 'https://medlineplus.gov/anemia.html',
      domain: 'medlineplus.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
      lastReviewedAt: '2026-09-02',
    },
    {
      id: 'nhlbi-blood-tests',
      organization: 'National Heart, Lung, and Blood Institute (NHLBI) / NIH',
      title: 'Blood Tests - Complete Blood Count | NHLBI, NIH',
      url: 'https://www.nhlbi.nih.gov/health/blood-tests',
      domain: 'nhlbi.nih.gov',
      sourceType: 'government',
      accessedAt: '2026-09-02',
      lastReviewedAt: '2026-09-02',
    },
  ],

  evidenceLevel: 'high',
  knowledgeVersion: '1.0.0',
  lastReviewedAt: '2026-09-02',
};
