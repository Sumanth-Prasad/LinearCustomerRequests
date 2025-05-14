"use client";
import React, { useState, useEffect } from "react";
import { FormBuilder } from "@/components/form-builder/form-builder";
import type { SavedForm } from "@/components/form-builder/core/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("form");
  const searchParams = useSearchParams();
  const router = useRouter();
  const formId = searchParams.get('formId');

  // Saved forms state
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]);

  // Load saved forms once on mount
  useEffect(() => {
    const loadSavedForms = () => {
      try {
        const raw = localStorage.getItem("savedForms");
        if (raw) {
          setSavedForms(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Failed to load saved forms", err);
      }
    };

    // Initial load
    loadSavedForms();

    // Add focus event listener to refresh form list when the tab regains focus
    // This catches cases where the user saved a form in the builder tab
    window.addEventListener("focus", loadSavedForms);
    
    return () => {
      window.removeEventListener("focus", loadSavedForms);
    };
  }, []);

  // Switch to form view when formId is present in URL
  useEffect(() => {
    if (formId) {
      setActiveSection("form");
    }
  }, [formId]);

  // Refresh forms list when switching to the saved forms tab
  useEffect(() => {
    if (activeSection === "savedForms") {
      try {
        const raw = localStorage.getItem("savedForms");
        if (raw) {
          setSavedForms(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Failed to refresh forms", err);
      }
    }
  }, [activeSection]);

  const handleDeleteForm = (id: string) => {
    const updated = savedForms.filter((f) => f.id !== id);
    setSavedForms(updated);
    localStorage.setItem("savedForms", JSON.stringify(updated));
  };

  const handleEditForm = (id: string) => {
    // Programmatically navigate and force the view to change
    router.push(`/settings?formId=${id}`);
    setActiveSection("form");
  };

  // Menu items for the settings sidebar
  const menuItems = [
    { id: "form", label: "Form Builder" },
    { id: "savedForms", label: "Saved Forms" },
    // Future menu items can be appended here.
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen">
        {/* Settings Sidebar */}
        <AppSidebar
          menuItems={menuItems}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        {/* Main Content */}
        <main className="ml-[220px] pt-4 bg-background min-h-screen w-[calc(100vw-220px)] pb-6">
          {/* Trigger only visible on small screens */}
          <div className="p-1 md:hidden">
            <SidebarTrigger size="icon" variant="ghost" />
          </div>

          <div className="w-full max-w-[1440px] mx-auto px-2 mt-2">
            <div className="bg-background rounded-lg shadow-md p-3 md:p-5 border border-border">
              {activeSection === "form" && (
                <section id="form-section" className="w-full">
                  <h2 className="text-lg font-semibold mb-2">Feature Request Form Builder</h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Design and customize the feature request form that customers will see.
                  </p>
                  <FormBuilder />
                </section>
              )}

              {activeSection === "savedForms" && (
                <section id="saved-forms-section" className="w-full">
                  <h2 className="text-lg font-semibold mb-2">Saved Forms</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    View, edit or delete your previously saved forms.
                  </p>
                  <div className="mb-4">
                    <Button 
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem("savedForms");
                          if (raw) {
                            setSavedForms(JSON.parse(raw));
                          }
                        } catch (err) {
                          console.error("Failed to refresh forms", err);
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Refresh Forms
                    </Button>
                  </div>
                  {savedForms.length === 0 ? (
                    <p className="text-muted-foreground">No forms saved yet.</p>
                  ) : (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                      {savedForms.map((form) => (
                        <Card key={form.id} className="p-4 flex flex-col hover:shadow-md transition-shadow">
                          <h3 className="text-xl font-semibold mb-1">
                            {form?.formSettings?.title || "Untitled Form"}
                          </h3>
                          {form?.formSettings?.description && (
                            <p className="text-muted-foreground mb-4 text-sm">
                              {form?.formSettings?.description}
                            </p>
                          )}
                          <div className="mt-auto flex gap-2">
                            <Button onClick={() => handleEditForm(form.id)}>
                              Edit
                            </Button>
                            <Button variant="destructive" onClick={() => handleDeleteForm(form.id)}>
                              Delete
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
} 