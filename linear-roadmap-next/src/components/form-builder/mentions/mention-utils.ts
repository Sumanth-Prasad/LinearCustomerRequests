import type { FieldMention, FormField } from "./types";

// Function to update mention positions when text changes
export function updateMentionPositions(value: string, mentions: FieldMention[]): FieldMention[] {
  if (mentions.length === 0) return [];
  
  // Find all marker characters in the value
  const markerPositions: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value.charAt(i) === '\u200D') {
      markerPositions.push(i);
    }
  }
  
  // Map mentions to new positions
  return mentions
    .filter((_, index) => index < markerPositions.length)
    .map((mention, index) => {
      const pos = markerPositions[index];
      return {
        ...mention,
        startPos: pos,
        endPos: pos + 1
      };
    });
}

// Handle selection from the mention menu
export function processMentionSelection(
  selectedFieldId: string,
  fields: FormField[],
  value: string,
  caretPosition: number,
  searchTerm: string
): {
  newValue: string;
  newCaretPosition: number;
  mention: FieldMention;
} {
  // Find where to insert the mention
  const atSymbolIndex = value.substring(0, caretPosition).lastIndexOf("@");
  if (atSymbolIndex === -1) {
    throw new Error("@ symbol not found");
  }
  
  let fieldLabel: string;
  let fieldId: string;
  
  if (selectedFieldId === 'current_date') {
    // Handle current date
    const today = new Date();
    const formattedDate = today.toLocaleDateString();
    fieldLabel = formattedDate;
    fieldId = `date_${formattedDate.replace(/\//g, '-')}`;
  } else {
    // Find the selected field
    const selectedField = fields.find(f => f.id === selectedFieldId);
    if (!selectedField) {
      throw new Error("Selected field not found");
    }
    fieldLabel = selectedField.label;
    fieldId = selectedField.id;
  }
  
  // The displayed badge text (for length calculation)
  const visibleText = `@${fieldLabel}`;
  const visibleLength = visibleText.length;
  
  // Add a ZERO-WIDTH JOINER character (U+200D) as the marker
  const marker = '\u200D';
  
  // Replace the @searchTerm with the marker
  const newValue =
    value.substring(0, atSymbolIndex) +
    marker +
    value.substring(atSymbolIndex + 1 + searchTerm.length);
  
  // Calculate new cursor position
  const newCaretPosition = atSymbolIndex + 1;
  
  // Create the mention object
  const mention: FieldMention = {
    id: fieldId,
    label: fieldLabel,
    startPos: atSymbolIndex,
    endPos: atSymbolIndex + 1,
    length: visibleLength
  };
  
  return { newValue, newCaretPosition, mention };
}

// Parse text content to extract mentions and their positions
export function extractMentionsFromText(
  text: string, 
  fields: FormField[]
): FieldMention[] {
  // Find all marker positions
  const mentions: FieldMention[] = [];
  const regex = /\u200D/g;
  let match;
  
  // Map of field IDs to labels
  const fieldMap = new Map<string, string>();
  fields.forEach(field => fieldMap.set(field.id, field.label));
  
  // Add current date handling
  fieldMap.set('current_date', new Date().toLocaleDateString());
  
  while ((match = regex.exec(text)) !== null) {
    const pos = match.index;
    // Try to determine which field this belongs to based on context
    // This is a simplified approach - in real usage you'd need to store
    // field IDs with positions
    
    // For this example, we'll assign random fields
    const fieldIds = Array.from(fieldMap.keys());
    const randomFieldId = fieldIds[Math.floor(Math.random() * fieldIds.length)];
    const fieldLabel = fieldMap.get(randomFieldId) || 'Unknown';
    
    mentions.push({
      id: randomFieldId,
      label: fieldLabel,
      startPos: pos,
      endPos: pos + 1,
      length: fieldLabel.length + 1 // +1 for @
    });
  }
  
  return mentions;
} 