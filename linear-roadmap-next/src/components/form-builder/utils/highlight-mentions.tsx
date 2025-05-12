import React from 'react';
import { FieldMention } from '../core/types';

/**
 * Highlights mentions in text by wrapping them in a styled span
 * 
 * @param text The text that may contain mentions
 * @param mentions Array of mention objects with positions and metadata
 * @returns React elements with styled mentions
 */
export function highlightMentions(text: string, mentions?: FieldMention[]): React.ReactNode {
  if (!mentions || mentions.length === 0) {
    return text;
  }

  // Sort mentions by starting position to process them in order
  const sortedMentions = [...mentions].sort((a, b) => a.startPos - b.startPos);
  
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const mention of sortedMentions) {
    // Add text before the mention
    if (mention.startPos > lastIndex) {
      result.push(text.substring(lastIndex, mention.startPos));
    }
    
    // Add highlighted mention
    result.push(
      <span 
        key={mention.id} 
        className="bg-primary/20 text-primary rounded px-1 py-0.5"
        data-mention-id={mention.id}
      >
        {text.substring(mention.startPos, mention.endPos)}
      </span>
    );
    
    lastIndex = mention.endPos;
  }
  
  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }
  
  return <>{result}</>;
} 