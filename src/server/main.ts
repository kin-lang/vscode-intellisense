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
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { collectCompletions } from './completions';
import { collectDiagnostics } from './diagnostics';
import { collectHover } from './hover';
import { buildSemanticTokens, semanticTokensLegend } from './semanticTokens';
import { collectSignatureHelp } from './signatureHelp';
import { offsetAt } from './text';

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

documents.listen(connection);
connection.listen();
