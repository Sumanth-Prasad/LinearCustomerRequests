"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createComment } from "@/app/actions";
import Image from "next/image";

interface CommentFormProps {
  issueId: string;
}

export function CommentForm({ issueId }: CommentFormProps) {
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize function
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Apply auto-resize on input change and on initial render
  useEffect(() => {
    autoResize();
  }, [comment]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
      
      // Create preview URLs
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Remove an attachment
  const removeAttachment = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    
    setAttachments(attachments.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  return (
    <form action={createComment} className="space-y-4">
      <input type="hidden" name="issueId" value={issueId} />
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="body"
          name="body"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full min-h-[100px] p-4 resize-none bg-[#0c0c0c] border border-[#333] rounded-md text-base text-gray-200 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#444]"
          required
        />
      </div>
      
      {/* Attachment previews */}
      {previewUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="w-20 h-20 bg-[#222] rounded-md border border-[#333] overflow-hidden flex items-center justify-center">
                {attachments[index].type.startsWith("image/") ? (
                  <Image 
                    src={url} 
                    alt={`Attachment ${index + 1}`} 
                    width={80} 
                    height={80} 
                    className="object-cover" 
                  />
                ) : (
                  <div className="text-xs text-center text-gray-400 p-2">
                    {attachments[index].name.slice(0, 20)}
                    {attachments[index].name.length > 20 ? "..." : ""}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-200 flex items-center gap-1 text-sm py-1 px-2 rounded-md hover:bg-[#333]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
            Attach files
          </button>
        </div>
        
        <Button 
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-auto"
        >
          Add Comment
        </Button>
      </div>
    </form>
  );
} 