import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  KEY_ARROW_DOWN_COMMAND, 
  KEY_ENTER_COMMAND, 
  $createTextNode, 
  $createParagraphNode,
  $getSelection, 
  $isRangeSelection, 
  $getRoot, 
  COMMAND_PRIORITY_LOW,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  ElementFormatType,
  TextFormatType,
  $setSelection,
  SELECTION_CHANGE_COMMAND
} from "lexical";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

import { MentionCombobox } from "@/components/ui/mention-combobox";
import { MentionNode } from "@/components/MentionNode";

// Import markdown-related packages
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { $convertToMarkdownString, $convertFromMarkdownString } from "@lexical/markdown";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";

// Import for rich text support with markdown
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $createQuoteNode } from "@lexical/rich-text";

// Import specialized commands for headings
import {
  $isHeadingNode,
  $createHeadingNode,
  $isQuoteNode,
  HeadingTagType,
} from "@lexical/rich-text";

// Add list-specific imports
import {
  $isListNode,
  $createListItemNode,
  $createListNode,
  $isListItemNode,
} from "@lexical/list";

// Import for toolbar
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isAtNodeEnd } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";

// Add ListPlugin import
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

// Import the FieldType and FormField types
import { FieldType, FormField } from "@/components/form-builder/core/types";

// Define a basic theme for the editor
const editorTheme = {
  heading: {
    h1: "text-2xl font-bold",
    h2: "text-xl font-bold",
    h3: "text-lg font-bold",
  },
  list: {
    ul: "list-disc ml-6",
    ol: "list-decimal ml-6",
    listitem: "my-1",
  },
  quote: "border-l-4 border-gray-300 pl-4 italic",
  code: "font-mono bg-gray-100 rounded px-1 py-0.5 dark:bg-gray-800",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "font-mono bg-gray-100 rounded px-1 py-0.5 dark:bg-gray-800",
  },
};

// Define toolbar button styles
const EDITOR_BUTTON_CLASS = "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800";
const ACTIVE_EDITOR_BUTTON_CLASS = "bg-gray-200 dark:bg-gray-700";

// Define formats
const TEXT_FORMAT_OPTIONS: {
  [key: string]: { icon: React.ReactNode; name: TextFormatType }
} = {
  bold: {
    icon: <span className="font-bold">B</span>,
    name: "bold"
  },
  italic: {
    icon: <span className="italic">I</span>,
    name: "italic"
  },
  underline: {
    icon: <span className="underline">U</span>,
    name: "underline"
  },
  strikethrough: {
    icon: <span className="line-through">S</span>,
    name: "strikethrough"
  },
  code: {
    icon: <span className="font-mono">{`<>`}</span>,
    name: "code"
  },
};

const ELEMENT_FORMAT_OPTIONS: {
  [key: string]: { icon: React.ReactNode; name: ElementFormatType }
} = {
  left: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="15" y2="12"></line>
        <line x1="3" y1="18" x2="18" y2="18"></line>
      </svg>
    ),
    name: "left"
  },
  center: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="6" y1="12" x2="18" y2="12"></line>
        <line x1="4" y1="18" x2="20" y2="18"></line>
      </svg>
    ),
    name: "center"
  },
  right: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="9" y1="12" x2="21" y2="12"></line>
        <line x1="6" y1="18" x2="21" y2="18"></line>
      </svg>
    ),
    name: "right"
  },
};

// Improved toolbar component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [textFormatStates, setTextFormatStates] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  });

  const [elementFormatState, setElementFormatState] = useState<ElementFormatType>("left");
  // Add state to track the current block type (paragraph or heading level)
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [isListActive, setIsListActive] = useState<{
    bullet: boolean;
    numbered: boolean;
  }>({ bullet: false, numbered: false });
  
  // Update state on selection change
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          // Update active editor
          setActiveEditor(editor);
          // Update focus state
          const rootElement = editor.getRootElement();
          setIsEditorFocused(editor.isEditable() && rootElement !== null && rootElement.contains(document.activeElement));
          
          // Get selection and update format states
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Update text format states
            setTextFormatStates({
              bold: selection.hasFormat("bold"),
              italic: selection.hasFormat("italic"),
              underline: selection.hasFormat("underline"),
              strikethrough: selection.hasFormat("strikethrough"),
              code: selection.hasFormat("code"),
            });
            
            // Update element format state
            const anchorNode = selection.anchor.getNode();
            const element = anchorNode.getKey() === 'root' 
              ? anchorNode 
              : anchorNode.getTopLevelElementOrThrow();
            // Check if getFormat exists on the element and correctly handle the returned format
            let formatValue: ElementFormatType = "left";
            if (element.getFormat && typeof element.getFormat === 'function') {
              const format = element.getFormat();
              if (format === 0) formatValue = "left";
              else if (format === 1) formatValue = "center"; 
              else if (format === 2) formatValue = "right";
              else if (format === 3) formatValue = "justify";
            }
            setElementFormatState(formatValue);
            
            // Detect block type (paragraph, heading, or list)
            const parentElement = anchorNode.getTopLevelElementOrThrow();
            
            // Simplified logic for detecting headings and lists
            if ($isHeadingNode(parentElement)) {
              // It's a heading, get the tag (h1, h2, h3)
              setBlockType(parentElement.getTag());
              setIsListActive({ bullet: false, numbered: false });
            } else {
              // First check if the current node is a list item
              let isInList = $isListItemNode(parentElement);
              let listType = '';
              let currentNode = parentElement;
              
              // If not a list item, check ancestors
              if (!isInList) {
                let parent = parentElement.getParent();
                while (parent !== null) {
                  if ($isListItemNode(parent)) {
                    isInList = true;
                    currentNode = parent;
                    break;
                  }
                  parent = parent.getParent();
                }
              }
              
              // If we found a list item, determine the list type
              if (isInList) {
                // Get the parent list node to determine the type
                let listNode = currentNode.getParent();
                while (listNode !== null && !$isListNode(listNode)) {
                  listNode = listNode.getParent();
                }
                
                if (listNode !== null && $isListNode(listNode)) {
                  // Get the list type directly from ListNode
                  listType = listNode.getListType();
                  
                  setBlockType('list');
                  setIsListActive({
                    bullet: listType === 'bullet',
                    numbered: listType === 'number'
                  });
                } else {
                  // Shouldn't happen, but just in case
                  setBlockType('paragraph');
                  setIsListActive({ bullet: false, numbered: false });
                }
              } else {
                // Default to paragraph
                setBlockType('paragraph');
                setIsListActive({ bullet: false, numbered: false });
              }
            }
          }
        });
      })
    );
  }, [editor]);
  
  // Format elements
  const formatHeading = useCallback(
    (headingTag: string) => {
      if (activeEditor) {
        activeEditor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            if (headingTag === "paragraph") {
              // Convert to paragraph
              for (const node of selection.getNodes()) {
                const parent = node.getParent();
                if ($isHeadingNode(parent) || $isQuoteNode(parent)) {
                  const paragraph = $createParagraphNode();
                  // Move the content to the new paragraph node
                  parent.getChildren().forEach(child => {
                    paragraph.append(child);
                  });
                  parent.replace(paragraph);
                }
              }
            } else if (headingTag === "h1" || headingTag === "h2" || headingTag === "h3") {
              // Convert to heading - first check if we're already in a heading
              const topLevelElement = selection.anchor.getNode().getTopLevelElementOrThrow();
              
              // Whether it's already a heading or not, create a new heading and replace
              const heading = $createHeadingNode(headingTag as HeadingTagType);
              
              // Copy children to the new heading
              topLevelElement.getChildren().forEach(child => {
                heading.append(child);
              });
              
              topLevelElement.replace(heading);
            }
          }
        });
      }
    },
    [activeEditor]
  );

  // Add a handler for list commands
  const handleListCommand = useCallback(
    (listType: 'bullet' | 'number') => {
      if (activeEditor) {
        // Check if we're already in this list type
        if ((listType === 'bullet' && isListActive.bullet) || 
            (listType === 'number' && isListActive.numbered)) {
          // We need to remove the list - convert to paragraphs
          activeEditor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              // Find the list node to convert
              const nodes = selection.getNodes();
              
              // Start with the anchor node's ancestors
              let currentNode: any = selection.anchor.getNode();
              
              // Find the list item first (could be the node or an ancestor)
              let listItemNode: any = null;
              while (currentNode && !$isListItemNode(currentNode)) {
                currentNode = currentNode.getParent();
              }
              
              if (currentNode && $isListItemNode(currentNode)) {
                listItemNode = currentNode;
                // Now find the parent list
                let listNode = listItemNode.getParent();
                
                // Convert to paragraphs
                if (listNode && $isListNode(listNode)) {
                  // Extract all list item content to paragraphs
                  const listItems = listNode.getChildren();
                  
                  // Create a paragraph for each list item
                  const paragraphs: Array<any> = [];
                  listItems.forEach(item => {
                    if ($isListItemNode(item)) {
                      const paragraph = $createParagraphNode();
                      item.getChildren().forEach(child => {
                        paragraph.append(child);
                      });
                      paragraphs.push(paragraph);
                    }
                  });
                  
                  // Replace the list with the paragraphs
                  if (paragraphs.length > 0) {
                    listNode.replace(paragraphs[0]);
                    
                    // Insert the rest after the first one
                    let prevNode = paragraphs[0];
                    for (let i = 1; i < paragraphs.length; i++) {
                      prevNode.insertAfter(paragraphs[i]);
                      prevNode = paragraphs[i];
                    }
                  }
                }
              }
            }
          });
        } else {
          // Determine which command to use based on the list type
          const command = 
            listType === 'bullet' 
              ? INSERT_UNORDERED_LIST_COMMAND 
              : INSERT_ORDERED_LIST_COMMAND;
          
          // Execute the list command
          activeEditor.dispatchCommand(command, undefined);
        }
      }
    },
    [activeEditor, isListActive]
  );

  // Toolbar component
  return (
    <div className="flex flex-wrap gap-1 mb-2 p-1 border-b border-border">
      <div className="flex items-center gap-1 mr-2">
        {/* Text Format Options */}
        {Object.entries(TEXT_FORMAT_OPTIONS).map(([formatKey, format]) => (
          <button
            key={formatKey}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, format.name);
            }}
            className={`${EDITOR_BUTTON_CLASS} ${textFormatStates[formatKey] ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
            title={formatKey.charAt(0).toUpperCase() + formatKey.slice(1)}
          >
            {format.icon}
          </button>
        ))}
      </div>
      
      <div className="border-r border-gray-300 dark:border-gray-700 mx-1 h-6" />
      
      <div className="flex items-center gap-1 mr-2">
        {/* Heading Buttons */}
        <button
          onClick={() => formatHeading("h1")}
          className={`${EDITOR_BUTTON_CLASS} ${blockType === "h1" ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Heading 1"
        >
          <span className="font-bold">H1</span>
        </button>
        
        <button
          onClick={() => formatHeading("h2")}
          className={`${EDITOR_BUTTON_CLASS} ${blockType === "h2" ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Heading 2"
        >
          <span className="font-bold">H2</span>
        </button>
        
        <button
          onClick={() => formatHeading("h3")}
          className={`${EDITOR_BUTTON_CLASS} ${blockType === "h3" ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Heading 3"
        >
          <span className="font-bold">H3</span>
        </button>
        
        <button
          onClick={() => formatHeading("paragraph")}
          className={`${EDITOR_BUTTON_CLASS} ${blockType === "paragraph" ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Paragraph"
        >
          <span>¶</span>
        </button>
      </div>
      
      <div className="border-r border-gray-300 dark:border-gray-700 mx-1 h-6" />
      
      <div className="flex items-center gap-1 mr-2">
        {/* Lists */}
        <button
          onClick={() => handleListCommand('bullet')}
          className={`${EDITOR_BUTTON_CLASS} ${isListActive.bullet ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Bullet List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        
        <button
          onClick={() => handleListCommand('number')}
          className={`${EDITOR_BUTTON_CLASS} ${isListActive.numbered ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
          title="Numbered List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
        
        <button
          onClick={() => {
            activeEditor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const quoteNode = $createQuoteNode();
                selection.insertNodes([quoteNode]);
              }
            });
          }}
          className={EDITOR_BUTTON_CLASS}
          title="Quote"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
          </svg>
        </button>
      </div>
      
      <div className="border-r border-gray-300 dark:border-gray-700 mx-1 h-6" />
      
      <div className="flex items-center gap-1">
        {/* Alignment */}
        {Object.entries(ELEMENT_FORMAT_OPTIONS).map(([formatKey, format]) => (
          <button
            key={formatKey}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format.name);
            }}
            className={`${EDITOR_BUTTON_CLASS} ${elementFormatState === format.name ? ACTIVE_EDITOR_BUTTON_CLASS : ""}`}
            title={formatKey.charAt(0).toUpperCase() + formatKey.slice(1) + " Align"}
          >
            {format.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Mention Suggestion Menu                           */
/* -------------------------------------------------------------------------- */

interface MentionMenuState {
  isOpen: boolean;
  position: { top: number; left: number };
  searchTerm: string;
}

// Create a shared editor config
const editorConfig = {
  namespace: "badge-editor",
  theme: editorTheme,
  // Register all nodes that might be needed for markdown
  nodes: [
    MentionNode,
    HeadingNode,
    QuoteNode,
    ListItemNode,
    ListNode,
    CodeNode,
    CodeHighlightNode,
    LinkNode,
    AutoLinkNode
  ],
  onError: (e: Error) => {
    console.error(e);
  },
};

// Function component to properly use Lexical context hooks
function MentionPlugin({ fields, fieldId, containerRef }: { fields: FormField[]; fieldId?: string; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [editor] = useLexicalComposerContext();
  const [menuState, setMenuState] = useState<MentionMenuState>({
    isOpen: false,
    position: { top: 0, left: 0 },
    searchTerm: "",
  });
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return;
        }
        const anchor = selection.anchor;
        const node = anchor.getNode();
        const textContent = node.getTextContent();
        const offset = anchor.offset;

        // Determine the text before caret up to current node start
        const before = textContent.slice(0, offset);
        const atIndex = before.lastIndexOf("@");
        if (atIndex !== -1) {
          const term = before.slice(atIndex + 1);
          
          // Compute popup position relative to the viewport based on the caret.
          let position = { top: 0, left: 0 };

          try {
            const domSelection = window.getSelection();
            if (domSelection && domSelection.rangeCount > 0) {
              const range = domSelection.getRangeAt(0);
              const rect = range.getBoundingClientRect();

              if (containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                position = {
                  top: rect.top - containerRect.top + containerRef.current.scrollTop,
                  left: rect.right - containerRect.left + containerRef.current.scrollLeft + 2,
                };
              } else {
                position = {
                  top: rect.top,
                  left: rect.right + 2,
                };
              }
            }
          } catch {
            // ignore selection errors
          }
          
          // Simple approach - show popup
          setMenuState({
            isOpen: true,
            position,
            searchTerm: term
          });
        } else if (menuState.isOpen) {
          // No @ in current word -> close menu
          setMenuState((s) => ({ ...s, isOpen: false }));
        }
      });
    });
    return removeListener;
  }, [editor, menuState.isOpen, fieldId]);

  // Handle selection from combobox
  const handleSelectItem = useCallback(
    (fieldId: string) => {
      const selectedField = fields.find((f) => f.id === fieldId);
      if (!selectedField) return;
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const textNode = selection.anchor.getNode();
        if (textNode == null) return;

        // Remove the @searchTerm text fragment
        const offset = selection.anchor.offset;
        const textContent = textNode.getTextContent();
        const before = textContent.slice(0, offset);
        const atIndex = before.lastIndexOf("@");
        if (atIndex === -1) return;

        try {
          // Always start with a paragraph to ensure proper structure
          // This approach replaces the text node's content rather than trying
          // to manipulate the DOM structure directly
          
          // Create the new content
          const mentionNode = new MentionNode(selectedField.id, selectedField.label);
          
          // Get the parent - might be a paragraph or another element
          const parent = textNode.getParent();
          if (!parent) return;
          
          // Create a temporary paragraph if needed
          const paragraph = $createParagraphNode();
          
          // Add head text if it exists
          if (before.slice(0, atIndex).length > 0) {
            paragraph.append($createTextNode(before.slice(0, atIndex)));
          }
          
          // Add the mention node
          paragraph.append(mentionNode);
          
          // Add space after mention
          const spaceNode = $createTextNode(" ");
          paragraph.append(spaceNode);
          
          // Add tail text if it exists
          const tailNode = textContent.slice(offset).length > 0 ? $createTextNode(textContent.slice(offset)) : undefined;
          if (tailNode) {
            paragraph.append(tailNode);
          }
          
          // Replace the text node with our paragraph's children
          if (parent.getType() === 'paragraph') {
            // If already in a paragraph, just transfer the children
            textNode.remove();
            parent.append(...paragraph.getChildren());
            
            // Set selection position
            if (tailNode) {
              selection.setTextNodeRange(tailNode, 0, tailNode, 0);
            } else {
              selection.setTextNodeRange(spaceNode, 1, spaceNode, 1);
            }
          } else if (parent.getType() === 'root') {
            // If in root, we need to replace with the paragraph
            textNode.replace(paragraph);
            
            // Set selection position
            if (tailNode) {
              selection.setTextNodeRange(tailNode, 0, tailNode, 0);
            } else {
              selection.setTextNodeRange(spaceNode, 1, spaceNode, 1);
            }
          } else {
            // For any other parent type, use the most general approach
            // Replace the text node with our content
            const children = paragraph.getChildren();
            textNode.replace(children[0]);
            
            // Insert the rest of the children after the first one
            let prevNode = children[0];
            for (let i = 1; i < children.length; i++) {
              prevNode.insertAfter(children[i]);
              prevNode = children[i];
            }
            
            // Set selection position
            if (tailNode) {
              selection.setTextNodeRange(tailNode, 0, tailNode, 0);
            } else {
              selection.setTextNodeRange(spaceNode, 1, spaceNode, 1);
            }
          }
        } catch (error) {
          console.error('Error inserting mention:', error);
        }
      });
      setMenuState((s) => ({ ...s, isOpen: false }));
    },
    [editor, fields, fieldId],
  );

  /* ------------------------------------------------------------------ */
  /*                 Keyboard & click-outside behaviour                  */
  /* ------------------------------------------------------------------ */

  // When the suggestions menu is open, keep arrow-down and Enter inside it.
  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        if (menuState.isOpen) {
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, menuState.isOpen]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (menuState.isOpen) {
          event?.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, menuState.isOpen]);

  // Hide the menu when the user clicks outside of it.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuState.isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState((s) => ({ ...s, isOpen: false }));
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuState.isOpen]);

  if (!menuState.isOpen) return null;

  return (
    <div
      className="mention-dropdown absolute z-50 w-64 overflow-hidden rounded-md border border-border shadow-md bg-popover"
      ref={menuRef}
      style={{
        top: `${menuState.position.top}px`,
        left: `${menuState.position.left}px`,
      }}
    >
      <MentionCombobox
        fields={fields}
        inputId={null}
        searchTerm={menuState.searchTerm}
        onSearchChange={() => {}}
        onSelectItem={handleSelectItem}
        getFieldTypeIcon={() => null}
        disableSearchByDefault
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Editor                                  */
/* -------------------------------------------------------------------------- */

interface LexicalBadgeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fields: FormField[];
  placeholder?: string;
  className?: string;
  fieldId?: string;
  isMarkdown?: boolean; // New prop to enable markdown mode
  disableMarkdownShortcuts?: boolean; // New prop to disable markdown shortcuts
  hideMarkdownHelp?: boolean; // New prop to hide markdown help dropdown
  autoFocus?: boolean; // Whether to auto-focus the editor on mount (default: true)
}

export function LexicalBadgeEditor({ 
  value, 
  onChange, 
  fields, 
  placeholder, 
  className, 
  fieldId, 
  isMarkdown = false, 
  disableMarkdownShortcuts = false,
  hideMarkdownHelp = false,
  autoFocus = true
}: LexicalBadgeEditorProps) {
  // Use shared editor config with explicitly defined nodes
  const initialConfig = useMemo(() => {
    // Make sure all nodes are registered explicitly
    return {
      namespace: "badge-editor",
      theme: editorTheme,
      nodes: [
        MentionNode,
        HeadingNode,
        QuoteNode,
        ListItemNode,
        ListNode,
        CodeNode,
        CodeHighlightNode,
        LinkNode,
        AutoLinkNode
      ],
      onError: (e: Error) => {
        console.error(e);
      },
      // Start with an empty editor instead of loading content
      // Only load content if value is non-empty
      editorState: value && value.trim() !== '' && isMarkdown ? 
        () => $convertFromMarkdownString(value, TRANSFORMERS) : 
        undefined
    };
  }, [isMarkdown, value]);

  // Define URL matcher for AutoLinkPlugin
  const URL_MATCHER = /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/i;

  const MATCHERS = [
    (text: string) => {
      const match = URL_MATCHER.exec(text);
      return (
        match && {
          index: match.index,
          length: match[0].length,
          text: match[0],
          url: match[0].startsWith('http') ? match[0] : `https://${match[0]}`,
          attributes: { rel: 'noopener', target: '_blank' }
        }
      );
    }
  ];

  // Keep internal state to initialize only once
  const [editorState, setEditorState] = useState<string>(value);

  const handleEditorChange = useCallback(
    (state) => {
      state.read(() => {
        setEditorState(state.toJSON());
      });
      
      // Export different formats based on the mode
      if (isMarkdown) {
        // Export markdown when in markdown mode
        const markdown = state.read(() => {
          return $convertToMarkdownString(TRANSFORMERS);
        });
        onChange(markdown);
      } else {
        // Export plain text for regular mode (badges will be included as text)
        const plain = state.read(() => {
          return $getRoot().getTextContent();
        });
        onChange(plain);
      }
    },
    [onChange, isMarkdown],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Use a custom set of transformers to ensure lists work properly
  const customTransformers = [...TRANSFORMERS];

  // Initialize with empty value to allow placeholder to show
  const initialValue = value || '';

  // Placeholder component with direct DOM access for proper positioning
  const PlaceholderComponent = ({ text }: { text?: string }) => {
    const placeholderRef = useRef<HTMLDivElement>(null);
    const [editor] = useLexicalComposerContext();
    
    useLayoutEffect(() => {
      // Position the placeholder immediately when DOM is ready
      const positionPlaceholder = () => {
        if (!placeholderRef.current) return;
        
        // Get the cursor position from the actual editor
        const rootElement = editor.getRootElement();
        if (!rootElement) return;
        
        // For markdown mode with toolbar, position differently
        const topPosition = isMarkdown ? 45 : 8;
        
        // Apply positioning directly to the placeholder element
        placeholderRef.current.style.position = 'absolute';
        placeholderRef.current.style.top = `${topPosition}px`;
        placeholderRef.current.style.left = '10px';
        placeholderRef.current.style.opacity = '0.65';
        placeholderRef.current.style.pointerEvents = 'none';
        placeholderRef.current.style.userSelect = 'none';
        placeholderRef.current.style.color = 'var(--muted-foreground, #888)';
        placeholderRef.current.style.zIndex = '0';
        placeholderRef.current.style.margin = '0';
        placeholderRef.current.style.padding = '0';
      };
      
      // Position initially
      positionPlaceholder();
      
      // Check on window resize
      window.addEventListener('resize', positionPlaceholder);
      return () => {
        window.removeEventListener('resize', positionPlaceholder);
      };
    }, [editor, isMarkdown]);
    
    return (
      <div ref={placeholderRef} className="placeholder">
        {text}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={className + " relative lexical-editor-container"} data-fieldid={fieldId || undefined}>
      <LexicalComposer initialConfig={initialConfig}>
        {isMarkdown && <ToolbarPlugin />}
        
        {isMarkdown ? (
          <RichTextPlugin
            contentEditable={<ContentEditable className="w-full resize-none outline-none bg-transparent py-2 px-2" />}
            placeholder={
              <PlaceholderComponent text={placeholder} />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        ) : (
          <PlainTextPlugin
            contentEditable={<ContentEditable className="w-full resize-none outline-none bg-transparent py-2 px-2" />}
            placeholder={
              <PlaceholderComponent text={placeholder} />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        )}
        
        <HistoryPlugin />
        <OnChangePlugin onChange={handleEditorChange} />
        <MentionPlugin fields={fields} fieldId={fieldId} containerRef={containerRef} />
        
        {/* Add List Plugin when in markdown mode */}
        {isMarkdown && <ListPlugin />}
        
        {/* Add AutoLinkPlugin when in markdown mode */}
        {isMarkdown && <AutoLinkPlugin matchers={MATCHERS} />}
        
        {/* Add markdown shortcuts when in markdown mode and not disabled */}
        {isMarkdown && !disableMarkdownShortcuts && <MarkdownShortcutPlugin transformers={customTransformers} />}
        
        {/* Add auto-focus plugin (optional) */}
        {autoFocus && <AutoFocusPlugin />}
      </LexicalComposer>
    </div>
  );
}

// Auto-focus plugin to help with editor focus
function AutoFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    // Focus the editor when the component mounts
    editor.focus();
    
    // Handle click on the editor container to ensure proper focus
    const handleContainerClick = () => {
      if (!editor.isEditable()) return;
      editor.focus();
    };
    
    // Find the contentEditable element
    const rootElement = editor.getRootElement();
    if (rootElement && rootElement.parentElement) {
      rootElement.parentElement.addEventListener('click', handleContainerClick);
      
      return () => {
        if (rootElement && rootElement.parentElement) {
          rootElement.parentElement.removeEventListener('click', handleContainerClick);
        }
      };
    }
  }, [editor]);
  
  return null;
} 