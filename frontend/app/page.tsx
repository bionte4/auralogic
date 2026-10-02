import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FEATURES = [
  {
    title: 'Sequential mastery',
    body: 'Each level stays locked until every lesson in the previous level is complete. The server enforces the order.',
  },
  {
    title: 'Bank-grade video security',
    body: 'Lessons stream as encrypted HLS. The player blocks downloads and keeps a live watermark of the student email and ID.',
  },
  {
    title: 'Verified digital certification',
    body: 'A certificate is issued when the course is complete. Anyone can confirm it with the QR code, without seeing the student email.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Fluentis</p>
            <h1 className="mt-4 text-[clamp(2.25rem,6vw,4.25rem)] font-semibold leading-[1.05] tracking-tight">
              Master professional English with enterprise-grade security
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Learn in sequence, then stream each lesson as encrypted video that stays tied to the signed-in student.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button className="min-h-11 px-6" asChild>
                <Link href="/learn">Explore courses</Link>
              </Button>
              <Button variant="outline" className="min-h-11 px-6" asChild>
                <Link href="/student/login">Student login</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle className="tracking-tight">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
