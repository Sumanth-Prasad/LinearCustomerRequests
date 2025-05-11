"use client"

import React, { useState, useRef } from "react";
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
}

export function MentionCombobox({
  fields,
  inputId,
  searchTerm,
  onSearchChange,
  onSelectItem,
  getFieldTypeIcon
}: MentionComboboxProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const skipNextSelect = useRef(false);
  
  // Filter fields based on search term and exclude current field
  const filteredFields = fields.filter(field => 
    field.id !== inputId && 
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (fieldId: string) => {
    console.log('Item clicked:', fieldId);
    onSelectItem(fieldId);
  };

  return (
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Search fields..." 
        value={searchTerm}
        onValueChange={onSearchChange}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No fields found</CommandEmpty>
        <CommandGroup>
          <ScrollArea className="h-[200px]">
            {filteredFields.map((field, index) => (
              <CommandItem
                key={field.id}
                value={field.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  focusedIndex === index ? "bg-accent text-accent-foreground" : ""
                )}
                onMouseEnter={() => setFocusedIndex(index)}
                onMouseLeave={() => setFocusedIndex(-1)}
                onMouseDown={(e) => {
                  // Keep focus on the original input element.
                  e.preventDefault();
                  // Run selection immediately for mouse users.
                  onSelectItem(field.id);
                  // Tell onSelect to ignore this upcoming event.
                  skipNextSelect.current = true;
                }}
                onSelect={() => {
                  if (skipNextSelect.current) {
                    skipNextSelect.current = false;
                    return;
                  }
                  onSelectItem(field.id);
                }}
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
      </CommandList>
    </Command>
  );
} 