'use client';

import { FormSubmitDialog } from '@/components/form-submit-dialog';

interface FloatingFormButtonProps {
  teamId: string;
  projectId?: string;
}

export default function FloatingFormButton({ teamId, projectId }: FloatingFormButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <FormSubmitDialog
        teamId={teamId}
        projectId={projectId}
        triggerText="+"
        variant="default"
        size="icon"
      />
    </div>
  );
} 