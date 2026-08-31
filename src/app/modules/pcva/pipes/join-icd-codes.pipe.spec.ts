import { JoinIcdCodesPipe } from './join-icd-codes.pipe';

describe('JoinIcdCodesPipe', () => {
  it('create an instance', () => {
    const pipe = new JoinIcdCodesPipe();
    expect(pipe).toBeTruthy();
  });

  it('formats each code as "code-name" and joins with the given delimiter', () => {
    const pipe = new JoinIcdCodesPipe();
    const result = pipe.transform(
      [{ code: 'A00', name: 'Cholera' }, { code: 'B01', name: 'Varicella' }],
      ', '
    );
    expect(result).toBe('A00-Cholera, B01-Varicella');
  });

  it('returns an empty string for an empty array', () => {
    const pipe = new JoinIcdCodesPipe();
    expect(pipe.transform([], ', ')).toBe('');
  });

  it('passes through undefined for a null/undefined input rather than throwing', () => {
    const pipe = new JoinIcdCodesPipe();
    expect(pipe.transform(null as any, ', ')).toBeUndefined();
    expect(pipe.transform(undefined as any, ', ')).toBeUndefined();
  });
});
