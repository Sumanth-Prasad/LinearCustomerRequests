"use client";

import { useEffect } from "react";

export function CursorStyleFix() {
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.innerHTML = `
      /* Ensure text remains transparent for placeholder overlay */
      input.text-transparent, textarea.text-transparent {
        color: transparent !important; 
        -webkit-text-fill-color: transparent !important;
      }
      
      /* Make tag characters invisible - this is critical for showing badges without visible markers */
      .form-builder-container input, .form-builder-container textarea {
        letter-spacing: normal;
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

      .form-builder-container input:focus,
      .form-builder-container textarea:focus,
      .form-builder-container select:focus {
        box-shadow: none !important;
        outline: 1px auto -webkit-focus-ring-color;
        border-color: hsl(var(--border));
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