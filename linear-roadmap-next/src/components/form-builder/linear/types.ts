import type { FieldMention } from '../core/types';

export { FieldMention };

export type LinearPriority = 'urgent' | 'high' | 'medium' | 'low' | 'no_priority';

export interface LinearIntegrationSettings {
  issueType: 'customer_request' | 'issue';
  team: string;
  project?: string;
  status?: string;
  labels?: string[];
  assignee?: string;
  priority?: LinearPriority;
  includeCustomerInfo: boolean;
  defaultTitle: string;
  responseMessage: string;
} 