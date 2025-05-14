'use client';

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SavedForm, FormField } from "@/components/form-builder/core/types";
import { submitFormIssue } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import { getCountryCallingCode } from 'react-phone-number-input/input';

interface FormSubmitDialogProps {
  teamId: string;
  projectId?: string;
  triggerText?: string;
  variant?: "default" | "outline" | "secondary";
}

// Helper to render input for a form field with solid background
function renderFieldInput(field: FormField) {
  const common: any = {
    name: field.id,
    required: field.required,
    placeholder: field.placeholder,
    className: "w-full border rounded px-3 py-2 mb-4 bg-input text-foreground",
  };

  switch (field.type) {
    case "textarea":
      return <textarea {...common} rows={4}></textarea>;
    case "select":
      return (
        <select {...common} defaultValue="" className={`${common.className} bg-input`}>
          <option value="" disabled>
            {field.placeholder || "Select"}
          </option>
          {field.options?.map((o, i) => (
            <option value={o} key={i}>
              {o}
            </option>
          ))}
        </select>
      );
    case "checkbox":
    case "radio":
      return (
        <div className="mb-4">
          {field.options?.map((o, i) => (
            <label key={i} className="flex items-center gap-2 mb-1">
              <input type={field.type} name={field.id} value={o} /> {o}
            </label>
          ))}
        </div>
      );
    case "phone": {
      const countryCode = field.countryCode || "US";
      let callingCode;
      try {
        callingCode = getCountryCallingCode(countryCode as any);
      } catch {
        callingCode = "1";
      }
      return (
        <div className="flex">
          <div className="bg-muted px-3 py-2 border border-r-0 border-border rounded-l text-sm text-muted-foreground flex items-center gap-1">
            <img
              src={`https://flagcdn.com/16x12/${String(countryCode).toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/32x24/${String(countryCode).toLowerCase()}.png 2x, https://flagcdn.com/48x36/${String(countryCode).toLowerCase()}.png 3x`}
              width="16"
              height="12"
              alt={countryCode as string}
              className="inline-block object-cover"
            />
            <span>+{callingCode}</span>
          </div>
          <input type="tel" {...common} className="flex-1 border border-border rounded-r px-3 py-2 bg-input text-foreground" />
        </div>
      );
    }
    default:
      return <input type={field.type === "email" ? "email" : "text"} {...common} />;
  }
}

export function FormSubmitDialog({
  teamId,
  projectId,
  triggerText = "Submit Request",
  variant = "default",
}: FormSubmitDialogProps) {
  // Client-side only
  const [forms, setForms] = useState<SavedForm[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'select' | 'fill'>('select');

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedForms");
      if (raw) {
        const parsed: SavedForm[] = JSON.parse(raw);
        setForms(parsed);
        if (parsed.length) {
          setSelectedId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to parse savedForms", e);
    }
  }, []);

  if (!forms.length) {
    return (
      <Button asChild variant={variant} className="cursor-not-allowed opacity-60">
        <span>Create Form First</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-card border border-border shadow-lg" style={{backgroundColor:'var(--card)', opacity:1}}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {view === 'fill' && (
              <button type="button" onClick={() => setView('select')} className="p-1 rounded hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle>{view === 'select' ? 'Choose a Form' : 'Submit Request'}</DialogTitle>
          </div>
        </DialogHeader>

        {view === 'select' && (
          <div className="space-y-3">
            {forms.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedId(f.id); setView('fill'); }}
                className="w-full text-left border rounded p-3 bg-card/90 hover:bg-muted flex items-start gap-3"
              >
                <span className="text-2xl">{f.formSettings.emoji}</span>
                <div>
                  <h3 className="font-medium">{f.formSettings.title}</h3>
                  {f.formSettings.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{f.formSettings.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {view === 'fill' && selectedId && (
          <FormRenderer
            form={forms.find((f) => f.id === selectedId)!}
            teamId={teamId}
            projectId={projectId}
            onSuccess={() => {setOpen(false); setView('select');}}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormRendererProps {
  form: SavedForm;
  teamId: string;
  projectId?: string;
  onSuccess: () => void;
}

function FormRenderer({ form, teamId, projectId, onSuccess }: FormRendererProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("teamId", teamId);
    formData.set("projectId", projectId || "");
    formData.set("formId", form.id);
    formData.set("linearSettings", JSON.stringify(form.linearSettings));

    const res = await submitFormIssue(formData);
    if (res.success) {
      onSuccess();
      alert("Request submitted! Issue ID: " + res.issueId);
    } else {
      setError(res.error || "Unknown error");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <span>{form.formSettings.emoji}</span> {form.formSettings.title}
      </h3>
      {form.formSettings.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {form.formSettings.description}
        </p>
      )}

      {form.fields.map((field) => (
        <div key={field.id} className="w-full">
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </label>
          {renderFieldInput(field)}
        </div>
      ))}

      {/* Hidden meta */}
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="projectId" value={projectId || ""} />
      <input type="hidden" name="formId" value={form.id} />
      <input type="hidden" name="linearSettings" value={JSON.stringify(form.linearSettings)} />

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
} 