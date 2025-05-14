'use client';

import Link from "next/link";
import { ListProvider, ListGroup, ListHeader, ListItems } from "@/components/ui/shadcn-io/list";
import { LabelBadge } from "@/components/custom-label-badge";

export interface KanbanState {
  id: string;
  name: string;
  color?: string;
}

export interface Issue {
  id: string;
  title: string;
  priority?: number;
  labels?: { name: string; color: string }[];
  assignee?: { id: string; name: string; avatarUrl?: string } | null;
  state: { id: string; name: string; color?: string };
}

interface IssueListViewProps {
  workflowStates: KanbanState[];
  issuesByState: Record<string, Issue[]>;
}

export default function IssueListView({ workflowStates, issuesByState }: IssueListViewProps) {
  return (
    <ListProvider onDragEnd={() => {}} className="space-y-10 container mx-auto px-4 md:px-6 py-6">
      {workflowStates.map((state) => (
        <ListGroup key={state.id} id={state.id}>
          <ListHeader name={state.name} color={state.color || '#6b7280'} />
          <ListItems>
            {issuesByState[state.id]?.map((issue) => (
              <Link key={issue.id} href={`/issue/${issue.id}`} className="block">
                <div className="flex flex-col gap-3 rounded-md border bg-background px-3 py-2 hover:bg-secondary/20 transition-colors">
                  {/* Title & Assignee */}
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm text-foreground max-w-[70%] mt-0.5">{issue.title}</h3>
                    {issue.assignee && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{issue.assignee.name}</span>
                        {issue.assignee.avatarUrl ? (
                          <img src={issue.assignee.avatarUrl} alt={issue.assignee.name} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                            {issue.assignee.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority & Labels */}
                  <div className="flex justify-between items-center">
                    {issue.priority !== undefined && (
                      <span
                        className={`text-[10px] font-semibold`} // color via inline style below
                        style={{
                          backgroundColor:
                            issue.priority === 1
                              ? '#ef4444'
                              : issue.priority === 2
                              ? '#f97316'
                              : issue.priority === 3
                              ? '#eab308'
                              : issue.priority === 4
                              ? '#6b7280'
                              : '#d1d5db',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '0.2rem',
                          color: '#fff',
                        }}
                      >
                        {issue.priority === 1
                          ? 'Urgent'
                          : issue.priority === 2
                          ? 'High'
                          : issue.priority === 3
                          ? 'Medium'
                          : issue.priority === 4
                          ? 'Low'
                          : 'None'}
                      </span>
                    )}

                    <div className="flex flex-wrap gap-1 justify-end">
                      {issue.labels?.map((label) => (
                        <LabelBadge key={label.name} color={label.color || '#d1d5db'}>
                          {label.name}
                        </LabelBadge>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Empty state */}
            {(!issuesByState[state.id] || issuesByState[state.id].length === 0) && (
              <div className="py-6 text-center text-muted-foreground text-sm border border-dashed rounded-md">
                No issues
              </div>
            )}
          </ListItems>
        </ListGroup>
      ))}
    </ListProvider>
  );
} 