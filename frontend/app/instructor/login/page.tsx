'use client';

import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { BrandLockup } from '@/components/brand-mark';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import { fromUiLocale, writeLocaleCookie } from '@/lib/locale';
import { clearSession, isStaffRole, saveSession, type AuthUser } from '@/lib/session';

interface LoginResult {
  user: AuthUser;
}

const TRUST = [
  { label: 'Sequential lessons', detail: 'The next level opens only after the current one is complete.' },
  { label: 'Encrypted playback', detail: 'Lesson video streams as HLS with a student watermark.' },
  { label: 'Instructor studio', detail: 'Publish modules, quizzes, and rosters from one dashboard.' },
];

export default function InstructorLoginPage() {
  const router = useRouter();
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
      if (result.user.locale) {
        writeLocaleCookie(fromUiLocale(result.user.locale));
      }
      if (!isStaffRole(session.role)) {
        clearSession();
        setError('This dashboard is for instructors and super admins.');
        return;
      }
      router.replace('/instructor');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <section className="relative overflow-hidden px-6 py-12 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.35), transparent 32%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.18), transparent 28%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: 'auto, auto, 48px 48px, 48px 48px',
          }}
        />
        <div className="relative flex w-full items-center gap-3">
          <BrandLockup markClassName="h-10 w-10" className="text-sm" />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
        <div className="relative mt-12 max-w-xl lg:mt-0">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Instructor studio</p>
          <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-tight">
            Empowering world-class English instruction
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Build courses, watch progress, and keep every lesson in sequence.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {TRUST.map((item) => (
              <li key={item.label} className="rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur">
                <p className="text-sm font-medium tracking-tight">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Instructors and admins use this studio.</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={(event) => void onSubmit(event)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@school.edu"
                  className="h-11 bg-background pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 bg-background pl-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="min-h-11 transition hover:scale-[1.01] active:scale-[0.99]"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p id="password-help" className="mt-6 text-xs leading-relaxed text-muted-foreground">
            The reset link expires in 15 minutes. A super admin can still issue a new password from the user directory.
          </p>
          <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
