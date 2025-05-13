"use client";

import React from "react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FieldCard } from "./field-card";
import type { FormField } from "../core/types";

interface SortableFieldProps {
  field: FormField;
  activeField: string | null;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  setActiveField: (id: string) => void;
  getFileTypeDescription: (acceptedTypes: string) => string;
  highlightMentions: (text: string) => React.ReactNode;
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
    opacity: isDragging ? 0 : 1, // Hide the original item during drag
    zIndex: isDragging ? 1 : 0
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      className={`relative ${isDragging ? 'border border-primary rounded-md' : ''}`}
      data-dragging={isDragging ? "true" : "false"}
    >
      <div className="relative group">
        <FieldCard 
          field={field} 
          isActive={activeField === field.id}
          emailValidation={emailValidation}
          onActive={setActiveField}
          getFileTypeDescription={getFileTypeDescription}
          highlightMentions={highlightMentions}
        />
        {/* Improved Drag handle */}
        <div 
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-md cursor-grab 
            active:cursor-grabbing text-muted-foreground hover:text-primary hover:bg-primary/5 
            transition-colors duration-200 opacity-60 group-hover:opacity-100"
          title="Drag to reorder"
        >
          <div className="grid grid-cols-2 gap-[2px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 