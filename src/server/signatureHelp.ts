import {
  MarkupKind,
  ParameterInformation,
  SignatureHelp,
  SignatureInformation,
} from 'vscode-languageserver/node';
import { formatMarkdown, formatSignature, lookupSymbol } from './catalog';
import { callContextAt } from './text';

export function collectSignatureHelp(
  text: string,
  offset: number,
): SignatureHelp | null {
  const ctx = callContextAt(text, offset);
  if (!ctx) return null;

  const sym = lookupSymbol(ctx.callee);
  if (!sym || (sym.kind !== 'function' && sym.kind !== 'method')) {
    return null;
  }

  const parameters: ParameterInformation[] = (sym.args ?? []).map((arg) => ({
    label: arg.name,
    documentation: {
      kind: MarkupKind.Markdown,
      value: `(\`${arg.type}\`${arg.required ? '' : ', optional'}) ${arg.documentation}`,
    },
  }));

  const info: SignatureInformation = {
    label: formatSignature(sym, ctx.callee),
    documentation: {
      kind: MarkupKind.Markdown,
      value: formatMarkdown(sym, ctx.callee),
    },
    parameters,
  };

  const activeParameter =
    parameters.length === 0
      ? 0
      : Math.min(ctx.argIndex, parameters.length - 1);

  return {
    signatures: [info],
    activeSignature: 0,
    activeParameter,
  };
}
