'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';

interface ResetResult {
  message: string;
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'This reset link is missing a token.');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError('This reset link is missing a token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    setPending(true);
    try {
      const result = await apiRequest<ResetResult>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update the password.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Auralogic</p>
            <ThemeSwitcher />
          </div>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="flex flex-col gap-4">
              <p role="status" className="text-sm text-success">
                {message}
              </p>
              <Link href="/student/login" className="inline-flex min-h-11 items-center text-sm text-foreground underline">
                Student sign in
              </Link>
              <Link href="/instructor/login" className="inline-flex min-h-11 items-center text-sm text-foreground underline">
                Instructor sign in
              </Link>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <p className="text-sm text-muted-foreground">Use at least 8 characters, with a letter and a number.</p>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11" disabled={pending || token.length === 0}>
                {pending ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
