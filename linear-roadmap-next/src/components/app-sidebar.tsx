import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LucideIcon, ListChecks } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface AppSidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSelect: (id: string) => void;
}

export function AppSidebar({ menuItems, activeSection, onSelect }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar min-w-[220px] w-[220px] h-[calc(100vh-3.5rem)] mt-[3.5rem] fixed left-0 top-0">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon ?? ListChecks;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      className="w-full justify-start gap-3"
                      onClick={() => onSelect(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate text-sm font-normal">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
} 