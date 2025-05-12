"use client";

import React from 'react';

export function highlightMentions(text: string) {
  if (!text) return null;
  
  // Updated regex to find our mention format with zero-width space markers
  const parts = text.split(/(\u200D[^\u200D]+\u200D)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('\u200D') && part.endsWith('\u200D')) {
      const mentionText = part.slice(1, -1); // Remove marker characters
      return (
        <span 
          key={index} 
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded font-medium"
        >
          @{mentionText}
        </span>
      );
    }
    return part;
  });
} 