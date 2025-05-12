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
  const [activeSection, setActiveSection] = useState<string>('text');
  const commandRef = useRef<HTMLDivElement>(null);
  
  // Filter fields based on search term and exclude current field
  const filteredFields = fields.filter(field => 
    field.id !== inputId && 
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group fields by type for sectioning
  const fieldGroups = React.useMemo(() => {
    const groups: Record<string, FormField[]> = {
      'Text Fields': [],
      'Selection Fields': [],
      'Contact Fields': [],
      'File Fields': [],
      'Special Fields': [],
    };

    filteredFields.forEach(field => {
      switch (field.type) {
        case 'text':
        case 'textarea':
          groups['Text Fields'].push(field);
          break;
        case 'select':
        case 'checkbox':
        case 'radio':
          groups['Selection Fields'].push(field);
          break;
        case 'email':
        case 'phone':
          groups['Contact Fields'].push(field);
          break;
        case 'file':
        case 'image':
          groups['File Fields'].push(field);
          break;
        default:
          groups['Special Fields'].push(field);
      }
    });

    // Only return non-empty groups
    return Object.entries(groups).filter(([_, fields]) => fields.length > 0);
  }, [filteredFields]);

  // Custom section with date/time
  const hasUtilitySection = searchTerm.length === 0 || 
                           'date'.includes(searchTerm.toLowerCase()) || 
                           'time'.includes(searchTerm.toLowerCase());

  // Recalculate total items for keyboard navigation
  const allItems = React.useMemo(() => {
    const items: FormField[] = [];
    fieldGroups.forEach(([_, groupFields]) => {
      items.push(...groupFields);
    });
    return items;
  }, [fieldGroups]);

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

  // Calculate absolute index across all groups
  const getAbsoluteIndex = (groupIndex: number, itemIndex: number): number => {
    let absoluteIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      absoluteIndex += fieldGroups[i][1].length;
    }
    return absoluteIndex + itemIndex;
  };

  // Simple handler for keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!allItems.length && !hasUtilitySection) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allItems.length) {
          onSelectItem(allItems[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        // Close dropdown would be handled by the parent component
        break;
    }
  };

  // Define icons for the sidebar
  const sidebarItems = [
    { 
      id: 'text', 
      label: 'Text Fields',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v18m3-6h3"></path>
        </svg>
      )
    },
    { 
      id: 'utilities', 
      label: 'Utilities',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) 
    },
    { 
      id: 'selection', 
      label: 'Selection Fields',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
        </svg>
      )
    },
    { 
      id: 'contact', 
      label: 'Contact Fields',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
      )
    },
    { 
      id: 'file', 
      label: 'File Fields',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      )
    }
  ];

  // Filter sections based on the selected sidebar item
  const getVisibleSections = () => {
    if (activeSection === 'text') {
      return fieldGroups.filter(([name]) => name === 'Text Fields').map(([name]) => name);
    } else if (activeSection === 'utilities') {
      return hasUtilitySection ? ['utilities'] : [];
    } else if (activeSection === 'selection') {
      return fieldGroups.filter(([name]) => name === 'Selection Fields').map(([name]) => name);
    } else if (activeSection === 'contact') {
      return fieldGroups.filter(([name]) => name === 'Contact Fields').map(([name]) => name);
    } else if (activeSection === 'file') {
      return fieldGroups.filter(([name]) => name === 'File Fields').map(([name]) => name);
    }
    return [];
  };

  const visibleSections = getVisibleSections();

  // Helper to get fields for a specific section
  const getFieldsForSection = (sectionName: string) => {
    if (sectionName === 'utilities') {
      return [];
    }
    const group = fieldGroups.find(([name]) => name === sectionName);
    return group ? group[1] : [];
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
        <div className="flex border-t border-border">
          {/* Sidebar */}
          <div className="w-10 border-r border-border bg-muted/50">
            <div className="py-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full p-2 flex justify-center hover:bg-accent hover:text-accent-foreground transition-colors",
                    activeSection === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <CommandList className="bg-popover max-h-[300px]">
              {visibleSections.length === 0 && (
                <CommandEmpty className="text-popover-foreground py-6 text-sm text-center">No fields found</CommandEmpty>
              )}

              {visibleSections.includes('utilities') && hasUtilitySection && (
                <CommandGroup heading="Utilities" className="px-1 py-1">
                  <CommandItem
                    value="current_date"
                    onSelect={() => onSelectItem('current_date')}
                    className={cn(
                      "cursor-pointer transition-colors text-popover-foreground hover:bg-accent hover:text-accent-foreground my-1 px-2 py-2 rounded-md",
                      focusedIndex === allItems.length ? "bg-primary text-primary-foreground font-medium border-l-4 border-primary shadow-sm" : ""
                    )}
                  >
                    <span className={cn(
                      "mr-2",
                      focusedIndex === allItems.length ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span>Current Date</span>
                    <span className={cn(
                      "ml-auto text-xs",
                      focusedIndex === allItems.length ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      Today's date
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {fieldGroups.map(([groupName, groupFields], groupIndex) => {
                if (!visibleSections.includes(groupName)) {
                  return null;
                }
                
                return (
                  <CommandGroup key={groupName} heading={groupName} className="px-1 py-1">
                    {groupFields.length <= 5 ? (
                      <>
                        {groupFields.map((field, fieldIndex) => {
                          const absoluteIndex = getAbsoluteIndex(groupIndex, fieldIndex);
                          return (
                            <CommandItem
                              key={field.id}
                              value={field.id}
                              onSelect={() => onSelectItem(field.id)}
                              className={cn(
                                "cursor-pointer transition-colors text-popover-foreground hover:bg-accent hover:text-accent-foreground my-1 px-2 py-2 rounded-md",
                                focusedIndex === absoluteIndex ? "bg-primary text-primary-foreground font-medium border-l-4 border-primary shadow-sm" : ""
                              )}
                              onMouseEnter={() => setFocusedIndex(absoluteIndex)}
                            >
                              <span className={cn(
                                "mr-2",
                                focusedIndex === absoluteIndex ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {getFieldTypeIcon(field.type)}
                              </span>
                              <span>{field.label}</span>
                              <span className={cn(
                                "ml-auto text-xs",
                                focusedIndex === absoluteIndex ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {field.type}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </>
                    ) : (
                      <ScrollArea className="h-[150px] bg-popover">
                        {groupFields.map((field, fieldIndex) => {
                          const absoluteIndex = getAbsoluteIndex(groupIndex, fieldIndex);
                          return (
                            <CommandItem
                              key={field.id}
                              value={field.id}
                              onSelect={() => onSelectItem(field.id)}
                              className={cn(
                                "cursor-pointer transition-colors text-popover-foreground hover:bg-accent hover:text-accent-foreground my-1 px-2 py-2 rounded-md",
                                focusedIndex === absoluteIndex ? "bg-primary text-primary-foreground font-medium border-l-4 border-primary shadow-sm" : ""
                              )}
                              onMouseEnter={() => setFocusedIndex(absoluteIndex)}
                            >
                              <span className={cn(
                                "mr-2",
                                focusedIndex === absoluteIndex ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {getFieldTypeIcon(field.type)}
                              </span>
                              <span>{field.label}</span>
                              <span className={cn(
                                "ml-auto text-xs",
                                focusedIndex === absoluteIndex ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {field.type}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </ScrollArea>
                    )}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </div>
        </div>
      </Command>
    </div>
  );
} 