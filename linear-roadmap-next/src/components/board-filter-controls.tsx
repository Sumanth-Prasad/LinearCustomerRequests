"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterPopover, FilterOption } from "@/components/filter-popover";
import { Button } from "@/components/ui/button";

export interface WorkflowState { id: string; name: string; type?: string }
export interface Priority { id: string; name: string }
export interface LabelType { id: string; name: string }
export interface UserType { id: string; name: string }

interface Props {
  states: WorkflowState[];
  priorities: Priority[];
  labels: LabelType[];
  users: UserType[];
}

export function BoardFilterControls({ states, priorities, labels, users }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  // helper
  const setParam = (key: string, values: string[]) => {
    const search = new URLSearchParams(Array.from(params.entries()));
    if (!values.length || (values.length === 1 && values[0] === "all")) {
      search.delete(key);
    } else {
      search.set(key, values.join(","));
    }
    router.push(pathname + "?" + search.toString());
  };

  const getArray = (key: string): string[] => {
    const raw = params.get(key);
    if (!raw || raw === "all") return [];
    return raw.split(",").filter(Boolean);
  };

  // Build options
  const statusOpts: FilterOption[] = states.map((s) => ({ id: s.name, name: s.name }));
  const priorityOpts: FilterOption[] = [
    { id: "urgent", name: "Urgent" },
    { id: "high", name: "High" },
    { id: "medium", name: "Medium" },
    { id: "low", name: "Low" },
    { id: "none", name: "None" },
  ];
  const labelOpts: FilterOption[] = labels.map((l) => ({ id: l.name, name: l.name }));
  const userOpts: FilterOption[] = [
    { id: "unassigned", name: "Unassigned" },
    ...users.map((u) => ({ id: u.name, name: u.name })),
  ];

  const statusSel = getArray("status");
  const prioritySel = getArray("priority");
  const labelSel = getArray("label");
  const assigneeSel = getArray("assignee");

  const resetFilters = () => {
    router.push(pathname);
  };

  const activeCount = statusSel.length + prioritySel.length + labelSel.length + assigneeSel.length;

  // Build summary text for currently active filters
  const summaryParts: string[] = [];
  if (statusSel.length) summaryParts.push(`Status: ${statusSel.join(", ")}`);
  if (prioritySel.length) summaryParts.push(`Priority: ${prioritySel.join(", ")}`);
  if (labelSel.length) summaryParts.push(`Label: ${labelSel.join(", ")}`);
  if (assigneeSel.length) summaryParts.push(`Assignee: ${assigneeSel.join(", ")}`);

  return (
    <div className="mb-4">
      {summaryParts.length > 0 && (
        <div className="text-sm text-muted-foreground mb-2">
          <span className="font-semibold mr-1">Active Filters:</span>
          {summaryParts.join("; ")}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold mr-1">Filters:</span>
        <FilterPopover
          label="Status"
          options={statusOpts}
          selected={statusSel}
          onChange={(arr) => setParam("status", arr)}
        />
        <FilterPopover
          label="Priority"
          options={priorityOpts}
          selected={prioritySel}
          onChange={(arr) => setParam("priority", arr)}
        />
        <FilterPopover
          label="Label"
          options={labelOpts}
          selected={labelSel}
          onChange={(arr) => setParam("label", arr)}
        />
        <FilterPopover
          label="Assignee"
          options={userOpts}
          selected={assigneeSel}
          onChange={(arr) => setParam("assignee", arr)}
        />

        <>
          <div className="h-5 w-px bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={activeCount === 0}
          >
            Clear filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </>
      </div>
    </div>
  );
} 