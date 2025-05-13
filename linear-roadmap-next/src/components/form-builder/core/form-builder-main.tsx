"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import validator from 'validator';
import { CursorStyleFix } from "../mentions/cursor-style-fix";
import { FormToolbar } from "./form-toolbar";
import { FormPreview } from "./form-preview";
import { FieldEditor } from "../fields/field-editor";
import { LinearSettings } from "../linear/linear-settings";
import { MentionPopup } from "../mentions/mention-popup";
import { updateMentionPositions, processMentionSelection } from "../mentions/mention-utils";
import { getDefaultPlaceholder, createNewField } from "../utils/field-utils";
import { updateField, removeField as removeFieldOp, addOption, removeOption, updateOption } from "../utils/field-operations";
import type { FieldType, FormField, FieldMention, MentionMenuState, LinearIntegrationSettings } from "./types";

// ========== FORM BUILDER COMPONENT ==========
export default function FormBuilder() {
  // ===== STATE MANAGEMENT =====
  // Form field state
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
  
  // Linear integration state
  const [linearSettings, setLinearSettings] = useState<LinearIntegrationSettings>({
    issueType: 'customer_request',
    team: '',
    includeCustomerInfo: true,
    defaultTitle: 'Customer Request: {title}',
    responseMessage: 'Thank you for your request! We will review it shortly.',
  });
  
  // UI state
  const [activeField, setActiveField] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [showLinearSettings, setShowLinearSettings] = useState(false);
  const [disableSearchByDefault, setDisableSearchByDefault] = useState(true);
  
  // Mention system state
  const [mentionMenu, setMentionMenu] = useState<MentionMenuState>({
    isOpen: false,
    inputId: null,
    position: { top: 0, left: 0 },
    searchTerm: "",
  });
  const [mentions, setMentions] = useState<Record<string, FieldMention[]>>({});
  
  // Validation state
  const [emailValidation, setEmailValidation] = useState<{
    [key: string]: { isValid: boolean | null; message: string }
  }>({});
  
  // ===== REFS =====
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const formContainerRef = useRef<HTMLDivElement>(null);
  const formFieldsRef = useRef<HTMLFormElement>(null);

  // ===== DRAG AND DROP SETUP =====
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ===== FIELD OPERATIONS =====
  // Add a new field
  const handleAddField = () => {
    const newField = createNewField(newFieldType);
    setFields([...fields, newField]);
    setActiveField(newField.id);
  };
  
  // Remove a field
  const handleRemoveField = (id: string) => {
    const { updatedFields, newActiveField } = removeFieldOp(fields, id, activeField);
    setFields(updatedFields);
    setActiveField(newActiveField);
  };
  
  // Update a field
  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(updateField(fields, id, updates));
  };
  
  // Save the form
  const handleSaveForm = () => {
    console.log("Saving form:", { fields, linearSettings });
    // API call or other logic for saving would go here
  };

  // ===== VALIDATION =====
  // Email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const value = e.target.value;
    
    // Update the field
    handleUpdateField(fieldId, { placeholder: value });
    
    // Skip validation if empty
    if (!value) {
      setEmailValidation(prev => ({
        ...prev,
        [fieldId]: { isValid: null, message: '' }
      }));
      return;
    }
    
    // Validate email
    const isValid = validator.isEmail(value);
    setEmailValidation(prev => ({
      ...prev,
      [fieldId]: {
        isValid,
        message: isValid ? 'Valid email format' : 'Invalid email format'
      }
    }));
  };
  
  // ===== MENTION SYSTEM =====
  // Handle @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => {
    const inputElement = e.target;
    const value = inputElement.value;
    const caretPosition = inputElement.selectionStart || 0;
    
    // Check for @ symbol and show mention menu if needed
    detectAndPositionMentionMenu(inputElement, value, caretPosition, fieldId);
    
    // Update field or linear settings based on the field ID
    updateFieldOrSettingValue(fieldId, value);
    
    // Update mentions positions when text changes
    const updatedMentions = updateMentionPositions(value, mentions[fieldId] || []);
    setMentions(prev => ({
      ...prev,
      [fieldId]: updatedMentions
    }));
  };
  
  // Helper: Detect @ and position the mention menu
  const detectAndPositionMentionMenu = (
    inputElement: HTMLInputElement | HTMLTextAreaElement, 
    value: string, 
    caretPosition: number, 
    fieldId: string
  ) => {
    const textBeforeCaret = value.substring(0, caretPosition);
    const atSymbolIndex = textBeforeCaret.lastIndexOf('@');
    
    // Check if @ is already processed
    const hasZeroWidthSpace = atSymbolIndex > -1 && 
      value.charAt(atSymbolIndex + 1) === '\u200D';
    
    if (atSymbolIndex !== -1 && !hasZeroWidthSpace && 
       (atSymbolIndex === 0 || textBeforeCaret[atSymbolIndex - 1] === ' ')) {
      // Found unprocessed @ symbol, show mention menu
      const searchTerm = textBeforeCaret.substring(atSymbolIndex + 1).toLowerCase();
      
      console.log('@ detected at index:', atSymbolIndex);
      
      // Get input element's position
      const inputRect = inputElement.getBoundingClientRect();
      const isTextarea = inputElement.tagName.toLowerCase() === 'textarea';
      const containerRect = formContainerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      const computedStyle = window.getComputedStyle(inputElement);
      
      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.font = computedStyle.font;
      tempSpan.style.fontSize = computedStyle.fontSize;
      tempSpan.style.fontFamily = computedStyle.fontFamily;
      tempSpan.style.letterSpacing = computedStyle.letterSpacing;
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'pre';
      
      let top, left;
      
      if (isTextarea) {
        // For textareas, position based on line breaks
        const lines = textBeforeCaret.split('\n');
        const lineBreaks = lines.length - 1;
        const currentLine = lines[lineBreaks];
        const lineHeight = parseInt(computedStyle.lineHeight) || 20;
        
        // Find position of @ in current line
        const atPosInCurrentLine = currentLine.indexOf('@');
        if (atPosInCurrentLine >= 0) {
          // Measure width of text up to @
          tempSpan.textContent = currentLine.substring(0, atPosInCurrentLine + 1); // Include @ for exact positioning
          document.body.appendChild(tempSpan);
          const atWidth = tempSpan.getBoundingClientRect().width;
          document.body.removeChild(tempSpan);
          
          // Calculate precise position
          const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
          // Position to the right of @ symbol with some vertical offset for textarea
          top = inputRect.top - containerRect.top + (lineBreaks * lineHeight) + 5;
          left = inputRect.left - containerRect.left + paddingLeft + atWidth + 2; // Position to right of @ symbol
        } else {
          // Fallback
          top = inputRect.top - containerRect.top + (lineBreaks * lineHeight) + 5;
          left = inputRect.left - containerRect.left + 20;
        }
      } else {
        // For regular inputs
        // Measure width of text up to @
        tempSpan.textContent = textBeforeCaret.substring(0, atSymbolIndex + 1); // Include @ for exact positioning
        document.body.appendChild(tempSpan);
        const atWidth = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);
        
        const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
        // For inputs, position to the right of @ at the same vertical level
        top = inputRect.top - containerRect.top + (inputRect.height / 2) - 15; // Vertically center, with slight adjustment
        left = inputRect.left - containerRect.left + paddingLeft + atWidth + 2; // Position to right of @ symbol
      }
      
      console.log('Input rect:', inputRect);
      console.log('Container rect:', containerRect);
      console.log('Positioning popup at:', { top, left });
      
      setMentionMenu({
        isOpen: true,
        inputId: fieldId,
        position: { top, left },
        searchTerm,
      });
    } else if (mentionMenu.isOpen && mentionMenu.inputId === fieldId) {
      // Close the menu if there's no @ before the caret
      setMentionMenu({ ...mentionMenu, isOpen: false });
    }
  };
  
  // Helper: Calculate mention menu position
  const calculateMentionMenuPosition = (
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    textBeforeCaret: string,
    atSymbolIndex: number
  ) => {
    // Create temporary measurement span
    const tempSpan = document.createElement('span');
    tempSpan.style.font = window.getComputedStyle(inputElement).font;
    tempSpan.style.position = 'absolute';
    tempSpan.style.visibility = 'hidden';
    tempSpan.textContent = textBeforeCaret.substring(0, atSymbolIndex + 1);
    document.body.appendChild(tempSpan);
    
    const inputRect = inputElement.getBoundingClientRect();
    const textWidth = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);
    
    // Calculate offsets for textarea vs input
    const isTextarea = inputElement.tagName.toLowerCase() === 'textarea';
    const lineHeight = parseInt(window.getComputedStyle(inputElement).lineHeight) || 20;
    const linesBefore = isTextarea ? textBeforeCaret.split('\n').length - 1 : 0;
    
    // Calculate position in current line for textarea
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
    
    return {
      top: inputRect.top + (isTextarea ? linesBefore * lineHeight + lineHeight : inputRect.height),
      left: inputRect.left + (isTextarea && lastNewlineIndex !== -1 ? textWidthInCurrentLine : textWidth),
    };
  };
  
  // Helper: Update field or linear settings value
  const updateFieldOrSettingValue = (fieldId: string, value: string) => {
    if (fieldId === 'response_message') {
      setLinearSettings({...linearSettings, responseMessage: value});
    } else if (fieldId === 'default_title') {
      setLinearSettings({...linearSettings, defaultTitle: value});
    } else {
      // It's a regular form field
      handleUpdateField(fieldId, { placeholder: value });
    }
  };
  
  // Handle mention selection
  const handleMentionSelect = (selectedFieldId: string) => {
    if (!mentionMenu.inputId) return;
    
    const inputElement = inputRefs.current.get(mentionMenu.inputId);
    if (!inputElement) return;
    
    const currentInputId = mentionMenu.inputId; 
    const currentSearchTerm = mentionMenu.searchTerm;

    // Close menu immediately
    setMentionMenu({
      isOpen: false,
      inputId: null,
      position: { top: 0, left: 0 },
      searchTerm: ""
    });
    
    // Process mention selection
    try {
      const value = inputElement.value;
      const caretPosition = inputElement.selectionStart || 0;
      
      const { newValue, newCaretPosition, mention } = processMentionSelection(
        selectedFieldId,
        fields,
        value,
        caretPosition,
        currentSearchTerm
      );
      
      // Update input and state
      inputElement.value = newValue;
      inputElement.focus();
      inputElement.setSelectionRange(newCaretPosition, newCaretPosition);
      
      // Update mentions state
      setMentions(prev => {
        const fieldMentions = prev[currentInputId] || [];
        return {
          ...prev,
          [currentInputId]: [...fieldMentions, mention]
        };
      });
      
      // Update field or settings value
      updateFieldOrSettingValue(currentInputId, newValue);
    } catch (error) {
      console.error("Error processing mention selection:", error);
    }
  };

  // Handle mention removal
  const handleRemoveMention = (
    fieldId: string,
    mentionId: string,
    mentionStartPos: number,
    mentionEndPos: number
  ) => {
    // Update mentions list
    setMentions(prev => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter(m => 
        !(m.id === mentionId && m.startPos === mentionStartPos))
    }));
    
    // Get current value and remove the mention
    let currentValue = '';
    if (fieldId === 'response_message') {
      currentValue = linearSettings.responseMessage;
    } else if (fieldId === 'default_title') {
      currentValue = linearSettings.defaultTitle;
    } else {
      const field = fields.find(f => f.id === fieldId);
      currentValue = field?.placeholder || '';
    }
    
    const newValue = currentValue.substring(0, mentionStartPos) + 
      currentValue.substring(mentionEndPos);
    
    // Update field or settings
    updateFieldOrSettingValue(fieldId, newValue);
    
    // Update input element
    const inputEl = inputRefs.current.get(fieldId);
    if (inputEl) {
      inputEl.value = newValue;
      inputEl.focus();
      inputEl.setSelectionRange(mentionStartPos, mentionStartPos);
    }
  };

  // Handle keyboard events (esp. for deleting mentions)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => {
    const inputElement = e.currentTarget;
    const value = inputElement.value;
    const caretPosition = inputElement.selectionStart || 0;
    
    // Handle backspace for badge removal
    if (e.key === 'Backspace' && caretPosition > 0) {
      // Check if the previous character is our marker
      if (value.charAt(caretPosition - 1) === '\u200D') {
        e.preventDefault(); // Prevent default backspace behavior
        
        // Find and remove the mention
        const fieldMentions = mentions[fieldId] || [];
        const mentionIndex = fieldMentions.findIndex(mention => 
          mention.startPos === caretPosition - 1);
        
        if (mentionIndex !== -1) {
          const mention = fieldMentions[mentionIndex];
          handleRemoveMention(fieldId, mention.id, mention.startPos, mention.endPos);
        }
      }
    }
  };

  // Close mention menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionMenu.isOpen) {
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

  // ===== RENDER =====
  return (
    <div className="relative bg-background text-foreground form-builder-container" ref={formContainerRef}>
      <CursorStyleFix />
      
      {/* Toolbar */}
      <FormToolbar 
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        onAddField={handleAddField}
        onSave={handleSaveForm}
      />
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Form preview panel */}
        <div className="lg:col-span-7">
          <FormPreview 
            fields={fields}
            activeField={activeField}
            setActiveField={setActiveField}
            setFields={setFields}
            emailValidation={emailValidation}
            sensors={sensors}
            formFieldsRef={formFieldsRef}
          />
        </div>
        
        {/* Field editor panel */}
        <div className="lg:col-span-5">
          <FieldEditor 
            activeField={activeField}
            fields={fields}
            onUpdateField={handleUpdateField}
            onRemoveField={handleRemoveField}
            onAddOption={(fieldId) => setFields(addOption(fields, fieldId))}
            onRemoveOption={(fieldId, index) => setFields(removeOption(fields, fieldId, index))}
            onUpdateOption={(fieldId, index, value) => setFields(updateOption(fields, fieldId, index, value))}
            handleEmailChange={handleEmailChange}
            handleInputChange={handleInputChange}
            inputRefs={inputRefs}
            emailValidation={emailValidation}
          />
        </div>
      </div>
      
      {/* Linear integration settings */}
      <LinearSettings 
        linearSettings={linearSettings}
        setLinearSettings={setLinearSettings}
        showLinearSettings={showLinearSettings}
        setShowLinearSettings={setShowLinearSettings}
        mentions={mentions}
        disableSearchByDefault={disableSearchByDefault}
        setDisableSearchByDefault={setDisableSearchByDefault}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        handleRemoveMention={handleRemoveMention}
        inputRefs={inputRefs}
      />

      {/* Mention popup (shadcn Combobox) */}
      <MentionPopup 
        mentionMenu={mentionMenu}
        fields={fields}
        onSearchChange={(value) => setMentionMenu({...mentionMenu, searchTerm: value})}
        onSelectItem={handleMentionSelect}
        disableSearchByDefault={disableSearchByDefault}
      />
    </div>
  );
} 