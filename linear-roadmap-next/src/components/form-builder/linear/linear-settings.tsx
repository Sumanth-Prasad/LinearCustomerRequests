"use client";

import React from "react";
import { BadgeInput } from "../mentions/badge-input";
import type { LinearIntegrationSettings, FieldMention } from "./types";

interface LinearSettingsProps {
  linearSettings: LinearIntegrationSettings;
  setLinearSettings: React.Dispatch<React.SetStateAction<LinearIntegrationSettings>>;
  showLinearSettings: boolean;
  setShowLinearSettings: React.Dispatch<React.SetStateAction<boolean>>;
  mentions: Record<string, FieldMention[]>;
  disableSearchByDefault: boolean;
  setDisableSearchByDefault: React.Dispatch<React.SetStateAction<boolean>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  handleRemoveMention: (fieldId: string, mentionId: string, mentionStartPos: number, mentionEndPos: number) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
}

export function LinearSettings({
  linearSettings,
  setLinearSettings,
  showLinearSettings,
  setShowLinearSettings,
  mentions,
  disableSearchByDefault,
  setDisableSearchByDefault,
  handleInputChange,
  handleKeyDown,
  handleRemoveMention,
  inputRefs
}: LinearSettingsProps) {
  // Markdown editing function
  const insertMarkdown = (pattern: string) => {
    const input = inputRefs.current.get('response_message');
    if (!input) return;
    
    const value = input.value;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Get selected text
    const selectedText = value.substring(start, end);
    
    // Format based on pattern
    let formatted = '';
    let newCursorPos = 0;
    
    if (pattern === '**') {
      // Bold
      formatted = `**${selectedText}**`;
      newCursorPos = end + 4;
    } else if (pattern === '*') {
      // Italic
      formatted = `*${selectedText}*`;
      newCursorPos = end + 2;
    } else if (pattern === '- ') {
      // List item
      formatted = `- ${selectedText}`;
      newCursorPos = end + 2;
    } else if (pattern === '1. ') {
      // Numbered list
      formatted = `1. ${selectedText}`;
      newCursorPos = end + 3;
    } else if (pattern === '[](url)') {
      // Link
      formatted = `[${selectedText}](url)`;
      newCursorPos = end + 7;
    } else if (pattern === '# ') {
      // Heading
      formatted = `# ${selectedText}`;
      newCursorPos = end + 2;
    }
    
    // Insert formatted text
    const newValue = value.substring(0, start) + formatted + value.substring(end);
    setLinearSettings({...linearSettings, responseMessage: newValue});
    
    // Focus and set cursor position
    setTimeout(() => {
      if (input) {
        input.focus();
        
        // If text was selected, position cursor at the end of the formatted text
        // Otherwise, position it inside the formatting tokens (like between ** and **)
        const newPosition = selectedText ? newCursorPos : start + pattern.length;
        input.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <div className="border border-border p-4 rounded bg-background mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Linear Integration Settings</h3>
        <button 
          onClick={() => setShowLinearSettings(!showLinearSettings)}
          className="text-sm text-primary hover:text-primary/80"
        >
          {showLinearSettings ? 'Hide Settings' : 'Show Settings'}
        </button>
      </div>
      
      {showLinearSettings && (
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Submit As</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="issueType"
                  checked={linearSettings.issueType === 'customer_request'} 
                  onChange={() => setLinearSettings({...linearSettings, issueType: 'customer_request'})}
                  className="mr-2" 
                />
                Customer Request
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="issueType"
                  checked={linearSettings.issueType === 'issue'} 
                  onChange={() => setLinearSettings({...linearSettings, issueType: 'issue'})}
                  className="mr-2" 
                />
                Issue
              </label>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Team</label>
            <select 
              value={linearSettings.team}
              onChange={(e) => setLinearSettings({...linearSettings, team: e.target.value})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            >
              <option value="">Select a team</option>
              <option value="team1">Engineering</option>
              <option value="team2">Product</option>
              <option value="team3">Design</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Teams will be loaded from Linear</p>
          </div>
          
          {/* Project field - added from form-builder.tsx */}
          <div>
            <label className="block mb-2 font-medium">Project (Optional)</label>
            <select 
              value={linearSettings.project || ''}
              onChange={(e) => setLinearSettings({...linearSettings, project: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            >
              <option value="">No project</option>
              <option value="project1">Website Redesign</option>
              <option value="project2">Mobile App</option>
              <option value="project3">API Integration</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Projects will be loaded from Linear</p>
          </div>
          
          {/* Initial Status field - added from form-builder.tsx */}
          <div>
            <label className="block mb-2 font-medium">Initial Status (Optional)</label>
            <select 
              value={linearSettings.status || ''}
              onChange={(e) => setLinearSettings({...linearSettings, status: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            >
              <option value="">Default status</option>
              <option value="status1">Backlog</option>
              <option value="status2">Todo</option>
              <option value="status3">In Progress</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Statuses will be loaded from Linear</p>
          </div>
          
          {/* Labels field - added from form-builder.tsx */}
          <div>
            <label className="block mb-2 font-medium">Labels (Optional)</label>
            <div className="border rounded-md p-2 bg-background">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                  Customer Request
                  <button type="button" className="ml-1 inline-flex items-center justify-center">
                    <span className="sr-only">Remove</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
              <div className="flex items-center border-t pt-2">
                <input 
                  type="text" 
                  className="flex-1 p-1 bg-background border-0 focus:ring-0 text-sm text-foreground" 
                  placeholder="Search and add labels..."
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Labels will be loaded from Linear</p>
          </div>
          
          {/* Default Assignee field - added from form-builder.tsx */}
          <div>
            <label className="block mb-2 font-medium">Default Assignee (Optional)</label>
            <select 
              value={linearSettings.assignee || ''}
              onChange={(e) => setLinearSettings({...linearSettings, assignee: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            >
              <option value="">Unassigned</option>
              <option value="me">Me (Current User)</option>
              <option value="user1">John Doe</option>
              <option value="user2">Jane Smith</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Team members will be loaded from Linear</p>
          </div>
          
          {/* Title field with mentions support */}
          <div>
            <label className="block mb-2 font-medium">Default Title Format</label>
            <BadgeInput
              fieldId="default_title"
              value={linearSettings.defaultTitle}
              mentions={mentions['default_title'] || []}
              InputComponent="input"
              inputProps={{
                type: 'text',
                id: 'default_title',
                placeholder: 'Enter default title',
                className: 'w-full p-2 border rounded focus:outline-none',
                value: linearSettings.defaultTitle
              }}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onRemoveMention={handleRemoveMention}
              inputRefs={inputRefs}
            />
            <p className="text-xs text-muted-foreground mt-1">Use {'{title}'} to include the submitted title. Type @ to reference form fields.</p>
          </div>
          
          {/* Response message field with mentions support and markdown toolbar */}
          <div>
            <label className="block mb-2 font-medium">Response Message</label>
            <div className="relative border rounded-md overflow-hidden border-border">
              {/* Markdown toolbar */}
              <div className="flex gap-1 border-b border-border bg-muted dark:bg-background p-1">
                <button 
                  type="button"
                  onClick={() => insertMarkdown('**')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Bold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 10.5H21M13.5 6.5H21M3 10.5H7.5C9 10.5 10.5 9 10.5 7.5C10.5 6 9 4.5 7.5 4.5H3v6M3 19.5h4.5c1.5 0 3-1.5 3-3 0-1.5-1.5-3-3-3H3v6z"></path>
                  </svg>
                </button>
                <button 
                  type="button"
                  onClick={() => insertMarkdown('*')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Italic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4.5h3m4 0h-3m-4 15h3m4 0h-3m-7-7.5L14 4.5m0 15L7 12"></path>
                  </svg>
                </button>
                <div className="h-full w-px bg-border mx-1"></div>
                <button 
                  type="button"
                  onClick={() => insertMarkdown('- ')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Bulleted List"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h7"></path>
                  </svg>
                </button>
                <button 
                  type="button"
                  onClick={() => insertMarkdown('1. ')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Numbered List"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12.5h10.5m-10.5-6h10.5m-10.5 12h10.5M3 18.5v-3l-1 1v-1l1-1v-3m2 1v-1l-2 2v-1l2-2v-1m0-2v-1l-2 2v-1l2-2v-1"></path>
                  </svg>
                </button>
                <div className="h-full w-px bg-border mx-1"></div>
                <button 
                  type="button"
                  onClick={() => insertMarkdown('[](url)')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                  </svg>
                </button>
                <button 
                  type="button"
                  onClick={() => insertMarkdown('# ')}
                  className="p-1 rounded hover:bg-accent hover:text-accent-foreground text-foreground" 
                  title="Heading"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h12m-6-6v12"></path>
                  </svg>
                </button>
              </div>
              <BadgeInput
                fieldId="response_message"
                value={linearSettings.responseMessage}
                mentions={mentions['response_message'] || []}
                InputComponent="textarea"
                inputProps={{
                  id: 'response_message',
                  placeholder: 'Enter response message...',
                  className: 'w-full p-2 border-0 focus:outline-none h-32',
                  value: linearSettings.responseMessage
                }}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onRemoveMention={handleRemoveMention}
                inputRefs={inputRefs}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Shown to users after form submission. Type @ to reference form fields.
              Supports Markdown formatting.
            </p>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="includeCustomerInfo" 
              checked={linearSettings.includeCustomerInfo} 
              onChange={(e) => setLinearSettings({...linearSettings, includeCustomerInfo: e.target.checked})}
              className="mr-2" 
            />
            <label htmlFor="includeCustomerInfo">Include customer contact information (if provided)</label>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="disableSearchByDefault" 
              checked={disableSearchByDefault} 
              onChange={(e) => setDisableSearchByDefault(e.target.checked)}
              className="mr-2" 
            />
            <label htmlFor="disableSearchByDefault">Disable search box focus by default in field references</label>
            <div className="ml-2 text-muted-foreground">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="feather feather-info"
                aria-label="When enabled, the search box won't automatically receive focus when the field reference menu appears."
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 