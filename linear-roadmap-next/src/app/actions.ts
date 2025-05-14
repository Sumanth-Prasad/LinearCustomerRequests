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

// Server action to create an issue in Linear from a submitted form
export async function submitFormIssue(formData: FormData): Promise<{ success: boolean; issueId?: string; error?: string }> {
  "use server";
  try {
    // Basic props
    const teamId = (formData.get("teamId") as string) || "";
    const projectId = (formData.get("projectId") as string) || undefined;
    const formId = (formData.get("formId") as string) || "";
    const linearSettingsRaw = formData.get("linearSettings") as string | null;
    let linearSettings: any = {};
    if (linearSettingsRaw) {
      try { linearSettings = JSON.parse(linearSettingsRaw); } catch {}
    }

    if (!teamId) throw new Error("Missing teamId");

    // Collect field values (exclude our hidden inputs)
    const fieldEntries: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (["teamId", "projectId", "formId"].includes(key)) continue;
      fieldEntries[key] = String(value);
    }

    const client = getLinearClient();

    // Build title using template if provided
    const rawSubmittedTitle = fieldEntries['title'] || Object.values(fieldEntries)[0] || 'New request';
    const template = (linearSettings?.defaultTitle as string | undefined);
    const title = template ? template.replace('{title}', rawSubmittedTitle) : rawSubmittedTitle;

    // Base description from responseMessage if provided
    let description = '';
    if(linearSettings?.responseMessage){
      description += linearSettings.responseMessage.replace('{title}', rawSubmittedTitle) + '\n\n';
    }

    description += `Submitted via website form (formId: ${formId}).\n\n`;

    // Build markdown body listing each field label/value
    Object.entries(fieldEntries).forEach(([k, v]) => {
      if(k!=='linearSettings' && k!=='title' && k!=='description')
        description += `**${k}**: ${v}\n`;
    });

    // Map priority string to number
    const priorityMap: any = { 'urgent':1, 'high':2, 'medium':3, 'low':4, 'no_priority':0 };
    const priorityVal = priorityMap[linearSettings.priority] ?? undefined;

    // Resolve label IDs if provided
    let labelIds: string[] | undefined;
    if(Array.isArray(linearSettings.labels) && linearSettings.labels.length){
      try{
        const labelQuery = `query Labels($teamId: String!){ team(id:$teamId){ labels{ nodes{ id name } } } }`;
        const labelRes: any = await client.client.rawRequest(labelQuery,{teamId});
        const available = labelRes?.data?.team?.labels?.nodes || [];
        labelIds = available.filter((l:any)=>linearSettings.labels.includes(l.name)).map((l:any)=>l.id);
      }catch{}
    }

    if (linearSettings?.issueType === 'customer_request') {
      // override title & description per requirements
      const crTitle = rawSubmittedTitle;
      const crDesc = linearSettings?.responseMessage ? linearSettings.responseMessage.replace('{title}', rawSubmittedTitle) : '';
      const issueInput: Record<string, any> = { teamId, title: crTitle, description: '' };
      if (projectId && projectId !== 'undefined') issueInput.projectId = projectId;
      if(priorityVal!==undefined) issueInput.priority = priorityVal;
      if(labelIds?.length) issueInput.labelIds = labelIds;
      const mutation = `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id } } }`;
      const res: any = await client.client.rawRequest(mutation, { input: issueInput });
      const issueCreate = res?.data?.issueCreate;
      if (!issueCreate?.success) throw new Error('Linear issue creation failed');

      // Step 2: attach a customer need (request) to it
      const needInput: Record<string, any> = {
        issueId: issueCreate.issue.id,
        body: crDesc
      };
      const needMutation = `mutation CustomerNeedCreate($input: CustomerNeedCreateInput!) { customerNeedCreate(input: $input) { success } }`;
      await client.client.rawRequest(needMutation, { input: needInput });

      return { success: true, issueId: issueCreate.issue.id };
    } else {
      const input: Record<string, any> = { teamId, title, description };
      if (projectId && projectId !== 'undefined') input.projectId = projectId;
      if(priorityVal!==undefined) input.priority = priorityVal;
      if(labelIds?.length) input.labelIds = labelIds;
      const mutation = `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id } } }`;
      const res: any = await client.client.rawRequest(mutation, { input });
      const issueCreate = res?.data?.issueCreate;
      if (!issueCreate?.success) throw new Error('Linear issue creation failed');
      return { success: true, issueId: issueCreate.issue.id };
    }
  } catch (error: any) {
    console.error("submitFormIssue error", error);
    return { success: false, error: error?.message || String(error) };
  }
} 