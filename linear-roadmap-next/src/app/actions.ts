"use server";

import { getLinearClient } from "@/lib/linear";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Server action to create a comment
export async function createComment(formData: FormData): Promise<void> {
  const issueId = formData.get("issueId") as string;
  const body = formData.get("body") as string;
  
  if (!body || !body.trim()) {
    throw new Error("Comment cannot be empty");
  }
  
  const client = getLinearClient();
  try {
    // First create the comment
    const commentResponse = await client.client.rawRequest(`
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
          }
        }
      }`,
      { 
        input: {
          issueId,
          body
        }
      }
    );
    
    // TODO: For file uploads, we would need to use Linear's API to upload files
    // This would require additional implementation with their file upload endpoints
    // The implementation would depend on Linear's specific file upload API
    
    revalidatePath(`/issue/${issueId}`);
  } catch (error) {
    console.error("Error creating comment:", error);
    throw new Error(`Failed to create comment: ${error}`);
  }
}

// Server action to delete an issue
export async function deleteIssue(issueId: string): Promise<{ success: boolean; error?: string }> {
  const client = getLinearClient();
  try {
    // Use the raw API client to delete the issue
    await client.client.rawRequest(`
      mutation DeleteIssue($id: String!) {
        issueDelete(id: $id) {
          success
        }
      }`,
      { id: issueId }
    );
    
    revalidatePath("/roadmap");
    return { success: true };
  } catch (error) {
    console.error("Error deleting issue:", error);
    return { success: false, error: String(error) };
  }
}

// Combined server action to delete issue and redirect
export async function deleteIssueAndRedirect(issueId: string) {
  "use server";
  if (!issueId) return;
  
  const result = await deleteIssue(issueId);
  if (result.success) {
    redirect("/roadmap");
  }
}

// Server action to update an issue
export async function updateIssue(formData: FormData): Promise<void> {
  const issueId = formData.get("issueId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  
  const client = getLinearClient();
  try {
    // Use the raw API client to update the issue
    await client.client.rawRequest(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            title
          }
        }
      }`,
      { 
        id: issueId,
        input: {
          title,
          description
        }
      }
    );
    
    revalidatePath(`/issue/${issueId}`);
    redirect(`/issue/${issueId}`);
  } catch (error) {
    console.error("Error updating issue:", error);
    throw new Error(`Failed to update issue: ${error}`);
  }
} 