import { FieldType, FormField } from "../core/types";
export { highlightMentions } from './highlight-mentions';

// Default accepted file types
export const defaultFileTypes = {
  file: ".pdf,.doc,.docx,.txt,.zip",
  image: "image/*",
};

// Get default placeholder based on field type
export function getDefaultPlaceholder(type: FieldType): string {
  switch (type) {
    case "email":
      return "email@example.com";
    case "url":
      return "https://example.com";
    case "phone":
      return "Phone number";
    case "text":
      return "Enter text";
    case "textarea":
      return "Enter details here";
    case "file":
      return "Select a file";
    case "image":
      return "Select an image";
    default:
      return "";
  }
}

// Get file type description for display
export function getFileTypeDescription(acceptedTypes: string): string {
  if (acceptedTypes === "image/*") return "Images";
  if (acceptedTypes === ".pdf,.doc,.docx,.txt,.zip") return "Documents";
  
  // Create user-friendly description based on extensions
  const types = acceptedTypes.split(',').map(t => t.trim());
  const typeNames = types.map(t => {
    if (t === ".pdf") return "PDF";
    if (t === ".doc" || t === ".docx") return "Word";
    if (t === ".txt") return "Text";
    if (t === ".zip") return "ZIP";
    if (t === ".jpg" || t === ".jpeg") return "JPEG";
    if (t === ".png") return "PNG";
    if (t === ".gif") return "GIF";
    return t.replace(".", "").toUpperCase();
  });
  
  // Join with commas and "and" for the last one
  return typeNames.length <= 2 
    ? typeNames.join(" and ") 
    : typeNames.slice(0, -1).join(", ") + ", and " + typeNames[typeNames.length - 1];
}

// Create a new field with default values
export function createNewField(type: FieldType): FormField {
  return {
    id: `field_${Date.now()}`,
    type: type,
    label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
    placeholder: getDefaultPlaceholder(type),
    required: false,
    options: type === "select" || type === "radio" || type === "checkbox" 
      ? ["Option 1", "Option 2"] 
      : undefined,
    countryCode: type === "phone" ? "US" : undefined,
    acceptedFileTypes: type === "file" ? defaultFileTypes.file : 
                       type === "image" ? defaultFileTypes.image : undefined,
    multiple: type === "file" || type === "image" ? false : undefined,
    maxFileSize: type === "file" || type === "image" ? 5 : undefined, // 5MB default
  };
} 