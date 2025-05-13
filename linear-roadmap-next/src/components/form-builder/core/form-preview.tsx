"use client";

import React from "react";
import { closestCenter, DragStartEvent, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableField } from "./sortable-field";
import { FieldCard } from "./field-card";
import type { FormField, FormSettings } from "./types";
import { getFileTypeDescription, highlightMentions } from "../utils/field-utils";
import dynamic from 'next/dynamic';

// Dynamically import DndContext and SortableContext with SSR disabled
const DndContext = dynamic(
  () => import('@dnd-kit/core').then((mod) => ({ default: mod.DndContext })),
  { ssr: false }
);

const SortableContext = dynamic(
  () => import('@dnd-kit/sortable').then((mod) => ({ default: mod.SortableContext })),
  { ssr: false }
);

interface FormPreviewProps {
  fields: FormField[];
  formSettings: FormSettings;
  activeField: string | null;
  setActiveField: (id: string) => void;
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  sensors: any; // Type it properly if you have the types
  formFieldsRef: React.RefObject<HTMLFormElement | null>;
}

// Custom wrapper component to ensure opacity
const OpaqueCardWrapper = ({ children }: { children: React.ReactNode }) => {
  // Use inlineStyles for maximum CSS specificity
  const inlineStyles = {
    opacity: 1,
    backgroundColor: 'var(--card)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--primary)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    width: '100%'
  };

  return (
    <div 
      style={inlineStyles}
      className="w-full" 
    >
      {children}
    </div>
  );
};

export function FormPreview({
  fields,
  formSettings,
  activeField,
  setActiveField,
  setFields,
  emailValidation,
  sensors,
  formFieldsRef
}: FormPreviewProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeFieldData = activeId ? fields.find(field => field.id === activeId) : null;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end and reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  return (
    <div className="border border-border p-4 rounded bg-background overflow-hidden">
      <h3 className="text-lg font-medium mb-4">Form Preview</h3>
      
      {/* Form Title and Type */}
      <div className="mb-6 border-b pb-4 border-border">
        <div className="flex items-center mb-2">
          <span className="text-3xl mr-3">{formSettings.emoji}</span>
          <h2 className="text-2xl font-bold">{formSettings.title}</h2>
        </div>
        {formSettings.description && (
          <p className="text-sm text-muted-foreground">{formSettings.description}</p>
        )}
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <form className="space-y-4" ref={formFieldsRef as React.RefObject<HTMLFormElement>}>
          <SortableContext 
            items={fields.map(field => field.id)} 
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                activeField={activeField}
                emailValidation={emailValidation}
                setActiveField={setActiveField}
                getFileTypeDescription={getFileTypeDescription}
                highlightMentions={highlightMentions}
              />
            ))}
          </SortableContext>
        </form>
        
        {/* Enhanced Drag overlay with custom wrapper component */}
        <DragOverlay 
          adjustScale={false} 
          dropAnimation={null}
          zIndex={1000}
        >
          {activeFieldData && (
            <OpaqueCardWrapper>
              <FieldCard
                field={activeFieldData}
                isActive={true}
                emailValidation={emailValidation}
                onActive={() => {}}
                getFileTypeDescription={getFileTypeDescription}
                highlightMentions={highlightMentions}
              />
            </OpaqueCardWrapper>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 