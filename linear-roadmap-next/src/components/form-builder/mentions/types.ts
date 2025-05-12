import type { FieldMention, FormField } from '../core/types';

export type { FieldMention, FormField };

export interface MentionMenuState {
  isOpen: boolean;
  inputId: string | null;
  position: { top: number; left: number };
  searchTerm: string;
} 