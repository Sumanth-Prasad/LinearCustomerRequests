import React from "react";
import Link from "next/link";
import { getLinearClient, safeGraphQLQuery } from "@/lib/linear";
import { DraggableKanbanBoard } from "@/components/draggable-kanban-board";
import { FloatingForm } from "@/components/floating-form";
import IssueListView from "@/components/issue-list-view";
import { BoardFilterControls } from "@/components/board-filter-controls";

/*--------------------------------------------------------------------
  NOTE: This component is a direct copy of the previous /roadmap page
  (which acted as an Issue Board).  All self-referencing links have
  been updated to use the new /board route so navigation stays on the
  correct page.  The actual project-roadmap (Gantt) view will now live
  at /roadmap.
--------------------------------------------------------------------*/

// --- Types & Search-params ----------------------------------------------------

type BoardSearchParams = {
  team_id?: string;
  project_id?: string;
  view?: string; // 'kanban' | 'list'
  filter_category?: string; // 'status' | 'priority' | 'label' | 'assignee'
  filter_value?: string;
};

type Issue = {
  id: string;
  title: string;
  state: { id: string; name: string; color?: string };
  priority?: number;
  labels?: { name: string; color: string }[];
  assignee?: { id: string; name: string; avatarUrl?: string } | null;
  updatedAt?: string;
};

type User = { id: string; name: string; email: string; avatarUrl?: string };

// --- Helpers -----------------------------------------------------------------

interface WorkflowStateFetched { id: string; name: string; color?: string; position: number; type?: string; }

async function fetchWorkflowStates(teamId: string) {
  try {
    const client = getLinearClient();
    const query = `
      query GetWorkflowStates($teamId: String!) {
        team(id: $teamId) {
          states { nodes { id name color position type } }
        }
      }
    `;
    const data = await safeGraphQLQuery<{
      team?: { states?: { nodes: WorkflowStateFetched[] } };
    }>(client, query, { teamId }, { team: { states: { nodes: [] } } });
    const nodes = data?.team?.states?.nodes || [];
    return nodes.sort((a, b) => a.position - b.position);
  } catch (e) {
    console.error("Error fetching workflow states", e);
    return [];
  }
}

async function fetchPriorities() {
  return [
    { id: "1", name: "Urgent", color: "#ef4444" },
    { id: "2", name: "High", color: "#f97316" },
    { id: "3", name: "Medium", color: "#eab308" },
    { id: "4", name: "Low", color: "#6b7280" },
  ];
}

async function fetchAllLabelTypes(teamId: string) {
  try {
    const client = getLinearClient();
    const query = `
      query GetLabels($teamId: String!) {
        team(id: $teamId) { labels { nodes { id name color } } }
        organization { labels { nodes { id name color team { id } } } }
      }
    `;
    const data = await safeGraphQLQuery<{
      team?: { labels?: { nodes: Array<{ id: string; name: string; color?: string }> } };
      organization?: { labels?: { nodes: Array<{ id: string; name: string; color?: string; team?: { id: string } }> } };
    }>(client, query, { teamId }, { team: { labels: { nodes: [] } }, organization: { labels: { nodes: [] } } });

    const colorPool = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];
    let idx = 0;
    const map = new Map<string, { id: string; name: string; color: string }>();
    const upsert = (l: { id: string; name: string; color?: string }) => {
      let color = l.color;
      if (!color || !color.startsWith("#")) {
        color = colorPool[idx % colorPool.length];
        idx += 1;
      }
      map.set(l.name, { id: l.id, name: l.name, color });
    };
    data.organization?.labels?.nodes?.forEach(upsert);
    data.team?.labels?.nodes?.forEach(upsert);
    return Array.from(map.values());
  } catch (e) {
    console.error("Error fetching labels", e);
    return [];
  }
}

async function fetchUsers(teamId: string) {
  try {
    const client = getLinearClient();
    const query = `
      query TeamUsers($teamId: String!) {
        team(id: $teamId) { members { nodes { id name email avatarUrl } } }
      }
    `;
    const res = await safeGraphQLQuery<{ team?: { members?: { nodes: User[] } } }>(client, query, { teamId }, { team: { members: { nodes: [] } } });
    return res?.team?.members?.nodes || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function fetchIssues(teamId: string, projectId: string | undefined, statusList: string[], priority: string, label: string, assignee: string): Promise<Issue[]> {
  try {
    const client = getLinearClient();
    const filter: any = { team: { id: { eq: teamId } } };
    if (projectId && projectId !== "undefined") filter.project = { id: { eq: projectId } };
    if (statusList.length && !statusList.includes("all")) {
      if (statusList.length === 1) {
        filter.state = { name: { eq: statusList[0] } };
      } else {
        filter.state = { name: { in: statusList } };
      }
    }
    if (priority && priority !== "all") {
        const map: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4, none: 0 };
      if (map[priority] !== undefined) filter.priority = { eq: map[priority] };
    }
    if (label && label !== "all") {
      filter.labels = { name: { eq: label } };
    }
    if (assignee && assignee !== "all") {
      if (assignee === "unassigned") {
        filter.assignee = { null: true };
      } else {
        const users = await fetchUsers(teamId);
        const u = users.find((x) => x.name === assignee);
          if (u) filter.assignee = { id: { eq: u.id } };
      }
    }

    const query = `
      query FetchIssues($filter: IssueFilter) {
        issues(filter: $filter, first: 100, orderBy: updatedAt) {
          nodes {
            id title priority updatedAt
            state { id name color }
            labels { nodes { id name color } }
            assignee { id name avatarUrl }
          }
        }
      }
    `;
    const data = await safeGraphQLQuery<{
      issues?: { nodes: any[] };
    }>(client, query, { filter }, { issues: { nodes: [] } });
    return (data?.issues?.nodes || []).map((n) => ({
      id: n.id,
      title: n.title,
      priority: n.priority,
      state: n.state,
      labels: n.labels?.nodes.map((l: any) => ({ name: l.name, color: l.color || "#6b7280" })) || [],
      assignee: n.assignee ? { id: n.assignee.id, name: n.assignee.name, avatarUrl: n.assignee.avatarUrl } : null,
      updatedAt: n.updatedAt,
    }));
  } catch (e) {
    console.error("Error fetching issues", e);
    return [];
  }
}

// --- React component ---------------------------------------------------------

export default async function BoardPage({ searchParams }: { searchParams: Promise<BoardSearchParams> | BoardSearchParams }) {
  const params = await Promise.resolve(searchParams);
  let teamId = params.team_id || "";

  if (!teamId) {
    try {
      const client = getLinearClient();
      const res = await safeGraphQLQuery<{ teams?: { nodes: Array<{ id: string }> } }>(client, `query { teams { nodes { id } } }`, {}, { teams: { nodes: [] } });
      if (res.teams && res.teams.nodes.length) teamId = res.teams.nodes[0].id;
    } catch (e) {
      console.error(e);
    }
  }

  const projectId = params.project_id;
  const view = params.view || "kanban";
  const statusParamRaw = (params as any).status || "all";
  const statusParamArr = typeof statusParamRaw === "string" ? statusParamRaw.split(",").filter(Boolean) : ["all"];
  const priorityParam = (params as any).priority || "all";
  const labelParam = (params as any).label || "all";
  const assigneeParam = (params as any).assignee || "all";

  if (!teamId) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
        <p className="mb-6">Please specify a valid team ID or check if your Linear workspace has any teams.</p>
        <p className="text-sm text-muted-foreground mb-8">
          You can specify a team ID in the URL like: <code className="bg-muted px-2 py-1 rounded">/board?team_id=YOUR_TEAM_ID</code>
        </p>
      </main>
    );
  }

  const [states, labels, priorities, issues, users] = await Promise.all([
    fetchWorkflowStates(teamId),
    fetchAllLabelTypes(teamId),
    fetchPriorities(),
    fetchIssues(teamId, projectId, statusParamArr, priorityParam, labelParam, assigneeParam),
    fetchUsers(teamId),
  ]);

  const issuesByState: Record<string, Issue[]> = {};
  states.forEach((s) => (issuesByState[s.id] = []));
  issues.forEach((i) => {
    if (issuesByState[i.state.id]) issuesByState[i.state.id].push(i);
    else if (states.length) issuesByState[states[0].id].push(i);
  });

  // Custom status ordering - using Linear's built-in type field
  // Order: Triage > Backlog > Todo > In Progress > Completed > Canceled 
  const typeOrderMap = new Map([
    ["triage", 0],
    ["backlog", 1],
    ["unstarted", 2], // Todo
    ["started", 3],   // In Progress
    ["completed", 4],
    ["canceled", 5]
  ]);
  
  // First find Triage state if it exists
  const triageState = states.find(s => s.name.toLowerCase() === 'triage');
  const otherStates = states.filter(s => s.name.toLowerCase() !== 'triage');
  
  // Sort non-Triage states by type
  const sortedOthers = [...otherStates].sort((a, b) => {
    const aType = (a.type || "").toLowerCase();
    const bType = (b.type || "").toLowerCase();
    
    // If both have a recognized type, sort by the type order map
    if (typeOrderMap.has(aType) && typeOrderMap.has(bType)) {
      return (typeOrderMap.get(aType) || 999) - (typeOrderMap.get(bType) || 999);
    }
    
    // If one has a type and the other doesn't, prioritize the one with a type
    if (typeOrderMap.has(aType) && !typeOrderMap.has(bType)) return -1;
    if (!typeOrderMap.has(aType) && typeOrderMap.has(bType)) return 1;
    
    // Fall back to the original Linear position if types are equal or missing
    return a.position - b.position;
  });
  
  // Put Triage first, then sorted others
  const sortedStates = triageState 
    ? [triageState, ...sortedOthers]
    : sortedOthers;

  // Apply status filter to visible states
  const visibleStates = statusParamArr.includes("all") ? sortedStates : sortedStates.filter(s => statusParamArr.includes(s.name));

  const base = "/board";
  const buildView = (v: string) => {
    const search = new URLSearchParams({
      team_id: teamId,
      project_id: projectId as any,
      view: v,
      status: statusParamRaw,
      priority: priorityParam,
      label: labelParam,
      assignee: assigneeParam,
    });
    return `${base}?${search.toString()}`;
  };

  /* ------------------------------ RENDER ----------------------------------- */
  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">{projectId ? "Project Issue Board" : "Team Issue Board"}</h1>
          <p className="text-muted-foreground mb-4">{issues.length} issues across {states.length} workflow states</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex rounded-md shadow-sm">
            <Link href={buildView("kanban")} className={`px-4 py-2 text-sm font-medium rounded-l-md ${view === "kanban" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>Kanban</Link>
            <Link href={buildView("list")} className={`px-4 py-2 text-sm font-medium rounded-r-md ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>List</Link>
          </div>
        </div>
      </div>

      {/* Filter controls */}
      <BoardFilterControls
        states={states}
        priorities={priorities}
        labels={labels}
        users={users}
      />

      {/* Kanban Board */}
      {view === "kanban" && <DraggableKanbanBoard workflowStates={visibleStates} issuesByState={issuesByState} />}

      {/* List View */}
      {view === "list" && (
        <IssueListView workflowStates={visibleStates} issuesByState={issuesByState} />
                )}

      {/* Floating form button */}
      {teamId && (
        <div className="fixed bottom-6 right-6">
          <FloatingForm teamId={teamId} projectId={projectId} />
        </div>
      )}
    </main>
  );
} 