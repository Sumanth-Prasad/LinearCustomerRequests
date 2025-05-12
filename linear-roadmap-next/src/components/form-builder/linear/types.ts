import type { FieldMention } from '../core/types';

export { FieldMention };

export interface LinearIntegrationSettings {
  issueType: 'customer_request' | 'issue';
  team: string;
  project?: string;
  status?: string;
  labels?: string[];
  assignee?: string;
  includeCustomerInfo: boolean;
  defaultTitle: string;
  responseMessage: string;
} 