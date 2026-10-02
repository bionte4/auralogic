import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutReturnPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fluentis</p>
      <h1 className="text-3xl font-semibold tracking-tight">Payment received by the bank page</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Course access opens after the payment provider notifies Fluentis. Returning here does not unlock the lessons by itself.
        Refresh My courses in a moment.
      </p>
      <Button asChild className="min-h-11 w-fit">
        <Link href="/learn">Back to my courses</Link>
      </Button>
    </main>
  );
}
