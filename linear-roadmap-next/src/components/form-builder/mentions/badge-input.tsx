"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";
import type { FieldMention } from "./types";

interface BadgeInputProps {
  fieldId: string;
  value: string;
  mentions: FieldMention[];
  inputProps: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
  InputComponent: 'input' | 'textarea';
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onRemoveMention: (fieldId: string, mentionId: string, mentionStartPos: number, mentionEndPos: number) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
}

export function BadgeInput({
  fieldId,
  value,
  mentions,
  inputProps,
  InputComponent,
  onInputChange,
  onKeyDown,
  onRemoveMention,
  inputRefs
}: BadgeInputProps) {
  // Regular input rendering without badges
  if (mentions.length === 0) {
    return (
      <InputComponent
        {...inputProps}
        ref={(el) => {
          if (el) inputRefs.current.set(fieldId, el);
        }}
        data-input-id={fieldId}
        onChange={(e) => onInputChange(e, fieldId)}
        onKeyDown={(e) => onKeyDown(e, fieldId)}
      />
    );
  }
  
  // Prepare content with badges for overlay
  const content: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  
  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.startPos - b.startPos);
  
  for (const mention of sortedMentions) {
    // Add text before mention
    if (mention.startPos > lastIndex) {
      content.push(value.substring(lastIndex, mention.startPos));
    }
    
    // Add the badge component
    content.push(
      <Badge
        key={`mention-${mention.id}-${mention.startPos}`}
        variant="secondary"
        className="h-5 py-0 px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-100 inline-flex items-center gap-0.5 rounded-md shadow-sm border border-blue-200 dark:border-blue-700 whitespace-nowrap align-text-bottom"
        style={{ margin: '0 1px' }}
        data-field-id={mention.id}
      >
        <span className="font-medium text-xs leading-none">@{mention.label}</span>
        <button
          type="button"
          className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-600 rounded-full flex items-center justify-center h-3 w-3 transition-colors"
          title={`Remove ${mention.label} mention`}
          onClick={() => onRemoveMention(fieldId, mention.id, mention.startPos, mention.endPos)}
        >
          <XIcon className="h-2 w-2" />
        </button>
      </Badge>
    );
    
    lastIndex = mention.endPos;
  }
  
  // Add remaining text
  if (lastIndex < value.length) {
    content.push(value.substring(lastIndex));
  }
  
  // Handle click to correctly position cursor around badges
  const handleContainerClick = (e: React.MouseEvent) => {
    const inputEl = inputRefs.current.get(fieldId);
    if (!inputEl) return;
    
    // Smart positioning: Position cursor at the click point, 
    // but adjusted for badges
    
    // First find the horizontal position of the click
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Calculate an approximate character position
    const charWidth = 8; // Approximate character width
    const approxPos = Math.floor(clickX / charWidth);
    
    // Find the best cursor position considering badges
    let realPos = 0;
    let visiblePos = 0; 
    
    for (let i = 0; i < value.length; i++) {
      // If we're at a marker, skip the appropriate length
      const isMention = sortedMentions.some(m => m.startPos === i);
      if (isMention) {
        const mention = sortedMentions.find(m => m.startPos === i);
        if (mention) {
          // If clicked past this badge's position
          if (visiblePos + (mention.length || 1) <= approxPos) {
            visiblePos += mention.length || 1;
            realPos = mention.endPos;
          } else {
            // Click was on this badge, put cursor after it
            realPos = mention.endPos;
            break;
          }
        }
      } else {
        visiblePos++;
        realPos++;
      }
      
      // If we reached the approximate position, stop
      if (visiblePos >= approxPos) break;
    }
    
    // Set focus and position
    inputEl.focus();
    inputEl.setSelectionRange(realPos, realPos);
  };

  // Enhanced keyboard navigation
  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Custom handling for key navigation with badges
    const pos = e.currentTarget.selectionStart || 0;
    
    // Handle arrow keys for badge navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      
      // Check if cursor is adjacent to a badge
      const mention = sortedMentions.find(m => 
        (direction > 0 && m.startPos === pos) || 
        (direction < 0 && m.endPos === pos)
      );
      
      if (mention) {
        e.preventDefault();
        // Move cursor to the other side of the badge
        const newPos = direction > 0 ? mention.endPos : mention.startPos;
        e.currentTarget.setSelectionRange(newPos, newPos);
        return;
      }
    }
    
    // Delegate to the provided onKeyDown handler
    onKeyDown(e, fieldId);
  };
  
  // The DynamicComponent approach to support both input and textarea
  const DynamicComponent = InputComponent === 'textarea' ? 'textarea' : 'input';
  
  return (
    <div className="relative" onClick={handleContainerClick}>
      <DynamicComponent
        {...inputProps}
        ref={(el) => {
          if (el) inputRefs.current.set(fieldId, el as any);
        }}
        data-input-id={fieldId}
        onChange={(e) => onInputChange(e, fieldId)}
        onKeyDown={handleCustomKeyDown}
        style={{
          ...inputProps.style,
          color: 'transparent',
          caretColor: 'var(--primary)',
          backgroundColor: 'transparent'
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none p-2 flex items-start"
        style={{ zIndex: 1 }}
      >
        {content}
      </div>
    </div>
  );
} 