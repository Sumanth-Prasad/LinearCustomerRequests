"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface LinearTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
}

const LinearTextarea = React.forwardRef<HTMLTextAreaElement, LinearTextareaProps>(
  ({ className, autoResize = true, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    // Combine external ref with internal ref
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      if (!autoResize || !textareaRef.current) return;
      
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, [autoResize]);
    
    // Adjust height when content changes
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        adjustHeight();
        
        // Listen for input events
        const textarea = textareaRef.current;
        textarea.addEventListener('input', adjustHeight);
        return () => textarea.removeEventListener('input', adjustHeight);
      }
    }, [autoResize, adjustHeight, props.value, props.defaultValue]);
    
    return (
      <Textarea
        ref={textareaRef}
        className={cn(
          "w-full resize-none min-h-[120px] bg-[#0c0c0c] border-none rounded-none",
          "text-[15px] text-gray-200 placeholder:text-gray-500", 
          "focus-visible:ring-0 focus-visible:outline-none focus:outline-none p-4",
          autoResize && "overflow-hidden",
          className
        )}
        onInput={adjustHeight}
        {...props}
      />
    );
  }
);

LinearTextarea.displayName = "LinearTextarea";

export { LinearTextarea }; 