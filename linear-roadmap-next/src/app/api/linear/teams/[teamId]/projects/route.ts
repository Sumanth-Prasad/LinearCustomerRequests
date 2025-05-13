import { NextResponse } from "next/server";
import { linearGraphQL } from "@/lib/linear";
import "server-only";

interface Project {
  id: string;
  name: string;
  teamId: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { teamId: string } }
) {
  const { teamId } = await params;
  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  try {
    const query = /* GraphQL */ `
      query Projects($teamId: String!) {
        team(id: $teamId) {
          id
          projects(first: 250) {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    type ProjectsQueryResult = {
      team: {
        id: string;
        projects: {
          nodes: { id: string; name: string }[];
        };
      } | null;
    };

    const data = await linearGraphQL<{ teamId: string }, ProjectsQueryResult>(query, { teamId });

    const projects = data?.team?.projects.nodes.map((p) => ({
      ...p,
      teamId,
    })) ?? [];

    return NextResponse.json<Project[]>(projects, { status: 200 });
  } catch (error) {
    console.error(`/api/linear/teams/${teamId}/projects error`, error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
} 