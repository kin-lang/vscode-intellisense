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
import { collectDeclaredNames, currentPrefix, memberOwnerAt } from './text';

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

export function collectCompletions(text: string, offset: number): CompletionItem[] {
  const owner = memberOwnerAt(text, offset);
  if (owner) {
    const ns = lookupSymbol(owner);
    if (ns?.members) {
      return Object.values(ns.members).map((m) => toItem(m, `${owner}.${m.name}`));
    }
    return [];
  }

  const prefix = currentPrefix(text, offset).toLowerCase();
  const items: CompletionItem[] = [];

  for (const sym of allTopLevelSymbols()) {
    if (prefix && !sym.name.toLowerCase().startsWith(prefix)) continue;
    items.push(toItem(sym));
  }

  for (const name of collectDeclaredNames(text)) {
    if (KEYWORD_NAMES.has(name)) continue;
    if (lookupSymbol(name)) continue;
    if (prefix && !name.toLowerCase().startsWith(prefix)) continue;
    items.push({
      label: name,
      kind: CompletionItemKind.Variable,
      detail: 'name in this file',
      sortText: `6_${name}`,
    });
  }

  return items;
}

/** Used by tests to resolve a member list without LSP types leaking. */
export function memberNames(owner: string): string[] {
  const ns = lookupSymbol(owner);
  return ns?.members ? Object.keys(ns.members) : [];
}

export function resolveMember(owner: string, name: string): KinSymbolDoc | undefined {
  return lookupMember(owner, name);
}
