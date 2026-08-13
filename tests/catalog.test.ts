import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CONSTANTS,
  FUNCTIONS,
  KEYWORDS,
  NAMESPACES,
  allCatalogSymbols,
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
        'komeza',
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
      ['injiza', 'injiza_amakuru', 'sisitemu', 'tangaza_amakuru', 'ubwoko'].sort(),
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

  test('every symbol has a full Kinyarwanda teaching paragraph', () => {
    const symbols = allCatalogSymbols();
    assert.ok(symbols.length >= 40, `expected many symbols, got ${symbols.length}`);
    for (const sym of symbols) {
      assert.ok(
        typeof sym.documentation_rw === 'string' && sym.documentation_rw.length > 40,
        `${sym.name} missing documentation_rw paragraph (len=${sym.documentation_rw?.length ?? 0})`,
      );
      assert.doesNotMatch(
        sym.documentation_rw,
        /^Kinyarwanda:\s*\*/,
        `${sym.name} documentation_rw is a gloss line`,
      );
      assert.doesNotMatch(
        sym.documentation,
        /Kinyarwanda:\s*\*/,
        `${sym.name} English docs still end with a gloss`,
      );
    }
  });

  test('formatMarkdown puts Kinyarwanda before English', () => {
    const md = formatMarkdown(lookupSymbol('reka')!);
    const rwHead = md.indexOf('**Kinyarwanda**');
    const enHead = md.indexOf('**English**');
    assert.ok(rwHead >= 0, 'missing Kinyarwanda heading');
    assert.ok(enHead > rwHead, 'English must follow Kinyarwanda');
    assert.match(md, /ihinduragaciro/);
    assert.match(md, /Creates a name/);
  });

  test('markdown docs include argument headings for functions', () => {
    const md = formatMarkdown(lookupSymbol('injiza_amakuru')!);
    assert.match(md, /\*\*Arguments\*\*/);
    assert.match(md, /\.\.\.prompt/);
    assert.match(md, /\*\*Returns:\*\*/);
    assert.ok(md.indexOf('**Kinyarwanda**') < md.indexOf('**English**'));
  });

  test('documents runtime facts students hit in the first hour', () => {
    const ubwoko = formatMarkdown(lookupSymbol('ubwoko')!);
    assert.match(ubwoko, /"number"/);
    assert.match(ubwoko, /not `umubare`|si `umubare`/);

    const ifite = formatMarkdown(lookupMember('KIN_URUTONDE', 'ifite')!);
    assert.match(ifite, /any element|icyo ari cyo cyose/i);

    const itariki = formatMarkdown(lookupMember('KIN_IGIHE', 'itariki')!);
    assert.match(itariki, /Do MMM YY/);
    assert.match(itariki, /not.*YYYY-MM-DD|si.*YYYY-MM-DD/i);

    const umunsi = formatMarkdown(lookupMember('KIN_IGIHE', 'umunsi')!);
    assert.match(umunsi, /Monday/);
    assert.match(umunsi, /Kuwa Mbere/);

    const andika = formatMarkdown(lookupMember('KIN_INYANDIKO', 'andika')!);
    assert.match(andika, /error message string/i);
    assert.match(andika, /sibyo/);

    const filename = formatMarkdown(lookupSymbol('filename')!);
    assert.match(filename, /KIN_INYANDIKO/);
    assert.match(filename, /ijambo/);

    const ikosa = formatMarkdown(lookupSymbol('ikosa')!);
    assert.match(ikosa, /ubusa/);

    const pi = formatMarkdown(lookupMember('KIN_IMIBARE', 'pi')!, 'KIN_IMIBARE.pi');
    assert.match(pi, /MK_NUMBER|Kin `number`|umubare wa Kin/);
    assert.match(pi, /KIN_IMIBARE\.pi \+ 1/);

    const sisitemu = formatMarkdown(lookupSymbol('sisitemu')!);
    assert.match(sisitemu, /Danger|Ingaruka/);
    assert.match(sisitemu, /echo muraho/);

    const inyuguti = formatMarkdown(lookupMember('KIN_AMAGAMBO', 'inyuguti')!);
    assert.match(inyuguti, /two/);
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
