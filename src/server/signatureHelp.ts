import {
  MarkupKind,
  ParameterInformation,
  SignatureHelp,
  SignatureInformation,
} from 'vscode-languageserver/node';
import { formatMarkdown, formatSignature, lookupSymbol } from './catalog';
import { analyze, lookupUserFunction } from './scope';
import { collectObjectShapes, lookupUserProperty } from './shapes';
import { callContextAt } from './text';

export function collectSignatureHelp(
  text: string,
  offset: number,
): SignatureHelp | null {
  const ctx = callContextAt(text, offset);
  if (!ctx) return null;

  const catalog = lookupSymbol(ctx.callee);
  if (catalog && (catalog.kind === 'function' || catalog.kind === 'method')) {
    return fromCatalog(catalog, ctx.callee, ctx.argIndex);
  }

  const analysis = analyze(text);
  const user = resolveUserCallee(text, analysis, ctx.callee);
  if (!user) return null;

  const parameters: ParameterInformation[] = user.params.map((name) => ({
    label: name,
  }));
  const label = `${user.display}(${user.params.join(', ')})`;
  const info: SignatureInformation = {
    label,
    documentation: {
      kind: MarkupKind.Markdown,
      value: [
        `### \`${user.display}\``,
        '',
        `\`porogaramu_ntoya ${user.name}(${user.params.join(', ')})\``,
        '',
        'Porogaramu_ntoya muri iyi dosiye. / Function in this file.',
        user.doc ? `\n${user.doc}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    parameters,
  };
  const activeParameter =
    parameters.length === 0
      ? 0
      : Math.min(ctx.argIndex, parameters.length - 1);
  return { signatures: [info], activeSignature: 0, activeParameter };
}

function fromCatalog(
  sym: NonNullable<ReturnType<typeof lookupSymbol>>,
  callee: string,
  argIndex: number,
): SignatureHelp {
  const parameters: ParameterInformation[] = (sym.args ?? []).map((arg) => ({
    label: arg.name,
    documentation: {
      kind: MarkupKind.Markdown,
      value: `(\`${arg.type}\`${arg.required ? '' : ', optional'}) ${arg.documentation}`,
    },
  }));

  const info: SignatureInformation = {
    label: formatSignature(sym, callee),
    documentation: {
      kind: MarkupKind.Markdown,
      value: formatMarkdown(sym, callee),
    },
    parameters,
  };

  const activeParameter =
    parameters.length === 0
      ? 0
      : Math.min(argIndex, parameters.length - 1);

  return {
    signatures: [info],
    activeSignature: 0,
    activeParameter,
  };
}

function resolveUserCallee(
  text: string,
  analysis: ReturnType<typeof analyze>,
  callee: string,
): { name: string; display: string; params: string[]; doc?: string } | null {
  const user = lookupUserFunction(analysis, callee);
  if (user) {
    return {
      name: user.name,
      display: user.name,
      params: user.params,
      doc: user.docComment,
    };
  }

  const dot = callee.lastIndexOf('.');
  if (dot < 0) {
    const binding = analysis.bindings.find((b) => b.name === callee);
    if (binding?.boundName) {
      const fn = lookupUserFunction(analysis, binding.boundName);
      if (fn) {
        return {
          name: fn.name,
          display: callee,
          params: fn.params,
          doc: fn.docComment,
        };
      }
    }
    return null;
  }

  const object = callee.slice(0, dot);
  const member = callee.slice(dot + 1);
  const fromBinding = analysis.bindings
    .find((b) => b.name === object)
    ?.shape?.properties.get(member);
  const prop =
    fromBinding ?? lookupUserProperty(collectObjectShapes(text), object, member);
  if (prop?.boundName) {
    const fn = lookupUserFunction(analysis, prop.boundName);
    if (fn) {
      return {
        name: fn.name,
        display: member,
        params: fn.params,
        doc: fn.docComment,
      };
    }
  }
  return null;
}
