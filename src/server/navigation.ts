import { KEYWORD_NAMES } from './catalog';
import { isIdentifierToken, locateTokens } from './locate';
import {
  analyze,
  useAt,
  type Analysis,
  type Binding,
  type IdentUse,
  type TextRange,
} from './scope';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function collectDefinition(
  text: string,
  offset: number,
): TextRange | null {
  const analysis = analyze(text);
  const hit = useAt(analysis, offset);
  if (!hit) return null;
  if (hit.role === 'property' || hit.role === 'key') {
    const key = keyDefinition(analysis, hit);
    if (key) return key;
    if (hit.role === 'property') {
      const bound = boundFunction(analysis, hit);
      if (bound) return bound.range;
    }
    return hit.role === 'key' ? hit.range : null;
  }
  if (!hit.binding || hit.binding.kind === 'builtin') {
    if (hit.role === 'decl') return hit.range;
    return null;
  }
  return hit.binding.range;
}

export function collectReferences(
  text: string,
  offset: number,
  includeDeclaration = true,
): TextRange[] {
  const analysis = analyze(text);
  const hit = useAt(analysis, offset);
  if (!hit) return [];
  if (hit.role === 'property' || hit.role === 'key') {
    return propertyUses(analysis, hit).map((u) => u.range);
  }
  if (!hit.binding || hit.binding.kind === 'builtin') return [];
  return analysis.uses
    .filter((u) => {
      if (u.binding !== hit.binding) return false;
      if (!includeDeclaration && u.role === 'decl') return false;
      return true;
    })
    .map((u) => u.range);
}

export function prepareRename(
  text: string,
  offset: number,
): TextRange | null {
  const analysis = analyze(text);
  const hit = useAt(analysis, offset);
  if (!hit) return null;
  if (KEYWORD_NAMES.has(hit.name) && hit.binding?.kind === 'builtin') return null;
  if (hit.binding?.kind === 'builtin') return null;
  if (hit.role === 'property' || hit.role === 'key') return hit.range;
  if (!hit.binding && hit.role !== 'decl') return null;
  return hit.range;
}

export function collectRename(
  text: string,
  offset: number,
  newName: string,
): { range: TextRange; newText: string }[] | null {
  if (!IDENT.test(newName) || KEYWORD_NAMES.has(newName)) return null;
  const prepared = prepareRename(text, offset);
  if (!prepared) return null;
  const ranges = collectReferences(text, offset, true);
  if (ranges.length === 0) ranges.push(prepared);
  const seen = new Set<string>();
  const edits: { range: TextRange; newText: string }[] = [];
  for (const range of ranges) {
    const key = `${range.start}:${range.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edits.push({ range, newText: newName });
  }
  return edits;
}

function boundFunction(analysis: Analysis, hit: IdentUse): Binding | undefined {
  if (!hit.objectName) return undefined;
  const objUse = analysis.uses.find(
    (u) =>
      u.role === 'decl' &&
      u.name === hit.objectName &&
      u.binding,
  );
  const prop = objUse?.binding?.shape?.properties.get(hit.name);
  if (!prop?.boundName) return undefined;
  return analysis.functions.find((f) => f.name === prop.boundName)?.binding;
}

function keyDefinition(analysis: Analysis, hit: IdentUse): TextRange | null {
  const objectName = hit.objectName;
  if (hit.role === 'key') return hit.range;
  if (!objectName) return null;
  const key = analysis.uses.find(
    (u) => u.role === 'key' && u.name === hit.name,
  );
  return key?.range ?? null;
}

function propertyUses(analysis: Analysis, hit: IdentUse): IdentUse[] {
  if (hit.role === 'key') {
    // All keys with this name, plus property accesses of the same name
    // on an object that was bound to a literal containing this key.
    const keys = analysis.uses.filter(
      (u) => (u.role === 'key' || u.role === 'property') && u.name === hit.name,
    );
    return keys;
  }
  const objectName = hit.objectName;
  return analysis.uses.filter((u) => {
    if (u.name !== hit.name) return false;
    if (u.role === 'key') return true;
    if (u.role === 'property') {
      return !objectName || u.objectName === objectName;
    }
    return false;
  });
}

/** Sequential lexeme search: identifier under `offset`. */
export function identifierAt(text: string, offset: number): TextRange | null {
  const tokens = locateTokens(text);
  const tok = tokens.find(
    (t) => isIdentifierToken(t) && offset >= t.start && offset <= t.end,
  );
  return tok
    ? {
        start: tok.start,
        end: tok.end,
        line: tok.line,
        character: tok.startChar,
      }
    : null;
}
