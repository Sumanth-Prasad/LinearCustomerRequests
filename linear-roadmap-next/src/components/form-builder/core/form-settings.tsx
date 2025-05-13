"use client";

import React, { useState, useRef, useEffect } from "react";
import { FormType, FormSettings } from "./types";
import EmojiPicker, { Theme, EmojiClickData, EmojiStyle, Categories } from "emoji-picker-react";

interface FormSettingsProps {
  settings: FormSettings;
  onUpdateSettings: (settings: FormSettings) => void;
}

// Default emoji if none is selected
const DEFAULT_EMOJI = "📝";

export function FormSettingsPanel({ settings, onUpdateSettings }: FormSettingsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onUpdateSettings({
      ...settings,
      emoji: emojiData.emoji
    });
    setShowEmojiPicker(false);
  };

  return (
    <div className="bg-background border border-border rounded-md p-4 mb-6">
      <h3 className="text-lg font-medium mb-4">Form Settings</h3>
      <div className="space-y-4">
        {/* Form Title and Emoji */}
        <div className="flex items-start gap-4">
          {/* Emoji Selector */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 flex items-center justify-center text-2xl border rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Select emoji"
            >
              {settings.emoji}
            </button>
            
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 shadow-lg rounded-md overflow-hidden border border-border">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.AUTO}
                  emojiStyle={EmojiStyle.NATIVE}
                  searchPlaceHolder="Search emoji..."
                  width={320}
                  height={350}
                  previewConfig={{
                    showPreview: true,
                    defaultCaption: "Pick your emoji",
                  }}
                  skinTonesDisabled
                  lazyLoadEmojis={false}
                  categories={[
                    {
                      name: "Suggested",
                      category: Categories.SUGGESTED
                    },
                    {
                      name: "Smileys & People",
                      category: Categories.SMILEYS_PEOPLE
                    },
                    {
                      name: "Animals & Nature",
                      category: Categories.ANIMALS_NATURE
                    },
                    {
                      name: "Food & Drink",
                      category: Categories.FOOD_DRINK
                    },
                    {
                      name: "Travel & Places",
                      category: Categories.TRAVEL_PLACES
                    },
                    {
                      name: "Activities",
                      category: Categories.ACTIVITIES
                    },
                    {
                      name: "Objects",
                      category: Categories.OBJECTS
                    },
                    {
                      name: "Symbols",
                      category: Categories.SYMBOLS
                    },
                    {
                      name: "Flags",
                      category: Categories.FLAGS
                    }
                  ]}
                  style={{ 
                    backgroundColor: "var(--background)",
                    border: "none",
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Form Title */}
          <div className="flex-1">
            <label htmlFor="form-title" className="block mb-2 font-medium">
              Form Title
            </label>
            <input
              id="form-title"
              type="text"
              value={settings.title}
              onChange={(e) => onUpdateSettings({ ...settings, title: e.target.value })}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              placeholder="Enter form title"
            />
          </div>
        </div>

        {/* Form Description */}
        <div>
          <label htmlFor="form-description" className="block mb-2 font-medium">
            Form Description
          </label>
          <textarea
            id="form-description"
            value={settings.description || ""}
            onChange={(e) => onUpdateSettings({ ...settings, description: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground resize-y min-h-[100px]"
            placeholder="Enter a description for this form"
          />
        </div>
      </div>
    </div>
  );
} 