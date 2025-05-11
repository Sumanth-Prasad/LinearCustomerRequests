import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { getLinearClient } from "@/lib/linear";
import { Button } from "@/components/ui/button";

// Mock team data
const MOCK_TEAMS = [
  {
    id: "team1",
    name: "Engineering",
    key: "ENG",
    color: "#3B82F6",
    description: "Core engineering team working on platform features"
  },
  {
    id: "team2",
    name: "Product",
    key: "PROD",
    color: "#A855F7",
    description: "Product management and design"
  },
  {
    id: "team3",
    name: "Marketing",
    key: "MKT",
    color: "#F97316",
    description: "Marketing and growth initiatives"
  },
  {
    id: "team4",
    name: "Support",
    key: "SUP",
    color: "#10B981",
    description: "Customer support and success"
  }
];

async function fetchTeams() {
  try {
    const client = getLinearClient();
    const teams = await client.teams();
    
    return teams.nodes.map(team => ({
      id: team.id,
      name: team.name,
      key: team.key,
      color: team.color,
      description: team.description || `${team.name} team`
    }));
  } catch (error) {
    console.error("Error fetching teams:", error);
    return MOCK_TEAMS;
  }
}

export default async function HomePage() {
  const teams = await fetchTeams();
  
  return (
    <main className="container max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Select a Team</h1>
      <p className="text-muted-foreground mb-8">Choose a team to view their roadmap</p>
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
              <h2 className="text-xl font-semibold">{team.name}</h2>
              <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 ml-auto">
                {team.key}
              </span>
            </div>
            
            <p className="text-muted-foreground mb-6 flex-grow">{team.description}</p>
            
            <div className="flex justify-end">
              <Button asChild>
                <Link href={`/projects?team_id=${team.id}`}>View Projects</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
} 