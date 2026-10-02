'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';

interface CertificateVerification {
  valid: true;
  certificateId: string;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
}

export function CertificateVerify({ certificateId }: { certificateId: string }) {
  const [result, setResult] = useState<CertificateVerification | 'missing' | 'error' | null>(null);

  useEffect(() => {
    void apiRequest<CertificateVerification>(`/certificates/${certificateId}/verify`)
      .then(setResult)
      .catch((caught: unknown) => {
        setResult(caught instanceof ApiError && caught.status === 404 ? 'missing' : 'error');
      });
  }, [certificateId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Fluentis</p>
      {result === null ? <p className="text-sm text-muted-foreground">Checking this certificate…</p> : null}
      {result === 'missing' ? (
        <h1 className="text-3xl font-semibold">This certificate was not found.</h1>
      ) : null}
      {result === 'error' ? <h1 className="text-3xl font-semibold">Verification is unavailable right now.</h1> : null}
      {result && result !== 'missing' && result !== 'error' ? (
        <>
          <h1 className="text-3xl font-semibold">Certificate verified</h1>
          <p className="text-foreground">
            {result.studentName} completed {result.courseTitle}.
          </p>
          <p className="text-sm text-muted-foreground">Issued {formatIssued(result.issuedAt)}</p>
          <p className="break-all font-mono text-xs text-muted-foreground">{result.certificateId}</p>
        </>
      ) : null}
      <Link href="/" className="w-fit text-sm text-foreground underline">
        Back to Fluentis
      </Link>
    </main>
  );
}

function formatIssued(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
