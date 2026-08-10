import { Hover, MarkupKind } from 'vscode-languageserver/node';
import { formatMarkdown, lookupMember, lookupSymbol } from './catalog';
import { collectObjectShapes, lookupUserProperty } from './shapes';
import {
  analyze,
  lookupUserFunction,
  useAt,
} from './scope';
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

  const analysis = analyze(text);

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
        `Umunyamuryango wa \`${hit.object}\` muri iyi dosiye. / Property of \`${hit.object}\` in this file.`,
      ];
      if (prop.boundName) {
        lines.push('', `Agaciro / set to \`${prop.boundName}\`.`);
        const bound = lookupSymbol(prop.boundName);
        if (bound) {
          lines.push('', formatMarkdown(bound, prop.boundName));
        } else {
          const userFn = lookupUserFunction(analysis, prop.boundName);
          if (userFn) {
            lines.push('', userFunctionMarkdown(userFn.name, userFn.params, userFn.docComment));
          }
        }
      } else if (prop.nested) {
        const keys = [...prop.nested.properties.keys()].join(', ');
        lines.push('', `Igikubo / nested object: ${keys || '(empty)'}.`);
      }
      return {
        contents: { kind: MarkupKind.Markdown, value: lines.join('\n') },
      };
    }
  }

  const use = useAt(analysis, offset);
  const binding = use?.binding;
  if (binding && binding.kind !== 'builtin') {
    if (binding.kind === 'function') {
      return md(
        userFunctionMarkdown(binding.name, binding.params ?? [], binding.docComment),
      );
    }
    return md(variableMarkdown(binding.name, binding.kind, binding.inferred, binding.shape));
  }

  const userFn = lookupUserFunction(analysis, hit.name);
  if (userFn && !hit.object) {
    return md(userFunctionMarkdown(userFn.name, userFn.params, userFn.docComment));
  }

  return null;
}

function userFunctionMarkdown(
  name: string,
  params: string[],
  doc?: string,
): string {
  const sig = `porogaramu_ntoya ${name}(${params.join(', ')})`;
  const lines = [
    `### \`${name}\``,
    '',
    `\`${sig}\``,
    '',
    'Porogaramu_ntoya muri iyi dosiye. / Function in this file.',
  ];
  if (params.length > 0) {
    lines.push('', '**Arguments**');
    for (const p of params) lines.push(`- \`${p}\``);
  }
  if (doc) {
    lines.push('', doc);
  }
  return lines.join('\n');
}

function variableMarkdown(
  name: string,
  kind: string,
  inferred: string,
  shape: { properties: Map<string, unknown> } | undefined,
): string {
  const kw = kind === 'const' ? 'ntahinduka' : kind === 'param' ? 'parametere' : 'reka';
  const en =
    kind === 'const' ? 'constant' : kind === 'param' ? 'parameter' : 'variable';
  const lines = [
    `### \`${name}\``,
    '',
    `${kw} \`${name}\` muri iyi dosiye. / ${en} \`${name}\` in this file.`,
  ];
  if (inferred && inferred !== 'unknown') {
    lines.push('', `Ubwoko / shape: \`${inferred}\`.`);
  }
  if (shape && shape.properties.size > 0) {
    const keys = [...shape.properties.keys()].join(', ');
    lines.push('', `Imfunguzo / keys: ${keys}.`);
  }
  return lines.join('\n');
}

function md(value: string): Hover {
  return { contents: { kind: MarkupKind.Markdown, value } };
}
