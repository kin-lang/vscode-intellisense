import { Parser } from '@kin-lang/kin';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { lineText } from './text';

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
  };
}

/**
 * Parse Kin source and return syntax diagnostics.
 * The Kin parser stops at the first error, so this yields 0 or 1 item.
 */
export function collectDiagnostics(text: string): Diagnostic[] {
  try {
    const parser = new Parser();
    parser.produceAST(text);
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [parseDiagnostic(message, text)];
  }
}
