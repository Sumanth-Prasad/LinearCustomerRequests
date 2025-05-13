import { NextResponse } from "next/server";
import { linearGraphQL } from "@/lib/linear";
import "server-only";

interface WorkflowState {
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
      query States($teamId: String!) {
        team(id: $teamId) {
          id
          states(first: 250) {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    type StatesQueryResult = {
      team: {
        id: string;
        states: {
          nodes: { id: string; name: string }[];
        };
      } | null;
    };

    const data = await linearGraphQL<{ teamId: string }, StatesQueryResult>(query, { teamId });

    const states = data?.team?.states.nodes.map((s) => ({
      ...s,
      teamId,
    })) ?? [];

    return NextResponse.json<WorkflowState[]>(states, { status: 200 });
  } catch (error) {
    console.error(`/api/linear/teams/${teamId}/states error`, error);
    return NextResponse.json({ error: "Failed to fetch states" }, { status: 500 });
  }
} 