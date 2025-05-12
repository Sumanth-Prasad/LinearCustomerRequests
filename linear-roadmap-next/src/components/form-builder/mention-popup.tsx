// This is a barrel file that re-exports components from the mentions directory
// for backward compatibility and easier imports

export { MentionPopup } from './mentions/mention-popup';
export { MentionCombobox } from './mentions/mention-combobox';
export { updateMentionPositions, processMentionSelection } from './mentions/mention-utils';
export { BadgeInput } from './mentions/badge-input';
export { CursorStyleFix } from './mentions/cursor-style-fix';
export { highlightMentions } from './mentions/highlight-mentions'; 