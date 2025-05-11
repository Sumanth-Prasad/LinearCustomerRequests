import React from "react";
import { getLinearClient, safeGraphQLQuery } from "@/lib/linear";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LinearTextarea } from "@/components/linear-textarea";
import { LinearInput } from "@/components/linear-input";
import { LinearLabel } from "@/components/linear-label";
import { LinearSelect } from "@/components/linear-select";

// Server action to create a new issue
async function createIssue(formData: FormData): Promise<void> {
  "use server";
  
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const teamId = formData.get("teamId") as string;
  
  if (!title.trim()) {
    throw new Error("Title is required");
  }
  
  if (!teamId) {
    throw new Error("Team ID is required");
  }
  
  const client = getLinearClient();
  try {
    await client.client.rawRequest(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            title
          }
        }
      }`,
      { 
        input: {
          title,
          description,
          teamId
        }
      }
    );
    
    revalidatePath("/roadmap");
    redirect("/roadmap");
  } catch (error) {
    console.error("Error creating issue:", error);
    throw new Error(`Failed to create issue: ${error}`);
  }
}

// Fetch available teams
async function fetchTeams() {
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
  
  return teamsData.teams?.nodes || [];
}

export default async function CreateIssuePage() {
  const teams = await fetchTeams();
  
  if (teams.length === 0) {
    return (
      <main className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">No Teams Available</h1>
          <p className="mb-6">
            You need at least one team in your Linear workspace to create issues.
          </p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/roadmap" className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-arrow-left">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Roadmap
        </Link>
      </div>
      
      <Card className="p-6 mb-8 bg-[#1a1a1a] border-[#333]">
        <h1 className="text-2xl font-bold mb-6 text-white">Create New Issue</h1>
        
        <form action={createIssue} className="space-y-6 w-full">
          <div className="space-y-2 w-full bg-[#1a1a1a] p-4 rounded-lg shadow-sm border-[#333] border">
            <LinearLabel htmlFor="teamId">Team</LinearLabel>
            <LinearSelect 
              id="teamId" 
              name="teamId" 
              defaultValue={teams[0]?.id}
              required
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.key})
                </option>
              ))}
            </LinearSelect>
          </div>
          
          <div className="space-y-2 w-full bg-[#1a1a1a] p-4 rounded-lg shadow-sm border-[#333] border">
            <LinearLabel htmlFor="title">Title</LinearLabel>
            <LinearInput 
              id="title" 
              name="title" 
              placeholder="Issue title" 
              required
            />
          </div>
          
          <div className="space-y-2 w-full bg-[#1a1a1a] p-4 rounded-lg shadow-sm border-[#333] border">
            <LinearLabel htmlFor="description">Description (Markdown)</LinearLabel>
            <LinearTextarea 
              id="description" 
              name="description" 
              className="min-h-[300px] font-mono"
              placeholder="Describe the issue in detail..."
            />
            <div className="text-sm text-gray-400 mt-2">
              Supports Markdown formatting: **bold**, *italic*, `code`, [link](url), etc.
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Link 
              href="/roadmap" 
              className="px-5 py-3 border rounded-md hover:bg-[#2a2a2a] font-medium bg-[#333] text-white border-[#444]"
            >
              Cancel
            </Link>
            <Button 
              type="submit" 
              size="lg" 
              className="px-6 py-6 h-auto text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Issue
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
} 