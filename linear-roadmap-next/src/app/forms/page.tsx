"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SavedForm } from "@/components/form-builder/core/types";

export default function SavedFormsPage() {
  const [forms, setForms] = useState<SavedForm[]>([]);

  // Load saved forms from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedForms");
      if (raw) {
        setForms(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Failed to load saved forms", err);
    }
  }, []);

  const handleDelete = (id: string) => {
    const updated = forms.filter((f) => f.id !== id);
    setForms(updated);
    localStorage.setItem("savedForms", JSON.stringify(updated));
  };

  return (
    <main className="container max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Saved Forms</h1>
      {forms.length === 0 && (
        <p className="text-muted-foreground">No forms saved yet.</p>
      )}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        {forms.map((form) => (
          <Card key={form.id} className="p-4 flex flex-col hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-1">
              {form.formSettings.title}
            </h2>
            {form.formSettings.description && (
              <p className="text-muted-foreground mb-4 text-sm">
                {form.formSettings.description}
              </p>
            )}
            <div className="mt-auto flex gap-2">
              <Button asChild>
                <Link href={`/settings?formId=${form.id}`}>Edit</Link>
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(form.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
} 