"use client";

import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FieldType, FormField } from "./types";

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
  const [filteredItems, setFilteredItems] = useState<FormField[]>([]);
  
  // Add the current date as a utility option
  const utilityItems = [
    { id: 'current_date', label: 'Current Date', type: 'text' as FieldType }
  ];
  
  // Filter items based on search term
  useEffect(() => {
    const lowercaseSearch = searchTerm.toLowerCase();
    
    // Filtered form fields
    const matchingFields = fields.filter(field => 
      field.label.toLowerCase().includes(lowercaseSearch)
    );
    
    // Filtered utility items
    const matchingUtils = utilityItems.filter(item =>
      item.label.toLowerCase().includes(lowercaseSearch)
    );
    
    setFilteredItems([...matchingFields, ...matchingUtils as any]);
  }, [fields, searchTerm]);
  
  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder="Search fields..."
        value={searchTerm}
        onValueChange={onSearchChange}
        autoFocus={!disableSearchByDefault}
        className="border-none focus:ring-0 outline-none"
      />
      <CommandList>
        <ScrollArea className="h-[200px]">
          <CommandEmpty>No fields found.</CommandEmpty>
          <CommandGroup heading="Form Fields">
            {filteredItems.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.id}-${item.label}`}
                onSelect={() => onSelectItem(item.id)}
                className="flex items-center"
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  {getFieldTypeIcon(item.type)}
                </div>
                <span>@{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </Command>
  );
} 