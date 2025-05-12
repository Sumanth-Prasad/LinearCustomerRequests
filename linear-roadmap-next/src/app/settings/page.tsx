"use client";
import React, { useState } from "react";
import { FormBuilder } from "@/components/form-builder/form-builder";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("form");

  // Menu items for the settings sidebar
  const menuItems = [
    { id: "form", label: "Form Builder" },
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
            <div className="bg-white dark:bg-card rounded-lg shadow-md p-3 md:p-5 border border-sidebar-accent">
              {activeSection === "form" && (
                <section id="form-section" className="w-full">
                  <h2 className="text-lg font-semibold mb-2">Feature Request Form Builder</h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Design and customize the feature request form that customers will see.
                  </p>
                  <FormBuilder />
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
} 