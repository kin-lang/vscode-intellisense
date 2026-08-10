import { Lexer } from '@kin-lang/kin';
import { IDENTIFIER_TOKEN_TYPE } from './parserCompat';

export interface LocatedToken {
  lexeme: string;
  type: number;
  /** 0-based line. */
  line: number;
  /** 0-based column. */
  startChar: number;
  length: number;
  /** Offset in `text`. */
  start: number;
  end: number;
}

/**
 * Reconstruct start columns by walking the source in token order.
 * The Kin lexer only stores a line number, not a column.
 * Same strategy as `locateAndClassify` in semanticTokens.ts.
 */
export function locateTokens(text: string): LocatedToken[] {
  let tokens: Array<{ lexeme: string; type: number; line: number }>;
  try {
    tokens = new Lexer(text).tokenize();
  } catch {
    return [];
  }

  const located: LocatedToken[] = [];
  const lines = text.split('\n');
  const lineStarts: number[] = [];
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStarts.push(acc);
    acc += lines[i].length + 1;
  }
  const cursors = lines.map(() => 0);

  for (const token of tokens) {
    if (token.lexeme === 'EOF') break;
    const lineIdx = Math.max(0, token.line - 1);
    const line = lines[lineIdx] ?? '';
    let search = token.lexeme;

    const from = cursors[lineIdx] ?? 0;
    const slice = line.slice(from);
    let rel = search.length > 0 ? slice.indexOf(search) : -1;

    if (rel < 0) {
      const quoted = `"${search}"`;
      rel = slice.indexOf(quoted);
      if (rel >= 0) {
        search = quoted;
      }
    }

    if (rel < 0) continue;

    const startChar = from + rel;
    const length = search.length;
    cursors[lineIdx] = startChar + length;
    const start = (lineStarts[lineIdx] ?? 0) + startChar;

    located.push({
      lexeme: token.lexeme,
      type: token.type,
      line: lineIdx,
      startChar,
      length,
      start,
      end: start + length,
    });
  }

  return located;
}

export function isIdentifierToken(token: LocatedToken): boolean {
  return (
    token.type === IDENTIFIER_TOKEN_TYPE &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(token.lexeme)
  );
}

export function tokenAtOffset(
  tokens: LocatedToken[],
  offset: number,
): LocatedToken | undefined {
  return tokens.find((t) => offset >= t.start && offset <= t.end);
}
