import { Parser } from '@kin-lang/kin';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { isIdentifierToken, locateTokens } from './locate';
import { recoverSource } from './shapes';
import { analyze } from './scope';
import { lineText } from './text';

type SpanLike = {
  line?: number;
  column?: number;
  start?: number;
  end?: number;
};

function wholeLineRange(text: string, lineNumber: number): {
  start: { line: number; character: number };
  end: { line: number; character: number };
} {
  const line = Math.max(0, lineNumber - 1);
  const content = lineText(text, line);
  return {
    start: { line, character: 0 },
    end: { line, character: content.length },
  };
}

function tokenRange(
  text: string,
  lineNumber: number,
  token: string | undefined,
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  const line = Math.max(0, lineNumber - 1);
  const content = lineText(text, line);
  if (token) {
    const idx = content.indexOf(token);
    if (idx >= 0) {
      return {
        start: { line, character: idx },
        end: { line, character: idx + token.length },
      };
    }
  }
  return wholeLineRange(text, lineNumber);
}

function spanToRange(
  text: string,
  span: SpanLike | undefined,
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  if (!span || span.line === undefined) {
    return wholeLineRange(text, 1);
  }
  const line = Math.max(0, (span.line ?? 1) - 1);
  const character = Math.max(0, (span.column ?? 1) - 1);
  const length =
    span.start !== undefined && span.end !== undefined
      ? Math.max(1, span.end - span.start)
      : 1;
  const content = lineText(text, line);
  const endChar = Math.min(content.length, character + length);
  return {
    start: { line, character },
    end: { line, character: Math.max(character + 1, endChar) },
  };
}

export function parseDiagnostic(message: string, text: string): Diagnostic {
  const lineMatch =
    message.match(/On line\s+(\d+)/i) || message.match(/at line\s+(\d+)/i);
  const lineNumber = lineMatch ? Number(lineMatch[1]) : 1;

  const foundMatch = message.match(/found\s+(\S+)\s*$/i);
  const unexpected = message.match(
    /Unexpected (?:character|token)\s+'([^']+)'/i,
  );
  const token = unexpected?.[1] ?? foundMatch?.[1];

  const clean = message.replace(/^Kin Error:\s*/i, '').trim();

  return {
    severity: DiagnosticSeverity.Error,
    range: tokenRange(text, lineNumber, token),
    message: clean || message,
    source: 'kin',
    code: 'kin.parse',
  };
}

function isIncompleteInput(text: string, message: string): boolean {
  const trimmed = text.replace(/\s+$/g, '');
  const danglingDot = /[A-Za-z0-9_\]]\s*\.\s*$/.test(trimmed);
  const danglingCall = /[A-Za-z0-9_]\s*\(\s*$/.test(trimmed);
  if (danglingDot && /dot|identifier|unexpected|illegal|kitazwi/i.test(message)) {
    return true;
  }
  if (danglingCall && /unexpected|expected|error|biteganyijwe|kitazwi/i.test(message)) {
    return true;
  }
  if (
    /[A-Za-z0-9_\]]\s*\.\s*$/m.test(text) &&
    /dot|identifier|unexpected|illegal|kitazwi/i.test(message)
  ) {
    return true;
  }
  return false;
}

function isConstNeedsValue(message: string): boolean {
  return /Constant variables must be assigned a value|ntahinduka igomba/i.test(
    message,
  );
}

/** `ntahinduka x;` — locate from tokens when needed. */
export function uninitializedConsts(text: string): Diagnostic[] {
  const tokens = locateTokens(text);
  const diags: Diagnostic[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].lexeme !== 'ntahinduka') continue;
    const name = tokens[i + 1];
    const semi = tokens[i + 2];
    if (!name || !semi) continue;
    if (!isIdentifierToken(name)) continue;
    if (semi.lexeme !== ';') continue;
    diags.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: tokens[i].line, character: tokens[i].startChar },
        end: {
          line: semi.line,
          character: semi.startChar + semi.length,
        },
      },
      message:
        `Constant \`${name.lexeme}\` must be assigned a value. / ntahinduka \`${name.lexeme}\` igomba agaciro.`,
      source: 'kin',
      code: 'kin.const-needs-value',
    });
  }
  return diags;
}

function toLsp(
  severity: DiagnosticSeverity,
  range: { line: number; character: number; start: number; end: number },
  message: string,
  code: string,
): Diagnostic {
  const length = Math.max(0, range.end - range.start);
  return {
    severity,
    range: {
      start: { line: range.line, character: range.character },
      end: { line: range.line, character: range.character + length },
    },
    message,
    source: 'kin',
    code,
  };
}

function kinErrorDiagnostic(error: unknown, text: string): Diagnostic | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as {
    message?: string;
    code?: string;
    span?: SpanLike;
  };
  if (!e.message) return null;
  if (isIncompleteInput(text, e.message)) return null;
  return {
    severity: DiagnosticSeverity.Error,
    range: spanToRange(text, e.span),
    message: e.message,
    source: 'kin',
    code: typeof e.code === 'string' ? e.code : 'kin.parse',
  };
}

/**
 * Parse Kin source and return diagnostics: 0+ parse errors plus an AST pass
 * (redeclare, unresolved, assign to const, bad call, arity, after-tanga).
 */
export function collectDiagnostics(text: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const consts = uninitializedConsts(text);
  diags.push(...consts);

  let parseFailed = false;
  const parser = new Parser() as Parser & {
    parse?: (source: string) => {
      program: unknown;
      diagnostics: Array<{ severity: string; error: unknown }>;
    };
  };

  if (typeof parser.parse === 'function') {
    try {
      const { diagnostics } = parser.parse(text);
      for (const d of diagnostics) {
        const diag = kinErrorDiagnostic(d.error, text);
        if (diag) {
          parseFailed = true;
          if (isConstNeedsValue(diag.message) && consts.length > 0) continue;
          diags.push(diag);
        }
      }
    } catch (error) {
      // Lexer faults still throw before recovery starts.
      parseFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      if (!isIncompleteInput(text, message)) {
        const fromKin = kinErrorDiagnostic(error, text);
        diags.push(fromKin ?? parseDiagnostic(message, text));
      }
    }
  } else {
    try {
      new Parser().produceAST(text);
    } catch (error) {
      parseFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      if (isConstNeedsValue(message)) {
        if (consts.length === 0) {
          diags.push(parseDiagnostic(message, text));
        }
      } else if (isIncompleteInput(text, message)) {
        // Trailing `obj.` / `foo(` while typing
      } else {
        const fromKin = kinErrorDiagnostic(error, text);
        diags.push(fromKin ?? parseDiagnostic(message, text));
        try {
          new Parser().produceAST(recoverSource(text));
        } catch {
          // keep the original parse diagnostic only
        }
      }
    }
  }

  if (!parseFailed || recoverSource(text) !== text || consts.length > 0) {
    const analysis = analyze(text);
    for (const issue of analysis.issues) {
      const severity =
        issue.severity === 'warning'
          ? DiagnosticSeverity.Warning
          : DiagnosticSeverity.Error;
      diags.push(toLsp(severity, issue.range, issue.message, issue.code));
    }
  }

  return diags;
}
