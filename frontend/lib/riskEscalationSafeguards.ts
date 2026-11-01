/**
 * Clinical Risk Escalation Safeguards (Week 36)
 *
 * Provides deterministic safety boundaries and crisis hotline hand-offs
 * when high risk indicators are detected in text inputs.
 */

export interface RiskEvaluation {
  isHighRisk: boolean;
  actionRequired: 'none' | 'display_crisis_hotline' | 'recommend_emergency';
  crisisMessage?: string;
}

const HIGH_RISK_KEYWORDS = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'want to die'];

export function evaluateRiskSafeguards(userText: string): RiskEvaluation {
  const lower = userText.toLowerCase();
  const matched = HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw));

  if (matched) {
    return {
      isHighRisk: true,
      actionRequired: 'display_crisis_hotline',
      crisisMessage: 'If you are in immediate danger or need emotional crisis support, call or text 988 (U.S.) immediately.',
    };
  }

  return {
    isHighRisk: false,
    actionRequired: 'none',
  };
}
