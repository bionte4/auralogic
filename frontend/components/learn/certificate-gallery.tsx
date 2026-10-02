'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_URL, ApiError, apiRequest, readErrorMessage } from '@/lib/api';

interface CertificateSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
}

export function CertificateGallery() {
  const [certificates, setCertificates] = useState<CertificateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<CertificateSummary[]>('/me/certificates')
      .then(setCertificates)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load certificates.');
      });
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Certificates</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!certificates ? <p className="text-sm text-muted-foreground">Loading certificates…</p> : null}
      {certificates && certificates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Certificates appear here after you finish every module in a course.</p>
      ) : null}
      {certificates && certificates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardHeader>
                <CardTitle>{certificate.courseTitle}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Issued {formatIssued(certificate.issuedAt)}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{certificate.id}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === certificate.id}
                    onClick={() => {
                      const popup = window.open('', '_blank');
                      setBusyId(certificate.id);
                      void fetchCertificate(certificate.id, 'inline')
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          if (popup) {
                            popup.location.href = url;
                          }
                        })
                        .catch((caught: unknown) => {
                          popup?.close();
                          setError(caught instanceof ApiError ? caught.message : 'Could not open the certificate.');
                        })
                        .finally(() => setBusyId(null));
                    }}
                  >
                    View PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === certificate.id}
                    onClick={() => {
                      setBusyId(certificate.id);
                      void fetchCertificate(certificate.id, 'attachment')
                        .then((blob) => saveCertificate(certificate.id, blob))
                        .catch((caught: unknown) => {
                          setError(caught instanceof ApiError ? caught.message : 'Could not download the certificate.');
                        })
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Download PDF
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={`/verify/${certificate.id}`}>Verify</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
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

async function fetchCertificate(id: string, disposition: 'inline' | 'attachment'): Promise<Blob> {
  const response = await fetch(`${API_URL}/certificates/${id}/file?disposition=${disposition}`, { credentials: 'include' });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(readErrorMessage(body) ?? `Certificate request failed (${response.status}).`, response.status);
  }
  return response.blob();
}

function saveCertificate(id: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fluentis-${id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
