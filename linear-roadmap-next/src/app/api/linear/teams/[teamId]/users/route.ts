import { NextResponse } from "next/server";
import { linearGraphQL } from "@/lib/linear";
import "server-only";

interface User {
  id: string;
  name: string;
  displayName: string;
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
      query TeamMembers($teamId: String!) {
        team(id: $teamId) {
          id
          members(first: 250) {
            nodes {
              id
              name
              displayName
            }
          }
        }
      }
    `;

    type TeamMembersResult = {
      team: {
        id: string;
        members: {
          nodes: User[];
        };
      } | null;
    };

    const data = await linearGraphQL<{ teamId: string }, TeamMembersResult>(query, { teamId });
    const users = data?.team?.members.nodes ?? [];

    return NextResponse.json<User[]>(users, { status: 200 });
  } catch (error) {
    console.error(`/api/linear/teams/${teamId}/users error`, error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
} 