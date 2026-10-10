// @ts-nocheck -- uses Node fs/path; the repo has no @types/node

/**
 * The Live Activity layout is stringified (expo-widgets `'widget'` directive)
 * and can't import theme.config.js, so its colors are inlined. This test
 * fails when they drift from `theme.config.js` `fixed`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS theme file
const theme = require('../../../theme.config.js') as {
  fixed: Record<string, string>;
};

const source = readFileSync(join(__dirname, 'WorkoutActivity.tsx'), 'utf8');

function inlined(name: string): string | undefined {
  return source.match(new RegExp(`const ${name} = '(#[0-9A-Fa-f]{6})'`))?.[1];
}

describe('WorkoutActivity layout colors', () => {
  it.each([
    ['EMBER', 'ember'],
    ['FOREST', 'forestBot'],
    ['LABEL', 'heroLabel'],
    ['LABEL2', 'heroLabel2'],
  ])('%s matches theme.config fixed.%s', (constName, token) => {
    expect(inlined(constName)?.toUpperCase()).toBe(
      theme.fixed[token].toUpperCase(),
    );
  });
});
