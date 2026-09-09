import React from 'react';
import { GetInsightsView } from './GetInsightsView';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';

interface AIDietInsightsProps {
  reports: HealthReport[];
  decryptedReports?: Record<string, DecryptedReportDetails>;
  encryptionKey?: CryptoKey | null;
  userName?: string;
  selectedReportId?: string;
  onSelectReport?: (reportId: string) => void;
  onViewReport?: (report: HealthReport) => void;
  onNavigateToUpload?: () => void;
}

/**
 * Get Insights (formerly AI Diet & Lab Insights)
 * 
 * Uses the local deterministic health engine to evaluate laboratory reports
 * without remote LLMs, APIs, or network requests.
 */
export const AIDietInsights: React.FC<AIDietInsightsProps> = (props) => {
  return <GetInsightsView {...props} />;
};

export { GetInsightsView };
