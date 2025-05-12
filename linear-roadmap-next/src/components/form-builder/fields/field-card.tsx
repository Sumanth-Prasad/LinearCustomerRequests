"use client";

import React from "react";
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import type { FormField } from "./types";

interface FieldCardProps {
  field: FormField;
  isActive: boolean;
  emailValidation: Record<string, { isValid: boolean | null; message: string }>;
  onActive: (id: string) => void;
  getFileTypeDescription: (acceptedTypes: string) => string;
  highlightMentions: (text: string) => React.ReactNode;
}

export function FieldCard({
  field,
  isActive,
  emailValidation,
  onActive,
  getFileTypeDescription,
  highlightMentions
}: FieldCardProps) {
  return (
    <div
      className={`relative p-3 rounded-md border 
        ${isActive ? 'border-primary' : 'border-border'}
        hover:border-primary/30 hover:shadow-sm
      `}
      onClick={() => onActive(field.id)}
    >
      <label className="block mb-2 font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {field.type === "text" && (
        <div className="relative min-h-[36px]">
          <input 
            type="text" 
            placeholder={field.placeholder ? "" : "Enter text"}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-transparent !caret-primary cursor-text z-0" 
            disabled
            style={{ caretColor: 'var(--primary)' }}
          />
          <div className="absolute inset-0 pointer-events-none z-10 p-2 flex items-center flex-wrap gap-1">
            {field.placeholder ? highlightMentions(field.placeholder) : <span className="text-muted-foreground">Enter text</span>}
          </div>
        </div>
      )}
      
      {field.type === "email" && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <input 
            type="email" 
            placeholder={field.placeholder} 
            className="w-full pl-10 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background appearance-none" 
            disabled
          />
          {/* Show validation status for preview demonstration */}
          {emailValidation[field.id] && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {emailValidation[field.id].isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
      )}
      
      {field.type === "phone" && (
        <div className="w-full">
          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry={field.countryCode || "US"}
            placeholder={field.placeholder || "Enter phone number"}
            value=""
            onChange={() => {}}
            disabled
            className="disabled:opacity-75 bg-background PhoneInputCountry--showFlags"
          />
        </div>
      )}
      
      {field.type === "textarea" && (
        <div className="relative min-h-[65px]">
          <textarea 
            placeholder="" 
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-transparent !caret-primary cursor-text z-0" 
            rows={3}
            disabled
            style={{ caretColor: 'var(--primary)' }}
          />
          <div className="absolute inset-0 pointer-events-none z-10 p-2 flex flex-wrap gap-1">
            {field.placeholder ? highlightMentions(field.placeholder) : <span className="text-muted-foreground">Enter details here</span>}
          </div>
        </div>
      )}
      
      {field.type === "select" && (
        <select 
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground dark:bg-[#1a1a1a] dark:text-white dark:border-[#333] dark:focus:border-blue-600"
          disabled
        >
          <option value="">Select an option</option>
          {field.options?.map((option, optionIndex) => (
            <option key={optionIndex} value={option}>{option}</option>
          ))}
        </select>
      )}
      
      {field.type === "checkbox" && field.options?.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center mt-2">
          <input 
            type="checkbox" 
            id={`${field.id}_${optionIndex}`} 
            className="mr-2" 
            disabled 
          />
          <label htmlFor={`${field.id}_${optionIndex}`}>{option}</label>
        </div>
      ))}
      
      {field.type === "radio" && field.options?.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center mt-2">
          <input 
            type="radio" 
            id={`${field.id}_${optionIndex}`} 
            name={field.id}
            className="mr-2" 
            disabled 
          />
          <label htmlFor={`${field.id}_${optionIndex}`}>{option}</label>
        </div>
      ))}
      
      {field.type === "file" && (
        <div>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-muted dark:bg-background dark:hover:bg-muted/30">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V8m0 0-3 3m3-3 3 3"/>
                </svg>
                <p className="mb-1 text-sm text-foreground">
                  <span className="font-semibold">Click to upload</span>{field.multiple ? " files" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
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
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-muted dark:bg-background dark:hover:bg-muted/30">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 1v4m0 0 3-3m-3 3L7 2m10 3v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3M7 8h.01M12 8h.01M7 12h.01M12 12h.01M17 12h.01M17 8h.01"/>
                </svg>
                <p className="mb-1 text-sm text-foreground">
                  <span className="font-semibold">Click to upload</span>{field.multiple ? " images" : " an image"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {field.maxFileSize ? `Max: ${field.maxFileSize}MB` : ""}
                </p>
              </div>
              <input type="file" accept="image/*" className="hidden" disabled />
            </label>
          </div>
        </div>
      )}
    </div>
  );
} 