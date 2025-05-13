import { NextResponse } from "next/server";
import { linearGraphQL } from "@/lib/linear";
import "server-only";

interface Label {
  id: string;
  name: string;
  color: string;
}

export async function GET() {
  try {
    const query = /* GraphQL */ `
      query IssueLabels {
        issueLabels(first: 250) {
          nodes {
            id
            name
            color
          }
        }
      }
    `;

    type LabelsQueryResult = {
      issueLabels: {
        nodes: Label[];
      };
    };

    const data = await linearGraphQL<undefined, LabelsQueryResult>(query);
    const labels = (data as any)?.issueLabels?.nodes ?? [];

    return NextResponse.json<Label[]>(labels, { status: 200 });
  } catch (error) {
    console.error("/api/linear/labels error", error);
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 });
  }
} 