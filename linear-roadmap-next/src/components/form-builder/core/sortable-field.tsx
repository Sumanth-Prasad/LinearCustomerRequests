"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FieldCard } from './field-card';
import type { FormField, FieldMention } from './types';

interface SortableFieldProps {
  field: FormField;
  activeField: string | null;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  setActiveField: (id: string) => void;
  getFileTypeDescription: (acceptedTypes: string) => string;
  highlightMentions: (text: string, mentions?: FieldMention[]) => React.ReactNode;
}

export function SortableField({
  field,
  activeField,
  emailValidation,
  setActiveField,
  getFileTypeDescription,
  highlightMentions
}: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 10px 25px rgba(0, 0, 0, 0.2)' : 'none',
    backgroundColor: 'var(--card)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      suppressHydrationWarning
      className={`relative ${isDragging ? 'border border-primary rounded-md' : ''}`}
      data-dragging={isDragging ? "true" : "false"}
    >
      <FieldCard
        field={field}
        isActive={activeField === field.id}
        emailValidation={emailValidation}
        onActive={() => setActiveField(field.id)}
        getFileTypeDescription={getFileTypeDescription}
        highlightMentions={highlightMentions}
      />
      
      {/* Modern Drag handle icon */}
      <div 
        {...listeners}
        className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center cursor-grab rounded-md hover:bg-muted text-muted-foreground"
        title="Drag to reorder"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M9 18l6 0"></path>
          <path d="M9 14l6 0"></path>
          <path d="M9 10l6 0"></path>
          <path d="M9 6l6 0"></path>
        </svg>
      </div>
    </div>
  );
} 