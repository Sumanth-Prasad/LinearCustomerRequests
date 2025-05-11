"use client";
import React, { useState } from "react";
import { FormBuilder } from "@/components/form-builder/form-builder";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("form");

  // Menu items - easy to add more in the future
  const menuItems = [
    { id: "form", label: "Form Builder" },
    // Add more menu items here as needed
    // { id: "customization", label: "Customization" },
    // { id: "integrations", label: "Integrations" },
    // { id: "users", label: "User Management" },
  ];

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Menu */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-card rounded shadow border border-border">
            <nav className="flex flex-col p-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`px-4 py-3 text-left rounded-md mb-1 transition-colors duration-150 ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveSection(item.id)}
                  aria-selected={activeSection === item.id}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-card rounded shadow p-6 border border-border">
            {activeSection === "form" && (
              <section id="form-section">
                <h2 className="text-xl font-semibold mb-4">Feature Request Form Builder</h2>
                <p className="text-muted-foreground mb-6">Design and customize the feature request form that customers will see.</p>
                <FormBuilder />
              </section>
            )}
            
            {/* Add more content sections here as needed */}
            {/* {activeSection === "customization" && (
              <section id="customization-section">
                <h2 className="text-xl font-semibold mb-4">Customization</h2>
                <p className="text-muted-foreground mb-6">Customize the appearance and behavior of your roadmap.</p>
                [Content here]
              </section>
            )} */}
          </div>
        </div>
      </div>
    </main>
  );
} 