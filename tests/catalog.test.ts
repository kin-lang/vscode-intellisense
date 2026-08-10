import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CONSTANTS,
  FUNCTIONS,
  KEYWORDS,
  NAMESPACES,
  formatMarkdown,
  formatSignature,
  lookupMember,
  lookupSymbol,
} from '../src/server/catalog';

describe('Kin language catalog', () => {
  test('includes every keyword the lexer recognizes', () => {
    const names = KEYWORDS.map((k) => k.name).sort();
    assert.deepEqual(
      names,
      [
        'gereranya',
        'hagarara',
        'ibindi',
        'nanone_niba',
        'niba',
        'niba_byanze',
        'ntahinduka',
        'porogaramu_ntoya',
        'reka',
        'subiramo_niba',
        'tanga',
        'usanze',
      ].sort(),
    );
  });

  test('includes every top-level built-in from globals.ts', () => {
    assert.deepEqual(
      FUNCTIONS.map((f) => f.name).sort(),
      ['injiza_amakuru', 'sisitemu', 'tangaza_amakuru', 'ubwoko'].sort(),
    );
    assert.deepEqual(
      CONSTANTS.map((c) => c.name).sort(),
      ['filename', 'ikosa', 'nibyo', 'sibyo', 'ubusa'].sort(),
    );
    assert.deepEqual(
      NAMESPACES.map((n) => n.name).sort(),
      [
        'KIN_AMAGAMBO',
        'KIN_IGIHE',
        'KIN_IMIBARE',
        'KIN_INYANDIKO',
        'KIN_URUTONDE',
      ].sort(),
    );
  });

  test('documents every member of each KIN_* namespace', () => {
    assert.deepEqual(
      Object.keys(lookupSymbol('KIN_IMIBARE')!.members!).sort(),
      ['cos', 'kuraho_ibice', 'pi', 'sin', 'tan', 'umubare_utazwi', 'umuzikare'].sort(),
    );
    assert.deepEqual(
      Object.keys(lookupSymbol('KIN_AMAGAMBO')!.members!).sort(),
      [
        'huza',
        'ingano',
        'inyuguti',
        'inyuguti_nkuru',
        'inyuguti_ntoya',
        'tandukanya',
      ].sort(),
    );
    assert.deepEqual(
      Object.keys(lookupSymbol('KIN_URUTONDE')!.members!).sort(),
      [
        'ifite',
        'ifite_ikirango',
        'ingano',
        'injiza_ahabanza',
        'kora_ijambo',
        'ongera_kumusozo',
        'siba_ahabanza',
        'siba_kumusozo',
      ].sort(),
    );
    assert.deepEqual(Object.keys(lookupSymbol('KIN_IGIHE')!.members!).sort(), [
      'isaha',
      'itariki',
      'umunsi',
    ]);
    assert.deepEqual(Object.keys(lookupSymbol('KIN_INYANDIKO')!.members!).sort(), [
      'andika',
      'siba',
      'soma',
      'vugurura',
    ]);
  });

  test('every function and method documents each argument', () => {
    const withArgs = [
      ...FUNCTIONS,
      ...NAMESPACES.flatMap((ns) => Object.values(ns.members ?? {})),
    ].filter((s) => s.kind === 'function' || s.kind === 'method');

    assert.ok(withArgs.length > 10);
    for (const sym of withArgs) {
      assert.ok(sym.args, `${sym.name} missing args array`);
      assert.ok(sym.documentation.length > 20, `${sym.name} docs too short`);
      for (const arg of sym.args ?? []) {
        assert.ok(arg.name.length > 0);
        assert.ok(arg.documentation.length > 5, `${sym.name}.${arg.name}`);
      }
    }
  });

  test('markdown docs include argument headings for functions', () => {
    const md = formatMarkdown(lookupSymbol('injiza_amakuru')!);
    assert.match(md, /\*\*Arguments\*\*/);
    assert.match(md, /\.\.\.prompt/);
    assert.match(md, /\*\*Returns:\*\*/);
  });

  test('signature labels list required and optional args', () => {
    assert.equal(formatSignature(lookupSymbol('sisitemu')!), 'sisitemu(command)');
    assert.equal(
      formatSignature(
        lookupMember('KIN_IMIBARE', 'umubare_utazwi')!,
        'KIN_IMIBARE.umubare_utazwi',
      ),
      'KIN_IMIBARE.umubare_utazwi(min, max)',
    );
    assert.equal(
      formatSignature(lookupMember('KIN_IMIBARE', 'pi')!, 'KIN_IMIBARE.pi'),
      'KIN_IMIBARE.pi',
    );
  });
});
