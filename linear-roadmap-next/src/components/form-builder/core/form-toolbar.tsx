"use client";

import React from "react";
import { FieldType } from "./types";

interface FormToolbarProps {
  newFieldType: FieldType;
  setNewFieldType: (type: FieldType) => void;
  onAddField: () => void;
  onSave: () => void;
}

export function FormToolbar({ 
  newFieldType, 
  setNewFieldType, 
  onAddField, 
  onSave 
}: FormToolbarProps) {
  return (
    <div className="flex justify-between mb-6">
      <div className="flex items-center">
        <select 
          value={newFieldType}
          onChange={(e) => setNewFieldType(e.target.value as FieldType)}
          className="p-2 border rounded-md mr-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
        >
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="url">URL</option>
          <option value="phone">Phone Number</option>
          <option value="textarea">Text Area</option>
          <option value="select">Dropdown</option>
          <option value="checkbox">Checkboxes</option>
          <option value="radio">Radio Buttons</option>
          <option value="file">File Upload</option>
          <option value="image">Image Upload</option>
        </select>
        <button 
          onClick={onAddField}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add Field
        </button>
      </div>
      
      <button 
        onClick={onSave}
        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Save Form
      </button>
    </div>
  );
} 