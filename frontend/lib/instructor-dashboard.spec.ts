import { validateCourseDraft, validateLessonDraft, formatIdr } from './course-draft';
import { isStaffRole, parseProfile } from './session';
import { clampDurationSeconds, deliverLessonFile, isLocalMockUpload } from './upload-plan';

describe('instructor dashboard helpers', () => {
  it('reads a stored instructor profile and rejects an unknown role', () => {
    const session = parseProfile(
      JSON.stringify({ userId: 'instructor-1', email: 'bima@fluentis.test', name: 'Bima', role: 'INSTRUCTOR' }),
    );
    expect(session?.role).toBe('INSTRUCTOR');
    expect(session ? isStaffRole(session.role) : false).toBe(true);
    expect(parseProfile(JSON.stringify({ userId: 'x', email: 'a@b.c', name: 'A', role: 'ADMIN' }))).toBeNull();
  });

  it('rejects an incomplete course draft and accepts a priced technical course', () => {
    expect(validateCourseDraft({ title: 'Hi', description: 'Subnetting', level: 'FOUNDATION', track: 'NETWORK', contentLocale: 'ID', price: '250000' })).toBe(
      'title',
    );
    expect(
      validateCourseDraft({
        title: 'Network Fondasi',
        description: 'Subnetting',
        level: 'FOUNDATION',
        track: 'NETWORK',
        contentLocale: 'ID',
        price: '250000',
      }),
    ).toBeNull();
    expect(validateLessonDraft({ title: 'Quiz 1', type: 'QUIZ', passingScore: '' })).toMatch(/passing score/);
  });

  it('formats IDR without cents', () => {
    expect(formatIdr('250000.00')).toContain('250');
  });

  it('keeps mock uploads on the local target and posts real files only to https', async () => {
    expect(isLocalMockUpload('https://mock.local.fluentis/direct/abc')).toBe(true);
    const fetchImpl = jest.fn(async () => ({ ok: true }) as Response);
    await expect(deliverLessonFile('https://mock.local.fluentis/direct/abc', new Blob(['x']), fetchImpl)).resolves.toBe(
      'mock',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(deliverLessonFile('https://upload.cloudflarestream.com/direct/uid', new Blob(['x']), fetchImpl)).resolves.toBe(
      'uploaded',
    );
    expect(clampDurationSeconds(10.2)).toBe(11);
    expect(() => clampDurationSeconds(0)).toThrow(/at least 1 second/);
  });
});
