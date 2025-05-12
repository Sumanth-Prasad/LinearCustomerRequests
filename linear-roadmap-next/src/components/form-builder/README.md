# Form Builder Component

A modular and feature-rich form builder component for creating customizable forms with field references, Linear integration, and more.

## Component Structure

The form builder has been organized into a hierarchical folder structure for better maintainability and navigation:

### Directory Structure

```
form-builder/
├── core/                 # Core components & types
│   ├── form-builder-main.tsx
│   ├── form-preview.tsx
│   ├── form-toolbar.tsx
│   └── types.ts
│
├── fields/               # Field rendering & editing
│   ├── field-card.tsx
│   ├── field-editor.tsx
│   ├── field-icons.tsx
│   └── sortable-field.tsx
│
├── linear/               # Linear integration
│   └── linear-settings.tsx
│
├── mentions/             # Badge/mentions functionality
│   ├── badge-input.tsx
│   ├── cursor-style-fix.tsx
│   ├── highlight-mentions.tsx
│   ├── mention-combobox.tsx
│   ├── mention-popup.tsx
│   └── mention-utils.ts
│
├── utils/                # Utility functions
│   ├── field-operations.ts
│   └── field-utils.ts
│
├── form-builder.tsx      # Simple re-export file (entry point)
├── index.tsx             # Exports all components & utilities
└── README.md             # Documentation
```

### Key Components

- **Core Components**
  - `form-builder-main.tsx` - Main component orchestration
  - `form-preview.tsx` - Form preview panel
  - `form-toolbar.tsx` - Toolbar with field controls

- **Field Components**
  - `field-card.tsx` - Rendered field card component
  - `sortable-field.tsx` - Sortable wrapper for fields
  - `field-editor.tsx` - Properties editor for fields

- **Linear Integration**
  - `linear-settings.tsx` - Linear integration settings panel

- **Mention System Components**
  - `badge-input.tsx` - Input with badge/mention functionality
  - `mention-combobox.tsx` - Field reference dropdown
  - `cursor-style-fix.tsx` - Fixes for cursor positioning

- **Utilities**
  - `field-utils.ts` - Helper functions for field operations
  - `field-operations.ts` - Functions for field CRUD operations

## Features

- Drag and drop field reordering
- Custom field types (text, email, phone, textarea, etc.)
- Field references with @ mentions
- Cursor positioning fixes for badge components
- Linear integration settings
- Field validation
- Responsive design

## Usage

Import the component:

```tsx
import { FormBuilder } from "@/components/form-builder";

export default function SettingsPage() {
  return (
    <div>
      <FormBuilder />
    </div>
  );
}
```

## Field References (@ Mentions)

The form builder implements a special @mention system that allows referencing other form fields in text input and textarea fields. This feature helps create dynamic form fields that can reference other fields.

### How it works:

1. When a user types '@' in an input field, the mention popup appears
2. The user can select a field to reference
3. A special badge/tag is inserted in the input with the field reference
4. The badge is properly positioned and maintains cursor navigation

### Using Mention Functionality in Other Components

If you want to reuse this functionality in other components:

```tsx
import { 
  BadgeInput, 
  MentionPopup, 
  updateMentionPositions, 
  processMentionSelection 
} from "@/components/form-builder";

// Set up state and refs
const [mentionMenu, setMentionMenu] = useState({ isOpen: false, /* other props */ });
const [mentions, setMentions] = useState({});
const inputRefs = useRef(new Map());

// Use the BadgeInput component
<BadgeInput
  fieldId="my-field"
  value={value}
  mentions={mentions['my-field'] || []}
  InputComponent="input" // or "textarea"
  inputProps={{ /* input props */ }}
  onInputChange={handleInputChange}
  onKeyDown={handleKeyDown}
  onRemoveMention={handleRemoveMention}
  inputRefs={inputRefs}
/>

// Show the mention popup when needed
{mentionMenu.isOpen && (
  <MentionPopup
    mentionMenu={mentionMenu}
    fields={fields}
    onSearchChange={value => setMentionMenu({...mentionMenu, searchTerm: value})}
    onSelectItem={handleMentionSelect}
    disableSearchByDefault={true}
  />
)}
``` 