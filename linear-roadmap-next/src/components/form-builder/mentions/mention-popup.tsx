"use client";

import React from "react";
import { MentionMenuState } from "./types";
import { MentionCombobox } from "@/components/ui/mention-combobox";
import { getFieldTypeIcon } from "../fields/field-icons";
import type { FormField } from "./types";

interface MentionPopupProps {
  mentionMenu: MentionMenuState;
  fields: FormField[];
  onSearchChange: (value: string) => void;
  onSelectItem: (fieldId: string) => void;
  disableSearchByDefault: boolean;
}

export function MentionPopup({
  mentionMenu,
  fields,
  onSearchChange,
  onSelectItem,
  disableSearchByDefault
}: MentionPopupProps) {
  if (!mentionMenu.isOpen) return null;
  
  return (
    <div 
      className="absolute z-50 w-64 overflow-hidden rounded-md border border-border shadow-md mention-dropdown"
      style={{
        top: `${mentionMenu.position.top}px`,
        left: `${mentionMenu.position.left}px`,
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="w-full h-full overflow-hidden bg-popover rounded-md">
        <MentionCombobox
          fields={fields}
          inputId={mentionMenu.inputId}
          searchTerm={mentionMenu.searchTerm}
          onSearchChange={(value) => onSearchChange(value)}
          onSelectItem={onSelectItem}
          getFieldTypeIcon={getFieldTypeIcon}
          disableSearchByDefault={disableSearchByDefault}
        />
      </div>
    </div>
  );
} 