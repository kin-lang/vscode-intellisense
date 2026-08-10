import {
  DocumentSymbol,
  SymbolKind,
} from 'vscode-languageserver/node';
import {
  analyze,
  type Binding,
  type ScopeNode,
  type TextRange,
} from './scope';
import { positionAt } from './text';

function lspRange(range: TextRange): {
  start: { line: number; character: number };
  end: { line: number; character: number };
} {
  const length = Math.max(0, range.end - range.start);
  return {
    start: { line: range.line, character: range.character },
    end: { line: range.line, character: range.character + length },
  };
}

function offsetRange(
  text: string,
  start: number,
  end: number,
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  return { start: positionAt(text, start), end: positionAt(text, end) };
}

function kindOf(binding: Binding): SymbolKind {
  switch (binding.kind) {
    case 'function':
      return SymbolKind.Function;
    case 'const':
      return SymbolKind.Constant;
    case 'param':
      return SymbolKind.Variable;
    default:
      return SymbolKind.Variable;
  }
}

function bindingToSymbol(
  text: string,
  binding: Binding,
  children: DocumentSymbol[],
  container?: { start: number; end: number },
): DocumentSymbol {
  const sel = lspRange(binding.range);
  const range = container
    ? offsetRange(text, container.start, container.end)
    : sel;
  if (binding.shape) {
    for (const prop of binding.shape.properties.values()) {
      if (/^\d+$/.test(prop.key)) continue;
      children.push({
        name: prop.key,
        kind: prop.nested ? SymbolKind.Object : SymbolKind.Property,
        range: sel,
        selectionRange: sel,
        detail: prop.boundName ? `→ ${prop.boundName}` : undefined,
        children: [],
      });
    }
  }
  return {
    name: binding.name,
    detail:
      binding.kind === 'function' && binding.params
        ? `(${binding.params.join(', ')})`
        : binding.kind === 'const'
          ? 'ntahinduka'
          : binding.kind === 'param'
            ? 'parametere / parameter'
            : 'reka',
    kind: kindOf(binding),
    range,
    selectionRange: sel,
    children,
  };
}

function symbolsFromScope(text: string, scope: ScopeNode, skipParams = false): DocumentSymbol[] {
  const out: DocumentSymbol[] = [];
  const usedFn = new Set<ScopeNode>();

  for (const binding of scope.bindings.values()) {
    if (binding.kind === 'builtin') continue;
    if (skipParams && binding.kind === 'param') continue;

    const children: DocumentSymbol[] = [];
    let container: { start: number; end: number } | undefined;
    if (binding.kind === 'function') {
      const fnScope = scope.children.find(
        (c) => c.kind === 'function' && c.start === binding.range.start,
      );
      if (fnScope) {
        usedFn.add(fnScope);
        container = { start: fnScope.start, end: fnScope.end };
        for (const p of fnScope.bindings.values()) {
          if (p.kind === 'param') children.push(bindingToSymbol(text, p, []));
        }
        children.push(...symbolsFromScope(text, fnScope, true));
      }
    }
    out.push(bindingToSymbol(text, binding, children, container));
  }

  for (const child of scope.children) {
    if (usedFn.has(child) || child.kind === 'function') continue;
    out.push(...symbolsFromScope(text, child));
  }
  return out;
}

export function collectDocumentSymbols(text: string): DocumentSymbol[] {
  return symbolsFromScope(text, analyze(text).root);
}
