import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLinearClient } from "@/lib/linear";

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
    <main className="p-8 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="flex flex-col items-center p-6">
          <h2 className="text-xl font-bold mb-2">{project.name}</h2>
          <p className="mb-4 text-muted-foreground">{project.description}</p>
          <Link href={`/roadmap?team_id=${teamId}&project_id=${project.id}`}>
            <Button>View Roadmap</Button>
          </Link>
        </Card>
      ))}
    </main>
  );
} 