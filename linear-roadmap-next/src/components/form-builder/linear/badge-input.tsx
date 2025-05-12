"use client";

import React, { useRef, useEffect } from 'react';
import type { FieldMention } from '../core/types';

interface BadgeInputProps {
  fieldId: string;
  value: string;
  mentions: FieldMention[];
  InputComponent: 'input' | 'textarea';
  inputProps: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onRemoveMention: (fieldId: string, mentionId: string, mentionStartPos: number, mentionEndPos: number) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
}

export function BadgeInput({
  fieldId,
  value,
  mentions,
  InputComponent,
  inputProps,
  onInputChange,
  onKeyDown,
  onRemoveMention,
  inputRefs
}: BadgeInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  
  // Register input ref to the shared inputRefs map
  useEffect(() => {
    if (inputRef.current) {
      inputRefs.current.set(fieldId, inputRef.current);
      
      return () => {
        inputRefs.current.delete(fieldId);
      };
    }
  }, [fieldId, inputRefs]);
  
  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.startPos - b.startPos);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onInputChange(e, fieldId);
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onKeyDown(e, fieldId);
  };
  
  // Handle removing a mention
  const handleRemoveMention = (mention: FieldMention) => {
    onRemoveMention(fieldId, mention.id, mention.startPos, mention.endPos);
  };
  
  // Render input with appropriate props
  const renderInput = () => {
    // Common props for both input types
    const commonProps = {
      ...inputProps,
      ref: (el: HTMLInputElement | HTMLTextAreaElement) => {
        inputRef.current = el;
      },
      onChange: handleChange,
      onKeyDown: handleKeyDown
    };
    
    if (InputComponent === 'input') {
      return <input {...commonProps} />;
    } else {
      return <textarea {...commonProps} />;
    }
  };
  
  return (
    <div ref={wrapperRef} className="relative">
      {renderInput()}
      
      {/* Badges for mentions */}
      <div className="flex flex-wrap gap-1 mt-2">
        {sortedMentions.map((mention) => (
          <div 
            key={mention.id}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            title={`Field: ${mention.label}`}
          >
            @{mention.label}
            <button 
              type="button" 
              className="ml-1 inline-flex items-center justify-center"
              onClick={() => handleRemoveMention(mention)}
            >
              <span className="sr-only">Remove</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 