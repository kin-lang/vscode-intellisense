import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { locateAndClassify } from '../src/server/semanticTokens';

const grammar = JSON.parse(
  readFileSync(
    path.join(__dirname, '../../syntaxes/kinlang.tmLanguage.json'),
    'utf-8',
  ),
) as {
  patterns: Array<{
    match?: string;
    begin?: string;
    name?: string;
    captures?: Record<string, { name: string }>;
  }>;
};

const languageConfig = JSON.parse(
  readFileSync(
    path.join(__dirname, '../../language-configuration.json'),
    'utf-8',
  ),
) as {
  wordPattern?: string;
  folding?: { markers?: { start?: string; end?: string } };
  indentationRules?: { increaseIndentPattern?: string; decreaseIndentPattern?: string };
  autoClosingPairs?: Array<[string, string]>;
};

describe('TextMate grammar', () => {
  test('highlights hagarara as a keyword (was missing)', () => {
    const keywords = grammar.patterns.find((p) => p.match?.includes('hagarara'));
    assert.ok(keywords?.name?.includes('keyword'));
    assert.ok(keywords?.match?.includes('gereranya'));
    assert.ok(keywords?.match?.includes('usanze'));
    assert.ok(keywords?.match?.includes('ibindi'));
  });

  test('does not treat single quotes as strings (Kin has no such literal)', () => {
    assert.equal(
      grammar.patterns.find((p) => p.begin === "'"),
      undefined,
    );
    assert.ok(grammar.patterns.some((p) => p.begin === '"'));
  });

  test('does not highlight niba( as a function name', () => {
    const brokenFn = grammar.patterns.find(
      (p) => p.match?.includes('\\(') && p.match?.includes('[a-zA-Z0-9_]+'),
    );
    assert.equal(brokenFn, undefined);
  });

  test('function definitions highlight the name after porogaramu_ntoya', () => {
    const fnDef = grammar.patterns.find((p) =>
      p.match?.includes('porogaramu_ntoya)\\s+'),
    );
    assert.ok(fnDef);
    assert.match(fnDef!.captures?.['2']?.name ?? '', /entity.name.function/);
    const idxFn = grammar.patterns.indexOf(fnDef!);
    const idxKw = grammar.patterns.findIndex((p) =>
      p.match?.includes('niba|nanone_niba'),
    );
    assert.ok(idxFn < idxKw);
  });

  test('separates keywords, namespaces, and built-in functions', () => {
    const ns = grammar.patterns.find((p) => p.match?.includes('KIN_IMIBARE'));
    const fn = grammar.patterns.find((p) => p.match?.includes('tangaza_amakuru'));
    assert.match(ns?.name ?? '', /support.class/);
    assert.match(fn?.name ?? '', /support.function/);
  });

  test('comments win over the rest of a line', () => {
    assert.equal(grammar.patterns[0].match, '#.*$');
    assert.match(grammar.patterns[0].name ?? '', /comment/);
  });

  test('member names highlight only after a dot', () => {
    const member = grammar.patterns.find((p) =>
      p.match?.includes('umuzikare') && (p.name?.includes('member') ?? false),
    );
    assert.ok(member, 'missing member pattern');
    assert.match(member!.match ?? '', /\\\./);
    assert.ok(
      !/^(?:\(\?<!\\\.\)\\b)?\(pi\|/.test(member!.match ?? ''),
      'member names must not match as bare words',
    );
  });

  test('filename is a constant, not a built-in function', () => {
    const fn = grammar.patterns.find(
      (p) => p.name === 'support.function.kin' && p.match?.includes('tangaza_amakuru'),
    );
    assert.ok(fn);
    assert.ok(!fn!.match?.includes('filename'), 'filename must not be a support.function');
    const filename = grammar.patterns.find((p) => p.match?.includes('filename'));
    assert.match(filename?.name ?? '', /constant/);
  });
});

describe('language-configuration', () => {
  test('wordPattern matches Kin identifiers only', () => {
    assert.equal(languageConfig.wordPattern, '[A-Za-z_][A-Za-z0-9_]*');
  });

  test('folds braces via editor brackets and # region markers', () => {
    assert.match(languageConfig.folding?.markers?.start ?? '', /#\\s\*region/);
    assert.match(languageConfig.folding?.markers?.end ?? '', /#\\s\*endregion/);
  });

  test('indents on {, gereranya, and usanze', () => {
    const inc = languageConfig.indentationRules?.increaseIndentPattern ?? '';
    assert.match(inc, /gereranya/);
    assert.match(inc, /usanze/);
    assert.match(inc, /\\\{/);
  });

  test('does not auto-close single quotes', () => {
    const opens = (languageConfig.autoClosingPairs ?? []).map((p) => p[0]);
    assert.ok(!opens.includes("'"));
    assert.ok(opens.includes('"'));
  });
});

describe('semantic tokens from the Kin lexer', () => {
  test('classifies keywords, built-ins, numbers, and comments', () => {
    const src = 'reka n = 2 # igiteranyo\ntangaza_amakuru(n)\nKIN_IMIBARE.pi';
    const tokens = locateAndClassify(src);
    const types = new Map(
      tokens.map((t) => [
        src.split('\n')[t.line].slice(t.startChar, t.startChar + t.length),
        t.type,
      ]),
    );

    assert.equal(types.get('reka'), 'keyword');
    assert.equal(types.get('2'), 'number');
    assert.equal(types.get('# igiteranyo'), 'comment');
    assert.equal(types.get('tangaza_amakuru'), 'function');
    assert.equal(types.get('KIN_IMIBARE'), 'namespace');
  });

  test('does not paint # inside a string as a comment', () => {
    const tokens = locateAndClassify('reka s = "a # b"');
    assert.equal(
      tokens.some((t) => t.type === 'comment'),
      false,
    );
  });

  test('"Hello" is a string token (including quotes), not a variable', () => {
    const src = 'reka s = "Hello"';
    const tokens = locateAndClassify(src);
    const slice = (t: (typeof tokens)[number]) =>
      src.split('\n')[t.line].slice(t.startChar, t.startChar + t.length);

    const str = tokens.find((t) => t.type === 'string');
    assert.ok(str, `no string token in ${tokens.map((t) => `${slice(t)}:${t.type}`).join(', ')}`);
    assert.equal(slice(str!), '"Hello"');
    assert.equal(
      tokens.some((t) => t.type === 'variable' && slice(t) === 'Hello'),
      false,
    );
  });

  test('identifier-shaped strings stay strings', () => {
    const src = 'reka s = "Kin"';
    const tokens = locateAndClassify(src);
    const slice = (t: (typeof tokens)[number]) =>
      src.split('\n')[t.line].slice(t.startChar, t.startChar + t.length);
    const str = tokens.find((t) => t.type === 'string');
    assert.equal(slice(str!), '"Kin"');
  });

  test('members after a dot are properties', () => {
    const src = 'KIN_IMIBARE.pi\nobj.ingano';
    const tokens = locateAndClassify(src);
    const slice = (t: (typeof tokens)[number]) =>
      src.split('\n')[t.line].slice(t.startChar, t.startChar + t.length);
    const byLex = new Map(tokens.map((t) => [slice(t), t.type]));
    assert.equal(byLex.get('KIN_IMIBARE'), 'namespace');
    assert.equal(byLex.get('pi'), 'property');
    assert.equal(byLex.get('ingano'), 'property');
    assert.equal(byLex.get('obj'), 'variable');
  });
});
