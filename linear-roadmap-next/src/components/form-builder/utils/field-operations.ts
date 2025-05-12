import type { FormField } from "./types";

// Remove a field by id
export function removeField(fields: FormField[], id: string, activeField: string | null): {
  updatedFields: FormField[];
  newActiveField: string | null;
} {
  // Don't allow removing title and description
  if (id === "title" || id === "description") {
    return { updatedFields: fields, newActiveField: activeField };
  }
  
  const updatedFields = fields.filter(field => field.id !== id);
  const newActiveField = activeField === id ? null : activeField;
  
  return { updatedFields, newActiveField };
}

// Update a field property
export function updateField(fields: FormField[], id: string, updates: Partial<FormField>): FormField[] {
  return fields.map(field => 
    field.id === id ? { ...field, ...updates } : field
  );
}

// Update option for select/checkbox/radio fields
export function updateOption(fields: FormField[], fieldId: string, index: number, value: string): FormField[] {
  return fields.map(field => {
    if (field.id === fieldId && field.options) {
      const newOptions = [...field.options];
      newOptions[index] = value;
      return { ...field, options: newOptions };
    }
    return field;
  });
}

// Add an option to a select/checkbox/radio field
export function addOption(fields: FormField[], fieldId: string): FormField[] {
  return fields.map(field => {
    if (field.id === fieldId && field.options) {
      return { ...field, options: [...field.options, `Option ${field.options.length + 1}`] };
    }
    return field;
  });
}

// Remove an option from a select/checkbox/radio field
export function removeOption(fields: FormField[], fieldId: string, index: number): FormField[] {
  return fields.map(field => {
    if (field.id === fieldId && field.options && field.options.length > 1) {
      const newOptions = [...field.options];
      newOptions.splice(index, 1);
      return { ...field, options: newOptions };
    }
    return field;
  });
} 