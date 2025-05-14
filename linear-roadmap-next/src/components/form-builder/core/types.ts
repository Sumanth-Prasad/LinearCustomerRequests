import type { Country } from 'react-phone-number-input';

export type FieldType = "text" | "textarea" | "select" | "checkbox" | "radio" | "email" | "phone" | "file" | "image" | "url";

export type FormType = "bug" | "feature" | "feedback" | "question" | "custom";

export interface FormSettings {
  title: string;
  type: FormType;
  description?: string;
  customType?: string; // Used when type is "custom"
  emoji: string; // Store the emoji character
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, checkbox, radio
  countryCode?: Country; // For phone fields (ISO country code)
  acceptedFileTypes?: string; // For file/image fields (e.g., ".pdf,.docx" or "image/*")
  multiple?: boolean; // For file/image fields
  maxFileSize?: number; // In MB
}

export interface FieldMention {
  id: string;
  label: string;
  startPos: number;
  endPos: number;
  length: number; // Track the visible length for cursor positioning
}

export interface MentionMenuState {
  isOpen: boolean;
  inputId: string | null;
  position: { top: number; left: number };
  searchTerm: string;
}

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

export interface SavedForm {
  id: string; // Unique identifier for the form (generated locally)
  formSettings: FormSettings;
  fields: FormField[];
  linearSettings: LinearIntegrationSettings;
  createdAt: number; // timestamp when created
  updatedAt: number; // timestamp when last updated
} 