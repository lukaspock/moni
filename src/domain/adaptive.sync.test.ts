// @ts-nocheck -- uses Node fs/path; the repo has no @types/node

import { readFileSync } from 'fs';
import { join } from 'path';

// supabase/functions/_shared/adaptive.ts must be a verbatim copy of src/domain/adaptive.ts
// (except for the KCAL_PER_KG import line), because Deno can't import from src/.
describe('adaptive.ts Deno copy', () => {
  it('stays in sync with src/domain/adaptive.ts', () => {
    const root = join(__dirname, '..', '..');
    const domain = readFileSync(join(root, 'src/domain/adaptive.ts'), 'utf8');
    const shared = readFileSync(
      join(root, 'supabase/functions/_shared/adaptive.ts'),
      'utf8',
    );
    const strip = (s: string) =>
      s
        .split('\n')
        .filter(
          (l) =>
            !l.includes('KCAL_PER_KG = 7700') &&
            !l.includes('import { KCAL_PER_KG }') &&
            !l.includes('(Deno copy)'),
        )
        .join('\n');
    expect(strip(shared)).toBe(strip(domain));
  });
});
