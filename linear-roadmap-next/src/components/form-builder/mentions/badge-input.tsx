"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";
import type { FieldMention } from "./types";

interface BadgeInputProps {
  fieldId: string;
  value: string;
  mentions: FieldMention[];
  inputProps: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
  InputComponent: 'input' | 'textarea';
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  onRemoveMention: (fieldId: string, mentionId: string, mentionStartPos: number, mentionEndPos: number) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
}

// Add global declaration for our helper methods
declare global {
  interface Window {
    _badgeInputHelpers?: {
      [fieldId: string]: {
        restoreCursorAfterDelete: (position: number) => void;
      };
    };
  }
}

export function BadgeInput({
  fieldId,
  value,
  mentions,
  inputProps,
  InputComponent,
  onInputChange,
  onKeyDown,
  onRemoveMention,
  inputRefs
}: BadgeInputProps) {
  // Always declare ALL hooks at the top level - never conditionally
  const [isFocused, setIsFocused] = React.useState(false);
  const localInputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const cursorPositionRef = React.useRef<number | null>(null);
  const lastDeletedMentionPosRef = React.useRef<number | null>(null);
  
  // Special method to set cursor after mention deletion
  const restoreCursorAfterDelete = React.useCallback((position: number) => {
    // Save the position
    lastDeletedMentionPosRef.current = position;
    cursorPositionRef.current = position;
    
    // Get the element
    const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
    if (!inputEl) return;
    
    // Set focus and position
    inputEl.focus();
    
    // Set cursor position immediately
    try {
      inputEl.setSelectionRange(position, position);
    } catch (err) {
      console.error('Error setting cursor position after delete:', err);
    }
    
    // Schedule follow-up positioning attempts
    [0, 10, 50, 100, 200, 500].forEach(delay => {
      setTimeout(() => {
        const el = localInputRef.current || inputRefs.current.get(fieldId);
        if (!el) return;
        
        if (document.activeElement !== el) {
          el.focus();
        }
        
        try {
          el.setSelectionRange(position, position);
        } catch (err) {
          console.error(`Error setting cursor position at ${delay}ms:`, err);
        }
      }, delay);
    });
  }, [fieldId, inputRefs]);
  
  // Register this method with the parent
  React.useEffect(() => {
    // Create global helpers object if it doesn't exist
    if (!window._badgeInputHelpers) {
      window._badgeInputHelpers = {};
    }
    
    // Register this component's cursor restore method
    window._badgeInputHelpers[fieldId] = {
      restoreCursorAfterDelete: (position: number) => {
        console.log(`Restoring cursor to position ${position}`);
        
        // Store position for future reference
        lastDeletedMentionPosRef.current = position;
        cursorPositionRef.current = position;
        
        // Get the element
        const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
        if (!inputEl) return;
        
        // Set focus and position immediately, with high priority
        requestAnimationFrame(() => {
          inputEl.focus();
          try {
            inputEl.setSelectionRange(position, position);
          } catch (err) {
            console.error('Error setting selection range:', err);
          }
        });
        
        // Follow-up focus attempts to ensure focus is maintained
        [10, 50, 100, 200, 500].forEach(delay => {
          setTimeout(() => {
            try {
              const el = localInputRef.current || inputRefs.current.get(fieldId);
              if (!el) return;
              
              if (document.activeElement !== el) {
                el.focus();
              }
              
              el.setSelectionRange(position, position);
            } catch (err) {
              console.error(`Error in focus recovery at ${delay}ms:`, err);
            }
          }, delay);
        });
      }
    };
    
    // Cleanup on unmount
    return () => {
      if (window._badgeInputHelpers && window._badgeInputHelpers[fieldId]) {
        delete window._badgeInputHelpers[fieldId];
      }
    };
  }, [fieldId, inputRefs]);
  
  // Direct DOM-based focus management
  const focusInput = React.useCallback((cursorPosition?: number) => {
    // If we have a saved deletion position, always use that
    if (lastDeletedMentionPosRef.current !== null) {
      const deletePos = lastDeletedMentionPosRef.current;
      console.log(`Using last deletion position: ${deletePos}`, new Error().stack);
      
      const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(deletePos, deletePos);
        
        // Clear the ref after using it once
        setTimeout(() => {
          lastDeletedMentionPosRef.current = null;
        }, 100);
        
        return true;
      }
    }
    
    // Otherwise, normal focus behavior
    // Get the target element
    const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
    if (!inputEl) return false;
    
    try {
      // Focus the element
      inputEl.focus();
      
      // Set cursor position if provided
      if (cursorPosition !== undefined && cursorPosition !== null) {
        try {
          // Make sure position is valid
          const maxPos = inputEl.value ? inputEl.value.length : 0;
          const safePos = Math.min(Math.max(0, cursorPosition), maxPos);
          
          console.log(`Setting cursor to position ${safePos} (requested: ${cursorPosition}, max: ${maxPos})`);
          inputEl.setSelectionRange(safePos, safePos);
          
          // Store the cursor position for later recovery
          cursorPositionRef.current = safePos;
        } catch (err) {
          console.error('Error setting selection range:', err);
        }
      } else if (cursorPositionRef.current !== null) {
        // Use stored position if available
        try {
          const maxPos = inputEl.value ? inputEl.value.length : 0;
          const safePos = Math.min(Math.max(0, cursorPositionRef.current), maxPos);
          
          inputEl.setSelectionRange(safePos, safePos);
        } catch (err) {
          console.error('Error setting selection range from ref:', err);
        }
      }
    } catch (err) {
      console.error('Error in focusInput:', err);
    }
    
    return true;
  }, [fieldId, inputRefs]);
  
  // Enhanced keyboard navigation
  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    try {
      // Store current cursor position in ref
      if (e.currentTarget) {
        cursorPositionRef.current = e.currentTarget.selectionStart || 0;
      }
      
      // Sort mentions by position for navigation
      const sortedMentions = [...mentions].sort((a, b) => a.startPos - b.startPos);
      
      // Handle arrow keys for badge navigation
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        const pos = cursorPositionRef.current || 0;
        
        // Check if cursor is adjacent to a badge
        const mention = sortedMentions.find(m => 
          (direction > 0 && m.startPos === pos) || 
          (direction < 0 && m.endPos === pos)
        );
        
        if (mention && e.currentTarget) {
          e.preventDefault();
          // Move cursor to the other side of the badge
          const newPos = direction > 0 ? mention.endPos : mention.startPos;
          e.currentTarget.setSelectionRange(newPos, newPos);
          cursorPositionRef.current = newPos;
          return;
        }
      }
      
      // Delegate to the provided onKeyDown handler
      onKeyDown(e, fieldId);
      
      // Schedule focus check after key events
      setTimeout(() => {
        if (e.currentTarget) {
          const pos = e.currentTarget.selectionStart || 0;
          if (document.activeElement !== e.currentTarget) {
            focusInput(pos);
          }
        }
      }, 0);
    } catch (err) {
      console.error('Error in handleCustomKeyDown:', err);
      // Just delegate to parent handler if we had an error
      onKeyDown(e, fieldId);
    }
  };
  
  // Track cursor position on every change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    try {
      if (e.target) {
        cursorPositionRef.current = e.target.selectionStart || 0;
      }
      onInputChange(e, fieldId);
    } catch (err) {
      console.error('Error tracking cursor in handleChange:', err);
      onInputChange(e, fieldId);
    }
  };
  
  // Always run this effect for focus recovery
  React.useEffect(() => {
    // Initial focus
    if (mentions.length > 0) {
      requestAnimationFrame(() => {
        focusInput();
      });
    }
    
    // Create a function to check and restore focus regularly
    const focusInterval = setInterval(() => {
      const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
      if (isFocused && inputEl && document.activeElement !== inputEl) {
        console.log('Focus lost, recovering...');
        focusInput();
      }
    }, 100);
    
    return () => clearInterval(focusInterval);
  }, [focusInput, fieldId, isFocused, mentions.length, inputRefs]);
  
  // Common props for both inputs
  const commonProps = {
    ...inputProps,
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (el) {
        // Store in local ref for immediate access
        localInputRef.current = el;
        
        // Store in shared ref for component access
        inputRefs.current.set(fieldId, el as any);
        
        // If we have mentions, focus this input after it's rendered
        if (mentions.length > 0) {
          el.focus();
          
          // Try to position cursor at the end if not already set
          if (el.selectionStart === 0 && value.length > 0) {
            const pos = value.length;
            el.setSelectionRange(pos, pos);
            cursorPositionRef.current = pos;
          }
        }
      }
    },
    'data-input-id': fieldId,
    onChange: handleChange,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (mentions.length > 0) {
        handleCustomKeyDown(e);
      } else {
        onKeyDown(e, fieldId);
      }
    },
    onFocus: () => {
      setIsFocused(true);
      
      // Get current cursor position
      const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
      if (inputEl) {
        cursorPositionRef.current = inputEl.selectionStart || 0;
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Check if the related target is part of our component
      const target = e.relatedTarget as HTMLElement | null;
      const isInComponent = target && 
        (e.currentTarget.contains(target) || 
          (e.currentTarget.parentElement && e.currentTarget.parentElement.contains(target)));
      
      // Only set unfocused if not moving to an element within our component
      if (!isInComponent) {
        setIsFocused(false);
      } else {
        // Store cursor position first
        cursorPositionRef.current = e.currentTarget.selectionStart || 0;
        
        // If still in component, make sure we get focus back
        setTimeout(() => {
          focusInput();
        }, 0);
      }
    },
    onSelect: (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Update cursor position on selection change
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      cursorPositionRef.current = target.selectionStart || 0;
    },
    onClick: () => {
      // Handle click on the input to update cursor position
      const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
      if (inputEl) {
        cursorPositionRef.current = inputEl.selectionStart || 0;
      }
    },
    style: {
      ...inputProps.style,
      ...(mentions.length > 0 ? {
        color: 'transparent',
        caretColor: 'black',
        backgroundColor: 'transparent',
        cursor: 'text',
        outlineWidth: '1px'
      } : {})
    },
    autoFocus: mentions.length > 0
  };
  
  // Enhanced onRemoveMention to handle cursor positioning
  const handleRemoveMention = React.useCallback((fieldId: string, mentionId: string, startPos: number, endPos: number) => {
    // Save position before removal
    lastDeletedMentionPosRef.current = startPos;
    cursorPositionRef.current = startPos;
    
    console.log('Badge component - saving cursor position before removal:', startPos);
    
    // Call the parent's removal function
    onRemoveMention(fieldId, mentionId, startPos, endPos);
    
    // Schedule focus recovery
    const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
    if (inputEl) {
      [0, 10, 50, 100, 200, 500].forEach(delay => {
        setTimeout(() => {
          if (!inputEl) return;
          
          // Make sure we're focused
          if (document.activeElement !== inputEl) {
            inputEl.focus();
          }
          
          // Set cursor position
          inputEl.setSelectionRange(startPos, startPos);
          console.log(`Focus/cursor recovery at ${delay}ms`);
        }, delay);
      });
    }
  }, [onRemoveMention, inputRefs]);
  
  // Create a separate DeleteButton component
  const DeleteButton = React.useCallback(({ mention }: { mention: FieldMention }) => {
    return (
      <button
        type="button"
        className="ml-2 -mr-1 h-5 w-5 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
        style={{cursor: 'pointer'}}
        title={`Remove ${mention.label} mention`}
        aria-label={`Remove ${mention.label} mention`}
        onMouseDown={(e) => {
          // Critical: prevent event propagation and default
          e.stopPropagation();
          e.preventDefault();
          console.log('Delete button clicked for mention:', mention.id);
          
          // Focus the input
          const inputEl = localInputRef.current || inputRefs.current.get(fieldId);
          if (inputEl) {
            inputEl.focus();
          }
          
          // Set the cursor position
          if (window._badgeInputHelpers && window._badgeInputHelpers[fieldId]) {
            window._badgeInputHelpers[fieldId].restoreCursorAfterDelete(mention.startPos);
          }
          
          // Call the parent handler to remove the mention
          onRemoveMention(fieldId, mention.id, mention.startPos, mention.endPos);
        }}
      >
        <XIcon className="h-3 w-3 text-white" />
      </button>
    );
  }, [fieldId, localInputRef, inputRefs, onRemoveMention]);
  
  // Memoized badge component to maintain stable event handlers
  const BadgeComponent = React.useCallback(
    (props: { mention: FieldMention }) => {
      const { mention } = props;
      
      return (
        <div
          key={`mention-${mention.id}-${mention.startPos}`}
          className="inline-flex items-center rounded-pill bg-blue-500 text-white px-3 py-1 text-xs font-medium mr-1"
          data-field-id={mention.id}
          data-start={mention.startPos}
          data-end={mention.endPos}
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => {
            // Prevent focus loss on badge click
            e.preventDefault();
          }}
        >
          <span>{mention.label}</span>
          <DeleteButton mention={mention} />
        </div>
      );
    },
    [fieldId, DeleteButton]
  );
  
  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.startPos - b.startPos);
  
  // Debug output
  console.log('Rendering BadgeInput for', fieldId, {
    value,
    mentions: sortedMentions.map(m => ({
      id: m.id,
      label: m.label,
      startPos: m.startPos,
      endPos: m.endPos,
      length: m.length,
      valueAt: value.substring(m.startPos, m.endPos + 5) // Show value at mention position for debugging
    }))
  });
  
  // Regular input rendering without badges
  if (mentions.length === 0) {
    return (
      InputComponent === 'textarea' 
        ? <textarea {...commonProps} /> 
        : <input {...commonProps} />
    );
  }
  
  // Prepare content with badges for overlay
  const content: React.ReactNode[] = [];
  let lastIndex = 0;
  
  for (const mention of sortedMentions) {
    // Add text before mention
    if (mention.startPos > lastIndex) {
      content.push(<span key={`text-${lastIndex}-${mention.startPos}`}>{value.substring(lastIndex, mention.startPos)}</span>);
    }
    
    // Add the badge component using our memoized component
    content.push(
      <BadgeComponent 
        key={`badge-${mention.id}-${mention.startPos}`} 
        mention={mention} 
      />
    );
    
    lastIndex = mention.endPos;
  }
  
  // Add remaining text
  if (lastIndex < value.length) {
    content.push(<span key={`text-${lastIndex}-end`}>{value.substring(lastIndex)}</span>);
  }
  
  // Handle click to correctly position cursor around badges
  const handleContainerClick = (e: React.MouseEvent) => {
    try {
      const inputEl = inputRefs.current.get(fieldId);
      if (!inputEl) return;
      
      // Smart positioning: Position cursor at the click point, 
      // but adjusted for badges
      
      // First find the horizontal position of the click
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      // Calculate an approximate character position
      const charWidth = 8; // Approximate character width
      const approxPos = Math.floor(clickX / charWidth);
      
      // Find the best cursor position considering badges
      let realPos = 0;
      let visiblePos = 0; 
      
      for (let i = 0; i < value.length; i++) {
        // If we're at a marker, skip the appropriate length
        const isMention = sortedMentions.some(m => m.startPos === i);
        if (isMention) {
          const mention = sortedMentions.find(m => m.startPos === i);
          if (mention) {
            // If clicked past this badge's position
            if (visiblePos + (mention.length || 1) <= approxPos) {
              visiblePos += mention.length || 1;
              realPos = mention.endPos;
            } else {
              // Click was on this badge, put cursor after it
              realPos = mention.endPos;
              break;
            }
          }
        } else {
          visiblePos++;
          realPos++;
        }
        
        // If we reached the approximate position, stop
        if (visiblePos >= approxPos) break;
      }
      
      // Ensure position is valid
      const maxPos = inputEl.value ? inputEl.value.length : 0;
      const safePos = Math.min(Math.max(0, realPos), maxPos);
      
      // Store the final cursor position
      cursorPositionRef.current = safePos;
      console.log(`Container click - setting cursor to ${safePos}`);
      
      // Set focus and position
      inputEl.focus();
      inputEl.setSelectionRange(safePos, safePos);
      
      // Use our enhanced focus recovery with the calculated cursor position
      focusInput(safePos);
    } catch (err) {
      console.error('Error in container click handler:', err);
      // Basic fallback
      const inputEl = inputRefs.current.get(fieldId);
      if (inputEl) {
        inputEl.focus();
      }
    }
  };
  
  return (
    <div 
      className="relative" 
      onClick={(e) => {
        handleContainerClick(e);
        // Ensure input is focused when clicking anywhere in the container
        focusInput();
      }}
      data-badge-input={fieldId}
    >
      {InputComponent === 'textarea' 
        ? <textarea {...commonProps} /> 
        : <input {...commonProps} />}
      
      <div
        className="absolute inset-0 p-2 flex items-start flex-wrap"
        style={{ 
          zIndex: 1, 
          pointerEvents: 'none' 
        }}
      >
        {/* Each item in content already has pointer-events set on badge elements */}
        {content.map((item, index) => item)}
      </div>
    </div>
  );
} 