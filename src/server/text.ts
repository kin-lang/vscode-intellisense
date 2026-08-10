export interface OffsetPosition {
  line: number;
  character: number;
}

/** Convert a 0-based line/character to an offset in `text`. */
export function offsetAt(text: string, position: OffsetPosition): number {
  const lines = text.split('\n');
  let offset = 0;
  const maxLine = Math.min(position.line, lines.length - 1);
  for (let i = 0; i < maxLine; i++) {
    offset += lines[i].length + 1;
  }
  if (maxLine < 0) return 0;
  return offset + Math.min(position.character, lines[maxLine]?.length ?? 0);
}

export function positionAt(text: string, offset: number): OffsetPosition {
  let line = 0;
  let lastBreak = -1;
  const clamped = Math.max(0, Math.min(offset, text.length));
  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      line++;
      lastBreak = i;
    }
  }
  return { line, character: clamped - lastBreak - 1 };
}

export function lineText(text: string, line: number): string {
  return text.split('\n')[line] ?? '';
}

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/g;

/** Identifier (or KIN_* name) under `offset`, plus optional object.member. */
export function symbolAt(
  text: string,
  offset: number,
): { object?: string; name: string; start: number; end: number } | null {
  if (offset < 0 || offset > text.length) return null;

  let start = offset;
  let end = offset;

  const isIdentChar = (c: string | undefined) =>
    !!c && /[A-Za-z0-9_]/.test(c);

  if (offset > 0 && !isIdentChar(text[offset]) && isIdentChar(text[offset - 1])) {
    start = offset - 1;
    end = offset;
  }

  while (start > 0 && isIdentChar(text[start - 1])) start--;
  while (end < text.length && isIdentChar(text[end])) end++;
  if (start === end) return null;

  const name = text.slice(start, end);
  if (!/^[A-Za-z_]/.test(name)) return null;

  // object.member: if we sit on the member, capture the object.
  let look = start;
  while (look > 0 && /\s/.test(text[look - 1])) look--;
  if (look > 0 && text[look - 1] === '.') {
    let objEnd = look - 1;
    while (objEnd > 0 && /\s/.test(text[objEnd - 1])) objEnd--;
    let objStart = objEnd;
    while (objStart > 0 && isIdentChar(text[objStart - 1])) objStart--;
    const object = text.slice(objStart, objEnd);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(object)) {
      return { object, name, start, end };
    }
  }

  return { name, start, end };
}

/** `KIN_AMAGAMBO.` prefix just before offset, for member completion. */
export function memberOwnerAt(text: string, offset: number): string | null {
  const before = text.slice(0, offset);
  const match = before.match(/([A-Za-z_][A-Za-z0-9_]*)\.\s*([A-Za-z_][A-Za-z0-9_]*)?$/);
  return match ? match[1] : null;
}

export interface CallContext {
  callee: string;
  argIndex: number;
  openOffset: number;
}

/**
 * Innermost call whose '(' is left of `offset` and whose matching ')'
 * has not yet closed. Callee may be `foo` or `OBJ.method`.
 */
export function callContextAt(text: string, offset: number): CallContext | null {
  let depth = 0;
  let open = -1;
  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) {
        open = i;
        break;
      }
      depth--;
    }
  }
  if (open < 0) return null;

  let end = open;
  while (end > 0 && /\s/.test(text[end - 1])) end--;
  let start = end;
  while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) start--;
  let callee = text.slice(start, end);
  if (!callee) return null;

  let look = start;
  while (look > 0 && /\s/.test(text[look - 1])) look--;
  if (look > 0 && text[look - 1] === '.') {
    let objEnd = look - 1;
    while (objEnd > 0 && /\s/.test(text[objEnd - 1])) objEnd--;
    let objStart = objEnd;
    while (objStart > 0 && /[A-Za-z0-9_]/.test(text[objStart - 1])) objStart--;
    const object = text.slice(objStart, objEnd);
    if (object) callee = `${object}.${callee}`;
  }

  const inside = text.slice(open + 1, offset);
  let argIndex = 0;
  let nested = 0;
  for (const ch of inside) {
    if (ch === '(' || ch === '[' || ch === '{') nested++;
    else if (ch === ')' || ch === ']' || ch === '}') nested = Math.max(0, nested - 1);
    else if (ch === ',' && nested === 0) argIndex++;
  }

  return { callee, argIndex, openOffset: open };
}

export function collectDeclaredNames(text: string): string[] {
  const names = new Set<string>();
  const patterns = [
    /\breka\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bntahinduka\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bporogaramu_ntoya\s+([A-Za-z_][A-Za-z0-9_]*)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) names.add(m[1]);
  }
  // function parameters: porogaramu_ntoya name(a, b)
  const fn = /\bporogaramu_ntoya\s+[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)/g;
  let fm: RegExpExecArray | null;
  while ((fm = fn.exec(text))) {
    for (const part of fm[1].split(',')) {
      const id = part.trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) names.add(id);
    }
  }
  IDENT.lastIndex = 0;
  return [...names];
}

export function currentPrefix(text: string, offset: number): string {
  let start = offset;
  while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) start--;
  return text.slice(start, offset);
}
