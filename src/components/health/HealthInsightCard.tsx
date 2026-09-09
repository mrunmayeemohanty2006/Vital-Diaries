import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Utensils,
  Activity,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  FileText,
} from 'lucide-react';
import type { HealthInsight, EvaluatedMetricStatus } from '../../health-engine/types';

interface HealthInsightCardProps {
  insight: HealthInsight;
}

export const HealthInsightCard: React.FC<HealthInsightCardProps> = ({ insight }) => {
  const getStatusBadge = (status: EvaluatedMetricStatus) => {
    switch (status) {
      case 'low':
        return {
          bg: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />,
          label: 'LOW',
          sub: 'Below laboratory reference interval',
        };
      case 'high':
        return {
          bg: 'bg-blue-100 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200',
          icon: <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />,
          label: 'HIGH',
          sub: 'Above laboratory reference interval',
        };
      case 'normal':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
          label: 'NORMAL',
          sub: 'Within laboratory reference interval',
        };
      default:
        return {
          bg: 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200',
          icon: <HelpCircle className="w-4 h-4 text-stone-500 dark:text-stone-400" />,
          label: 'REFERENCE RANGE UNAVAILABLE',
          sub: 'Status unknown — no reference range in uploaded report',
        };
    }
  };

  const badge = getStatusBadge(insight.status);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 p-5 sm:p-7 shadow-xs space-y-6 text-stone-900 dark:text-stone-100">
      {/* Top Banner & Value Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Deterministic Health Engine
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
              v{insight.knowledgeVersion} • Reviewed {insight.lastReviewedAt}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-stone-900 dark:text-stone-100">
            {insight.metric}
          </h3>
        </div>

        {/* Metric Value & Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-stone-900 dark:text-stone-100">
              {insight.value} <span className="text-base font-semibold text-stone-500 dark:text-stone-400">{insight.unit}</span>
            </div>
            <div className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
              Extracted from medical report
            </div>
          </div>

          <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 ${badge.bg}`}>
            {badge.icon}
            <div className="text-left">
              <span className="text-xs font-black tracking-wider block">{badge.label}</span>
              <span className="text-[10px] opacity-80 hidden sm:block">{badge.sub}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Range Provenance Card */}
      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 dark:text-stone-400 block mb-0.5">
            Reference Range
          </span>
          {insight.referenceRange.source === 'uploaded_report' &&
          (insight.referenceRange.low !== undefined || insight.referenceRange.high !== undefined || insight.referenceRange.rawText) ? (
            <div className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>
                {insight.referenceRange.low !== undefined && insight.referenceRange.high !== undefined
                  ? `${insight.referenceRange.low} – ${insight.referenceRange.high} ${insight.referenceRange.unit || insight.unit}`
                  : insight.referenceRange.rawText || `${insight.referenceRange.high ? `< ${insight.referenceRange.high}` : `> ${insight.referenceRange.low}`} ${insight.referenceRange.unit || insight.unit}`}
              </span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                Extracted from Report
              </span>
            </div>
          ) : (
            <div className="text-stone-600 dark:text-stone-300 font-medium italic">
              Laboratory reference interval was not specified in the uploaded report.
            </div>
          )}
        </div>

        <div className="text-[11px] text-stone-500 dark:text-stone-400 max-w-sm">
          {insight.referenceRange.source === 'uploaded_report' ? (
            <span>Evaluated directly against the clinical interval established by your testing laboratory.</span>
          ) : (
            <span>Reference ranges vary across laboratories and demographics. Evaluator does not assume arbitrary ranges.</span>
          )}
        </div>
      </div>

      {/* If Status is UNKNOWN (Missing Reference Range) */}
      {insight.status === 'unknown' ? (
        <div className="p-5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/80 rounded-2xl text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
            <Info className="w-4 h-4 text-stone-500" />
            <span>Deterministic Reference Evaluation Notice</span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
            {insight.missingReferenceRangeMessage ||
              'A reliable laboratory reference interval was not detected in this document. Because reference ranges depend on testing equipment, reagent batches, and individual patient factors, Vital Diaries does not assign a generic low or high status without a verified laboratory interval.'}
          </p>
          <p className="text-stone-500 dark:text-stone-400">
            Please refer to your laboratory report's reference column or consult your physician to interpret this {insight.value} {insight.unit} result.
          </p>
        </div>
      ) : (
        /* Structured Health Insight Content when Low, Normal, or High */
        <div className="space-y-6">
          {/* 1. What This Means */}
          {insight.interpretation && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  What This Means
                </h4>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700/80">
                <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
                  {insight.interpretation.title}
                </h5>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {insight.interpretation.meaning}
                </p>
              </div>
            </div>
          )}

          {/* 2. Possible Causes / Associations */}
          {insight.possibleAssociations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Possible Causes & Associations
                </h4>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 dark:text-stone-300">
                {insight.possibleAssociations.map((assoc, idx) => (
                  <li
                    key={idx}
                    className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-700/80 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{assoc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Nutrition & Dietary Considerations */}
          {insight.nutrition.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  What to Eat / Nutritional Considerations
                </h4>
              </div>
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                {insight.nutrition.map((item, idx) => (
                  <div key={idx} className="text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3b. What to Limit / Avoid */}
          {insight.foodRestrictions && insight.foodRestrictions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  What to Limit / Avoid
                </h4>
              </div>
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                {insight.foodRestrictions.map((item, idx) => (
                  <div key={idx} className="text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Lifestyle & Activities */}
          {insight.lifestyle.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Activities & Lifestyle
                </h4>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-2">
                {insight.lifestyle.map((item, idx) => (
                  <div key={idx} className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Be Careful About (Cautions) */}
          {insight.cautions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Clinical Cautions
                </h4>
              </div>
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                {insight.cautions.map((caution, idx) => (
                  <div key={idx} className="text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{caution}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Questions to Discuss with Your Doctor */}
          {insight.questionsForDoctor && insight.questionsForDoctor.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Questions to Discuss with Your Doctor
                </h4>
              </div>
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 space-y-2">
                {insight.questionsForDoctor.map((q, idx) => (
                  <div key={idx} className="text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed font-medium">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. When to Seek Prompt Care (if available) */}
          {insight.whenToSeekPromptCare && insight.whenToSeekPromptCare.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                  When to Seek Prompt Medical Attention
                </h4>
              </div>
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800/60 space-y-1.5">
                {insight.whenToSeekPromptCare.map((item, idx) => (
                  <div key={idx} className="text-xs text-rose-950 dark:text-rose-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* 8. Related Markers */}
      {insight.relatedMetrics.length > 0 && (
        <div className="pt-2">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-400 uppercase tracking-wider block mb-2">
            Related Biomarkers & Indices
          </span>
          <div className="flex flex-wrap gap-1.5">
            {insight.relatedMetrics.map((m, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 9. Traceable Authoritative Sources */}
      {insight.sources.length > 0 && (
        <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-emerald-600" />
              <span>Traceable Medical Reference Sources</span>
            </span>
            <span className="text-[10px] text-stone-400">Curated & Reviewed</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {insight.sources.map((src) => (
              <div
                key={src.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
              >
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100 block">{src.organization}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">{src.title}</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-[10px] text-stone-400 font-mono">Accessed {src.accessedAt}</span>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                      title="View medical source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Clinical Disclaimer Footer */}
      <div className="pt-2 flex items-start gap-2 text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong>Local, AI-Free Health Intelligence</strong>: This evaluation was executed 100% deterministically on your device using static clinical knowledge. Vital Diaries does not diagnose conditions. Please share all lab reports with your healthcare provider for professional medical interpretation.
        </span>
      </div>
    </div>
  );
};
