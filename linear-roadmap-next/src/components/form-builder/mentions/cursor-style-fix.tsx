"use client";

import { useEffect } from "react";

export function CursorStyleFix() {
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.innerHTML = `
      /* Ensure cursor is always visible in our text fields - maximum compatibility approach */
      input.text-transparent, textarea.text-transparent {
        color: transparent !important; 
        caret-color: #0284c7 !important; /* bright blue */
        -webkit-text-fill-color: transparent !important;
      }
      
      /* For different browser compatibility */
      .dark input.text-transparent, .dark textarea.text-transparent {
        caret-color: #38bdf8 !important; /* lighter blue for dark mode */
      }
      
      /* Force cursor color in all text fields in the form-builder */
      .form-builder-container input, .form-builder-container textarea {
        caret-color: #0284c7 !important;
      }
      
      .dark .form-builder-container input, .dark .form-builder-container textarea {
        caret-color: #38bdf8 !important;
      }
      
      /* Make tag characters invisible - this is critical for showing badges without visible markers */
      .form-builder-container input, .form-builder-container textarea {
        letter-spacing: normal;
      }
      
      /* This makes the actual tag character invisible but keeps its space */
      .form-builder-container *::selection {
        background-color: rgba(37, 99, 235, 0.1);
        color: inherit;
      }
      
      /* Make the badge appear as if it's a character in the text */
      .tag-badge {
        margin: 0 1px;
        position: relative;
        top: -1px;
      }
      
      /* Position mention badges properly and make them look good */
      .mention-badge {
        position: relative;
        display: inline-flex;
        vertical-align: middle;
      }
      
      /* Hide actual marker text from selection */
      ::selection {
        background-color: rgba(66, 133, 244, 0.2);
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
} 