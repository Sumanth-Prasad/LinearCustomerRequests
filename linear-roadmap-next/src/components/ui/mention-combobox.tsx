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
      className="outline-none focus:outline-none w-full bg-popover text-popover-foreground"
      onKeyDown={handleKeyDown}
    >
      <Command shouldFilter={false} className="overflow-visible bg-popover border-none rounded-md">
        <CommandInput 
          placeholder="Search fields..." 
          value={searchTerm}
          onValueChange={onSearchChange}
          autoFocus={!disableSearchByDefault}
          className="border-none focus:ring-0 outline-none text-popover-foreground bg-transparent font-medium"
        />
        <CommandList className="bg-popover border-t border-border max-h-[200px]">
          {filteredFields.length === 0 && (
            <CommandEmpty className="text-popover-foreground py-6 text-sm text-center">No fields found</CommandEmpty>
          )}
          {filteredFields.length > 0 && (
            <CommandGroup className="bg-popover p-1">
              {/* Only use ScrollArea if we have more than 5 items */}
              {filteredFields.length <= 5 ? (
                <>
                  {filteredFields.map((field, index) => (
                    <CommandItem
                      key={field.id}
                      value={field.id}
                      onSelect={() => onSelectItem(field.id)}
                      className={cn(
                        "cursor-pointer transition-colors text-popover-foreground hover:bg-accent hover:text-accent-foreground my-1 px-2 py-2 rounded-md",
                        focusedIndex === index 
                          ? "bg-primary text-primary-foreground shadow-sm border-l-4 border-primary" 
                          : ""
                      )}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span className={cn(
                        "mr-2",
                        focusedIndex === index ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {getFieldTypeIcon(field.type)}
                      </span>
                      <span>{field.label}</span>
                      <span className={cn(
                        "ml-auto text-xs",
                        focusedIndex === index ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {field.type}
                      </span>
                    </CommandItem>
                  ))}
                </>
              ) : (
                <ScrollArea className="h-[200px] bg-popover">
                  {filteredFields.map((field, index) => (
                    <CommandItem
                      key={field.id}
                      value={field.id}
                      onSelect={() => onSelectItem(field.id)}
                      className={cn(
                        "cursor-pointer transition-colors text-popover-foreground hover:bg-accent hover:text-accent-foreground my-1 px-2 py-2 rounded-md",
                        focusedIndex === index 
                          ? "bg-primary text-primary-foreground shadow-sm border-l-4 border-primary" 
                          : ""
                      )}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span className={cn(
                        "mr-2",
                        focusedIndex === index ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {getFieldTypeIcon(field.type)}
                      </span>
                      <span>{field.label}</span>
                      <span className={cn(
                        "ml-auto text-xs",
                        focusedIndex === index ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {field.type}
                      </span>
                    </CommandItem>
                  ))}
                </ScrollArea>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
} 