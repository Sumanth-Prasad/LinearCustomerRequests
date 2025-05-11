import React from "react";
import { getLinearClient } from "@/lib/linear";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { LinearInput } from "@/components/linear-input";
import { LinearLabel } from "@/components/linear-label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CommentForm } from "@/components/comment-form";
import { updateIssue, deleteIssueAndRedirect } from "@/app/actions";

// Define params type for this specific route
type IssueParams = {
  id: string;
};

async function fetchIssueDetails(issueId: string) {
  const client = getLinearClient();
  try {
    const issue = await client.issue(issueId);
    const comments = await issue.comments();
    
    // Fetch state and assignee info
    const stateObj = issue.state ? await issue.state : null;
    const assigneeObj = issue.assignee ? await issue.assignee : null;
    const teamObj = issue.team ? await issue.team : null;
    
    // Fetch all comment users in parallel
    const commentsWithUsers = await Promise.all(
      comments.nodes.map(async (comment) => {
        let userName = "Unknown";
        let avatarUrl: string | undefined = undefined;
        
        if (comment.user) {
          const userObj = await comment.user;
          userName = userObj?.name || "Unknown";
          avatarUrl = userObj?.avatarUrl || undefined;
        }
        
        return {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          user: { 
            name: userName,
            avatarUrl
          }
        };
      })
    );
    
    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      state: stateObj ? {
        id: stateObj.id,
        name: stateObj.name,
        color: stateObj.color
      } : null,
      assignee: assigneeObj ? {
        id: assigneeObj.id,
        name: assigneeObj.name,
        avatarUrl: assigneeObj.avatarUrl
      } : null,
      team: teamObj ? {
        id: teamObj.id,
        name: teamObj.name,
        key: teamObj.key
      } : null,
      priority: issue.priority,
      comments: commentsWithUsers,
      updatedAt: issue.updatedAt,
      createdAt: issue.createdAt
    };
  } catch (error) {
    console.error("Error fetching issue details:", error);
    return null;
  }
}

export default async function IssueDetailsPage({ 
  params,
  searchParams 
}: { 
  params: Promise<IssueParams> | IssueParams;
  searchParams: { edit?: string };
}) {
  // Await params before accessing properties (Next.js 15+ requirement)
  const routeParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const issue = await fetchIssueDetails(routeParams.id);
  const isEditMode = resolvedSearchParams.edit === "true";
  
  if (!issue) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="p-8 text-center bg-[#1a1a1a] border-[#333]">
            <h2 className="text-xl font-bold mb-4 text-white">Issue Not Found</h2>
            <p className="text-gray-400 mb-6">This issue may have been deleted or you don&apos;t have permission to view it.</p>
            <Link href="/roadmap">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                Return to Roadmap
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto bg-[#121212]">
      <div className="mb-6">
        <Link href="/roadmap" className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Roadmap
        </Link>
      </div>
      
      <Card className="p-5 md:p-6 mb-8 bg-[#1a1a1a] border-[#333] shadow-md overflow-hidden">
        {isEditMode ? (
          // EDIT MODE
          <form action={updateIssue} className="space-y-6 w-full">
            <input type="hidden" name="issueId" value={issue.id} />
            
            <div className="space-y-3">
              <LinearLabel htmlFor="title">Issue Title</LinearLabel>
              <LinearInput 
                id="title" 
                name="title" 
                defaultValue={issue.title}
                required
                placeholder="Issue title"
                className="text-lg font-medium"
              />
            </div>
            
            <div className="space-y-3">
              <LinearLabel htmlFor="description">Description (Markdown)</LinearLabel>
              <textarea 
                id="description" 
                name="description" 
                defaultValue={issue.description || ""}
                className="w-full min-h-[300px] p-4 resize-none bg-[#0c0c0c] border-0 text-base text-gray-200 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 font-mono rounded-md border border-[#333]"
                placeholder="Describe the issue in detail..."
              />
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                Markdown supported
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Link 
                href={`/issue/${issue.id}`} 
                className="px-4 py-2 border border-[#444] rounded-md hover:bg-[#2a2a2a] font-medium bg-[#333] text-white"
              >
                Cancel
              </Link>
              <Button 
                type="submit" 
                className="px-5 py-2 h-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          // VIEW MODE
          <>
            <div className="flex justify-between items-start mb-5">
              <h1 className="text-2xl font-bold text-white">{issue.title}</h1>
              <div className="flex gap-2">
                <Link href={`/issue/${issue.id}?edit=true`}>
                  <Button variant="outline" size="sm" className="bg-[#333] text-white border-[#444] hover:bg-[#444] hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </Button>
                </Link>
                <form action={deleteIssueAndRedirect.bind(null, issue.id)}>
                  <Button variant="destructive" size="sm" type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete
                  </Button>
                </form>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-5">
              {issue.state && (
                <Badge
                  className="px-2.5 py-1 text-xs font-medium text-white border-0"
                  style={{
                    backgroundColor: issue.state.color || '#6b7280'
                  }}
                >
                  {issue.state.name}
                </Badge>
              )}
              
              {issue.priority !== null && issue.priority !== undefined && (
                <Badge
                  className="px-2.5 py-1 text-xs font-medium text-white border-0"
                  style={{
                    backgroundColor: 
                      issue.priority === 1 ? "#ef4444" : // Urgent
                      issue.priority === 2 ? "#f97316" : // High
                      issue.priority === 3 ? "#eab308" : // Medium
                      issue.priority === 4 ? "#6b7280" : // Low
                      "#d1d5db" // None/default
                  }}
                >
                  {issue.priority === 1 ? "Urgent" : 
                   issue.priority === 2 ? "High" : 
                   issue.priority === 3 ? "Medium" : 
                   issue.priority === 4 ? "Low" : "No Priority"}
                </Badge>
              )}
              
              {issue.assignee && (
                <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium bg-[#222] text-white border-[#444]">
                  {issue.assignee.name}
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-gray-400 mb-6 flex gap-3">
              <span>Created {new Date(issue.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated {new Date(issue.updatedAt).toLocaleDateString()}</span>
            </div>
            
            <Separator className="mb-6 bg-[#333]" />
            
            {issue.description ? (
              <div className="mb-6 p-4 bg-[#222] rounded-md border border-[#333] text-white">
                <MarkdownRenderer content={issue.description} />
              </div>
            ) : (
              <div className="text-gray-400 italic mb-6 p-4 bg-[#222] rounded-md border border-dashed border-[#333] text-center">
                No description provided
          </div>
            )}
          </>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6 text-white">Comments {issue.comments.length > 0 && `(${issue.comments.length})`}</h2>
        
      {issue.comments.length > 0 ? (
          <div className="space-y-4 mb-8">
          {issue.comments.map(comment => (
              <Card key={comment.id} className="overflow-hidden bg-[#1a1a1a] border-[#333] shadow-md">
                <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#222]">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {comment.user?.avatarUrl ? (
                        <AvatarImage src={comment.user.avatarUrl} alt={comment.user.name} />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white">
                          {comment.user?.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{comment.user?.name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 text-white">
                  <MarkdownRenderer content={comment.body} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
          <Card className="p-8 border border-dashed bg-[#1a1a1a] border-[#333] mb-8 flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-gray-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p className="text-gray-400">No comments yet</p>
            </div>
          </Card>
        )}
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Add a comment
          </h3>
          
          <CommentForm issueId={issue.id} />
        </div>
      </div>
    </main>
  );
}