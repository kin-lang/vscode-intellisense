import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { collectDocumentSymbols } from '../src/server/symbols';

describe('document symbols', () => {
  test('outlines functions, variables, params, and object keys', () => {
    const src = `porogaramu_ntoya add(a, b) {
    tanga a + b
}
reka xyz = 1
ntahinduka obj = { addNumbers: add, nested: { x: 1 } }
`;
    const symbols = collectDocumentSymbols(src);
    const names = symbols.map((s) => s.name);
    assert.ok(names.includes('add'), `got ${names.join(',')}`);
    assert.ok(names.includes('xyz'));
    assert.ok(names.includes('obj'));

    const add = symbols.find((s) => s.name === 'add')!;
    const addChildren = (add.children ?? []).map((c) => c.name);
    assert.ok(addChildren.includes('a'));
    assert.ok(addChildren.includes('b'));

    const obj = symbols.find((s) => s.name === 'obj')!;
    const keys = (obj.children ?? []).map((c) => c.name);
    assert.ok(keys.includes('addNumbers'));
    assert.ok(keys.includes('nested'));
  });
});
