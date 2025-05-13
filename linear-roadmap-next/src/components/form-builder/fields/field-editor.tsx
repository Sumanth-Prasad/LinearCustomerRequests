"use client";

import React from "react";
import { FormField } from "../core/types";
import { Mail, Link } from "lucide-react";
import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input';
import en from 'react-phone-number-input/locale/en.json';
import { LexicalBadgeEditor } from "@/components/LexicalBadgeEditor";

interface FieldEditorProps {
  activeField: string | null;
  fields: FormField[];
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onRemoveField: (id: string) => void;
  onAddOption: (fieldId: string) => void;
  onRemoveOption: (fieldId: string, index: number) => void;
  onUpdateOption: (fieldId: string, index: number, value: string) => void;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
}

export function FieldEditor({
  activeField,
  fields,
  onUpdateField,
  onRemoveField,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  handleEmailChange,
  handleInputChange,
  inputRefs,
  emailValidation
}: FieldEditorProps) {
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
        {/* Field Label */}
        <div>
          <label className="block mb-2 font-medium">Label</label>
          <input 
            type="text" 
            value={field.label} 
            onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
          />
        </div>
        
        {/* Placeholder/Content Field - Different based on field type */}
        {(field.type === "text" || field.type === "textarea") && (
          <div>
            <label className="block mb-2 font-medium">Placeholder</label>
            <LexicalBadgeEditor
              value={field.placeholder || ""}
              onChange={(v) => onUpdateField(field.id, { placeholder: v })}
              fields={fields}
              placeholder="Type @ to reference other fields"
              className="border rounded-md p-2 bg-background text-foreground"
              fieldId={field.id}
            />
            <p className="text-xs text-muted-foreground mt-1">Type @ to reference other fields</p>
          </div>
        )}
        
        {/* Email Field */}
        {field.type === "email" && (
          <div>
            <label className="block mb-2 font-medium">Placeholder</label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <input 
                type="email" 
                value={field.placeholder || ""} 
                onChange={(e) => handleEmailChange(e, field.id)}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set(field.id, el);
                  } else {
                    inputRefs.current.delete(field.id);
                  }
                }}
                list={`domains-${field.id}`}
                className={`w-full pl-10 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none ${
                  emailValidation[field.id]?.isValid === false 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' 
                    : emailValidation[field.id]?.isValid === true
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/50'
                      : 'focus:border-primary border-border'
                }`}
              />
            </div>
          </div>
        )}
        
        {/* URL Field */}
        {field.type === "url" && (
          <div>
            <label className="block mb-2 font-medium">Placeholder</label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="h-4 w-4 text-muted-foreground" />
              </div>
              <input 
                type="url" 
                value={field.placeholder || ""} 
                onChange={(e) => handleInputChange(e, field.id)}
                ref={(el) => {
                  if (el) {
                    inputRefs.current.set(field.id, el);
                  } else {
                    inputRefs.current.delete(field.id);
                  }
                }}
                className="w-full pl-10 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              />
            </div>
          </div>
        )}
        
        {/* Phone Field */}
        {field.type === "phone" && (
          <div>
            <label className="block mb-2 font-medium">Default Country</label>
            <select 
              value={field.countryCode || "US"}
              onChange={(e) => onUpdateField(field.id, { countryCode: e.target.value as any })}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            >
              {getCountries().sort((a, b) => {
                const nameA = en[a] || a;
                const nameB = en[b] || b;
                return nameA.localeCompare(nameB);
              }).map((country) => {
                // For each country code, convert to flag emoji 
                const codePoints = [...country.toUpperCase()].map(
                  char => char.charCodeAt(0) + 127397
                );
                const flagEmoji = String.fromCodePoint(...codePoints);
                const countryName = en[country] || country;
                const callingCode = getCountryCallingCode(country);
                return (
                  <option key={country} value={country}>
                    {flagEmoji} {countryName} (+{callingCode})
                </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground mt-1">This sets the default country in the phone input.</p>
          </div>
        )}
        
        {/* Select/Checkbox/Radio Options */}
        {(field.type === "select" || field.type === "checkbox" || field.type === "radio") && field.options && (
          <div>
            <label className="block mb-2 font-medium">Options</label>
            {field.options.map((option, index) => (
              <div key={index} className="flex items-center mb-2">
                <input 
                  type="text" 
                  value={option} 
                  onChange={(e) => onUpdateOption(field.id, index, e.target.value)}
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                />
                <button 
                  onClick={() => onRemoveOption(field.id, index)}
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
              onClick={() => onAddOption(field.id)}
              className="text-sm text-primary hover:text-primary/80 mt-2"
            >
              + Add Option
            </button>
          </div>
        )}
        
        {/* File/Image Upload Settings */}
        {(field.type === "file" || field.type === "image") && (
          <>
            <div>
              <label className="block mb-2 font-medium">
                {field.type === "file" ? "Accepted File Types" : "Accepted Image Types"}
              </label>
              <input 
                type="text" 
                value={field.acceptedFileTypes || ""} 
                onChange={(e) => onUpdateField(field.id, { acceptedFileTypes: e.target.value })}
                placeholder={field.type === "file" ? ".pdf,.doc,.txt" : "image/jpeg,image/png"}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
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
                onChange={(e) => onUpdateField(field.id, { maxFileSize: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              />
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="multiple" 
                checked={field.multiple || false} 
                onChange={(e) => onUpdateField(field.id, { multiple: e.target.checked })}
                className="mr-2" 
              />
              <label htmlFor="multiple">Allow multiple files</label>
            </div>
          </>
        )}

        {/* Required field checkbox */}
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="required" 
            checked={field.required} 
            onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
            className="mr-2" 
          />
          <label htmlFor="required">Required field</label>
        </div>
        
        {/* Remove button for custom fields */}
        {field.id !== "title" && field.id !== "description" && (
          <button 
            onClick={() => onRemoveField(field.id)}
            className="mt-4 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Remove Field
          </button>
        )}
      </div>
    </div>
  );
} 