import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  collectDefinition,
  collectReferences,
  collectRename,
  prepareRename,
} from '../src/server/navigation';

describe('definition / references / rename', () => {
  const src = `porogaramu_ntoya add(a, b) {
    tanga a + b
}
reka xyz = 1
tangaza_amakuru(xyz)
tangaza_amakuru(add(xyz, 2))
`;

  test('F12 on a variable goes to its reka', () => {
    const offset = src.lastIndexOf('xyz') + 1;
    const def = collectDefinition(src, offset);
    assert.ok(def);
    assert.equal(src.slice(def!.start, def!.end), 'xyz');
    assert.equal(def!.line, 3);
  });

  test('F12 on a call goes to the function', () => {
    const offset = src.lastIndexOf('add') + 1;
    const def = collectDefinition(src, offset);
    assert.ok(def);
    assert.equal(src.slice(def!.start, def!.end), 'add');
    assert.equal(def!.line, 0);
  });

  test('F12 on a parameter use goes to the parameter', () => {
    const bodyA = src.indexOf('tanga a') + 'tanga '.length;
    const def = collectDefinition(src, bodyA);
    assert.ok(def);
    assert.equal(src.slice(def!.start, def!.end), 'a');
    assert.ok(def!.start < src.indexOf('tanga'));
  });

  test('finds every reference to xyz including the declaration', () => {
    const offset = src.indexOf('xyz') + 1;
    const refs = collectReferences(src, offset, true);
    assert.equal(refs.length, 3);
    for (const r of refs) {
      assert.equal(src.slice(r.start, r.end), 'xyz');
    }
  });

  test('rename rewrites every reference', () => {
    const offset = src.indexOf('xyz') + 1;
    const edits = collectRename(src, offset, 'umubare');
    assert.ok(edits);
    assert.equal(edits!.length, 3);
    assert.ok(edits!.every((e) => e.newText === 'umubare'));
  });

  test('prepareRename rejects builtins', () => {
    const t = 'tangaza_amakuru(1)';
    assert.equal(prepareRename(t, 3), null);
  });

  test('rename rejects keywords as the new name', () => {
    const offset = src.indexOf('xyz') + 1;
    assert.equal(collectRename(src, offset, 'reka'), null);
  });
});
