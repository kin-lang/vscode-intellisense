import { Hover, MarkupKind } from 'vscode-languageserver/node';
import { formatMarkdown, lookupMember, lookupSymbol } from './catalog';
import { symbolAt } from './text';

export function collectHover(text: string, offset: number): Hover | null {
  const hit = symbolAt(text, offset);
  if (!hit) return null;

  const qualified = hit.object ? `${hit.object}.${hit.name}` : hit.name;
  const sym = hit.object
    ? lookupMember(hit.object, hit.name) ?? lookupSymbol(hit.name)
    : lookupSymbol(hit.name);

  if (!sym) return null;

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: formatMarkdown(sym, qualified),
    },
  };
}
