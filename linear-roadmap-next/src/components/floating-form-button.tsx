'use client';

import { Button } from '@/components/ui/button';
import { FormSubmitDialog } from '@/components/form-submit-dialog';
import { useState } from 'react';

interface FloatingFormButtonProps {
  teamId: string;
  projectId?: string;
}

export default function FloatingFormButton({ teamId, projectId }: FloatingFormButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <FormSubmitDialog
        teamId={teamId}
        projectId={projectId}
        triggerText={open ? 'Submit Request' : '+'}
        variant="default"
      />
    </div>
  );
} 