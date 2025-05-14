'use client';

import { FormSubmitDialog } from '@/components/form-submit-dialog';

interface FloatingFormProps {
  teamId: string;
  projectId?: string;
}

export function FloatingForm({ teamId, projectId }: FloatingFormProps) {
  return (
    <FormSubmitDialog
      teamId={teamId}
      projectId={projectId}
      triggerText="Submit Request"
      variant="default"
    />
  );
} 