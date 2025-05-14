import React from "react";
import { getLinearClient, safeGraphQLQuery } from "@/lib/linear";
import { GanttChartIcon, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import only the types needed for data transformation
import type { GanttFeature, GanttMarkerProps } from "@/components/ui/shadcn-io/gantt";
import type { Feature as CalendarFeature } from "@/components/ui/shadcn-io/calendar";

// Import our client components
import { ProjectGantt, ProjectCalendar } from "./components";

// Query-param definition
interface RoadmapSearchParams {
  team_id?: string; 
  view?: "gantt" | "calendar";
}

interface ProjectMilestone {
  id: string;
  name: string;
  targetDate?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  state: string;
  startDate?: string;
  targetDate?: string;
  milestones: ProjectMilestone[];
}

// Extended marker type to allow className
type Marker = GanttMarkerProps & { className?: string };

// Fetch projects for a team (including milestones)
async function fetchTeamProjects(teamId: string): Promise<ProjectItem[]> {
  try {
    const client = getLinearClient();
    // Query projects without the milestones field that's not available
    const query = `
      query TeamProjects($teamId: String!) {
        team(id: $teamId) {
          projects {
            nodes {
              id
              name
              state
              startDate
              targetDate
              projectMilestones {
                nodes {
                  id
                  name
                  targetDate
                }
              }
            }
          }
        }
      }
    `;
    const data = await safeGraphQLQuery<{
      team?: {
        projects?: {
          nodes: Array<{
            id: string;
            name: string;
            state: string;
            startDate?: string;
            targetDate?: string;
            projectMilestones?: {
              nodes: Array<{
                id: string;
                name: string;
                targetDate?: string;
              }>;
            };
          }>;
        };
      };
    }>(client, query, { teamId }, { team: { projects: { nodes: [] } } });

    const projects = data?.team?.projects?.nodes || [];
    
    // Map to our internal format, with empty milestones array for now
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      state: p.state,
      startDate: p.startDate,
      targetDate: p.targetDate,
      milestones: p.projectMilestones?.nodes || [],
    }));
  } catch (e) {
    console.error("Error fetching projects", e);
    return [];
  }
}

// Function to get status color based on project state
function getStateColor(state: string): string {
  switch (state) {
    case 'completed':
      return '#22c55e'; // green
    case 'canceled':
      return '#ef4444'; // red
    case 'paused':
      return '#f97316'; // orange
    default:
      return '#3b82f6'; // blue (active)
  }
}

// Convert ProjectItem to GanttFeature format
function projectToGanttFeature(project: ProjectItem): GanttFeature {
  const now = new Date();
  // If the project has explicit dates we'll use them directly. Otherwise we only supply a single-day placeholder so no fake 1-month ranges are rendered.
  let startAt: Date;
  let endAt: Date;

  if (project.startDate && project.targetDate) {
    // Both dates provided
    startAt = new Date(project.startDate);
    endAt = new Date(project.targetDate);
  } else if (project.startDate) {
    // Only start date – use it for both start and end so duration is zero
    startAt = new Date(project.startDate);
    endAt = new Date(project.startDate);
  } else if (project.targetDate) {
    // Only target date – use it for both
    startAt = new Date(project.targetDate);
    endAt = new Date(project.targetDate);
  } else {
    // Missing both – fall back to today for a single-day placeholder
    startAt = now;
    endAt = now;
  }

  // Ensure end is never before start (shouldn't happen with the logic above)
  if (endAt < startAt) {
    endAt = new Date(startAt);
  }

  console.log(`Project ${project.name}: ${startAt} to ${endAt}`);
  
  return {
    id: project.id,
    name: project.name,
    startAt,
    endAt,
    status: {
      id: project.state,
      name: project.state,
      color: getStateColor(project.state)
    }
  };
}

// Convert ProjectItem to Calendar Feature format
function projectToCalendarFeature(project: ProjectItem): CalendarFeature {
  // Use current date if missing both dates to ensure project displays
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  
  const startAt = project.startDate ? new Date(project.startDate) : now;
  const endAt = project.targetDate ? new Date(project.targetDate) : 
    (project.startDate ? new Date(new Date(project.startDate).setMonth(new Date(project.startDate).getMonth() + 1)) : oneMonthLater);
  
  return {
    id: project.id,
    name: project.name,
    startAt,
    endAt,
    status: {
      id: project.state,
      name: project.state,
      color: getStateColor(project.state)
    }
  };
}

// Convert ProjectMilestone to GanttMarker
function milestoneToMarker(milestone: ProjectMilestone): Marker | null {
  if (!milestone.targetDate) return null;
  return {
    id: milestone.id,
    label: milestone.name,
    date: new Date(milestone.targetDate),
    className: "milestone-marker",
  };
}

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<RoadmapSearchParams> | RoadmapSearchParams }) {
  const params = await Promise.resolve(searchParams);
  let teamId = params.team_id || "";
  const activeView = params.view || "gantt";
  
  // Auto-select first team if none provided
  if (!teamId) {
    try {
      const client = getLinearClient();
      const res = await safeGraphQLQuery<{ teams?: { nodes: Array<{ id: string }> } }>(client, `query { teams { nodes { id } } }`, {}, { teams: { nodes: [] } });
      if (res.teams && res.teams.nodes.length) teamId = res.teams.nodes[0].id;
    } catch (e) {
      console.error(e);
    }
  }

  if (!teamId) {
    return (
      <main className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
        <p>You need to specify a valid team_id query parameter.</p>
      </main>
    );
  }
  
  const projects = await fetchTeamProjects(teamId);

  // Check if we have any projects with data
  if (projects.length === 0) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No Projects Found</h1>
        <p>This team has no active projects.</p>
      </main>
    );
  }

  // Let's log to debug
  console.log(`Found ${projects.length} projects`);
  
  // Use all projects and assign default dates in our conversion functions
  const projectsWithDates = projects;
  
  if (projectsWithDates.length === 0) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No Timeline Data</h1>
        <p>No projects have start or target dates defined.</p>
      </main>
    );
  }

  // Only include projects that have at least one real date
  const projectsWithRealDates = projectsWithDates.filter(
    project => project.startDate || project.targetDate
  );
  console.log(`Filtered out ${projectsWithDates.length - projectsWithRealDates.length} projects without real dates`);

  // Convert all projects to Gantt features format, but mark which ones have real dates
  const ganttFeatures = projectsWithDates.map(project => {
    const feature = projectToGanttFeature(project);
    // Get milestones associated with this project
    const projectMilestones = project.milestones
      .filter(ms => ms.targetDate)
      .map(ms => ({
        id: ms.id,
        label: ms.name,
        date: new Date(ms.targetDate!)
      }));
    
    // Add a flag to indicate if this has real dates
    return {
      ...feature,
      hasRealDates: !!(project.startDate || project.targetDate),
      milestones: projectMilestones,
      // Add original source data to help with debugging
      _source: {
        hasStartDate: !!project.startDate,
        hasEndDate: !!project.targetDate,
        originalProject: project
      }
    };
  });
  console.log(`Converted ${ganttFeatures.length} Gantt features (${projectsWithRealDates.length} with real dates)`);
  
  // No more separate markers - milestones will be rendered in their respective project bars
  const markers: Marker[] = [];
  console.log(`Found ${markers.length} milestone markers - now attached to respective features`);

  // DEBUG: Check for any May 15th markers
  markers.forEach(marker => {
    if (marker.date) {
      const dateStr = marker.date.toLocaleDateString();
      console.log(`MARKER DEBUG: ${marker.label} - ${dateStr} - ID: ${marker.id}`);
    }
  });

  // Filter out any invalid markers (missing id, name, or date)
  const validMarkers = markers.filter(marker => 
    marker.id && 
    marker.label && 
    marker.date instanceof Date && 
    !isNaN(marker.date.getTime())
  );
  console.log(`Valid markers: ${validMarkers.length}`);

  // Convert projects to Calendar features format
  const calendarFeatures = projectsWithDates.map(projectToCalendarFeature);

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Roadmap</h1>
      </div>

      <Tabs defaultValue={activeView} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <GanttChartIcon className="h-4 w-4" />
            <span>Gantt View</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Calendar View</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="gantt" className="mt-0">
          <ProjectGantt features={ganttFeatures} markers={validMarkers} />
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-0">
          <ProjectCalendar features={calendarFeatures} />
        </TabsContent>
      </Tabs>
    </main>
  );
} 