import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-muted-foreground">Loading the reset form…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
