import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { getLinearClient, safeGraphQLQuery } from "@/lib/linear";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LabelBadge } from "@/components/custom-label-badge";
import { DraggableKanbanBoard } from "@/components/draggable-kanban-board";

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

async function fetchWorkflowStates(teamId: string) {
  try {
    const client = getLinearClient();
    const query = `
      query GetWorkflowStates($teamId: String!) {
        team(id: $teamId) {
          states { nodes { id name color position } }
        }
      }
    `;
    const data = await safeGraphQLQuery<{
      team?: { states?: { nodes: Array<{ id: string; name: string; color?: string; position: number }> } };
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

async function fetchIssues(teamId: string, projectId?: string, filterCat?: string, filterVal?: string): Promise<Issue[]> {
  try {
    const client = getLinearClient();
    const filter: any = { team: { id: { eq: teamId } } };
    if (projectId && projectId !== "undefined") filter.project = { id: { eq: projectId } };
    if (filterCat && filterCat !== "all" && filterVal && filterVal !== "all") {
      if (filterCat === "status") {
        if (filterVal === "unassigned") filter.assignee = { null: { eq: true } };
        else filter.state = { name: { eq: filterVal } };
      } else if (filterCat === "priority") {
        const map: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4, none: 0 };
        if (map[filterVal] !== undefined) filter.priority = { eq: map[filterVal] };
      } else if (filterCat === "label") {
        filter.labels = { name: { eq: filterVal } };
      } else if (filterCat === "assignee") {
        if (filterVal === "unassigned") filter.assignee = { null: { eq: true } };
        else {
          const users = await fetchUsers(teamId);
          const u = users.find((x) => x.name === filterVal);
          if (u) filter.assignee = { id: { eq: u.id } };
        }
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
  const filterCat = params.filter_category || "all";
  const filterVal = params.filter_value || "all";

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
    fetchIssues(teamId, projectId, filterCat, filterVal),
    fetchUsers(teamId),
  ]);

  const issuesByState: Record<string, Issue[]> = {};
  states.forEach((s) => (issuesByState[s.id] = []));
  issues.forEach((i) => {
    if (issuesByState[i.state.id]) issuesByState[i.state.id].push(i);
    else if (states.length) issuesByState[states[0].id].push(i);
  });

  const base = "/board";
  const build = (v: string, c: string, val: string) => `${base}?team_id=${teamId}&project_id=${projectId}&view=${v}&filter_category=${c}&filter_value=${val}`;

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
            <Link href={build("kanban", filterCat, filterVal)} className={`px-4 py-2 text-sm font-medium rounded-l-md ${view === "kanban" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>Kanban</Link>
            <Link href={build("list", filterCat, filterVal)} className={`px-4 py-2 text-sm font-medium rounded-r-md ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>List</Link>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {view === "kanban" && <DraggableKanbanBoard workflowStates={states} issuesByState={issuesByState} />}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-10 container mx-auto px-4 md:px-6 py-6">
          {states.map((state) => (
            <div key={state.id} className="mb-12">
              <div className="mb-5 max-w-4xl mx-auto">
                <div className="flex items-center mb-2 pt-8">
                  <h2 className="text-lg font-semibold text-foreground">{state.name}</h2>
                  <span className="text-sm text-muted-foreground ml-3">{issuesByState[state.id]?.length || 0}</span>
                </div>
              </div>

              <div className="space-y-4 max-w-4xl mx-auto">
                {issuesByState[state.id]?.map((issue) => (
                  <Link key={issue.id} href={`/issue/${issue.id}`} className="block">
                    <div className="border border-border/40 rounded-md hover:bg-secondary/20 transition-colors p-4 md:p-5">
                      {/* Top Row */}
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="font-medium text-base text-foreground max-w-[70%] mt-2">{issue.title}</h3>

                        {/* Assignee */}
                        {issue.assignee && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{issue.assignee.name}</span>
                            {issue.assignee.avatarUrl ? (
                              <img src={issue.assignee.avatarUrl} alt={issue.assignee.name} className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                {issue.assignee.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Row */}
                      <div className="flex justify-between items-center">
                        {/* Priority */}
                        {issue.priority !== undefined && (
                          <span
                            className={`text-xs font-semibold ${
                              issue.priority === 1
                                ? "text-red-700 dark:text-red-500"
                                : issue.priority === 2
                                ? "text-orange-700 dark:text-orange-500"
                                : issue.priority === 3
                                ? "text-yellow-600 dark:text-yellow-400"
                                : issue.priority === 4
                                ? "text-gray-600 dark:text-gray-400"
                                : "text-gray-400 dark:text-gray-600"
                            }`}
                            style={{
                              backgroundColor:
                                issue.priority === 1
                                  ? "#ef4444"
                                  : issue.priority === 2
                                  ? "#f97316"
                                  : issue.priority === 3
                                  ? "#eab308"
                                  : issue.priority === 4
                                  ? "#6b7280"
                                  : "#d1d5db",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              color: "#fff",
                            }}
                          >
                            {issue.priority === 1
                              ? "Urgent"
                              : issue.priority === 2
                              ? "High"
                              : issue.priority === 3
                              ? "Medium"
                              : issue.priority === 4
                              ? "Low"
                              : "None"}
                          </span>
                        )}

                        {/* Labels */}
                        <div className="flex flex-wrap gap-1 justify-end">
                          {issue.labels?.map((label) => (
                            <LabelBadge key={label.name} color={label.color || "#d1d5db"}>
                              {label.name}
                            </LabelBadge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Empty column fallback */}
                {(!issuesByState[state.id] || issuesByState[state.id].length === 0) && (
                  <div className="py-6 text-center text-muted-foreground text-sm border border-dashed rounded-md">No issues</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TODO: List view & filter UI omitted for brevity */}

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