"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BadgeInput } from "../mentions/badge-input";
import { LexicalBadgeEditor } from "@/components/LexicalBadgeEditor";
import type { LinearIntegrationSettings, FieldMention, LinearPriority } from "./types";
import type { FormField, FormSettings, FormType } from "../core/types";

// Linear API types
interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

interface LinearProject {
  id: string;
  name: string;
  teamId: string;
}

interface LinearWorkflowState {
  id: string;
  name: string;
  teamId: string;
}

interface LinearLabel {
  id: string;
  name: string;
  color: string; // Hex color
}

interface LinearUser {
  id: string;
  name: string;
  displayName: string;
}

interface LinearSettingsProps {
  linearSettings: LinearIntegrationSettings;
  setLinearSettings: React.Dispatch<React.SetStateAction<LinearIntegrationSettings>>;
  formSettings: FormSettings;
  showLinearSettings: boolean;
  setShowLinearSettings: React.Dispatch<React.SetStateAction<boolean>>;
  mentions: Record<string, FieldMention[]>;
  disableSearchByDefault: boolean;
  setDisableSearchByDefault: React.Dispatch<React.SetStateAction<boolean>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldId: string) => void;
  handleRemoveMention: (fieldId: string, mentionId: string, mentionStartPos: number, mentionEndPos: number) => void;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLTextAreaElement>>;
  fields: FormField[];
}

export function LinearSettings({
  linearSettings,
  setLinearSettings,
  formSettings,
  showLinearSettings,
  setShowLinearSettings,
  mentions,
  disableSearchByDefault,
  setDisableSearchByDefault,
  handleInputChange,
  handleKeyDown,
  handleRemoveMention,
  inputRefs,
  fields
}: LinearSettingsProps) {
  // Loading states
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const [responseEditorKey, setResponseEditorKey] = useState(Date.now());
  const responseMessageEditorWrapperRef = useRef<HTMLDivElement>(null);
  const [defaultTitleEditorKey, setDefaultTitleEditorKey] = useState(Date.now());
  const defaultTitleEditorWrapperRef = useRef<HTMLDivElement>(null);
  
  // Track last text value with '@' to detect mention selection
  const [lastDefaultTitleWithAt, setLastDefaultTitleWithAt] = useState<string | null>(null);
  const [lastResponseMessageWithAt, setLastResponseMessageWithAt] = useState<string | null>(null);
  
  // Store tracked mentions
  const mentionsRef = useRef<{
    default_title: Record<string, string>;
    response_message: Record<string, string>;
  }>({
    default_title: {},
    response_message: {}
  });
  
  // API data
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [states, setStates] = useState<LinearWorkflowState[]>([]);
  const [labels, setLabels] = useState<LinearLabel[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  
  // Search states
  const [labelSearch, setLabelSearch] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  
  // API functions - in a real app, these would call the actual Linear API
  // We're mocking them for demonstration
  const fetchTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const response = await fetch('/api/linear/teams');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: LinearTeam[] = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };
  
  const fetchProjects = async (teamId: string) => {
    if (!teamId) return;
    
    setIsLoadingProjects(true);
    try {
      const response = await fetch(`/api/linear/teams/${teamId}/projects`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: LinearProject[] = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };
  
  const fetchStates = async (teamId: string) => {
    if (!teamId) return;
    
    setIsLoadingStates(true);
    try {
      const response = await fetch(`/api/linear/teams/${teamId}/states`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: LinearWorkflowState[] = await response.json();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error);
    } finally {
      setIsLoadingStates(false);
    }
  };
  
  const fetchLabels = async () => {
    setIsLoadingLabels(true);
    try {
      const response = await fetch('/api/linear/labels');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: LinearLabel[] = await response.json();
      setLabels(data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setIsLoadingLabels(false);
    }
  };
  
  const fetchUsers = async (teamId: string) => {
    if (!teamId) return;
    
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`/api/linear/teams/${teamId}/users`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: LinearUser[] = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  // Load teams on initial render
  useEffect(() => {
    if (showLinearSettings) {
      fetchTeams();
      fetchLabels();
    }
  }, [showLinearSettings]);
  
  // Load dependent data when team changes
  useEffect(() => {
    if (linearSettings.team) {
      fetchProjects(linearSettings.team);
      fetchStates(linearSettings.team);
      fetchUsers(linearSettings.team);
    }
  }, [linearSettings.team]);
  
  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const responseEditorWrapper = responseMessageEditorWrapperRef.current;
      const titleEditorWrapper = defaultTitleEditorWrapperRef.current;

      // Handle Response Message Editor
      if (responseEditorWrapper && !responseEditorWrapper.contains(target)) {
        const activeElement = document.activeElement;
        if (activeElement && responseEditorWrapper.contains(activeElement)) {
          if (typeof (activeElement as HTMLElement).blur === 'function') {
            (activeElement as HTMLElement).blur();
          }
          setTimeout(() => {
            setResponseEditorKey(Date.now());
          }, 0);
        }
      }

      // Handle Default Title Editor
      if (titleEditorWrapper && !titleEditorWrapper.contains(target)) {
        const activeElement = document.activeElement;
        if (activeElement && titleEditorWrapper.contains(activeElement)) {
          if (typeof (activeElement as HTMLElement).blur === 'function') {
            (activeElement as HTMLElement).blur();
          }
          setTimeout(() => {
            setDefaultTitleEditorKey(Date.now());
          }, 0);
        }
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, []); // Empty dependency array
  
  // Handle label selection
  const handleAddLabel = (labelId: string) => {
    const label = labels.find(l => l.id === labelId);
    if (label && !selectedLabels.includes(labelId)) {
      setSelectedLabels([...selectedLabels, labelId]);
      setLinearSettings({
        ...linearSettings,
        labels: [...(linearSettings.labels || []), label.name]
      });
      setLabelSearch('');
    }
  };
  
  const handleRemoveLabel = (labelName: string) => {
    const label = labels.find(l => l.name === labelName);
    if (label) {
      setSelectedLabels(selectedLabels.filter(id => id !== label.id));
    }
    // Always remove from settings even if label not in the fetched list
    setLinearSettings({
      ...linearSettings,
      labels: (linearSettings.labels || []).filter(name => name !== labelName)
    });
  };

  // Check for newly selected mentions
  const checkForMentionSelection = (
    fieldId: 'default_title' | 'response_message',
    newValue: string,
    previousValueWithAt: string | null
  ) => {
    // If we had a value with @ before, and now @ is gone, a mention might have been selected
    if (previousValueWithAt?.includes('@') && !newValue.includes('@')) {
      console.log(`Possible mention selection detected in ${fieldId}`);
      
      // If we have mention data, try to identify what was selected
      const fieldMentions = mentions[fieldId] || [];
      if (fieldMentions.length > 0) {
        const latestMention = fieldMentions[fieldMentions.length - 1];
        if (latestMention) {
          console.log('Latest mention:', latestMention);
          
          // Track this mention using a simple object lookup
          mentionsRef.current[fieldId][latestMention.id] = 
            (latestMention as any).displayName || 
            (latestMention as any).name || 
            String(latestMention.id);
            
          console.log('Updated mentions:', mentionsRef.current);
        }
      }
      
      // Reset tracking state
      if (fieldId === 'default_title') {
        setLastDefaultTitleWithAt(null);
      } else {
        setLastResponseMessageWithAt(null);
      }
    } 
    // If the new value has @ but we weren't tracking one before, start tracking
    else if (newValue.includes('@') && !previousValueWithAt) {
      if (fieldId === 'default_title') {
        setLastDefaultTitleWithAt(newValue);
      } else {
        setLastResponseMessageWithAt(newValue);
      }
    }
    // If we still have an @ in both values, keep tracking
    else if (newValue.includes('@') && previousValueWithAt) {
      if (fieldId === 'default_title') {
        setLastDefaultTitleWithAt(newValue);
      } else {
        setLastResponseMessageWithAt(newValue);
      }
    }
  };
  
  // Create a string with mentions appended
  const appendMentionsToText = (text: string, fieldId: 'default_title' | 'response_message'): string => {
    const mentionsMap = mentionsRef.current[fieldId];
    if (!Object.keys(mentionsMap).length) return text;
    
    let result = text;
    
    // Append each tracked mention
    Object.entries(mentionsMap).forEach(([id, displayText]) => {
      // Format compatible with both markdown and a more standardized syntax
      const mentionString = `@${displayText}{${id}}`;
      
      // Only add if not already present
      if (!result.includes(mentionString) && !result.includes(`@${displayText}`)) {
        result = result.trim() + ' ' + mentionString + ' ';
      }
    });
    
    return result;
  };
  
  // Extract mentions from saved text
  const extractMentionsFromText = (text: string, fieldId: 'default_title' | 'response_message'): void => {
    // Format 1: @[text](id)
    const format1Matches = text.match(/@\[([^\]]+)\]\(([^)]+)\)/g) || [];
    format1Matches.forEach(match => {
      const textMatch = match.match(/@\[([^\]]+)\]/) || [];
      const idMatch = match.match(/\(([^)]+)\)/) || [];
      if (textMatch[1] && idMatch[1]) {
        mentionsRef.current[fieldId][idMatch[1]] = textMatch[1];
      }
    });
    
    // Format 2: @text{id}
    const format2Matches = text.match(/@([^{]+){([^}]+)}/g) || [];
    format2Matches.forEach(match => {
      const parts = match.match(/@([^{]+){([^}]+)}/) || [];
      if (parts[1] && parts[2]) {
        mentionsRef.current[fieldId][parts[2]] = parts[1];
      }
    });
  };
  
  // Initialize mentions from saved values
  useEffect(() => {
    if (linearSettings.defaultTitle) {
      extractMentionsFromText(linearSettings.defaultTitle, 'default_title');
    }
    
    if (linearSettings.responseMessage) {
      extractMentionsFromText(linearSettings.responseMessage, 'response_message');
    }
    
    console.log('Extracted mentions:', mentionsRef.current);
  }, []);
  
  // Track changes to mentions from parent component
  useEffect(() => {
    console.log('Field mentions from parent:', mentions);
    
    // When mentions change, update our tracked mentions
    if (mentions['default_title']?.length) {
      // Use a simple loop instead to avoid type errors
      mentions['default_title'].forEach(mention => {
        const displayText = (mention as any).displayName || 
                            (mention as any).name || 
                            String(mention.id);
        
        mentionsRef.current['default_title'][mention.id] = displayText;
      });
    }
    
    if (mentions['response_message']?.length) {
      // Use a simple loop instead to avoid type errors
      mentions['response_message'].forEach(mention => {
        const displayText = (mention as any).displayName || 
                            (mention as any).name || 
                            String(mention.id);
        
        mentionsRef.current['response_message'][mention.id] = displayText;
      });
    }
  }, [mentions]);
  
  // Debug the current serialized values whenever they change
  useEffect(() => {
    if (linearSettings.defaultTitle) {
      console.log('Current default title value:', linearSettings.defaultTitle);
    }
    if (linearSettings.responseMessage) {
      console.log('Current response message value:', linearSettings.responseMessage);
    }
  }, [linearSettings.defaultTitle, linearSettings.responseMessage]);

  // Get priority display name
  const getPriorityLabel = (priority?: LinearPriority): string => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      case 'no_priority': return 'No Priority';
      default: return 'No Priority';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: LinearPriority): string => {
    switch (priority) {
      case 'urgent': return '#F25353'; // Red
      case 'high': return '#FF9F1A';   // Orange
      case 'medium': return '#FFD600'; // Yellow
      case 'low': return '#4894FE';    // Blue
      case 'no_priority': 
      default: return '#8E8E93';       // Gray
    }
  };

  // Get form type label for Linear integration
  const getFormTypeLabel = (type: FormType, customType?: string): string => {
    switch (type) {
      case 'bug': return 'Bug';
      case 'feature': return 'Feature Request';
      case 'feedback': return 'Feedback';
      case 'question': return 'Question';
      case 'custom': return customType || 'Custom Request';
      default: return 'Request';
    }
  };

  // Function to preserve mentions in serialized form
  const preserveMentionsInString = (editorElement: HTMLElement | null, plainTextValue: string): string => {
    if (!editorElement) return plainTextValue;
    
    // Try multiple possible selectors for mention badges
    const mentionSelectors = [
      '[data-mention]',                     // Common attribute for mentions
      '[data-type="mention"]',              // Another common attribute
      '.mention-badge',                     // Class-based selection
      '.badge',                             // Generic badge class
      '[class*="mention"]',                 // Any class containing "mention"
      '[class*="badge"]',                   // Any class containing "badge"
      '[data-lexical-mention]',             // Lexical-specific attribute
      'span[data-lexical-decorator="true"]' // Lexical decorator elements
    ];
    
    // Try each selector until we find mentions
    let mentionElements: NodeListOf<Element> = document.createDocumentFragment().querySelectorAll('*'); // Empty NodeList
    
    for (const selector of mentionSelectors) {
      const elements = editorElement.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} mentions using selector: ${selector}`);
        mentionElements = elements;
        break;
      }
    }
    
    if (mentionElements.length === 0) {
      console.log("No mentions found in the editor with any selector");
      return plainTextValue;
    }
    
    // Clone the text value so we can modify it
    let result = plainTextValue;
    
    // Create a temporary div to help with text extraction
    const tempDiv = document.createElement('div');
    
    // Process each mention badge
    mentionElements.forEach((mentionEl) => {
      // Try different ways to extract the mention ID and text
      let mentionId = '';
      let mentionText = '';
      
      // Try data-* attributes first
      const possibleIdAttrs = ['data-mention-id', 'data-id', 'id', 'data-value'];
      for (const attr of possibleIdAttrs) {
        const value = mentionEl.getAttribute(attr);
        if (value) {
          mentionId = value;
          break;
        }
      }
      
      // If no ID found, try to use a fallback
      if (!mentionId) {
        mentionId = 'mention-' + Math.random().toString(36).substring(2, 9);
      }
      
      // Extract text content
      tempDiv.innerHTML = mentionEl.innerHTML;
      mentionText = tempDiv.textContent || '';
      
      // Remove any @ symbol at the beginning if present
      mentionText = mentionText.replace(/^@/, '').trim();
      
      if (mentionText) {
        // Create a serialized mention tag
        const mentionTag = `@[${mentionText}](${mentionId})`;
        
        // For simplicity, we'll append mentions at the end if we can't determine position
        if (!result.includes(mentionTag) && !result.includes(`@${mentionText}`)) {
          console.log(`Adding mention tag: ${mentionTag}`);
          result = result.trim() + ' ' + mentionTag + ' ';
        }
      }
    });
    
    console.log("Enhanced output with mentions:", result);
    return result;
  };

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
              onChange={(e) => setLinearSettings({...linearSettings, team: e.target.value, project: undefined, status: undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              disabled={isLoadingTeams}
            >
              <option value="">Select a team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.key})
                </option>
              ))}
            </select>
            {isLoadingTeams ? (
              <p className="text-xs text-muted-foreground mt-1">Loading teams...</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Choose a team to continue setup</p>
            )}
          </div>
          
          {/* Project field - now using real data */}
          <div>
            <label className="block mb-2 font-medium">Project (Optional)</label>
            <select 
              value={linearSettings.project || ''}
              onChange={(e) => setLinearSettings({...linearSettings, project: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              disabled={isLoadingProjects || !linearSettings.team}
            >
              <option value="">No project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {!linearSettings.team ? (
              <p className="text-xs text-muted-foreground mt-1">Select a team first</p>
            ) : isLoadingProjects ? (
              <p className="text-xs text-muted-foreground mt-1">Loading projects...</p>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No projects available for this team</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select a project (optional)</p>
            )}
          </div>
          
          {/* Initial Status field - now using real data */}
          <div>
            <label className="block mb-2 font-medium">Initial Status (Optional)</label>
            <select 
              value={linearSettings.status || ''}
              onChange={(e) => setLinearSettings({...linearSettings, status: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              disabled={isLoadingStates || !linearSettings.team}
            >
              <option value="">Default status</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
            {!linearSettings.team ? (
              <p className="text-xs text-muted-foreground mt-1">Select a team first</p>
            ) : isLoadingStates ? (
              <p className="text-xs text-muted-foreground mt-1">Loading statuses...</p>
            ) : states.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No statuses available for this team</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select a status (optional)</p>
            )}
          </div>
          
          {/* Labels field - now using real data */}
          <div>
            <label className="block mb-2 font-medium">Labels (Optional)</label>
            <div className="border rounded-md p-2 bg-background">
              {/* Selected labels */}
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {linearSettings.labels && linearSettings.labels.map((label, index) => {
                  const labelObj = labels.find(l => l.name === label);
                  const labelColor = labelObj?.color || '#888888';
                  return (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${labelColor}20`, // 20% opacity
                        color: labelColor,
                        borderColor: labelColor
                      }}
                    >
                      {label}
                      <button 
                        type="button" 
                        className="ml-1 inline-flex items-center justify-center"
                        onClick={() => handleRemoveLabel(label)}
                      >
                    <span className="sr-only">Remove</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
                  );
                })}
              </div>

              {/* Common labels grid */}
              <div className="border-t pt-3 pb-2">
                <div className="text-sm font-medium mb-2">Common labels</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {!isLoadingLabels && labels
                    .slice(0, 8) // Show first 8 labels as quick options
                    .map(label => {
                      const isSelected = linearSettings.labels?.includes(label.name) || false;
                      return (
                        <div 
                          key={label.id} 
                          className={`flex items-center p-1.5 rounded border cursor-pointer
                            ${isSelected 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted border-border hover:border-primary/30'
                            }`}
                          onClick={() => isSelected 
                            ? handleRemoveLabel(label.name) 
                            : handleAddLabel(label.id)
                          }
                        >
                          <span 
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          ></span>
                          <span className="text-xs truncate">{label.name}</span>
                        </div>
                      );
                    })
                  }
                  {isLoadingLabels && Array(8).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center p-1.5 rounded border border-border">
                      <div className="w-3 h-3 rounded-full mr-2 bg-muted"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Search for more labels */}
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Search for more</div>
                <div className="flex items-center">
                  <div className="relative flex-1">
                <input 
                  type="text" 
                      className="w-full p-1.5 pl-7 bg-background text-sm border rounded" 
                      placeholder="Search labels..."
                      value={labelSearch}
                      onChange={(e) => setLabelSearch(e.target.value)}
                      disabled={isLoadingLabels}
                    />
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
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
                
                {/* Search results */}
                {labelSearch.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto border border-border rounded">
                    {labels
                      .filter(label => 
                        label.name.toLowerCase().includes(labelSearch.toLowerCase()) &&
                        !linearSettings.labels?.includes(label.name)
                      )
                      .map(label => (
                        <div 
                          key={label.id} 
                          className="px-2 py-1.5 hover:bg-muted cursor-pointer flex items-center"
                          onClick={() => handleAddLabel(label.id)}
                        >
                          <span 
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          ></span>
                          <span className="text-sm">{label.name}</span>
                        </div>
                      ))}
                      {labels.filter(label => 
                        label.name.toLowerCase().includes(labelSearch.toLowerCase()) &&
                        !linearSettings.labels?.includes(label.name)
                      ).length === 0 && (
                        <div className="px-2 py-1.5 text-muted-foreground text-sm">
                          No matching labels found
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
            {isLoadingLabels ? (
              <p className="text-xs text-muted-foreground mt-1">Loading labels...</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select common labels or search for more</p>
            )}
          </div>
          
          {/* Default Assignee field - now using real data */}
          <div>
            <label className="block mb-2 font-medium">Default Assignee (Optional)</label>
            <select 
              value={linearSettings.assignee || ''}
              onChange={(e) => setLinearSettings({...linearSettings, assignee: e.target.value || undefined})}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              disabled={isLoadingUsers || !linearSettings.team}
            >
              <option value="">Unassigned</option>
              <option value="me">Me (Current User)</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} (@{user.displayName})
                </option>
              ))}
            </select>
            {!linearSettings.team ? (
              <p className="text-xs text-muted-foreground mt-1">Select a team first</p>
            ) : isLoadingUsers ? (
              <p className="text-xs text-muted-foreground mt-1">Loading team members...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No team members available</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select an assignee (optional)</p>
            )}
          </div>
          
          {/* Priority field - based on Linear API docs */}
          <div>
            <label className="block mb-2 font-medium">Default Priority</label>
            <div className="grid grid-cols-5 gap-2">
              {(['no_priority', 'low', 'medium', 'high', 'urgent'] as LinearPriority[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setLinearSettings({...linearSettings, priority})}
                  className={`p-2 flex flex-col items-center justify-center border rounded-md 
                    ${linearSettings.priority === priority 
                      ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'}
                  `}
                >
                  <div 
                    className="w-6 h-6 rounded-full mb-2 flex-shrink-0"
                    style={{ backgroundColor: getPriorityColor(priority) }}
                  ></div>
                  <span className={`text-xs ${linearSettings.priority === priority ? 'font-medium' : ''}`}>
                    {getPriorityLabel(priority)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sets the default priority for issues created from this form</p>
          </div>
          
          {/* Title field with mentions support - now using LexicalBadgeEditor */}
          <div>
            <label className="block mb-2 font-medium">Default Title Format</label>
            <div ref={defaultTitleEditorWrapperRef}>
              <LexicalBadgeEditor
                key={defaultTitleEditorKey}
                value={linearSettings.defaultTitle}
                onChange={(v) => {
                  console.log("Default Title onChange output:", v, "Length:", v.length);
                  
                  // Check if a mention was just selected
                  checkForMentionSelection(
                    'default_title',
                    v,
                    lastDefaultTitleWithAt
                  );
                  
                  // Append serialized mentions to text
                  const valueWithMentions = appendMentionsToText(v, 'default_title');
                  
                  // Update settings with enhanced value
                  setLinearSettings(prev => ({...prev, defaultTitle: valueWithMentions}));
                }}
                fields={fields}
                placeholder="Enter default title"
                className="border border-border rounded-md p-2 bg-background text-foreground min-h-[42px]"
                fieldId="default_title"
                isMarkdown={false}
                disableMarkdownShortcuts={true}
                autoFocus={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use {'{title}'} to include the submitted title. Type @ to reference form fields.</p>
          </div>
          
          {/* Response message field with Lexical editor and badge support */}
          <div>
            <label className="block mb-2 font-medium">Response Message</label>
            <div ref={responseMessageEditorWrapperRef}>
              <LexicalBadgeEditor
                key={responseEditorKey}
                value={linearSettings.responseMessage}
                onChange={(v) => {
                  console.log("Response Message onChange output:", v, "Length:", v.length, "Contains @:", v.includes('@'));
                  
                  // Check if a mention was just selected
                  checkForMentionSelection(
                    'response_message',
                    v,
                    lastResponseMessageWithAt
                  );
                  
                  // Append serialized mentions to text
                  const valueWithMentions = appendMentionsToText(v, 'response_message');
                  
                  // Update settings with enhanced value
                  setLinearSettings(prev => ({...prev, responseMessage: valueWithMentions}));
                }}
                fields={fields}
                placeholder="Enter response message..."
                className="border border-border rounded-md p-2 bg-background text-foreground min-h-[250px]"
                fieldId="response_message"
                isMarkdown={true}
                disableMarkdownShortcuts={false}
                autoFocus={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Shown to users after form submission. Type @ to reference form fields. Supports markdown formatting.
              Try typing # for headings, * for lists, {'>'} for quotes, ** for bold, * for italic.
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
          
          {/* Status preview removed as requested */}
        </div>
      )}
    </div>
  );
} 