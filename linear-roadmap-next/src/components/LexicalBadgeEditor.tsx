import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
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
} from "lexical";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

import { MentionCombobox } from "@/components/ui/mention-combobox";
import { MentionNode } from "@/components/MentionNode";

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
  theme: {},
  nodes: [MentionNode],
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
}

// Local replica of FormField type used by the mention combobox.
type FieldType = "text" | "textarea" | "select" | "checkbox" | "radio" | "email" | "phone" | "file" | "image";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export function LexicalBadgeEditor({ value, onChange, fields, placeholder, className, fieldId }: LexicalBadgeEditorProps) {
  // Use shared editor config
  const initialConfig = editorConfig;

  // Keep internal state to initialize only once
  const [editorState, setEditorState] = useState<string>(value);

  const handleEditorChange = useCallback(
    (state) => {
      state.read(() => {
        setEditorState(state.toJSON());
      });
      // Export plain text for now; you might want to export JSON instead.
      const plain = state.read(() => {
        return $getRoot().getTextContent();
      });
      onChange(plain);
    },
    [onChange],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={className + " relative"}>
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className="w-full resize-none outline-none bg-transparent" />}
          placeholder={<div className="absolute top-0 left-0 text-muted-foreground pointer-events-none select-none p-2">{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleEditorChange} />
        <MentionPlugin fields={fields} fieldId={fieldId} containerRef={containerRef} />
      </LexicalComposer>
    </div>
  );
} 