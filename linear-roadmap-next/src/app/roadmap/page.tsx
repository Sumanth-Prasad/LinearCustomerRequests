import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { getLinearClient, safeGraphQLQuery } from "@/lib/linear";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StateBadge } from "@/components/status-badge";
import { MOCK_ISSUES } from "../issues";
import { Badge } from "@/components/ui/badge";
import { LabelBadge } from "@/components/custom-label-badge";
import { DraggableKanbanBoard } from "@/components/draggable-kanban-board";

// Define search params type for this page
type RoadmapSearchParams = { 
  team_id?: string; 
  project_id?: string;
  view?: string; // 'kanban' or 'list'
  filter_category?: string; // 'status', 'priority', 'type', 'assignee', 'label'
  filter_value?: string; // The specific filter value
};

// Define the issue type
type Issue = {
  id: string;
  title: string;
  state: {
    id: string;
    name: string;
    color?: string;
  };
  priority?: number;
  labels?: { name: string; color: string }[];
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  updatedAt?: string;
};

// Update the type to remove displayName
type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

// Fetch workflow states from Linear API
async function fetchWorkflowStates(teamId: string) {
  try {
    const client = getLinearClient();
    
    // Query to get workflow states for a team
    const query = `
      query GetWorkflowStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              color
              position
            }
          }
        }
      }
    `;
    
    // Use our safer GraphQL query function
    const data = await safeGraphQLQuery<{
      team?: {
        states?: {
          nodes: Array<{
            id: string;
            name: string;
            color?: string;
            position: number;
          }>
        }
      }
    }>(
      client,
      query,
      { teamId },
      { team: { states: { nodes: [] } } }
    );
    
    // Extract and sort states by position
    const states = data?.team?.states?.nodes || [];
    return states.sort((a, b) => a.position - b.position);
    
  } catch (error) {
    console.error("Error fetching workflow states:", error);
    return [];
  }
}

// Fetch priorities metadata
async function fetchPriorities() {
  // Linear API uses these priority values:
  // 0 - No priority
  // 1 - Urgent (highest priority)
  // 2 - High
  // 3 - Medium
  // 4 - Low (lowest priority)
  const priorities = [
    { id: "1", name: "Urgent", color: "#ef4444" }, // Highest priority
    { id: "2", name: "High", color: "#f97316" },
    { id: "3", name: "Medium", color: "#eab308" },
    { id: "4", name: "Low", color: "#6b7280" }    // Lowest priority
  ];
  
  return priorities;
}

// Fetch both standard issue types (Bug, Feature, etc.) and custom labels
async function fetchAllLabelTypes(teamId: string) {
  try {
    const client = getLinearClient();
    
    // Predefined color palette for labels without colors
    const colorPalette = [
      "#ef4444", // Red
      "#f97316", // Orange
      "#eab308", // Yellow
      "#22c55e", // Green
      "#3b82f6", // Blue
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#64748b", // Slate
    ];
    
    // Use a simpler approach with just team-specific labels
    // Since there's no direct issueTypes query in the Linear API
    const customQuery = `
      query GetLabelsAndTypes($teamId: String!) {
        # Team-specific labels
        team(id: $teamId) {
          # Get issue labels
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
        
        # Get organization level labels
        organization {
          labels {
            nodes {
              id
              name
              color
              team {
                id
              }
            }
          }
        }
      }
    `;
    
    // Use our safer GraphQL query function with proper error handling
    const responseData = await safeGraphQLQuery<{ 
      team?: { 
        labels?: { 
          nodes: Array<{ id: string; name: string; color?: string }> 
        } 
      };
      organization?: {
        labels?: {
          nodes: Array<{ 
            id: string; 
            name: string; 
            color?: string;
            team?: { id: string } 
          }>
        }
      };
    }>(
      client,
      customQuery, 
      { teamId },
      { team: { labels: { nodes: [] } }, organization: { labels: { nodes: [] } } }
    );
    
    const teamLabels = responseData?.team?.labels?.nodes || [];
    const orgLabels = responseData?.organization?.labels?.nodes || [];
    
    // Log raw label data to see what colors we're getting
    console.log("Raw label data:", {
      teamLabels: teamLabels.map(l => ({ name: l.name, color: l.color })),
      orgLabels: orgLabels.map(l => ({ name: l.name, color: l.color }))
    });
    
    // Look for patterns that indicate standard issue types rather than using hardcoded values
    // Standard issue types typically:
    // 1. Don't have spaces (e.g., "Bug" not "Critical Bug")
    // 2. Are typically capitalized
    // 3. Are relatively short (< 15 chars)
    // 4. Don't contain special characters like emojis 
    const isLikelyStandardType = (name: string): boolean => {
      // No spaces
      if (name.includes(" ")) return false;
      
      // Relatively short 
      if (name.length > 15) return false;
      
      // Should be capitalized (first letter is uppercase)
      if (name.charAt(0) !== name.charAt(0).toUpperCase()) return false;
      
      // No special characters or numbers (basic check)
      if (/[^a-zA-Z]/.test(name)) return false;
      
      return true;
    };
    
    // Process both types of labels
    const labelsMap = new Map();
    let colorIndex = 0;
    
    // First add organization labels (excluding those belonging to the current team)
    for (const label of orgLabels) {
      // Skip if this label belongs to the current team
      if (label.team && label.team.id === teamId) {
        continue;
      }
      
      // Make sure we have color values
      let color = label.color;
      // If no color, assign from palette
      if (!color || !color.startsWith('#')) {
        color = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
      
      // Dynamically determine if this looks like a standard type
      const isStandard = isLikelyStandardType(label.name);
      
      labelsMap.set(label.name, {
        id: label.id,
        name: label.name,
        color,
        isStandardType: isStandard
      });
    }
    
    // Then add team-specific labels (overriding any duplicates)
    for (const label of teamLabels) {
      // Make sure we have color values
      let color = label.color;
      // If no color, assign from palette
      if (!color || !color.startsWith('#')) {
        color = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
      
      // Dynamically determine if this looks like a standard type
      const isStandard = isLikelyStandardType(label.name);
      
      labelsMap.set(label.name, {
        id: label.id,
        name: label.name,
        color,
        isStandardType: isStandard
      });
    }
    
    // Convert to array
    const labelArray = Array.from(labelsMap.values());
    
    console.log("Final processed labels with colors:", 
      labelArray.map(l => ({ name: l.name, color: l.color }))
    );
    
    return labelArray;
  } catch (error) {
    console.error("Error fetching labels:", error);
    // Return empty array instead of fallbacks
    return [];
  }
}

// Fetch user data from Linear API
async function fetchUsers(teamId: string) {
  try {
    const client = getLinearClient();
    
    // Correct the query to fetch user data from team members
    const query = `
      query TeamUsers($teamId: String!) {
        team(id: $teamId) {
          members {
            nodes {
              id
              name
              email
              avatarUrl
            }
          }
        }
      }
    `;
    
    // Use our safer GraphQL query function
    const data = await safeGraphQLQuery<{ 
      team?: {
        members?: {
          nodes: Array<{
            id: string;
            name: string;
            email: string;
            avatarUrl?: string;
          }>
        }
      }
    }>(
      client,
      query,
      { teamId },
      { team: { members: { nodes: [] } } }
    );
    
    // Return the team members, using fallback of empty array
    const members = data?.team?.members?.nodes || [];
    
    return members.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    }));
    
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

async function fetchIssues(teamId: string, projectId?: string, filterCategory?: string, filterValue?: string) {
  try {
    const client = getLinearClient();
    
    // Build the filter object based on parameters
    const filterVariables: Record<string, any> = {
      team: { id: { eq: teamId } }
    };
    
    // Add project filter if applicable
    if (projectId && projectId !== "undefined") {
      filterVariables.project = { id: { eq: projectId } };
    }
    
    // Add specific filters based on category
    if (filterCategory && filterCategory !== 'all' && filterValue && filterValue !== 'all') {
      if (filterCategory === 'status') {
          if (filterValue === 'unassigned') {
          filterVariables.assignee = { null: { eq: true } };
          } else {
          filterVariables.state = { name: { eq: filterValue } };
        }
      } else if (filterCategory === 'priority') {
        const priorityValue = 
          filterValue === 'urgent' ? 1 :
          filterValue === 'high' ? 2 :
          filterValue === 'medium' ? 3 :
          filterValue === 'low' ? 4 :
          filterValue === 'none' ? 0 : null;
        
        if (priorityValue !== null) {
          filterVariables.priority = { eq: priorityValue };
        }
      } else if (filterCategory === 'label') {
        filterVariables.labels = { name: { eq: filterValue } };
      } else if (filterCategory === 'assignee') {
        if (filterValue === 'unassigned') {
          filterVariables.assignee = { null: { eq: true } };
        } else if (filterValue === 'me') {
          // Use the current user's ID when "me" is selected
          // This is a placeholder - you would need actual auth context here
          // filterVariables.assignee = { id: { eq: currentUserId } };
          } else {
          // Find the user by name
          const users = await fetchUsers(teamId);
          const user = users.find(u => u.name === filterValue);
          if (user) {
            filterVariables.assignee = { id: { eq: user.id } };
          }
        }
      }
    }
    
    // Build the GraphQL query with variables
    const query = `
      query FetchIssues($filter: IssueFilter) {
        issues(
          filter: $filter
          first: 100
          orderBy: updatedAt
        ) {
          nodes {
            id
            title
            priority
            state {
              id
              name
              color
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            assignee {
              id
              name
              avatarUrl
            }
            updatedAt
          }
        }
      }
    `;
    
    // Use our safe GraphQL query approach
    const data = await safeGraphQLQuery<{
      issues?: {
        nodes: Array<{
          id: string;
          title: string;
          priority?: number;
          state: {
            id: string;
            name: string;
            color?: string;
          };
          labels?: {
            nodes: Array<{
              id: string;
              name: string;
              color?: string;
            }>;
          };
          assignee?: {
            id: string;
            name: string;
            avatarUrl?: string;
          } | null;
          updatedAt: string;
        }>;
      };
    }>(
      client,
      query,
      { filter: filterVariables },
      { issues: { nodes: [] } }
    );
    
    // Map the response to our Issue type
    return (data?.issues?.nodes || []).map(issue => ({
        id: issue.id,
        title: issue.title,
      state: {
        id: issue.state.id,
        name: issue.state.name,
        color: issue.state.color
      },
        priority: issue.priority,
      labels: issue.labels?.nodes.map(label => ({
        name: label.name,
        color: label.color || '#6b7280'
      })) || [],
      assignee: issue.assignee ? {
        id: issue.assignee.id,
        name: issue.assignee.name,
        avatarUrl: issue.assignee.avatarUrl
      } : null,
      updatedAt: issue.updatedAt
    }));
    
  } catch (error) {
    console.error("Error fetching issues:", error);
    return [];
  }
}

// Update the TypeBadge component to use labels
const TypeBadge = ({ type, color }: { type: string; color?: string }) => {
  return (
    <span 
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ 
        backgroundColor: color || '#6b7280',
        color: 'white'
      }}
    >
      {type}
    </span>
  );
};

export default async function RoadmapPage({
  searchParams 
}: { 
  searchParams: Promise<RoadmapSearchParams> | RoadmapSearchParams 
}) {
  // Await searchParams before accessing properties (Next.js 15+ requirement)
  const params = await Promise.resolve(searchParams);
  
  // Get the first available team instead of using "demo" as fallback
  let teamId = params?.team_id || "";
  
  // If no teamId provided, try to get the first available team
  if (!teamId) {
    try {
      const client = getLinearClient();
      const teamsQuery = `
        query GetTeams {
          teams {
            nodes {
              id
              name
              key
            }
          }
        }
      `;
      
      // Use our safe query handler
      const teamsData = await safeGraphQLQuery<{
        teams?: {
          nodes: Array<{ id: string; name: string; key: string }>
        }
      }>(
        client,
        teamsQuery,
        {},
        { teams: { nodes: [] } }
      );
      
      // If teams exist, use the first one
      if (teamsData.teams && teamsData.teams.nodes && teamsData.teams.nodes.length > 0) {
        teamId = teamsData.teams.nodes[0].id;
        console.log(`No team ID provided, using first available team: ${teamId}`);
      } else {
        console.error("No teams available in Linear workspace");
      }
    } catch (error) {
      console.error("Error fetching available teams:", error);
    }
  }
  
  const projectId = params?.project_id;
  const viewMode = params?.view || "kanban";
  const filterCategory = params?.filter_category || "all";
  const filterValue = params?.filter_value || "all";
  
  // If we still don't have a valid teamId, show an error message
  if (!teamId) {
    return (
      <main className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <p className="mb-6">
            Please specify a valid team ID or check if your Linear workspace has any teams.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            You can specify a team ID in the URL like: <code className="bg-muted px-2 py-1 rounded">/roadmap?team_id=YOUR_TEAM_ID</code>
          </p>
        </div>
      </main>
    );
  }
  
  // Fetch all required data in parallel for better performance
  const [workflowStates, labels, priorities, issues, users] = await Promise.all([
    fetchWorkflowStates(teamId),
    fetchAllLabelTypes(teamId),
    fetchPriorities(),
    fetchIssues(teamId, projectId, filterCategory, filterValue),
    fetchUsers(teamId)
  ]);
  
  // Group issues by state for Kanban view
  const issuesByState: Record<string, Issue[]> = {};
  for (const state of workflowStates) {
    issuesByState[state.id] = [];
  }
  
  // Group the filtered issues by state
  for (const issue of issues) {
    if (issuesByState[issue.state.id]) {
      issuesByState[issue.state.id].push(issue);
    } else if (workflowStates.length > 0) {
      // If state doesn't match any column, put it in the first column as fallback
      issuesByState[workflowStates[0].id].push({
        ...issue,
        state: {
          id: workflowStates[0].id,
          name: workflowStates[0].name
        }
      });
    }
  }

  return (
    <main className="p-4 md:p-8">
      {/* Header with view toggle and filters */}
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Project Roadmap</h1>
          <p className="text-muted-foreground mb-4">
            {issues.length} issues across {workflowStates.length} workflow states
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* View Toggle - Reverting to original */}
          <div className="flex rounded-md shadow-sm">
            <Link 
              href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=kanban&filter_category=${filterCategory}&filter_value=${filterValue}`}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${viewMode === 'kanban' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
            >
              Kanban
            </Link>
            <Link 
              href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=list&filter_category=${filterCategory}&filter_value=${filterValue}`}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${viewMode === 'list' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
            >
              List
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        
        {/* Filter Categories */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Status Filter */}
          <div>
            <details className="relative">
              <summary className="px-3 py-1.5 text-sm font-medium rounded-md bg-background border border-border hover:bg-secondary cursor-pointer flex items-center gap-1">
                Status
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </summary>
              <div className="absolute left-0 mt-1 w-48 bg-popover shadow-lg rounded-md z-10 border overflow-hidden">
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'all' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    All Statuses
                  </Link>
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=status&filter_value=unassigned`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'status' && filterValue === 'unassigned' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    Unassigned
                  </Link>
                <div className="h-px bg-border"></div>
                  {workflowStates.map(state => (
                    <Link
                      key={state.id}
                      href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=status&filter_value=${encodeURIComponent(state.name)}`}
                    className={`px-3 py-2 text-sm hover:bg-secondary block ${
                      filterCategory === 'status' && filterValue === state.name ? 'bg-primary/10 font-medium' : ''
                      }`}
                    >
                      {state.name}
                    </Link>
                  ))}
                </div>
              </details>
              {filterCategory === 'status' && filterValue !== 'all' && (
              <div className="mt-2 text-xs font-medium bg-primary/10 px-2 py-1 rounded inline-flex items-center">
                    {filterValue}
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </Link>
                </div>
              )}
          </div>
          
          {/* Priority Filter */}
          <div>
            <details className="relative">
              <summary className="px-3 py-1.5 text-sm font-medium rounded-md bg-background border border-border hover:bg-secondary cursor-pointer flex items-center gap-1">
                Priority
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </summary>
              <div className="absolute left-0 mt-1 w-48 bg-popover shadow-lg rounded-md z-10 border overflow-hidden">
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'all' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    All Priorities
                  </Link>
                <div className="h-px bg-border"></div>
                  {priorities.map(priority => (
                    <Link
                      key={priority.id}
                      href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=priority&filter_value=${priority.id.toLowerCase()}`}
                    className={`px-3 py-2 text-sm hover:bg-secondary block ${
                      filterCategory === 'priority' && filterValue === priority.id.toLowerCase() ? 'bg-primary/10 font-medium' : ''
                      }`}
                      style={{ color: filterCategory === 'priority' && filterValue === priority.id.toLowerCase() ? undefined : priority.color }}
                    >
                      {priority.name}
                    </Link>
                  ))}
                </div>
              </details>
              {filterCategory === 'priority' && filterValue !== 'all' && (
              <div className="mt-2 text-xs font-medium bg-primary/10 px-2 py-1 rounded inline-flex items-center">
                    {priorities.find(p => p.id.toLowerCase() === filterValue)?.name || filterValue}
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </Link>
                </div>
              )}
          </div>
          
          {/* Labels Filter */}
          <div>
            <details className="relative">
              <summary className="px-3 py-1.5 text-sm font-medium rounded-md bg-background border border-border hover:bg-secondary cursor-pointer flex items-center gap-1">
                Labels
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </summary>
              <div className="absolute left-0 mt-1 w-48 max-h-[250px] overflow-y-auto bg-popover shadow-lg rounded-md z-10 border">
                  <Link
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'all' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    All Labels
                  </Link>
                <div className="h-px bg-border"></div>
                  {labels.length > 0 ? (
                    labels.map(label => (
                      <Link
                        key={label.id}
                        href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=label&filter_value=${encodeURIComponent(label.name)}`}
                      className={`px-3 py-2 text-sm hover:bg-secondary block ${
                        filterCategory === 'label' && filterValue === label.name ? 'bg-primary/10 font-medium' : ''
                        }`}
                        style={{ color: filterCategory === 'label' && filterValue === label.name ? undefined : label.color }}
                      >
                        {label.name}
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic py-2 px-3">
                      No labels found
                    </div>
                  )}
                </div>
              </details>
              {filterCategory === 'label' && filterValue !== 'all' && (
              <div className="mt-2 text-xs font-medium bg-primary/10 px-2 py-1 rounded inline-flex items-center">
                    {filterValue}
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </Link>
                </div>
              )}
          </div>
          
          {/* Assignee Filter */}
          <div>
            <details className="relative">
              <summary className="px-3 py-1.5 text-sm font-medium rounded-md bg-background border border-border hover:bg-secondary cursor-pointer flex items-center gap-1">
                Assignee
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </summary>
              <div className="absolute left-0 mt-1 w-48 max-h-[250px] overflow-y-auto bg-popover shadow-lg rounded-md z-10 border">
                  <Link
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'all' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    All Assignees
                  </Link>
                  <Link
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=assignee&filter_value=unassigned`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'assignee' && filterValue === 'unassigned' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    Unassigned
                  </Link>
                  <Link
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=assignee&filter_value=me`}
                  className={`px-3 py-2 text-sm hover:bg-secondary block ${
                    filterCategory === 'assignee' && filterValue === 'me' ? 'bg-primary/10 font-medium' : ''
                    }`}
                  >
                    Me
                  </Link>
                <div className="h-px bg-border"></div>
                  {users.length > 0 ? (
                    users.map(user => (
                      <Link
                        key={user.id}
                      href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=assignee&filter_value=${encodeURIComponent(user.name)}`}
                      className={`px-3 py-2 text-sm hover:bg-secondary block ${
                        filterCategory === 'assignee' && filterValue === user.name ? 'bg-primary/10 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        {user.name}
                      </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic py-2 px-3">
                      No users found
                    </div>
                  )}
                </div>
              </details>
              {filterCategory === 'assignee' && filterValue !== 'all' && (
              <div className="mt-2 text-xs font-medium bg-primary/10 px-2 py-1 rounded inline-flex items-center">
                    {filterValue === 'unassigned' 
                      ? 'Unassigned'
                      : filterValue === 'me'
                        ? 'Me'
                    : users.find(u => u.name === filterValue)?.name || filterValue
                    }
                  <Link 
                    href={`/roadmap?team_id=${teamId}&project_id=${projectId}&view=${viewMode}&filter_category=all&filter_value=all`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </Link>
                </div>
              )}
          </div>
        </div>
      </div>
      
      {/* Kanban Board View */}
      {viewMode === "kanban" && (
        <DraggableKanbanBoard 
          workflowStates={workflowStates}
          issuesByState={issuesByState}
        />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-10 container mx-auto px-4 md:px-6 py-6">
          {workflowStates.map((state) => (
            <div key={state.id} className="mb-12">
              <div className="mb-5 max-w-4xl mx-auto">
                <div className="flex items-center mb-2 pt-8">
                  <h2 className="text-lg font-semibold text-foreground">
                    {state.name}
                  </h2>
                  <span className="text-sm text-muted-foreground ml-3">
                    {issuesByState[state.id]?.length || 0}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4 max-w-4xl mx-auto">
                {issuesByState[state.id]?.map((issue, index) => (
                  <Link 
                    key={issue.id} 
                    href={`/issue/${issue.id}`}
                    className="block"
                  >
                    <div className="border border-border/40 rounded-md hover:bg-secondary/20 transition-colors p-4 md:p-5">
                      {/* Top Row: Title left, Assignee right */}
                      <div className="flex justify-between items-start mb-6">
                        {/* Title - Top Left */}
                        <h3 className="font-medium text-base text-foreground max-w-[70%] mt-2">
                          {issue.title}
                        </h3>
                        
                        {/* Assignee - Top Right */}
                        <div className="flex items-center gap-2">
                          {issue.assignee && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{issue.assignee.name}</span>
                              <div className="w-6 h-6 rounded-full bg-primary-foreground flex items-center justify-center text-xs">
                                {issue.assignee.name.charAt(0)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bottom Row: Priority left, Type right */}
                      <div className="flex justify-between items-center">
                        {/* Priority - Bottom Left */}
                        <div>
                          {issue.priority && (
                            <span className={`text-xs font-semibold ${
                              issue.priority === 1 ? "text-red-700 dark:text-red-500" :
                              issue.priority === 2 ? "text-orange-700 dark:text-orange-500" :
                              issue.priority === 3 ? "text-yellow-600 dark:text-yellow-400" :
                              issue.priority === 4 ? "text-gray-600 dark:text-gray-400" :
                              "text-gray-400 dark:text-gray-600"
                            }`}
                            style={{
                              backgroundColor: issue.priority === 1 ? "#ef4444" :
                                issue.priority === 2 ? "#f97316" :
                                issue.priority === 3 ? "#eab308" :
                                issue.priority === 4 ? "#6b7280" : "#d1d5db",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              color: "#fff"
                            }}>
                              {issue.priority === 1 ? "Urgent" : 
                               issue.priority === 2 ? "High" :
                               issue.priority === 3 ? "Medium" : 
                               issue.priority === 4 ? "Low" : "None"}
                            </span>
                          )}
                        </div>
                        
                        {/* Labels - Bottom Right */}
                        <div className="flex flex-wrap gap-1 justify-end">
                          {issue.labels && issue.labels.map(label => (
                              <LabelBadge 
                                key={label.name} 
                              color={label.color || "#d1d5db"}
                              >
                                {label.name}
                              </LabelBadge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {(!issuesByState[state.id] || issuesByState[state.id].length === 0) && (
                  <div className="py-6 text-center text-muted-foreground text-sm border border-dashed rounded-md">
                    No issues
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create Issue Button (Fixed at bottom) */}
      <div className="fixed bottom-6 right-6">
        <Link href="/issue/create">
          <Button size="lg" className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700 text-white">
            <span className="text-xl">+</span>
          </Button>
        </Link>
      </div>
    </main>
  );
} 