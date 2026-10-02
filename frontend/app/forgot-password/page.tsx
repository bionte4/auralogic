'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';

interface ResetRequest {
  message: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiRequest<ResetRequest>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send the reset link.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Fluentis</p>
            <ThemeSwitcher />
          </div>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">The link expires in 15 minutes.</p>
            {message ? (
              <p role="status" className="text-sm text-success">
                {message}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/student/login" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">
              Student sign in
            </Link>
            <Link href="/instructor/login" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground">
              Instructor sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
