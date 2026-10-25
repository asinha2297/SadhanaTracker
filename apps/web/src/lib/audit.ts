const LABELS: Record<string, string> = {
  ACCOUNT_CREATED: 'Account created',
  ACCOUNT_APPROVED: 'Account approved',
  JOIN_REQUEST_DECLINED: 'Join request declined',
  GROUP_CREATED: 'Group created',
  ACCOUNT_DEACTIVATED: 'Account deactivated',
  ACCOUNT_REACTIVATED: 'Account reactivated',
  ROLE_CHANGED: 'Role changed',
  GROUP_CHANGED: 'Group changed',
  PASSWORD_RESET_ISSUED: 'One-time password issued',
  RECORD_REVIEW_GRANTED: 'Record review granted',
  RECOMMENDED_TARGET_SET: 'Recommended target set',
}

export const auditLabel = (action: string): string => LABELS[action] ?? action.toLowerCase().replaceAll('_', ' ')
