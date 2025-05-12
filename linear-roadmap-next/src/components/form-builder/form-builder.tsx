"use client";

import React, { useState, useRef, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentionCombobox } from "@/components/ui/mention-combobox";

type FieldType = "text" | "textarea" | "select" | "checkbox" | "radio" | "email" | "phone" | "file" | "image";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, checkbox, radio
  countryCode?: string; // For phone fields
  acceptedFileTypes?: string; // For file/image fields (e.g., ".pdf,.docx" or "image/*")
  multiple?: boolean; // For file/image fields
  maxFileSize?: number; // In MB
}

// Interface for the @ mention context menu
interface MentionMenuState {
  isOpen: boolean;
  inputId: string | null;
  position: { top: number; left: number };
  searchTerm: string;
}

interface LinearIntegrationSettings {
  issueType: 'customer_request' | 'issue';
  team: string;
  project?: string;
  status?: string;
  labels?: string[];
  assignee?: string;
  includeCustomerInfo: boolean;
  defaultTitle: string;
  responseMessage: string;
}

export function FormBuilder() {
  const [fields, setFields] = useState<FormField[]>([
    {
      id: "title",
      type: "text",
      label: "Feature Title",
      placeholder: "Enter a title for your feature request",
      required: true,
    },
    {
      id: "description",
      type: "textarea",
      label: "Description",
      placeholder: "Describe the feature you'd like to see",
      required: true,
    },
  ]);
  
  const [linearSettings, setLinearSettings] = useState<LinearIntegrationSettings>({
    issueType: 'customer_request',
    team: '',
    includeCustomerInfo: true,
    defaultTitle: 'Customer Request: {title}',
    responseMessage: 'Thank you for your request! We will review it shortly.',
  });
  
  const [activeField, setActiveField] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [showLinearSettings, setShowLinearSettings] = useState(false);
  const [disableSearchByDefault, setDisableSearchByDefault] = useState(true);
  
  // State for the @ mention context menu
  const [mentionMenu, setMentionMenu] = useState<MentionMenuState>({
    isOpen: false,
    inputId: null,
    position: { top: 0, left: 0 },
    searchTerm: "",
  });
  
  // Ref for tracking input elements for @ mentions
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  // Ref for the form container to help with positioning
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Country codes for phone field
  const countryCodes = [
    { code: "+1", flag: "🇺🇸", name: "United States" },
    { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+61", flag: "🇦🇺", name: "Australia" },
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+86", flag: "🇨🇳", name: "China" },
    { code: "+49", flag: "🇩🇪", name: "Germany" },
    { code: "+33", flag: "🇫🇷", name: "France" },
    { code: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "+55", flag: "🇧🇷", name: "Brazil" },
    { code: "+7", flag: "🇷🇺", name: "Russia" },
  ];

  // Handle @ mention detection in input/textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => {
    const inputElement = e.target;
    const value = inputElement.value;
    const caretPosition = inputElement.selectionStart || 0;
    
    // Check if we have an @ symbol before the caret
    const textBeforeCaret = value.substring(0, caretPosition);
    const atSymbolIndex = textBeforeCaret.lastIndexOf('@');
    
    // Ignore @ within input if it's followed by a bracket - it's already a mention
    const isInsideMention = atSymbolIndex > 0 && 
      textBeforeCaret.substring(atSymbolIndex).match(/^\@«[^«»]+»/);
    
    if (atSymbolIndex !== -1 && !isInsideMention && 
       (atSymbolIndex === 0 || textBeforeCaret[atSymbolIndex - 1] === ' ')) {
      // We found an @ symbol, get the search term (if any)
      const searchTerm = textBeforeCaret.substring(atSymbolIndex + 1).toLowerCase();
      
      // Get exact position of the @ symbol for better positioning
      // This requires creating a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.font = window.getComputedStyle(inputElement).font;
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.textContent = textBeforeCaret.substring(0, atSymbolIndex + 1); // Include the @ symbol
      document.body.appendChild(tempSpan);
      
      const inputRect = inputElement.getBoundingClientRect();
      const textWidth = tempSpan.getBoundingClientRect().width;
      document.body.removeChild(tempSpan);
      
      // Calculate offsets based on input type
      const isTextarea = inputElement.tagName.toLowerCase() === 'textarea';
      const lineHeight = parseInt(window.getComputedStyle(inputElement).lineHeight) || 20;
      
      // Count newlines before the caret to calculate vertical offset for textareas
      const linesBefore = isTextarea 
        ? textBeforeCaret.split('\n').length - 1 
        : 0;
      
      // Get the position of the @ symbol in the current line for textareas
      const lastNewlineIndex = isTextarea ? textBeforeCaret.lastIndexOf('\n') : -1;
      const textWidthInCurrentLine = isTextarea && lastNewlineIndex !== -1 
        ? (() => {
            const lineText = textBeforeCaret.substring(lastNewlineIndex + 1, atSymbolIndex + 1);
            const lineSpan = document.createElement('span');
            lineSpan.style.font = window.getComputedStyle(inputElement).font;
            lineSpan.style.position = 'absolute';
            lineSpan.style.visibility = 'hidden';
            lineSpan.textContent = lineText;
            document.body.appendChild(lineSpan);
            const width = lineSpan.getBoundingClientRect().width;
            document.body.removeChild(lineSpan);
            return width;
          })()
        : textWidth;
      
      // Position the menu right after the @ symbol - using client coordinates (viewport position)
      // These coordinates are relative to the viewport and won't be affected by scrolling
      const position = {
        top: inputRect.top + (isTextarea ? linesBefore * lineHeight + lineHeight : inputRect.height),
        left: inputRect.left + (isTextarea && lastNewlineIndex !== -1 ? textWidthInCurrentLine : textWidth),
      };
      
      setMentionMenu({
        isOpen: true,
        inputId: fieldId,
        position,
        searchTerm,
      });
    } else {
      // Close the menu if there's no @ before the caret
      if (mentionMenu.isOpen && mentionMenu.inputId === fieldId) {
        setMentionMenu({ ...mentionMenu, isOpen: false });
      }
    }
    
    // Update field or linear settings based on the field ID
    if (fieldId === 'response_message') {
      setLinearSettings({...linearSettings, responseMessage: value});
    } else if (fieldId === 'default_title') {
      setLinearSettings({...linearSettings, defaultTitle: value});
    } else {
      // It's a regular form field
      updateField(fieldId, { placeholder: value });
    }
  };
  
  // Handle selection from the mention menu
  const handleMentionSelect = (selectedFieldId: string) => {
    console.log('Selected Field ID:', selectedFieldId);
    
    if (!mentionMenu.inputId) return;
    
    // Get the selected field label
    const selectedField = fields.find(f => f.id === selectedFieldId);
    console.log('Selected Field:', selectedField);
    if (!selectedField) return;
    
    // Get the input element
    const inputElement = inputRefs.current.get(mentionMenu.inputId);
    console.log('Input Element:', inputElement);
    if (!inputElement) return;
    
    // Store active inputId before clearing mentionMenu
    const currentInputId = mentionMenu.inputId; 
    const currentSearchTerm = mentionMenu.searchTerm;

    // Immediately close dropdown and clear all state to prevent 
    // any backspace or keyboard events going to search
    setMentionMenu({
      isOpen: false,
      inputId: null,
      position: { top: 0, left: 0 },
      searchTerm: ""
    });
    
    // After menu is completely closed, modify input
    setTimeout(() => {
      const value = inputElement.value;
      
      // Position of the last "@" typed by the user
      const atSymbolIndex = value.lastIndexOf("@");
      
      if (atSymbolIndex !== -1) {
        // Create a formatted reference with distinct syntax that won't trigger the menu again
        const formattedReference = `«${selectedField.label}» `;
        console.log('Formatted Reference:', formattedReference);
        
        // Replace the @searchTerm with the selected field reference
        const newValue =
          value.substring(0, atSymbolIndex) +
          formattedReference +
          value.substring(atSymbolIndex + 1 + currentSearchTerm.length);
        console.log('New Value:', newValue);
        
        // Directly set input value
        inputElement.value = newValue;
        
        // Set focus and correct caret position
        inputElement.focus();
        const newCaretPosition = atSymbolIndex + formattedReference.length;
        inputElement.setSelectionRange(newCaretPosition, newCaretPosition);
        
        // Update state after DOM is updated
        if (currentInputId === 'response_message') {
          setLinearSettings({...linearSettings, responseMessage: newValue});
        } else if (currentInputId === 'default_title') {
          setLinearSettings({...linearSettings, defaultTitle: newValue});
        } else {
          // For regular form fields, update the placeholder
          updateField(currentInputId, { placeholder: newValue });
        }
      }
    }, 0);
  };
  
  // Handle scrolling to keep mention menu positioned correctly
  useEffect(() => {
    const updateMentionMenuPosition = () => {
      if (mentionMenu.isOpen && mentionMenu.inputId) {
        const input = inputRefs.current.get(mentionMenu.inputId);
        if (!input) return;
        
        const value = input.value;
        const caretPosition = input.selectionStart || 0;
        
        // Find the @ symbol position
        const textBeforeCaret = value.substring(0, caretPosition);
        const atSymbolIndex = textBeforeCaret.lastIndexOf('@');
        
        if (atSymbolIndex !== -1) {
          // Recalculate position using the same logic as in handleInputChange
          const tempSpan = document.createElement('span');
          tempSpan.style.font = window.getComputedStyle(input).font;
          tempSpan.style.position = 'absolute';
          tempSpan.style.visibility = 'hidden';
          tempSpan.textContent = textBeforeCaret.substring(0, atSymbolIndex + 1);
          document.body.appendChild(tempSpan);
          
          const inputRect = input.getBoundingClientRect();
          const textWidth = tempSpan.getBoundingClientRect().width;
          document.body.removeChild(tempSpan);
          
          const isTextarea = input.tagName.toLowerCase() === 'textarea';
          const lineHeight = parseInt(window.getComputedStyle(input).lineHeight) || 20;
          const linesBefore = isTextarea ? textBeforeCaret.split('\n').length - 1 : 0;
          
          const lastNewlineIndex = isTextarea ? textBeforeCaret.lastIndexOf('\n') : -1;
          const textWidthInCurrentLine = isTextarea && lastNewlineIndex !== -1 
            ? (() => {
                const lineText = textBeforeCaret.substring(lastNewlineIndex + 1, atSymbolIndex + 1);
                const lineSpan = document.createElement('span');
                lineSpan.style.font = window.getComputedStyle(input).font;
                lineSpan.style.position = 'absolute';
                lineSpan.style.visibility = 'hidden';
                lineSpan.textContent = lineText;
                document.body.appendChild(lineSpan);
                const width = lineSpan.getBoundingClientRect().width;
                document.body.removeChild(lineSpan);
                return width;
              })()
            : textWidth;
          
          // Update position
          setMentionMenu({
            ...mentionMenu,
            position: {
              top: inputRect.top + (isTextarea ? linesBefore * lineHeight + lineHeight : inputRect.height),
              left: inputRect.left + (isTextarea && lastNewlineIndex !== -1 ? textWidthInCurrentLine : textWidth),
            }
          });
        }
      }
    };
    
    // Add scroll event listener
    window.addEventListener('scroll', updateMentionMenuPosition, true);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', updateMentionMenuPosition, true);
    };
  }, [mentionMenu]);

  // Close the mention menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionMenu.isOpen) {
        // Check if click is outside the mention menu
        const mentionMenuElement = document.querySelector('.mention-dropdown');
        if (mentionMenuElement && !mentionMenuElement.contains(e.target as Node)) {
          setMentionMenu({ ...mentionMenu, isOpen: false });
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mentionMenu]);

  // Default accepted file types
  const defaultFileTypes = {
    file: ".pdf,.doc,.docx,.txt,.zip",
    image: "image/*",
  };

  // Add a new field
  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: newFieldType,
      label: `New ${newFieldType.charAt(0).toUpperCase() + newFieldType.slice(1)} Field`,
      placeholder: getDefaultPlaceholder(newFieldType),
      required: false,
      options: newFieldType === "select" || newFieldType === "radio" || newFieldType === "checkbox" 
        ? ["Option 1", "Option 2"] 
        : undefined,
      countryCode: newFieldType === "phone" ? "+1" : undefined,
      acceptedFileTypes: newFieldType === "file" ? defaultFileTypes.file : 
                        newFieldType === "image" ? defaultFileTypes.image : undefined,
      multiple: newFieldType === "file" || newFieldType === "image" ? false : undefined,
      maxFileSize: newFieldType === "file" || newFieldType === "image" ? 5 : undefined, // 5MB default
    };
    
    setFields([...fields, newField]);
    setActiveField(newField.id);
  };

  // Get default placeholder based on field type
  const getDefaultPlaceholder = (type: FieldType): string => {
    switch (type) {
      case "email":
        return "email@example.com";
      case "phone":
        return "Phone number";
      case "text":
        return "Enter text";
      case "textarea":
        return "Enter details here";
      case "file":
        return "Select a file";
      case "image":
        return "Select an image";
      default:
        return "";
    }
  }

  // Remove a field by id
  const removeField = (id: string) => {
    // Don't allow removing title and description
    if (id === "title" || id === "description") return;
    
    setFields(fields.filter(field => field.id !== id));
    if (activeField === id) {
      setActiveField(null);
    }
  };

  // Update a field property
  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  // Update option for select/checkbox/radio fields
  const updateOption = (fieldId: string, index: number, value: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options) {
        const newOptions = [...field.options];
        newOptions[index] = value;
        return { ...field, options: newOptions };
      }
      return field;
    }));
  };

  // Add an option to a select/checkbox/radio field
  const addOption = (fieldId: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options) {
        return { ...field, options: [...field.options, `Option ${field.options.length + 1}`] };
      }
      return field;
    }));
  };

  // Remove an option from a select/checkbox/radio field
  const removeOption = (fieldId: string, index: number) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && field.options && field.options.length > 1) {
        const newOptions = [...field.options];
        newOptions.splice(index, 1);
        return { ...field, options: newOptions };
      }
      return field;
    }));
  };

  // Get file type description for display
  const getFileTypeDescription = (acceptedTypes: string): string => {
    if (acceptedTypes === "image/*") return "Images";
    if (acceptedTypes === ".pdf,.doc,.docx,.txt,.zip") return "Documents";
    
    // Create user-friendly description based on extensions
    const types = acceptedTypes.split(',').map(t => t.trim());
    const typeNames = types.map(t => {
      if (t === ".pdf") return "PDF";
      if (t === ".doc" || t === ".docx") return "Word";
      if (t === ".txt") return "Text";
      if (t === ".zip") return "ZIP";
      if (t === ".jpg" || t === ".jpeg") return "JPEG";
      if (t === ".png") return "PNG";
      if (t === ".gif") return "GIF";
      return t.replace(".", "").toUpperCase();
    });
    
    // Join with commas and "and" for the last one
    return typeNames.length <= 2 
      ? typeNames.join(" and ") 
      : typeNames.slice(0, -1).join(", ") + ", and " + typeNames[typeNames.length - 1];
  };

  // Helper function to highlight mentions in text
  const highlightMentions = (text: string) => {
    if (!text) return null;
    
    // Updated regex to find our mention format: «Label»
    const parts = text.split(/(«[^«»]+»)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('«') && part.endsWith('»')) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
            @{part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  // Render mention menu
  const renderMentionMenu = () => {
    if (!mentionMenu.isOpen) return null;
    
    console.log('Rendering mention menu:', { mentionMenu, fields });
    
    return (
      <div 
        className="fixed z-50 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-md mention-dropdown"
        style={{
          top: `${mentionMenu.position.top}px`,
          left: `${mentionMenu.position.left}px`,
        }}
      >
        <MentionCombobox
          fields={fields}
          inputId={mentionMenu.inputId}
          searchTerm={mentionMenu.searchTerm}
          onSearchChange={(value) => setMentionMenu({...mentionMenu, searchTerm: value})}
          onSelectItem={handleMentionSelect}
          getFieldTypeIcon={getFieldTypeIcon}
          disableSearchByDefault={disableSearchByDefault}
        />
      </div>
    );
  };

  // Render form preview
  const renderFormPreview = () => {
    return (
      <div className="border border-border p-4 rounded bg-background">
        <h3 className="text-lg font-medium mb-4">Form Preview</h3>
        <form className="space-y-4">
          {fields.map(field => (
            <div 
              key={field.id} 
              className={`p-3 rounded-md border ${activeField === field.id ? 'border-primary' : 'border-border'}`}
              onClick={() => setActiveField(field.id)}
            >
              <label className="block mb-2 font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === "text" && (
                <div className="relative">
                <input 
                  type="text" 
                  placeholder={field.placeholder} 
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background" 
                  disabled
                />
                  {field.placeholder && field.placeholder.includes('@') && (
                    <div className="absolute inset-0 pointer-events-none p-2 flex items-center">
                      {highlightMentions(field.placeholder)}
                    </div>
                  )}
                </div>
              )}
              
              {field.type === "email" && (
                <input 
                  type="email" 
                  placeholder={field.placeholder} 
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background" 
                  disabled
                />
              )}
              
              {field.type === "phone" && (
                <div className="flex">
                  <div className="w-24 flex-shrink-0">
                    <select 
                      className="w-full p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" 
                      disabled
                    >
                      {countryCodes.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input 
                    type="tel" 
                    placeholder={field.placeholder} 
                    className="flex-1 p-2 border border-l-0 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background" 
                    disabled
                  />
                </div>
              )}
              
              {field.type === "textarea" && (
                <div className="relative">
                <textarea 
                  placeholder={field.placeholder} 
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background" 
                  rows={3}
                  disabled
                />
                  {field.placeholder && field.placeholder.includes('@') && (
                    <div className="absolute inset-0 pointer-events-none p-2">
                      {highlightMentions(field.placeholder)}
                    </div>
                  )}
                </div>
              )}
              
              {field.type === "select" && (
                <select 
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  disabled
                >
                  <option value="">Select an option</option>
                  {field.options?.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              )}
              
              {field.type === "checkbox" && field.options?.map((option, index) => (
                <div key={index} className="flex items-center mt-2">
                  <input 
                    type="checkbox" 
                    id={`${field.id}_${index}`} 
                    className="mr-2" 
                    disabled 
                  />
                  <label htmlFor={`${field.id}_${index}`}>{option}</label>
                </div>
              ))}
              
              {field.type === "radio" && field.options?.map((option, index) => (
                <div key={index} className="flex items-center mt-2">
                  <input 
                    type="radio" 
                    id={`${field.id}_${index}`} 
                    name={field.id}
                    className="mr-2" 
                    disabled 
                  />
                  <label htmlFor={`${field.id}_${index}`}>{option}</label>
                </div>
              ))}
              
              {field.type === "file" && (
                <div>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V8m0 0-3 3m3-3 3 3"/>
                        </svg>
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span>{field.multiple ? " files" : ""}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {field.acceptedFileTypes ? getFileTypeDescription(field.acceptedFileTypes) : "Any file"}
                          {field.maxFileSize ? ` (Max: ${field.maxFileSize}MB)` : ""}
                        </p>
                      </div>
                      <input type="file" className="hidden" disabled />
                    </label>
                  </div>
                </div>
              )}
              
              {field.type === "image" && (
                <div>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 1v4m0 0 3-3m-3 3L7 2m10 3v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3M7 8h.01M12 8h.01M7 12h.01M12 12h.01M17 12h.01M17 8h.01"/>
                        </svg>
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span>{field.multiple ? " images" : " an image"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {field.maxFileSize ? `Max: ${field.maxFileSize}MB` : ""}
                        </p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" disabled />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </form>
      </div>
    );
  };

  // Render field properties editor
  const renderFieldEditor = () => {
    const field = fields.find(f => f.id === activeField);
    
    if (!field) {
      return (
        <div className="p-4 border border-border rounded bg-muted text-center">
          <p>Select a field to edit its properties</p>
        </div>
      );
    }
    
    return (
      <div className="border border-border p-4 rounded bg-background">
        <h3 className="text-lg font-medium mb-4">Field Properties</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Label</label>
            <input 
              type="text" 
              value={field.label} 
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
            />
          </div>
          
          {(field.type === "text" || field.type === "email" || field.type === "phone") && (
            <div>
              <label className="block mb-2 font-medium">Placeholder</label>
              <input 
                type="text" 
                value={field.placeholder || ""} 
                onChange={(e) => handleInputChange(e, field.id)}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set(field.id, el);
                  } else {
                    inputRefs.current.delete(field.id);
                  }
                }}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Type @ to reference other fields</p>
            </div>
          )}
          
          {field.type === "textarea" && (
            <div>
              <label className="block mb-2 font-medium">Placeholder</label>
              <textarea 
                value={field.placeholder || ""} 
                onChange={(e) => handleInputChange(e, field.id)}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set(field.id, el);
                  } else {
                    inputRefs.current.delete(field.id);
                  }
                }}
                rows={3}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Type @ to reference other fields</p>
            </div>
          )}
          
          {field.type === "phone" && (
            <div>
              <label className="block mb-2 font-medium">Default Country Code</label>
              <select 
                value={field.countryCode || "+1"}
                onChange={(e) => updateField(field.id, { countryCode: e.target.value })}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                {countryCodes.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.code} - {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {(field.type === "file" || field.type === "image") && (
            <>
              <div>
                <label className="block mb-2 font-medium">
                  {field.type === "file" ? "Accepted File Types" : "Accepted Image Types"}
                </label>
                <input 
                  type="text" 
                  value={field.acceptedFileTypes || ""} 
                  onChange={(e) => updateField(field.id, { acceptedFileTypes: e.target.value })}
                  placeholder={field.type === "file" ? ".pdf,.doc,.txt" : "image/jpeg,image/png"}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {field.type === "file" 
                    ? "Comma-separated file extensions or MIME types" 
                    : "Use 'image/*' for all images or specific types like 'image/jpeg,image/png'"}
                </p>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Max File Size (MB)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={field.maxFileSize || 5} 
                  onChange={(e) => updateField(field.id, { maxFileSize: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="multiple" 
                  checked={field.multiple || false} 
                  onChange={(e) => updateField(field.id, { multiple: e.target.checked })}
                  className="mr-2" 
                />
                <label htmlFor="multiple">Allow multiple files</label>
              </div>
            </>
          )}
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="required" 
              checked={field.required} 
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              className="mr-2" 
            />
            <label htmlFor="required">Required field</label>
          </div>
          
          {(field.type === "select" || field.type === "checkbox" || field.type === "radio") && field.options && (
            <div>
              <label className="block mb-2 font-medium">Options</label>
              {field.options.map((option, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input 
                    type="text" 
                    value={option} 
                    onChange={(e) => updateOption(field.id, index, e.target.value)}
                    className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeOption(field.id, index); }}
                    className="ml-2 p-2 text-red-500 hover:text-red-700"
                    disabled={field.options && field.options.length <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button 
                onClick={(e) => { e.stopPropagation(); addOption(field.id); }}
                className="text-sm text-primary hover:text-primary/80 mt-2"
              >
                + Add Option
              </button>
            </div>
          )}
          
          {/* Only show remove button for custom fields, not for title and description */}
          {field.id !== "title" && field.id !== "description" && (
            <button 
              onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
              className="mt-4 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Remove Field
            </button>
          )}
        </div>
      </div>
    );
  };

  // Add a function to render the Linear settings
  const renderLinearSettings = () => {
    return (
      <div className="border border-border p-4 rounded bg-background mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Linear Integration Settings</h3>
          <button 
            onClick={() => setShowLinearSettings(!showLinearSettings)}
            className="text-sm text-primary hover:text-primary/80"
          >
            {showLinearSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>
        
        {showLinearSettings && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Submit As</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="issueType"
                    checked={linearSettings.issueType === 'customer_request'} 
                    onChange={() => setLinearSettings({...linearSettings, issueType: 'customer_request'})}
                    className="mr-2" 
                  />
                  Customer Request
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="issueType"
                    checked={linearSettings.issueType === 'issue'} 
                    onChange={() => setLinearSettings({...linearSettings, issueType: 'issue'})}
                    className="mr-2" 
                  />
                  Issue
                </label>
              </div>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Team</label>
              <select 
                value={linearSettings.team}
                onChange={(e) => setLinearSettings({...linearSettings, team: e.target.value})}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="">Select a team</option>
                <option value="team1">Engineering</option>
                <option value="team2">Product</option>
                <option value="team3">Design</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Teams will be loaded from Linear</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Project (Optional)</label>
              <select 
                value={linearSettings.project || ''}
                onChange={(e) => setLinearSettings({...linearSettings, project: e.target.value || undefined})}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="">No project</option>
                <option value="project1">Website Redesign</option>
                <option value="project2">Mobile App</option>
                <option value="project3">API Integration</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Projects will be loaded from Linear</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Initial Status (Optional)</label>
              <select 
                value={linearSettings.status || ''}
                onChange={(e) => setLinearSettings({...linearSettings, status: e.target.value || undefined})}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="">Default status</option>
                <option value="status1">Backlog</option>
                <option value="status2">Todo</option>
                <option value="status3">In Progress</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Statuses will be loaded from Linear</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Labels (Optional)</label>
              <div className="border rounded-md p-2 bg-background">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    Customer Request
                    <button type="button" className="ml-1 inline-flex items-center justify-center">
                      <span className="sr-only">Remove</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                </div>
                <div className="flex items-center border-t pt-2">
                  <input 
                    type="text" 
                    className="flex-1 p-1 bg-background border-0 focus:ring-0 text-sm" 
                    placeholder="Search and add labels..."
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Labels will be loaded from Linear</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Default Assignee (Optional)</label>
              <select 
                value={linearSettings.assignee || ''}
                onChange={(e) => setLinearSettings({...linearSettings, assignee: e.target.value || undefined})}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              >
                <option value="">Unassigned</option>
                <option value="me">Me (Current User)</option>
                <option value="user1">John Doe</option>
                <option value="user2">Jane Smith</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Team members will be loaded from Linear</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Default Title Format</label>
              <div className="relative">
              <input 
                type="text" 
                value={linearSettings.defaultTitle}
                onChange={(e) => handleInputChange(e, 'default_title')}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set('default_title', el);
                  } else {
                    inputRefs.current.delete('default_title');
                  }
                }}
                placeholder="Customer Request: {title}"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              />
                {linearSettings.defaultTitle && linearSettings.defaultTitle.includes('@') && (
                  <div className="absolute inset-0 pointer-events-none p-2 flex items-center">
                    {highlightMentions(linearSettings.defaultTitle)}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use {'{title}'} to include the submitted title. Type @ to reference form fields.</p>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Response Message</label>
              <div className="relative border rounded-md overflow-hidden border-border">
                <div className="flex gap-1 border-b border-border bg-gray-50 dark:bg-gray-800 p-1">
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('**')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Bold"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 10.5H21M13.5 6.5H21M3 10.5H7.5C9 10.5 10.5 9 10.5 7.5C10.5 6 9 4.5 7.5 4.5H3v6M3 19.5h4.5c1.5 0 3-1.5 3-3 0-1.5-1.5-3-3-3H3v6z"></path>
                    </svg>
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('*')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Italic"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4.5h3m4 0h-3m-4 15h3m4 0h-3m-7-7.5L14 4.5m0 15L7 12"></path>
                    </svg>
                  </button>
                  <div className="h-full w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('- ')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Bulleted List"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h7"></path>
                    </svg>
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('1. ')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Numbered List"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12.5h10.5m-10.5-6h10.5m-10.5 12h10.5M3 18.5v-3l-1 1v-1l1-1v-3m2 1v-1l-2 2v-1l2-2v-1m0-2v-1l-2 2v-1l2-2v-1"></path>
                    </svg>
                  </button>
                  <div className="h-full w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('[](url)')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertMarkdown('# ')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200" 
                    title="Heading"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h12m-6-6v12"></path>
                    </svg>
                  </button>
                </div>
              <textarea 
                value={linearSettings.responseMessage}
                onChange={(e) => handleInputChange(e, 'response_message')}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set('response_message', el);
                  } else {
                    inputRefs.current.delete('response_message');
                  }
                }}
                placeholder="Thank you for your feedback!"
                rows={5}
                className="w-full p-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" 
              />
                {linearSettings.responseMessage && linearSettings.responseMessage.includes('@') && (
                  <div className="absolute inset-0 pointer-events-none p-2 pt-10">
                    {highlightMentions(linearSettings.responseMessage)}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Shown to users after form submission. Type @ to reference form fields. 
                Supports Markdown formatting.
              </p>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="includeCustomerInfo" 
                checked={linearSettings.includeCustomerInfo} 
                onChange={(e) => setLinearSettings({...linearSettings, includeCustomerInfo: e.target.checked})}
                className="mr-2" 
              />
              <label htmlFor="includeCustomerInfo">Include customer contact information (if provided)</label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="disableSearchByDefault" 
                checked={disableSearchByDefault} 
                onChange={(e) => setDisableSearchByDefault(e.target.checked)}
                className="mr-2" 
              />
              <label htmlFor="disableSearchByDefault">Disable search box focus by default in field references</label>
              <div className="ml-2 text-muted-foreground">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="feather feather-info"
                  aria-label="When enabled, the search box won't automatically receive focus when the field reference menu appears."
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get icon for field type
  const getFieldTypeIcon = (type: FieldType) => {
    switch (type) {
      case "text":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v18m3-6h3"></path>
          </svg>
        );
      case "email":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        );
      case "phone":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
        );
      case "textarea":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
          </svg>
        );
      case "select":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
          </svg>
        );
      case "checkbox":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        );
      case "radio":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
            <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
          </svg>
        );
      case "file":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        );
      case "image":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };

  // Markdown editing functions
  const insertMarkdown = (pattern: string) => {
    const input = inputRefs.current.get('response_message');
    if (!input) return;
    
    const value = input.value;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Get selected text
    const selectedText = value.substring(start, end);
    
    // Format based on pattern
    let formatted = '';
    let newCursorPos = 0;
    
    if (pattern === '**') {
      // Bold
      formatted = `**${selectedText}**`;
      newCursorPos = end + 4;
    } else if (pattern === '*') {
      // Italic
      formatted = `*${selectedText}*`;
      newCursorPos = end + 2;
    } else if (pattern === '- ') {
      // List item
      formatted = `- ${selectedText}`;
      newCursorPos = end + 2;
    } else if (pattern === '1. ') {
      // Numbered list
      formatted = `1. ${selectedText}`;
      newCursorPos = end + 3;
    } else if (pattern === '[](url)') {
      // Link
      formatted = `[${selectedText}](url)`;
      newCursorPos = end + 7;
    } else if (pattern === '# ') {
      // Heading
      formatted = `# ${selectedText}`;
      newCursorPos = end + 2;
    }
    
    // Insert formatted text
    const newValue = value.substring(0, start) + formatted + value.substring(end);
    setLinearSettings({...linearSettings, responseMessage: newValue});
    
    // Focus and set cursor position
    setTimeout(() => {
      if (input) {
        input.focus();
        
        // If text was selected, position cursor at the end of the formatted text
        // Otherwise, position it inside the formatting tokens (like between ** and **)
        const newPosition = selectedText ? newCursorPos : start + pattern.length;
        input.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <div className="relative" ref={formContainerRef}>
      <div className="flex justify-between mb-6">
        <div className="flex items-center">
          <select 
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as FieldType)}
            className="p-2 border rounded-md mr-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="phone">Phone Number</option>
            <option value="textarea">Text Area</option>
            <option value="select">Dropdown</option>
            <option value="checkbox">Checkboxes</option>
            <option value="radio">Radio Buttons</option>
            <option value="file">File Upload</option>
            <option value="image">Image Upload</option>
          </select>
          <button 
            onClick={addField}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Field
          </button>
        </div>
        
        <button 
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Save Form
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          {renderFormPreview()}
        </div>
        <div className="lg:col-span-5">
          {renderFieldEditor()}
        </div>
      </div>
      
      <div className="mt-6">
        {renderLinearSettings()}
      </div>
      
      {/* Render the mention menu */}
      {renderMentionMenu()}
    </div>
  );
} 