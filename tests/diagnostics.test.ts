import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { collectDiagnostics, parseDiagnostic } from '../src/server/diagnostics';

const example = (name: string) =>
  readFileSync(path.join(__dirname, '../../tests/fixtures', name), 'utf-8');

describe('diagnostics', () => {
  test('accepts every example program', () => {
    const files = [
      'arrays.kin',
      'conditional-statement.kin',
      'functions.kin',
      'io.kin',
      'loops.kin',
      'objects.kin',
      'switch.kin',
    ];
    for (const file of files) {
      assert.deepEqual(collectDiagnostics(example(file)), [], file);
    }
  });

  test('reports an unexpected character from the lexer', () => {
    const diags = collectDiagnostics('reka x = ~');
    assert.equal(diags.length, 1);
    assert.match(diags[0].message, /Unexpected character '~'/);
    assert.equal(diags[0].range.start.line, 0);
    assert.equal(diags[0].source, 'kin');
  });

  test('reports an unterminated string on the correct line', () => {
    const src = 'reka a = 1\nreka b = "oops\n';
    const diags = collectDiagnostics(src);
    assert.equal(diags.length, 1);
    assert.match(diags[0].message, /Unterminated string/);
    assert.equal(diags[0].range.start.line, 1);
  });

  test('reports a parser error for a constant without a value', () => {
    const diags = collectDiagnostics('ntahinduka x;');
    assert.equal(diags.length, 1);
    assert.match(diags[0].message, /Constant/);
    assert.match(diags[0].message, /must be assigned/);
    assert.equal(diags[0].range.start.line, 0);
    assert.equal(diags[0].code, 'kin.const-needs-value');
  });

  test('places ntahinduka-without-value on the correct line', () => {
    const src = 'reka a = 1\nntahinduka x;\n';
    const diags = collectDiagnostics(src);
    const hit = diags.find((d) => d.code === 'kin.const-needs-value');
    assert.ok(hit);
    assert.equal(hit!.range.start.line, 1);
  });

  test('does not error on a trailing obj. while typing', () => {
    const src = 'reka obj = { a: 1 }\nobj.\n';
    const errors = collectDiagnostics(src).filter(
      (d) => d.severity === 1 /* Error */,
    );
    assert.deepEqual(errors, []);
  });

  test('reports redeclare, unresolved, assign-to-const, arity, and after-tanga', () => {
    const src = `reka x = 1
reka x = 2
ntahinduka c = 1
c = 3
y
porogaramu_ntoya add(a, b) {
    tanga a + b
    tangaza_amakuru(a)
}
add(1)
nibyo()
`;
    const diags = collectDiagnostics(src);
    const codes = diags.map((d) => d.code);
    assert.ok(codes.includes('kin.redeclare'), `codes ${codes.join(',')}`);
    assert.ok(codes.includes('kin.unresolved'));
    assert.ok(codes.includes('kin.assign-to-const'));
    assert.ok(codes.includes('kin.arity'));
    assert.ok(codes.includes('kin.not-callable'));
    assert.ok(codes.includes('kin.after-tanga'));
    assert.ok(diags.length >= 6);
  });

  test('reports injiza_amakuru arity from the catalog', () => {
    const diags = collectDiagnostics('injiza_amakuru()');
    assert.ok(diags.some((d) => d.code === 'kin.arity'));
  });

  test('reports unexpected token after a bad statement', () => {
    const diags = collectDiagnostics('reka x = ;');
    assert.equal(diags.length, 1);
    assert.match(diags[0].message.toLowerCase(), /unexpected|error/);
  });

  test('parseDiagnostic extracts line and token from Kin error text', () => {
    const diag = parseDiagnostic(
      'On line 3: Kin Error: Unexpected token +, found +',
      'reka a = 1\nreka b = 2\n+\n',
    );
    assert.equal(diag.range.start.line, 2);
    assert.equal(diag.range.start.character, 0);
  });

  test('empty file is valid', () => {
    assert.deepEqual(collectDiagnostics(''), []);
    assert.deepEqual(collectDiagnostics('# just a comment\n'), []);
  });
});
