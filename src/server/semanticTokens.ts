import { Lexer } from '@kin-lang/kin';
import {
  SemanticTokensBuilder,
  SemanticTokensLegend,
} from 'vscode-languageserver/node';
import {
  CONSTANT_NAMES,
  FUNCTION_NAMES,
  KEYWORD_NAMES,
  NAMESPACE_NAMES,
} from './catalog';

export const TOKEN_TYPES = [
  'keyword',
  'function',
  'variable',
  'property',
  'number',
  'string',
  'operator',
  'namespace',
  'comment',
] as const;

export const TOKEN_MODIFIERS = ['declaration', 'readonly', 'defaultLibrary'] as const;

export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

const TYPE_INDEX: Record<(typeof TOKEN_TYPES)[number], number> = {
  keyword: 0,
  function: 1,
  variable: 2,
  property: 3,
  number: 4,
  string: 5,
  operator: 6,
  namespace: 7,
  comment: 8,
};

/**
 * Numeric `TokenType` values from `@kin-lang/kin` `src/lexer/tokens.ts`
 * (published 0.4.3 and local). STRING is 24, not 31 (31 is AND).
 */
const TOKEN_DOT = 0;
const TOKEN_STRING = 24;
const TOKEN_INTEGER = 25;
const TOKEN_FLOAT = 26;

interface Located {
  line: number;
  startChar: number;
  length: number;
  type: (typeof TOKEN_TYPES)[number];
  mods: number;
}

function classify(
  lexeme: string,
  rawType: number,
  afterDot: boolean,
): { type: (typeof TOKEN_TYPES)[number]; mods: number } | null {
  // Classify by lexer TokenType first so `"Hello"` is a string, not a variable.
  if (rawType === TOKEN_STRING) {
    return { type: 'string', mods: 0 };
  }
  if (rawType === TOKEN_INTEGER || rawType === TOKEN_FLOAT) {
    return { type: 'number', mods: 0 };
  }

  if (KEYWORD_NAMES.has(lexeme)) {
    return { type: 'keyword', mods: 0 };
  }

  // `obj.pi`, `KIN_IMIBARE.sin`, user keys after `.` are properties.
  if (afterDot && /^[A-Za-z_][A-Za-z0-9_]*$/.test(lexeme)) {
    return { type: 'property', mods: 0 };
  }

  if (CONSTANT_NAMES.has(lexeme)) {
    return { type: 'variable', mods: (1 << 1) /* readonly */ | (1 << 2) /* defaultLibrary */ };
  }
  if (NAMESPACE_NAMES.has(lexeme)) {
    return { type: 'namespace', mods: 1 << 2 };
  }
  if (FUNCTION_NAMES.has(lexeme)) {
    return { type: 'function', mods: 1 << 2 };
  }

  if (
    ['+', '-', '*', '/', '%', '^', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'].includes(
      lexeme,
    )
  ) {
    return { type: 'operator', mods: 0 };
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(lexeme)) {
    return { type: 'variable', mods: 0 };
  }

  return null;
}

/**
 * Reconstruct start columns by walking the source in token order.
 * The Kin lexer only stores a line number, not a column.
 */
export function locateAndClassify(text: string): Located[] {
  const lexer = new Lexer(text);
  const tokens = lexer.tokenize();
  const located: Located[] = [];
  const lines = text.split('\n');
  const cursors = lines.map(() => 0);
  let prevWasDot = false;

  for (const token of tokens) {
    if (token.lexeme === 'EOF') break;
    const lineIdx = Math.max(0, token.line - 1);
    const line = lines[lineIdx] ?? '';
    const from = cursors[lineIdx] ?? 0;
    const slice = line.slice(from);

    let search = token.lexeme;
    let rel = -1;

    // Strings: lexer strips the surrounding quotes. Paint the quotes too.
    if (token.type === TOKEN_STRING) {
      const quoted = `"${token.lexeme}"`;
      rel = slice.indexOf(quoted);
      if (rel >= 0) {
        search = quoted;
      } else {
        rel = slice.indexOf(token.lexeme);
      }
    } else {
      rel = slice.indexOf(search);
    }

    if (rel < 0) {
      prevWasDot = token.type === TOKEN_DOT || token.lexeme === '.';
      continue;
    }

    const startChar = from + rel;
    const length = search.length;
    cursors[lineIdx] = startChar + length;

    const classified = classify(token.lexeme, token.type, prevWasDot);
    prevWasDot = token.type === TOKEN_DOT || token.lexeme === '.';
    if (!classified) continue;

    located.push({
      line: lineIdx,
      startChar,
      length,
      type: classified.type,
      mods: classified.mods,
    });
  }

  // Comments are skipped by the lexer — paint them from source.
  for (let i = 0; i < lines.length; i++) {
    const hash = lines[i].indexOf('#');
    if (hash < 0) continue;
    // Don't treat # inside a string. Cheap check: odd number of quotes before it.
    const before = lines[i].slice(0, hash);
    const quotes = (before.match(/"/g) || []).length;
    if (quotes % 2 === 1) continue;
    located.push({
      line: i,
      startChar: hash,
      length: lines[i].length - hash,
      type: 'comment',
      mods: 0,
    });
  }

  located.sort((a, b) => a.line - b.line || a.startChar - b.startChar);
  return located;
}

export function buildSemanticTokens(text: string) {
  const builder = new SemanticTokensBuilder();
  for (const tok of locateAndClassify(text)) {
    builder.push(tok.line, tok.startChar, tok.length, TYPE_INDEX[tok.type], tok.mods);
  }
  return builder.build();
}
