import React, { useState, useMemo } from 'react';
import { Search, X, FileText, Calendar, Building2, UserCheck, ShieldCheck, Lock, Activity, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { searchLocalDataPoints, type MatchedDataPoint } from '../../lib/local-search';
import { formatDate } from '../../lib/utils';

interface LocalReportSearchProps {
  reports: HealthReport[];
  decryptedReports: Record<string, DecryptedReportDetails>;
  encryptionKey: CryptoKey | null;
  onViewReport: (report: HealthReport) => void;
  onNavigateToUpload?: () => void;
}

export const LocalReportSearch: React.FC<LocalReportSearchProps> = ({
  reports,
  decryptedReports,
  encryptionKey,
  onViewReport,
  onNavigateToUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const isLocked = !encryptionKey;

  // Perform purely local in-memory data point search (sorted most recent first)
  const matchedPoints: MatchedDataPoint[] = useMemo(() => {
    if (isLocked || !searchQuery.trim()) return [];
    return searchLocalDataPoints(reports, decryptedReports, searchQuery);
  }, [reports, decryptedReports, searchQuery, isLocked]);

  const hasQuery = searchQuery.trim().length > 0;

  if (isLocked) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-700 dark:text-amber-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Vault is Locked</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Unlock your health vault to search through your locally decrypted medical records, biomarkers, and test values.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Privacy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Search className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Search Health Records & Values
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Search for specific biomarkers (e.g. "Hemoglobin", "Cholesterol") to view test values sorted chronologically with recent tests first.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/60 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Local Search &bull; Zero Network</span>
        </div>
      </div>

      {/* Search Bar Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for biomarkers (e.g. hemoglobin, cholesterol, glucose)..."
          className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base shadow-xs transition-all"
          autoFocus
        />
        {hasQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search query"
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
              <X className="w-4 h-4" />
            </div>
          </button>
        )}
      </div>

      {/* Quick Search Chips */}
      {!hasQuery && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500 dark:text-stone-400">
          <span className="font-semibold text-stone-700 dark:text-stone-300">Try searching:</span>
          {['Hemoglobin', 'Cholesterol', 'Glucose', 'Platelets', 'TSH', 'Vitamin D'].map((term) => (
            <button
              key={term}
              onClick={() => setSearchQuery(term)}
              className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-stone-700 dark:text-stone-300 font-medium transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Search Status / Count */}
      {hasQuery && (
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-300 px-1">
          <span>
            {matchedPoints.length === 0
              ? 'No matching health records found.'
              : `${matchedPoints.length} matching ${matchedPoints.length === 1 ? 'value found' : 'values found'} (Most recent at top)`}
          </span>
          {matchedPoints.length > 0 && (
            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-normal">
              Click any value to open full report
            </span>
          )}
        </div>
      )}

      {/* Granular Biomarker Results List */}
      {hasQuery && matchedPoints.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {matchedPoints.map((point) => {
            const isAbnormal = point.status === 'low' || point.status === 'high';
            const isLow = point.status === 'low' || point.status === 'low-normal';
            const isHigh = point.status === 'high' || point.status === 'high-normal';

            return (
              <div
                key={point.id}
                onClick={() => onViewReport(point.rawReport)}
                className="group p-4 sm:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Marker Name & Context */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {point.markerName}
                    </span>

                    {/* Status Badge */}
                    {point.status && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          point.status === 'normal'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : isHigh
                            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                        }`}
                      >
                        {point.status === 'normal' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {point.status}
                      </span>
                    )}
                  </div>

                  {/* Date Uploaded / Recorded (Prominent) */}
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                    <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {formatDate(point.reportDate)}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                    <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 truncate max-w-[200px]">
                      <FileText className="w-3 h-3" />
                      {point.reportTitle}
                    </span>
                    {point.facility && (
                      <>
                        <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                        <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 truncate">
                          <Building2 className="w-3 h-3" />
                          {point.facility}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Measured Value & Reference Range */}
                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 dark:border-stone-800 shrink-0">
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tracking-tight">
                      {point.displayValue}
                    </span>
                  </div>
                  {point.referenceRange && (
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Ref: <span className="font-mono">{point.referenceRange}</span>
                    </span>
                  )}
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline mt-1">
                    View in Report
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasQuery && (
        <div className="bg-stone-50 dark:bg-stone-900/50 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-stone-400">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
            Search Biomarkers & Test Values
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Type any marker such as <span className="font-semibold text-stone-700 dark:text-stone-300">"Hemoglobin"</span>, <span className="font-semibold text-stone-700 dark:text-stone-300">"Cholesterol"</span>, or <span className="font-semibold text-stone-700 dark:text-stone-300">"Platelets"</span> to see exact test values across all your records, sorted with the latest tests at the top.
          </p>
        </div>
      )}
    </div>
  );
};
