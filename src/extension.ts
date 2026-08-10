import * as path from 'path';
import {
  commands,
  ExtensionContext,
  window,
  workspace,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

function shellQuote(value: string): string {
  if (process.platform === 'win32') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function activate(context: ExtensionContext): void {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server', 'main.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'kinlang' },
      { scheme: 'untitled', language: 'kinlang' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.kin'),
    },
  };

  client = new LanguageClient(
    'kinlang',
    'Kin Language Server',
    serverOptions,
    clientOptions,
  );

  context.subscriptions.push(
    commands.registerCommand('kinlang.runFile', async () => {
      const editor = window.activeTextEditor;
      if (!editor) {
        void window.showWarningMessage(
          'Nta dosiye ya Kin ifunguye. / No Kin file is open.',
        );
        return;
      }
      if (editor.document.isDirty) {
        await editor.document.save();
      }
      const file = editor.document.uri.fsPath;
      const term =
        window.terminals.find((t) => t.name === 'Kin') ??
        window.createTerminal('Kin');
      term.show();
      term.sendText(`kin run ${shellQuote(file)}`);
    }),
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
