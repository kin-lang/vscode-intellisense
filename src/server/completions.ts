import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
} from 'vscode-languageserver/node';
import {
  allTopLevelSymbols,
  formatMarkdown,
  formatSignature,
  KEYWORD_NAMES,
  lookupMember,
  lookupSymbol,
  type KinSymbolDoc,
} from './catalog';
import {
  collectObjectShapes,
  isNumericKey,
  resolveShape,
} from './shapes';
import {
  analyze,
  bindingsInScope,
  scopeAt,
} from './scope';
import {
  currentPrefix,
  inCommentOrString,
  inGereranyaBody,
  inIndexBrackets,
  memberPathAt,
} from './text';

function kindOf(sym: KinSymbolDoc): CompletionItemKind {
  switch (sym.kind) {
    case 'keyword':
      return CompletionItemKind.Keyword;
    case 'constant':
      return CompletionItemKind.Constant;
    case 'function':
      return CompletionItemKind.Function;
    case 'namespace':
      return CompletionItemKind.Module;
    case 'method':
      return CompletionItemKind.Method;
    case 'property':
      return CompletionItemKind.Property;
    default:
      return CompletionItemKind.Text;
  }
}

function toItem(sym: KinSymbolDoc, qualified?: string): CompletionItem {
  const name = qualified ?? sym.name;
  const item: CompletionItem = {
    label: name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name,
    kind: kindOf(sym),
    detail: formatSignature(sym, name),
    documentation: {
      kind: MarkupKind.Markdown,
      value: formatMarkdown(sym, name),
    },
    filterText: name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name,
    sortText: sortKey(sym),
  };

  if (sym.snippet) {
    item.insertText = sym.snippet;
    item.insertTextFormat = InsertTextFormat.Snippet;
  } else if (sym.insertText) {
    item.insertText = sym.insertText;
  }

  return item;
}

function sortKey(sym: KinSymbolDoc): string {
  const rank: Record<KinSymbolDoc['kind'], string> = {
    keyword: '1',
    function: '2',
    namespace: '3',
    method: '2',
    property: '4',
    constant: '5',
  };
  return `${rank[sym.kind] ?? '9'}_${sym.name}`;
}

function userPropertyItem(
  key: string,
  boundName: string | undefined,
  nested: boolean,
): CompletionItem {
  const kind = nested
    ? CompletionItemKind.Field
    : boundName
      ? CompletionItemKind.Method
      : CompletionItemKind.Property;
  const detail = boundName
    ? `umunyamuryango → ${boundName} / member of object → ${boundName}`
    : nested
      ? 'igikubo / nested object'
      : 'umunyamuryango / member of object';
  return {
    label: key,
    kind,
    detail,
    documentation: boundName
      ? {
          kind: MarkupKind.Markdown,
          value: `Property \`${key}\` is set to \`${boundName}\` in this file.`,
        }
      : undefined,
    sortText: `0_${key}`,
  };
}

export function collectCompletions(text: string, offset: number): CompletionItem[] {
  if (inCommentOrString(text, offset)) return [];
  if (inIndexBrackets(text, offset)) return [];

  const path = memberPathAt(text, offset);
  if (path && path.length > 0) {
    const ns = lookupSymbol(path[0]);
    if (ns?.members && path.length === 1) {
      return Object.values(ns.members).map((m) =>
        toItem(m, `${path[0]}.${m.name}`),
      );
    }

    const shapes = collectObjectShapes(text, offset);
    const shape = resolveShape(shapes, path);
    if (shape && shape.properties.size > 0) {
      const typed = currentPrefix(text, offset).toLowerCase();
      const props = [...shape.properties.values()].filter(
        (prop) => !isNumericKey(prop.key),
      );
      if (props.length === 0) return [];
      return props
        .filter((prop) => !typed || prop.key.toLowerCase().startsWith(typed))
        .map((prop) =>
          userPropertyItem(prop.key, prop.boundName, !!prop.nested),
        );
    }

    if (ns?.members) {
      return Object.values(ns.members).map((m) =>
        toItem(m, `${path[0]}.${m.name}`),
      );
    }
    return [];
  }

  const prefix = currentPrefix(text, offset).toLowerCase();
  const items: CompletionItem[] = [];
  const gereranya = inGereranyaBody(text, offset);

  for (const sym of allTopLevelSymbols()) {
    if (prefix && !sym.name.toLowerCase().startsWith(prefix)) continue;
    const item = toItem(sym);
    if (gereranya && (sym.name === 'usanze' || sym.name === 'ibindi')) {
      item.sortText = `0_${sym.name}`;
      item.detail = `${sym.detail} / gereranya`;
    }
    items.push(item);
  }

  const analysis = analyze(text, offset);
  const scope = scopeAt(analysis.root, offset);
  for (const binding of bindingsInScope(scope, offset)) {
    if (KEYWORD_NAMES.has(binding.name)) continue;
    if (lookupSymbol(binding.name)) continue;
    if (prefix && !binding.name.toLowerCase().startsWith(prefix)) continue;
    items.push({
      label: binding.name,
      kind:
        binding.kind === 'function'
          ? CompletionItemKind.Function
          : binding.kind === 'const'
            ? CompletionItemKind.Constant
            : CompletionItemKind.Variable,
      detail: detailForBinding(binding.kind),
      sortText: `5_${binding.name}`,
    });
  }

  return items;
}

function detailForBinding(kind: string): string {
  switch (kind) {
    case 'function':
      return 'porogaramu_ntoya muri iyi dosiye / function in this file';
    case 'const':
      return 'ntahinduka muri iyi dosiye / constant in this file';
    case 'param':
      return 'parametere / parameter';
    default:
      return 'izina muri iyi dosiye / name in this file';
  }
}

/** Used by tests to resolve a member list without LSP types leaking. */
export function memberNames(owner: string): string[] {
  const ns = lookupSymbol(owner);
  return ns?.members ? Object.keys(ns.members) : [];
}

export function resolveMember(owner: string, name: string): KinSymbolDoc | undefined {
  return lookupMember(owner, name);
}
