import { SecureVideoPlayer } from '../../components/player/SecureVideoPlayer';

const previewManifest = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export default function PlayerPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Lesson preview</p>
        <h1 className="mt-2 text-3xl font-semibold">Business English · Introductions</h1>
      </div>
      <SecureVideoPlayer
        manifestUrl={previewManifest}
        watermark={{
          email: 'alya@fluentis.test',
          userId: '11111111-1111-4111-8111-111111111111',
        }}
      />
      <p className="text-sm text-muted-foreground">
        Right-click and the save shortcut are disabled while this player is focused. The moving watermark shows the
        signed-in student.
      </p>
    </main>
  );
}
