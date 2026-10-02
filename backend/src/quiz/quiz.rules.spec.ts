import { quizPassed, scoreAttempt, shuffle } from './quiz.rules';

describe('quiz rules', () => {
  it('scores only the server-side correct choices and treats 80 as the pass line', () => {
    const result = scoreAttempt(
      [
        { id: 'q1', correctChoiceId: 'c1', choiceIds: ['c1', 'c2'] },
        { id: 'q2', correctChoiceId: 'c4', choiceIds: ['c3', 'c4'] },
      ],
      [
        { questionId: 'q1', choiceId: 'c2' },
        { questionId: 'q2', choiceId: 'c4' },
      ],
    );

    expect(result).toEqual({ correct: 1, score: 50 });
    expect(quizPassed(result.score, 80)).toBe(false);
    expect(quizPassed(80, 80)).toBe(true);
  });

  it('rejects a choice that does not belong to the question', () => {
    expect(() =>
      scoreAttempt([{ id: 'q1', correctChoiceId: 'c1', choiceIds: ['c1', 'c2'] }], [{ questionId: 'q1', choiceId: 'other' }]),
    ).toThrow('Answer every question once.');
  });

  it('shuffles with the supplied random source', () => {
    const values = shuffle(['a', 'b', 'c'], () => 0);
    expect(values).toEqual(['b', 'c', 'a']);
  });
});