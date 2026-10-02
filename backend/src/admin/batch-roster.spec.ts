import { parseBatchRoster, temporaryPassword } from './batch-roster';

describe('batch roster', () => {
  it('reads a CSV header and a pasted email list', () => {
    const parsed = parseBatchRoster(['alya@corp.test, budi@corp.test'], 'email,name\nCitra@corp.test,Citra\nbudi@corp.test,Budi');

    expect(parsed.students.map((student) => student.email)).toEqual([
      'alya@corp.test',
      'budi@corp.test',
      'citra@corp.test',
    ]);
    expect(parsed.students[2]?.name).toBe('Citra');
    expect(parsed.skipped).toEqual([{ email: 'budi@corp.test', reason: 'Duplicate email in this batch.' }]);
  });

  it('skips an invalid email and builds a usable temporary password', () => {
    const parsed = parseBatchRoster(['not-an-email'], undefined);
    expect(parsed.students).toEqual([]);
    expect(parsed.skipped[0]?.reason).toBe('Email is not valid.');
    expect(temporaryPassword()).toMatch(/[A-Za-z]/);
    expect(temporaryPassword()).toMatch(/\d/);
  });
});
