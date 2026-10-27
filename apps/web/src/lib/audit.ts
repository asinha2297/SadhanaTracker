const LABELS: Record<string, string> = {
  ACCOUNT_CREATED: 'Account created',
  ACCOUNT_DEACTIVATED: 'Account deactivated',
  ACCOUNT_REACTIVATED: 'Account reactivated',
  ROLE_CHANGED: 'Role changed',
  NAME_CHANGED: 'Name changed',
  PASSWORD_RESET_ISSUED: 'One-time password issued',
  RECORD_REVIEW_GRANTED: 'Record review granted',
  RECORD_REVIEW_REVOKED: 'Record review revoked',
  RECOMMENDED_TARGET_SET: 'Recommended target set',
}

export const auditLabel = (action: string): string => LABELS[action] ?? action.toLowerCase().replaceAll('_', ' ')
