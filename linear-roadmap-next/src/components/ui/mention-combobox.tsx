"use client"

import React, { useState, useRef, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type FieldType = "text" | "textarea" | "select" | "checkbox" | "radio" | "email" | "phone" | "file" | "image";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  countryCode?: string;
  acceptedFileTypes?: string;
  multiple?: boolean;
  maxFileSize?: number;
}

interface MentionComboboxProps {
  fields: FormField[];
  inputId: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (fieldId: string) => void;
  getFieldTypeIcon: (type: FieldType) => React.ReactNode;
  disableSearchByDefault?: boolean;
}

export function MentionCombobox({
  fields,
  inputId,
  searchTerm,
  onSearchChange,
  onSelectItem,
  getFieldTypeIcon,
  disableSearchByDefault = false
}: MentionComboboxProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const commandRef = useRef<HTMLDivElement>(null);
  
  // Filter fields based on search term and exclude current field
  const filteredFields = fields.filter(field => 
    field.id !== inputId && 
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset the focused index when the filtered fields change
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  // Make sure the dropdown is focusable when opened
  useEffect(() => {
    if (commandRef.current) {
      setTimeout(() => {
        if (disableSearchByDefault) {
          commandRef.current?.focus();
        }
      }, 0);
    }
  }, [disableSearchByDefault]);

  // Simple handler for keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredFields.length) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredFields.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredFields.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredFields.length) {
          onSelectItem(filteredFields[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        // Close dropdown would be handled by the parent component
        break;
    }
  };

  return (
    <div
      ref={commandRef}
      tabIndex={0}
      className="outline-none focus:outline-none w-full"
      onKeyDown={handleKeyDown}
    >
      <Command shouldFilter={false} className="overflow-visible">
        <CommandInput 
          placeholder="Search fields..." 
          value={searchTerm}
          onValueChange={onSearchChange}
          autoFocus={!disableSearchByDefault}
          className="border-none focus:ring-0 outline-none"
        />
        <CommandList>
          {filteredFields.length === 0 && (
            <CommandEmpty>No fields found</CommandEmpty>
          )}
          {filteredFields.length > 0 && (
            <CommandGroup>
              <ScrollArea className="h-[200px]">
                {filteredFields.map((field, index) => (
                  <CommandItem
                    key={field.id}
                    value={field.id}
                    onSelect={() => onSelectItem(field.id)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      focusedIndex === index ? "bg-accent text-accent-foreground" : ""
                    )}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <span className="mr-2 text-muted-foreground">
                      {getFieldTypeIcon(field.type)}
                    </span>
                    <span>{field.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{field.type}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
} 