"use client";

import React from "react";
import { DndContext, closestCenter, DragStartEvent, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableField } from "./sortable-field";
import { FieldCard } from "./field-card";
import type { FormField } from "./types";
import { getFileTypeDescription, highlightMentions } from "../utils/field-utils";

interface FormPreviewProps {
  fields: FormField[];
  activeField: string | null;
  setActiveField: (id: string) => void;
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  sensors: any; // Type it properly if you have the types
  formFieldsRef: React.RefObject<HTMLFormElement | null>;
}

export function FormPreview({
  fields,
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
        
        {/* Drag overlay for showing dragged item */}
        <DragOverlay>
          {activeFieldData && (
            <div className="w-full">
              <FieldCard
                field={activeFieldData}
                isActive={false}
                emailValidation={emailValidation}
                onActive={() => {}}
                getFileTypeDescription={getFileTypeDescription}
                highlightMentions={highlightMentions}
              />
              </div>
            )}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 