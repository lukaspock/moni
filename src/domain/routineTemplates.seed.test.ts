// @ts-nocheck -- uses Node fs/path; the repo has no @types/node

import { readFileSync } from 'fs';
import { join } from 'path';

import { allTemplatePlans } from './routineTemplates';

// Every template exercise must exist in the global catalog (supabase/seed.sql),
// otherwise it would silently disappear from the proposal at runtime.
describe('routine templates vs. seed catalog', () => {
  const seed = readFileSync(
    join(__dirname, '..', '..', 'supabase', 'seed.sql'),
    'utf8',
  );
  const seedKeys = new Set(
    Array.from(seed.matchAll(/'exercise\.([a-z0-9_]+)'/g), (m) => m[1]),
  );

  it('reads the seed catalog', () => {
    expect(seedKeys.size).toBeGreaterThan(100);
  });

  it('only uses exercise keys that exist in supabase/seed.sql', () => {
    const missing = allTemplatePlans()
      .flatMap((p) => p.routines)
      .flatMap((r) => r.exercises)
      .map((e) => e.nameKey)
      .filter((key) => !seedKeys.has(key));
    expect(missing).toEqual([]);
  });
});
