/** Year 5 Review & Governance (Weeks 251-260)
 * 5-year outcomes report, future roadmap v6, open-source governance model.
 */

/** Five-year outcomes metrics. */
export interface Year5Outcomes {
  totalUsers: number;
  retentionRate30Day: number;
  retentionRate90Day: number;
  averageSessionLength: number; // minutes
  crashFreeRate: number; // percentage
  offlineUsageRate: number; // percentage
  modelUsageDistribution: Record<string, number>; // model name -> usage count
  shareWindowCount: number;
  memoryCount: number;
  accessibilityCompliance: 'aa' | 'a' | 'none';
  languageDistribution: Record<string, number>; // language code -> usage count
}

/** Five-year clinical outcomes. */
export interface ClinicalOutcomes {
  totalSessions: number;
  improvementRate: number; // percentage reporting improvement
  crisisInterventionCount: number;
  protocolAdherenceByLevel: Record<string, number>; // level -> adherence %
  userSatisfaction: number; // 1-5 scale
}

/** Open-source governance model. */
export interface GovernanceModel {
  version: string;
  governanceStructure: 'foundation' | 'community' | 'corporate';
  contributionGuidelines: string;
  decisionMakingProcess: string;
  releaseCycle: 'monthly' | 'quarterly' | 'semester';
  trademarkLicense: string;
  patentPolicy: string;
}

/** Exported functions */
export { Year5Outcomes, ClinicalOutcomes, GovernanceModel };