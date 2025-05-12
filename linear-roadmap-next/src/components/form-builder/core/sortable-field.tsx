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
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative"
    >
      <FieldCard
        field={field}
        isActive={activeField === field.id}
        emailValidation={emailValidation}
        onActive={() => setActiveField(field.id)}
        getFileTypeDescription={getFileTypeDescription}
        highlightMentions={highlightMentions}
      />
      
      {/* Drag handle */}
      <div 
        {...listeners}
        className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center cursor-grab rounded-md hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 4.625C5.5 5.06 5.14 5.42 4.705 5.42C4.27 5.42 3.91 5.06 3.91 4.625C3.91 4.19 4.27 3.83 4.705 3.83C5.14 3.83 5.5 4.19 5.5 4.625Z" fill="currentColor"/>
          <path d="M5.5 7.5C5.5 7.935 5.14 8.295 4.705 8.295C4.27 8.295 3.91 7.935 3.91 7.5C3.91 7.065 4.27 6.705 4.705 6.705C5.14 6.705 5.5 7.065 5.5 7.5Z" fill="currentColor"/>
          <path d="M5.5 10.375C5.5 10.81 5.14 11.17 4.705 11.17C4.27 11.17 3.91 10.81 3.91 10.375C3.91 9.94 4.27 9.58 4.705 9.58C5.14 9.58 5.5 9.94 5.5 10.375Z" fill="currentColor"/>
          <path d="M11.09 4.625C11.09 5.06 10.73 5.42 10.295 5.42C9.86 5.42 9.5 5.06 9.5 4.625C9.5 4.19 9.86 3.83 10.295 3.83C10.73 3.83 11.09 4.19 11.09 4.625Z" fill="currentColor"/>
          <path d="M11.09 7.5C11.09 7.935 10.73 8.295 10.295 8.295C9.86 8.295 9.5 7.935 9.5 7.5C9.5 7.065 9.86 6.705 10.295 6.705C10.73 6.705 11.09 7.065 11.09 7.5Z" fill="currentColor"/>
          <path d="M11.09 10.375C11.09 10.81 10.73 11.17 10.295 11.17C9.86 11.17 9.5 10.81 9.5 10.375C9.5 9.94 9.86 9.58 10.295 9.58C10.73 9.58 11.09 9.94 11.09 10.375Z" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
} 