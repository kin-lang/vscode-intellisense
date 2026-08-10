import { Hover, MarkupKind } from 'vscode-languageserver/node';
import { formatMarkdown, lookupMember, lookupSymbol } from './catalog';
import { collectObjectShapes, lookupUserProperty } from './shapes';
import { symbolAt } from './text';

export function collectHover(text: string, offset: number): Hover | null {
  const hit = symbolAt(text, offset);
  if (!hit) return null;

  const qualified = hit.object ? `${hit.object}.${hit.name}` : hit.name;
  const sym = hit.object
    ? lookupMember(hit.object, hit.name) ?? lookupSymbol(hit.name)
    : lookupSymbol(hit.name);

  if (sym) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: formatMarkdown(sym, qualified),
      },
    };
  }

  if (hit.object) {
    const prop = lookupUserProperty(
      collectObjectShapes(text),
      hit.object,
      hit.name,
    );
    if (prop) {
      const lines = [
        `### \`${qualified}\``,
        '',
        `Property of \`${hit.object}\` in this file.`,
      ];
      if (prop.boundName) {
        lines.push('', `Set to \`${prop.boundName}\`.`);
        const bound = lookupSymbol(prop.boundName);
        if (bound) {
          lines.push('', formatMarkdown(bound, prop.boundName));
        }
      } else if (prop.nested) {
        const keys = [...prop.nested.properties.keys()].join(', ');
        lines.push('', `Nested object with: ${keys || '(empty)'}.`);
      }
      return {
        contents: { kind: MarkupKind.Markdown, value: lines.join('\n') },
      };
    }
  }

  return null;
}
