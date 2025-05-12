"use client";

import React from 'react';
import { FormField, FieldMention } from './types';

interface FieldCardProps {
  field: FormField;
  isActive: boolean;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  onActive: () => void;
  getFileTypeDescription: (acceptedTypes: string) => string;
  highlightMentions: (text: string, mentions?: FieldMention[]) => React.ReactNode;
}

export function FieldCard({
  field,
  isActive,
  emailValidation,
  onActive,
  getFileTypeDescription,
  highlightMentions
}: FieldCardProps) {
  // Handle display based on field type
  const renderFieldPreview = () => {
    switch (field.type) {
      case "text":
      case "email":
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border rounded bg-input"
            readOnly
          />
        );
      
      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border rounded bg-input resize-none h-24"
            readOnly
          />
        );
        
      case "select":
        return (
          <select className="w-full px-3 py-2 border border-border rounded bg-input">
            <option value="">{field.placeholder || "Select an option"}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {highlightMentions(option)}
              </option>
            ))}
          </select>
        );
        
      case "checkbox":
      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input 
                  type={field.type}
                  name={`field_${field.id}`}
                  id={`field_${field.id}_${index}`}
                  className="h-4 w-4"
                  readOnly
                />
                <label htmlFor={`field_${field.id}_${index}`} className="text-sm">
                  {highlightMentions(option)}
                </label>
              </div>
            ))}
          </div>
        );
        
      case "phone":
        return (
          <div className="flex">
            <div className="bg-muted px-3 py-2 border border-r-0 border-border rounded-l text-sm text-muted-foreground">
              {field.countryCode || "+1"}
            </div>
            <input
              type="tel"
              placeholder={field.placeholder}
              className="flex-1 px-3 py-2 border border-border rounded-r bg-input"
              readOnly
            />
          </div>
        );
        
      case "file":
      case "image":
        return (
          <div className="w-full px-3 py-4 border border-dashed border-border rounded bg-input text-center">
            <p className="text-sm text-muted-foreground">
              {field.placeholder || `Upload ${field.type === "image" ? "image" : "file"}`}
            </p>
            {field.acceptedFileTypes && (
              <p className="text-xs text-muted-foreground mt-1">
                {getFileTypeDescription(field.acceptedFileTypes)}
                {field.maxFileSize && ` (Max: ${field.maxFileSize}MB)`}
              </p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  // Validation message for email fields
  const emailError = field.type === "email" && emailValidation[field.id]?.isValid === false
    ? emailValidation[field.id]?.message
    : null;

  return (
    <div 
      className={`p-4 border rounded transition-colors ${
        isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/20 bg-card'
      }`}
      onClick={onActive}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">
            {highlightMentions(field.label)}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </h4>
        </div>
        <div className="px-2 py-1 rounded bg-muted text-xs text-muted-foreground">
          {field.type}
        </div>
      </div>
      
      {renderFieldPreview()}
      
      {emailError && (
        <p className="mt-2 text-xs text-destructive">{emailError}</p>
      )}
    </div>
  );
} 