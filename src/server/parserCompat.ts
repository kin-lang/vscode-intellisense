import { Lexer } from '@kin-lang/kin';

function firstToken(
  source: string,
): { type: number; lexeme: string } | undefined {
  try {
    const tokens = new Lexer(source).tokenize();
    return tokens.find((t) => t.lexeme !== 'EOF');
  } catch {
    return undefined;
  }
}

/** Token type the loaded lexer uses for a plain identifier. */
export function identifierTokenType(): number {
  return firstToken('kin_ident_probe')?.type ?? 23;
}

/** Token type for a known keyword (`reka`). */
export function keywordTokenType(lexeme = 'reka'): number | undefined {
  return firstToken(lexeme)?.type;
}

/**
 * True when this LSP's Parser/Lexer treats `hagarara` as a keyword
 * (unpublished local Kin with BreakStatement).
 *
 * npm `@kin-lang/kin@0.4.3` tokenizes `hagarara` as an identifier and
 * registers a native `hagarara(code)` that calls `process.exit`.
 * Do not assume break exists on 0.4.3.
 */
export function hagararaIsKeyword(): boolean {
  const tok = firstToken('hagarara');
  if (!tok) return false;
  return tok.type !== identifierTokenType();
}

export const HAGARARA_IS_KEYWORD = hagararaIsKeyword();
export const IDENTIFIER_TOKEN_TYPE = identifierTokenType();
