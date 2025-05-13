import { NextResponse } from "next/server";
import { linearGraphQL } from "@/lib/linear";
import "server-only";

interface Team {
  id: string;
  name: string;
  key: string;
}

export async function GET() {
  try {
    const query = /* GraphQL */ `
      query Teams {
        teams(first: 250) {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

    type TeamsQueryResult = {
      teams: {
        nodes: Team[];
      };
    };

    const data = await linearGraphQL<undefined, TeamsQueryResult>(query);
    const teams = data?.teams?.nodes ?? [];

    return NextResponse.json<Team[]>(teams, { status: 200 });
  } catch (error) {
    console.error("/api/linear/teams error", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
} 