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
});
