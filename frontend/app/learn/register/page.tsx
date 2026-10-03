'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n } from '@/components/locale-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import { courseReturnPath } from '@/lib/course-return';
import { fromUiLocale, toUiLocale, writeLocaleCookie } from '@/lib/locale';
import { saveSession, type AuthUser } from '@/lib/session';

interface RegisterResult {
  user: AuthUser;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-muted-foreground">Loading registration…</p>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { locale } = useI18n();
  const nextPath = courseReturnPath(useSearchParams().get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await apiRequest<RegisterResult>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, locale: toUiLocale(locale) }),
      });
      saveSession(result.user);
      if (result.user.locale) {
        writeLocaleCookie(fromUiLocale(result.user.locale));
      }
      router.replace(nextPath ?? '/learn');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Auralogic</p>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create a student account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters, with a letter and a number.</p>
      <form className="mt-8 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
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
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? 'Creating account…' : 'Register'}
        </Button>
      </form>
      <Link href="/student/login" className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">
        Already have an account? Sign in
      </Link>
    </main>
  );
}
