import assert from 'node:assert/strict';
import { Lexer } from '@kin-lang/kin';
import { describe, test } from 'node:test';
import { collectCompletions } from '../src/server/completions';
import {
  HAGARARA_IS_KEYWORD,
  hagararaIsKeyword,
  identifierTokenType,
} from '../src/server/parserCompat';

describe('parserCompat', () => {
  test('agrees with the Lexer the LSP actually loads', () => {
    const tok = new Lexer('hagarara')
      .tokenize()
      .find((t) => t.lexeme === 'hagarara');
    assert.ok(tok);
    assert.equal(hagararaIsKeyword(), tok!.type !== identifierTokenType());
    assert.equal(HAGARARA_IS_KEYWORD, hagararaIsKeyword());
  });

  test('completions still offer hagarara even when it is not a keyword', () => {
    const items = collectCompletions('', 0).map((c) => c.label);
    assert.ok(items.includes('hagarara'));
  });
});
