'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest } from '@/lib/api';
import {
  TRACK_ICON_OPTIONS,
  listAdminTracks,
  trackIcon,
  type LearningTrackRecord,
} from '@/lib/learning-tracks';

interface TrackDraft {
  slug: string;
  nameId: string;
  nameEn: string;
  blurbId: string;
  blurbEn: string;
  iconKey: string;
  sortOrder: string;
  active: boolean;
}

const emptyDraft = (): TrackDraft => ({
  slug: '',
  nameId: '',
  nameEn: '',
  blurbId: '',
  blurbEn: '',
  iconKey: 'waypoints',
  sortOrder: '100',
  active: true,
});

export function TracksAdmin() {
  const [rows, setRows] = useState<LearningTrackRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TrackDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<TrackDraft>(emptyDraft);

  async function reload(): Promise<void> {
    const next = await listAdminTracks();
    setRows(next);
    setError(null);
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'Could not load tracks.');
    });
  }, []);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/admin/tracks', {
        method: 'POST',
        body: JSON.stringify({
          slug: draft.slug.trim().toUpperCase(),
          nameId: draft.nameId.trim(),
          nameEn: draft.nameEn.trim(),
          blurbId: draft.blurbId.trim(),
          blurbEn: draft.blurbEn.trim(),
          iconKey: draft.iconKey,
          sortOrder: Number(draft.sortOrder) || 100,
          active: draft.active,
        }),
      });
      setCreating(false);
      setDraft(emptyDraft());
      await reload();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the track.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/admin/tracks/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameId: edit.nameId.trim(),
          nameEn: edit.nameEn.trim(),
          blurbId: edit.blurbId.trim(),
          blurbEn: edit.blurbEn.trim(),
          iconKey: edit.iconKey,
          sortOrder: Number(edit.sortOrder) || 0,
          active: edit.active,
        }),
      });
      setEditingId(null);
      await reload();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update the track.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this track? Only works when no courses use its slug.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/admin/tracks/${id}`, { method: 'DELETE' });
      await reload();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete the track.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: LearningTrackRecord): void {
    setEditingId(row.id);
    setEdit({
      slug: row.slug,
      nameId: row.nameId,
      nameEn: row.nameEn,
      blurbId: row.blurbId,
      blurbEn: row.blurbEn,
      iconKey: row.iconKey,
      sortOrder: String(row.sortOrder),
      active: row.active,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning tracks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cards on the home page and course filters come from this list.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => {
            setCreating((open) => !open);
            setDraft(emptyDraft());
          }}
        >
          {creating ? 'Cancel' : 'Add track'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {creating ? (
        <form onSubmit={onCreate} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          <Field label="Slug (UPPER_SNAKE)">
            <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} required />
          </Field>
          <Field label="Icon">
            <IconSelect value={draft.iconKey} onChange={(iconKey) => setDraft({ ...draft, iconKey })} />
          </Field>
          <Field label="Name (ID)">
            <Input value={draft.nameId} onChange={(e) => setDraft({ ...draft, nameId: e.target.value })} required />
          </Field>
          <Field label="Name (EN)">
            <Input value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} required />
          </Field>
          <Field label="Blurb (ID)">
            <Input value={draft.blurbId} onChange={(e) => setDraft({ ...draft, blurbId: e.target.value })} required />
          </Field>
          <Field label="Blurb (EN)">
            <Input value={draft.blurbEn} onChange={(e) => setDraft({ ...draft, blurbEn: e.target.value })} required />
          </Field>
          <Field label="Sort order">
            <Input value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Active on home page
          </label>
          <div className="md:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>
              Create track
            </Button>
          </div>
        </form>
      ) : null}

      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading tracks…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const Icon = trackIcon(row.iconKey);
            if (editingId === row.id) {
              return (
                <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                  <form onSubmit={onSaveEdit} className="grid gap-3 md:grid-cols-2">
                    <p className="md:col-span-2 text-xs uppercase tracking-wide text-muted-foreground">Slug {row.slug}</p>
                    <Field label="Icon">
                      <IconSelect value={edit.iconKey} onChange={(iconKey) => setEdit({ ...edit, iconKey })} />
                    </Field>
                    <Field label="Sort order">
                      <Input value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })} />
                    </Field>
                    <Field label="Name (ID)">
                      <Input value={edit.nameId} onChange={(e) => setEdit({ ...edit, nameId: e.target.value })} required />
                    </Field>
                    <Field label="Name (EN)">
                      <Input value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} required />
                    </Field>
                    <Field label="Blurb (ID)">
                      <Input value={edit.blurbId} onChange={(e) => setEdit({ ...edit, blurbId: e.target.value })} required />
                    </Field>
                    <Field label="Blurb (EN)">
                      <Input value={edit.blurbEn} onChange={(e) => setEdit({ ...edit, blurbEn: e.target.value })} required />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                      Active
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                      <Button type="submit" size="sm" disabled={busy}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </li>
              );
            }
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {row.nameId} <span className="font-normal text-muted-foreground">/ {row.nameEn}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.blurbId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.slug} · order {row.sortOrder} · {row.active ? 'active' : 'inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startEdit(row)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void onDelete(row.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {TRACK_ICON_OPTIONS.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}
