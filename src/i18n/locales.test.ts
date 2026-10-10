import { deTranslation, resources } from './index';

type Tree = { [key: string]: Tree | string };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const placeholders = (text: string) =>
  (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(',');

// Same range as the emoji audit in docs/identity/01-brand-strategy.md §5.
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

const de = flatten(deTranslation as unknown as Tree);
const en = flatten(resources.en.translation as unknown as Tree);

describe('locales', () => {
  it('de and en have identical keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });

  it('de and en use the same interpolation placeholders', () => {
    const mismatches = Object.keys(de).filter(
      (key) => placeholders(de[key]!) !== placeholders(en[key] ?? ''),
    );
    expect(mismatches).toEqual([]);
  });

  it('contains no emojis in UI strings', () => {
    const offenders = [...Object.entries(de), ...Object.entries(en)]
      .filter(([, value]) => EMOJI.test(value))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('writes the brand name in lower case', () => {
    const offenders = [...Object.entries(de), ...Object.entries(en)]
      .filter(([, value]) => /Møni|MØNI|\bMoni\b/.test(value))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});
