import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { collectCompletions, memberNames } from '../src/server/completions';
import { collectHover } from '../src/server/hover';
import { collectSignatureHelp } from '../src/server/signatureHelp';
import { callContextAt, offsetAt, symbolAt } from '../src/server/text';

const labels = (text: string, offset: number) =>
  collectCompletions(text, offset).map((c) => c.label);

describe('completions', () => {
  test('offers keywords and built-ins at the start of a file', () => {
    const items = labels('', 0);
    for (const name of [
      'reka',
      'hagarara',
      'gereranya',
      'tangaza_amakuru',
      'KIN_IMIBARE',
      'nibyo',
    ]) {
      assert.ok(items.includes(name), `missing ${name}`);
    }
  });

  test('filters by the identifier prefix already typed', () => {
    const items = labels('re', 2);
    assert.ok(items.includes('reka'));
    assert.ok(!items.includes('niba'));
    assert.ok(!items.includes('tangaza_amakuru'));
  });

  test('after KIN_AMAGAMBO. only string members are offered', () => {
    const src = 'KIN_AMAGAMBO.';
    const items = labels(src, src.length).sort();
    assert.deepEqual(
      items,
      [
        'huza',
        'ingano',
        'inyuguti',
        'inyuguti_nkuru',
        'inyuguti_ntoya',
        'tandukanya',
      ].sort(),
    );
  });

  test('memberNames helper lists KIN_IMIBARE methods', () => {
    assert.ok(memberNames('KIN_IMIBARE').includes('umuzikare'));
    assert.ok(memberNames('KIN_IMIBARE').includes('pi'));
    assert.deepEqual(memberNames('unknown'), []);
  });

  test('includes user-declared names from the current file', () => {
    const src =
      'reka umurongo = 1\nporogaramu_ntoya ongeza(a, b) {\n\ttanga a\n}\n';
    const items = labels(src, src.length);
    for (const name of ['umurongo', 'ongeza', 'a', 'b']) {
      assert.ok(items.includes(name), `missing ${name}`);
    }
  });

  test('keyword snippets use snippet insert format', () => {
    const reka = collectCompletions('', 0).find((c) => c.label === 'reka');
    assert.ok(reka?.insertText?.includes('reka'));
    assert.equal(reka?.insertTextFormat, 2);
  });
});

describe('hover', () => {
  test('documents a keyword under the cursor', () => {
    const hover = collectHover('reka x = 1', 1);
    assert.ok(hover);
    const value = (hover.contents as { value: string }).value;
    assert.match(value, /reka/);
    assert.match(value, /variable|Declare/i);
  });

  test('documents a built-in function and its arguments', () => {
    const hover = collectHover('tangaza_amakuru("hi")', 3);
    const value = (hover!.contents as { value: string }).value;
    assert.match(value, /tangaza_amakuru/);
    assert.match(value, /\*\*Arguments\*\*/);
    assert.match(value, /\.\.\.values/);
  });

  test('documents a namespace member from object.member', () => {
    const src = 'KIN_IMIBARE.umuzikare(9)';
    const hover = collectHover(src, src.indexOf('umuzikare') + 2);
    const value = (hover!.contents as { value: string }).value;
    assert.match(value, /KIN_IMIBARE\.umuzikare/);
    assert.match(value, /square root/i);
  });

  test('returns null for unknown identifiers', () => {
    assert.equal(collectHover('reka xyz = 1', 6), null);
  });
});

describe('signature help', () => {
  test('describes tangaza_amakuru inside the call', () => {
    const src = 'tangaza_amakuru(';
    const help = collectSignatureHelp(src, src.length);
    assert.ok(help);
    assert.match(help.signatures[0].label, /tangaza_amakuru/);
    assert.equal(help.activeParameter, 0);
  });

  test('advances the active parameter after a comma', () => {
    const src = 'KIN_IMIBARE.umubare_utazwi(1, ';
    const help = collectSignatureHelp(src, src.length);
    assert.ok(help);
    assert.equal(help.signatures[0].label, 'KIN_IMIBARE.umubare_utazwi(min, max)');
    assert.equal(help.activeParameter, 1);
    const params = help.signatures[0].parameters ?? [];
    assert.equal(params.length, 2);
    assert.equal(params[0].label, 'min');
    assert.equal(params[1].label, 'max');
  });

  test('ignores nested commas inside a deeper call', () => {
    const src = 'KIN_AMAGAMBO.huza(KIN_AMAGAMBO.ingano("a,b"), ';
    const ctx = callContextAt(src, src.length);
    assert.equal(ctx?.callee, 'KIN_AMAGAMBO.huza');
    assert.equal(ctx?.argIndex, 1);
  });

  test('returns null outside a call', () => {
    assert.equal(collectSignatureHelp('reka x = 1', 8), null);
  });
});

describe('text helpers', () => {
  test('offsetAt / symbolAt agree on a member expression', () => {
    const src = 'reka x = KIN_IGIHE.isaha()';
    const offset = src.indexOf('isaha') + 1;
    assert.equal(offsetAt(src, { line: 0, character: offset }), offset);
    assert.deepEqual(symbolAt(src, offset), {
      object: 'KIN_IGIHE',
      name: 'isaha',
      start: src.indexOf('isaha'),
      end: src.indexOf('isaha') + 'isaha'.length,
    });
  });
});
