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
): { type: (typeof TOKEN_TYPES)[number]; mods: number } | null {
  if (KEYWORD_NAMES.has(lexeme)) {
    return { type: 'keyword', mods: 0 };
  }
  if (CONSTANT_NAMES.has(lexeme)) {
    return { type: 'variable', mods: 1 << 1 /* readonly */ | 1 << 2 /* defaultLibrary */ };
  }
  if (NAMESPACE_NAMES.has(lexeme)) {
    return { type: 'namespace', mods: 1 << 2 };
  }
  if (FUNCTION_NAMES.has(lexeme)) {
    return { type: 'function', mods: 1 << 2 };
  }

  // TokenType numeric values from kin/src/lexer/tokens.ts
  // STRING = 31, INTEGER = 32, FLOAT = 33  (after 31 one-char/literal slots)
  // We also treat operators by lexeme.
  if (/^-?\d+(\.\d+)?$/.test(lexeme)) {
    return { type: 'number', mods: 0 };
  }
  if (
    ['+', '-', '*', '/', '%', '^', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'].includes(
      lexeme,
    )
  ) {
    return { type: 'operator', mods: 0 };
  }

  // Heuristic: STRING tokens have their quotes stripped, so they won't match
  // identifier rules when they contain spaces. Bare identifiers fall through.
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(lexeme)) {
    return { type: 'variable', mods: 0 };
  }

  // Anything else with letters/spaces is likely a string literal body.
  if (rawType >= 0 && lexeme.length > 0 && !/^[(){}\[\],:;.]$/.test(lexeme)) {
    if (/[\s"]/.test(lexeme) || !/^[A-Za-z0-9_+\-*/%=!<>&|^]+$/.test(lexeme)) {
      return { type: 'string', mods: 0 };
    }
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

  for (const token of tokens) {
    if (token.lexeme === 'EOF') break;
    const lineIdx = Math.max(0, token.line - 1);
    const line = lines[lineIdx] ?? '';
    let search = token.lexeme;
    let extraLeft = 0;
    let extraRight = 0;

    // Strings: lexer strips the surrounding quotes.
    const from = cursors[lineIdx] ?? 0;
    const slice = line.slice(from);
    let rel = slice.indexOf(search);

    if (rel < 0) {
      const quoted = `"${search}"`;
      rel = slice.indexOf(quoted);
      if (rel >= 0) {
        extraLeft = 0;
        extraRight = 0;
        search = quoted;
      }
    }

    if (rel < 0) continue;

    const startChar = from + rel + extraLeft;
    const length = search.length + extraRight;
    cursors[lineIdx] = startChar + length;

    const classified = classify(token.lexeme, token.type);
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
