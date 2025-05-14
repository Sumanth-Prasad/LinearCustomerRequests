import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLinearClient } from "@/lib/linear";
import { Separator } from "@/components/ui/separator";

// Define search params type for this page
type ProjectsSearchParams = {
  team_id?: string;
};

async function fetchProjects(teamId: string) {
  const client = getLinearClient();
  const projects = await client.projects();
  
  // Define the type for the projects we're returning
  type ProjectData = {
    id: string;
    name: string;
    description: string;
  };
  
  // Initialize with the proper type
  const filteredProjects: ProjectData[] = [];
  
  for (const project of projects.nodes) {
    const teams = await project.teams();
    if (teams.nodes.some((t) => t.id === teamId)) {
      filteredProjects.push({
        id: project.id,
        name: project.name,
        description: project.description,
      });
    }
  }
  return filteredProjects;
}

// New helper component for team-level issue board card
function TeamBoardCard({ teamId }: { teamId: string }) {
  return (
    <Card className="flex flex-col items-center p-6 border-dashed border-primary/40">
      <h2 className="text-xl font-bold mb-2">Team Issue Board</h2>
      <p className="mb-4 text-muted-foreground text-center max-w-xs">
        View all issues for this team across every project.
      </p>
      <Link href={`/board?team_id=${teamId}`}>
        <Button>Open Issue Board</Button>
      </Link>
    </Card>
  );
}

// New helper component for team-level roadmap
function TeamRoadmapCard({ teamId }: { teamId: string }) {
  return (
    <Card className="flex flex-col items-center p-6 border-dashed border-primary/40">
      <h2 className="text-xl font-bold mb-2">Team Roadmap</h2>
      <p className="mb-4 text-muted-foreground text-center max-w-xs">
        View milestones and deadlines across all projects in a Gantt chart.
      </p>
      <Link href={`/roadmap?team_id=${teamId}`}>
        <Button>View Roadmap</Button>
      </Link>
    </Card>
  );
}

export default async function ProjectsPage({ 
  searchParams 
}: { 
  searchParams: Promise<ProjectsSearchParams> | ProjectsSearchParams 
}) {
  // Await searchParams before accessing properties (Next.js 15+ requirement)
  const params = await Promise.resolve(searchParams);
  const teamId = params?.team_id || "";
  
  const projects = await fetchProjects(teamId);
  return (
    <main className="p-8">
      {/* Team section */}
      <section className="mb-12">
        <h1 className="text-2xl font-bold mb-6">Team View</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TeamBoardCard teamId={teamId} />
          <TeamRoadmapCard teamId={teamId} />
        </div>
      </section>
      
      <Separator className="my-8" />
      
      {/* Projects section */}
      <section>
        <h1 className="text-2xl font-bold mb-6">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-muted-foreground">No projects found for this team.</p>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col h-full">
                <div className="p-6 flex flex-col h-full">
                  <h2 className="text-xl font-bold mb-2">{project.name}</h2>
                  <p className="mb-6 text-muted-foreground flex-grow">{project.description}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                    <Link href={`/board?team_id=${teamId}&project_id=${project.id}`}>
                      <Button className="w-full">Open Issue Board</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
} 