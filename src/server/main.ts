#!/usr/bin/env node
/**
 * Kin language server — stdio LSP.
 *
 * VS Code launches this via the extension client. Other editors / lsp-mcp
 * can run:  node dist/server/main.js --stdio
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionParams,
  HoverParams,
  SignatureHelpParams,
  SemanticTokensParams,
  DidChangeConfigurationNotification,
  DefinitionParams,
  ReferenceParams,
  RenameParams,
  PrepareRenameParams,
  DocumentSymbolParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { collectCompletions } from './completions';
import { collectDiagnostics } from './diagnostics';
import { collectHover } from './hover';
import {
  collectDefinition,
  collectReferences,
  collectRename,
  prepareRename,
} from './navigation';
import { buildSemanticTokens, semanticTokensLegend } from './semanticTokens';
import { collectSignatureHelp } from './signatureHelp';
import { collectDocumentSymbols } from './symbols';
import { offsetAt } from './text';
import type { TextRange } from './scope';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  hasConfigurationCapability = !!params.capabilities.workspace?.configuration;
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.'],
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
      },
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        full: true,
        range: false,
      },
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      documentSymbolProvider: true,
    },
    serverInfo: {
      name: 'kin-language-server',
      version: '0.1.0',
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

function validate(doc: TextDocument): void {
  const diagnostics = collectDiagnostics(doc.getText());
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

documents.onDidOpen((event) => validate(event.document));
documents.onDidChangeContent((event) => validate(event.document));
documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

connection.onCompletion((params: CompletionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const offset = offsetAt(doc.getText(), params.position);
  return collectCompletions(doc.getText(), offset);
});

connection.onHover((params: HoverParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const offset = offsetAt(doc.getText(), params.position);
  return collectHover(doc.getText(), offset);
});

connection.onSignatureHelp((params: SignatureHelpParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const offset = offsetAt(doc.getText(), params.position);
  return collectSignatureHelp(doc.getText(), offset);
});

connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return { data: [] };
  }
  return buildSemanticTokens(doc.getText());
});

function lspRange(range: TextRange) {
  const length = Math.max(0, range.end - range.start);
  return {
    start: { line: range.line, character: range.character },
    end: { line: range.line, character: range.character + length },
  };
}

connection.onDefinition((params: DefinitionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const text = doc.getText();
  const range = collectDefinition(text, offsetAt(text, params.position));
  if (!range) return null;
  return { uri: doc.uri, range: lspRange(range) };
});

connection.onReferences((params: ReferenceParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const include = params.context?.includeDeclaration !== false;
  return collectReferences(text, offsetAt(text, params.position), include).map(
    (range) => ({ uri: doc.uri, range: lspRange(range) }),
  );
});

connection.onPrepareRename((params: PrepareRenameParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const text = doc.getText();
  const range = prepareRename(text, offsetAt(text, params.position));
  return range ? lspRange(range) : null;
});

connection.onRenameRequest((params: RenameParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const text = doc.getText();
  const edits = collectRename(text, offsetAt(text, params.position), params.newName);
  if (!edits) return null;
  return {
    changes: {
      [doc.uri]: edits.map((e) => ({ range: lspRange(e.range), newText: e.newText })),
    },
  };
});

connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return collectDocumentSymbols(doc.getText());
});

documents.listen(connection);
connection.listen();
