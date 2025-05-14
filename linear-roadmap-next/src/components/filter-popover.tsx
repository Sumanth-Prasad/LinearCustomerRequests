"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  name: string;
}

interface FilterPopoverProps {
  label: string;
  options: FilterOption[];
  selected: string[]; // array of option ids
  onChange: (ids: string[]) => void;
  className?: string;
}

export function FilterPopover({ label, options, selected, onChange, className }: FilterPopoverProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [search, options]);

  const toggle = (id: string) => {
    const exists = selected.includes(id);
    if (exists) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("flex items-center gap-1", className)}>
          {label}
          {selected.length > 0 && (
            <span className="ml-1 text-xs rounded-full bg-primary text-primary-foreground px-1.5">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        {selected.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="px-2 py-1 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8"
        />
        <ScrollArea className="h-64 pr-2">
          {filtered.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="accent-primary h-3 w-3"
              />
              <span className="text-sm">{opt.name}</span>
            </label>
          ))}
          {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">No results</p>}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
} 