'use client';

import React from "react";
import {
  GanttProvider,
  GanttHeader,
  GanttSidebar,
  GanttSidebarItem,
  GanttTimeline,
  GanttFeatureList,
  GanttFeatureItem,
  GanttMarker,
  GanttToday,
  type GanttFeature,
  type GanttMarkerProps
} from "@/components/ui/shadcn-io/gantt";

import {
  CalendarProvider,
  CalendarHeader,
  CalendarBody,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarItem,
  type Feature as CalendarFeature
} from "@/components/ui/shadcn-io/calendar";

import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Update the GanttFeature type to include our optional hasRealDates flag
type ExtendedGanttFeature = GanttFeature & { 
  hasRealDates?: boolean;
  milestones?: { id: string; label: string; date: Date }[];
  _source?: any; // For debugging
};

type Marker = GanttMarkerProps & { className?: string };

type ProjectGanttProps = {
  features: ExtendedGanttFeature[];
  markers?: Marker[];
};

// Custom non-draggable wrapper component
const NonDraggableGanttFeatureItem = ({
  id, name, startAt, endAt, status, milestones = []
}: ExtendedGanttFeature) => {
  console.log(`Rendering feature: ${name} (${id}) from ${startAt} to ${endAt}, milestones: ${milestones?.length || 0}`);
  
  // Calculate relative position of milestones within the feature bar
  const featureDuration = endAt.getTime() - startAt.getTime();
  const milestoneDots = milestones?.map(milestone => {
    // Calculate milestone position as percentage from start to end
    const relativePosition = featureDuration <= 0 ? 0 : 
      (milestone.date.getTime() - startAt.getTime()) / featureDuration * 100;
    
    // Clamp position between 0% and 100%
    const position = Math.max(0, Math.min(100, relativePosition));
    
    return (
      <div 
        key={milestone.id}
        className="absolute w-3 h-3 -mt-1.5 -ml-1.5 bg-purple-600 rotate-45 z-10"
        style={{ left: `${position}%`, top: '50%' }}
        title={milestone.label}
      />
    );
  });
  
  return (
    <div className="non-draggable-feature">
      <GanttFeatureItem 
        id={id}
        name={name}
        startAt={startAt}
        endAt={endAt}
        status={status}
        onMove={undefined}
        className="non-draggable-item relative"
      >
        <p className="flex-1 truncate text-xs">{name}</p>
        {milestoneDots}
      </GanttFeatureItem>
    </div>
  );
};

export function ProjectGantt({ features, markers = [] }: ProjectGanttProps) {
  // Log the features to verify we're receiving all projects
  console.log(`Rendering ProjectGantt with ${features.length} features and ${markers.length} markers`);
  // Log what markers are present for debugging
  console.log(`Markers in use: ${markers.length} plus the today marker`);
  
  // Add state for zoom level
  const [zoomLevel, setZoomLevel] = React.useState(100);
  // Add state for range view
  const [viewRange, setViewRange] = React.useState<"monthly" | "daily" | "quarterly">("monthly");
  
  // Functions to adjust zoom level
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  
  // Filter features that have real dates for the timeline
  const featuresForTimeline = features; // render all features to keep alignment
  console.log(`Timeline shows ${featuresForTimeline.length} features (including those without real dates)`);
  
  // We'll use built-in <GanttToday /> instead of custom marker
  const allMarkers = markers;
  
  // Create a map of features by ID for consistent ordering
  const featuresById = new Map<string, ExtendedGanttFeature>();
  features.forEach(feature => featuresById.set(feature.id, feature));
  
  // Get the ordered list of feature IDs from the sidebar
  const orderedFeatureIds = features.map(feature => feature.id);
  
  // Sidebar item without duration for undated features
  const SidebarItemNoDuration = ({ feature }: { feature: ExtendedGanttFeature }) => (
    <div
      role="button"
      tabIndex={0}
      key={feature.id}
      className="relative flex items-center gap-2.5 p-2.5 text-xs"
      style={{ height: 'var(--gantt-row-height)' }}
    >
      <div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: feature.status.color }}
      />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">
        {feature.name}
      </p>
    </div>
  );
  
  return (
    <div className="flex flex-col h-[70vh]">
      {/* Zoom controls */}
      <div className="flex items-center justify-between mb-2 p-2 bg-card rounded-md border">
        <div className="flex space-x-1">
          <Button 
            variant={viewRange === "daily" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewRange("daily")}
          >
            Daily
          </Button>
          <Button 
            variant={viewRange === "monthly" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewRange("monthly")}
          >
            Monthly
          </Button>
          <Button 
            variant={viewRange === "quarterly" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewRange("quarterly")}
          >
            Quarterly
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground mr-2">Zoom: {zoomLevel}%</span>
          <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom Out">
            <MinusIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom In">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt chart */}
      <GanttProvider range={viewRange} zoom={zoomLevel}>
        <GanttSidebar className="fixed-sidebar">
          {orderedFeatureIds.map(id => {
            const feature = featuresById.get(id)!;
            return feature.hasRealDates ? (
              <GanttSidebarItem key={feature.id} feature={feature} />
            ) : (
              <SidebarItemNoDuration key={feature.id} feature={feature} />
            );
          })}
        </GanttSidebar>
        <GanttTimeline className="overflow-visible-important">
          <GanttHeader />
          <GanttToday className="today-marker-tab" data-date={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} />
          <GanttFeatureList className="feature-list-auto-height">
            {orderedFeatureIds
              .map(id => {
                const feature = featuresById.get(id)!;
                if (feature.hasRealDates) {
                  return (
                    <NonDraggableGanttFeatureItem
                      key={feature.id}
                      {...feature}
                    />
                  );
                }
                // Empty placeholder row to preserve alignment
                return (
                  <div
                    key={feature.id}
                    className="empty-timeline-row"
                    style={{ height: 'var(--gantt-row-height)' }}
                  />
                );
              })}
          </GanttFeatureList>
          
          {/* Only render milestone markers with valid data */}
          {allMarkers.filter(m => m.id && m.date).map((marker) => (
            <GanttMarker key={marker.id} {...marker} />
          ))}
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}

type ProjectCalendarProps = {
  features: CalendarFeature[];
};

export function ProjectCalendar({ features }: ProjectCalendarProps) {
  return (
    <div className="border rounded-md w-full max-w-[700px] mx-auto h-[700px] overflow-hidden">
      <CalendarProvider className="h-full flex flex-col">
        <div className="border-b">
          <CalendarDate>
            <CalendarDatePicker>
              <CalendarMonthPicker />
              <CalendarYearPicker start={2023} end={2025} />
            </CalendarDatePicker>
            <CalendarDatePagination />
          </CalendarDate>
        </div>
        
        <style jsx global>{`
          /* Fix overall container */
          .calendar-grid-container {
            flex: 1;
            display: grid;
            grid-template-rows: min-content 1fr;
            min-height: 0;
            overflow: hidden;
            border-collapse: collapse;
          }
          
          /* Make day headers less tall */
          .weekday-header {
            padding: 0 !important;
            height: 16px;
            font-size: 0.55rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Remove flex from header container */
          .calendar-grid-container > div:first-child {
            display: block;
            line-height: 0;
          }
          
          /* Style the weekday grid */
          .calendar-grid-container > div:first-child .grid-cols-7 {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            margin-bottom: -1px; /* Overlap with date cells */
          }
          
          /* Style the weekday cells */
          .calendar-grid-container > div:first-child .grid-cols-7 > div {
            height: 16px !important;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-right: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
          }
          
          /* Fix the grid layout */
          .calendar-grid-container > div:nth-child(2) {
            display: block;
            height: 100%;
            overflow: hidden;
          }
          
          .calendar-grid-container > div:nth-child(2) .grid-cols-7 {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            grid-template-rows: repeat(6, 1fr);
            height: 100%;
            overflow: hidden;
          }
          
          /* Make cells into a perfect grid */
          .calendar-grid-container > div:nth-child(2) .grid-cols-7 > div {
            position: relative;
            border: 1px solid var(--border);
            box-sizing: border-box;
            padding: 2px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            font-size: 0.75rem;
          }
          
          /* Remove double borders between cells by hiding top border except first row */
          .calendar-grid-container > div:nth-child(2) .grid-cols-7 > div:not(:nth-child(-n+7)) {
            border-top: none;
          }
          
          /* Remove double borders between cells by hiding left border except first column */
          .calendar-grid-container > div:nth-child(2) .grid-cols-7 > div:not(:nth-child(7n+1)) {
            border-left: none;
          }
          
          /* Style events container */
          .calendar-grid-container .grid-cols-7 > div > div {
            margin-top: 2px;
            display: flex;
            flex-direction: column;
            gap: 1px;
            overflow: hidden;
          }
          
          /* Style each event item */
          .calendar-item-custom {
            font-size: 0.6rem !important;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 1px 2px;
            border-radius: 2px;
          }
          
          /* Fix right border for last column */
          .calendar-grid-container [class*="border-r-0"] {
            border-right: 1px solid var(--border) !important;
          }
          
          /* Disable Tailwind aspect-square padding that causes gaps */
          .calendar-grid-container [class*="aspect-square"] {
            aspect-ratio: auto !important;
            padding-bottom: 0 !important; /* remove intrinsic ratio space */
            height: 100% !important;
          }
          
          /* Fix any other grid issues */
          .calendar-grid-container .grid,
          .calendar-grid-container .grid-cols-7 {
            border-collapse: collapse;
            gap: 0;
          }
        `}</style>
        
        <div className="calendar-grid-container">
          <div>
            <CalendarHeader className="weekday-header" />
          </div>
          <div>
            <CalendarBody features={features}>
              {({ feature }) => (
                <CalendarItem 
                  key={feature.id} 
                  feature={feature} 
                  className="calendar-item-custom" 
                />
              )}
            </CalendarBody>
          </div>
        </div>
      </CalendarProvider>
    </div>
  );
} 