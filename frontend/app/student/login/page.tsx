'use client';

import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import { courseReturnPath } from '@/lib/course-return';
import { clearSession, saveSession, type AuthUser } from '@/lib/session';

interface LoginResult {
  user: AuthUser;
}

const fieldClassName =
  'h-11 border-zinc-800 bg-zinc-900/50 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-600 focus-visible:ring-white/20';

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-zinc-400">Loading sign in…</p>}>
      <StudentLoginForm />
    </Suspense>
  );
}

function StudentLoginForm() {
  const router = useRouter();
  const nextPath = courseReturnPath(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await apiRequest<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const session = saveSession(result.user);
      if (session.role !== 'STUDENT') {
        clearSession();
        setError('This portal is for students.');
        return;
      }
      router.replace(nextPath ?? '/learn');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50 sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">Access your English courses and lessons.</p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={(event) => void onSubmit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-zinc-200">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@school.edu"
                className={fieldClassName}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-zinc-200">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-400 underline-offset-4 transition hover:text-zinc-100 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className={fieldClassName}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-red-900/80 bg-red-950/80 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="min-h-11 w-full bg-white text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100 active:scale-[0.99]"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">
          Your session stays in a secure cookie. Reset links expire after 15 minutes.
        </p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>
      </section>
    </main>
  );
}
