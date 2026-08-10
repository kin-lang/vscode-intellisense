import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { describe, test } from 'node:test';

const SERVER = path.join(__dirname, '../../dist/server/main.js');

type Rpc = Record<string, unknown>;

function startServer() {
  const child = spawn(process.execPath, [SERVER, '--stdio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buf = Buffer.alloc(0);
  const pending = new Map<number, (msg: Rpc) => void>();
  const notifications: Rpc[] = [];

  child.stdout!.on('data', (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const headerEnd = buf.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const header = buf.slice(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buf = buf.slice(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buf.length < bodyStart + length) return;
      const body = buf.slice(bodyStart, bodyStart + length).toString('utf8');
      buf = buf.slice(bodyStart + length);
      const msg = JSON.parse(body) as Rpc;
      if (typeof msg.id === 'number' && pending.has(msg.id)) {
        pending.get(msg.id)!(msg);
        pending.delete(msg.id);
      } else {
        notifications.push(msg);
      }
    }
  });

  let nextId = 1;
  const send = (message: Rpc) => {
    const json = JSON.stringify(message);
    child.stdin!.write(
      `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`,
    );
  };

  const request = (method: string, params: unknown) =>
    new Promise<Rpc>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(
        () => reject(new Error(`timeout waiting for ${method}`)),
        8000,
      );
      pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      send({ jsonrpc: '2.0', id, method, params });
    });

  const notify = (method: string, params: unknown) =>
    send({ jsonrpc: '2.0', method, params });

  const waitFor = (predicate: (n: Rpc) => boolean, ms = 8000) =>
    new Promise<Rpc>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const hit = notifications.find(predicate);
        if (hit) return resolve(hit);
        if (Date.now() - start > ms) {
          return reject(new Error('timeout waiting for notification'));
        }
        setTimeout(tick, 25);
      };
      tick();
    });

  return {
    request,
    notify,
    waitFor,
    notifications,
    stop: () => {
      child.kill();
    },
  };
}

describe('kin-lsp over stdio', () => {
  test('initialize, diagnose a bad file, hover and complete a good one', async () => {
    const lsp = startServer();
    try {
      const init = await lsp.request('initialize', {
        processId: null,
        rootUri: null,
        capabilities: {
          textDocument: {
            publishDiagnostics: {},
            completion: { completionItem: { snippetSupport: true } },
            hover: { contentFormat: ['markdown'] },
            semanticTokens: { requests: { full: true } },
          },
        },
        workspaceFolders: null,
      });
      const result = init.result as {
        capabilities: Record<string, unknown>;
        serverInfo: { name: string };
      };
      assert.equal(result.serverInfo.name, 'kin-language-server');
      assert.equal(result.capabilities.hoverProvider, true);
      assert.ok(result.capabilities.completionProvider);
      assert.ok(result.capabilities.signatureHelpProvider);
      assert.ok(result.capabilities.semanticTokensProvider);

      lsp.notify('initialized', {});

      const badUri = 'file:///tmp/bad.kin';
      lsp.notify('textDocument/didOpen', {
        textDocument: {
          uri: badUri,
          languageId: 'kinlang',
          version: 1,
          text: 'reka x = ~\n',
        },
      });

      const diag = await lsp.waitFor(
        (n) =>
          n.method === 'textDocument/publishDiagnostics' &&
          (n.params as { uri: string }).uri === badUri,
      );
      const diagnostics = (diag.params as { diagnostics: Array<{ message: string }> })
        .diagnostics;
      assert.ok(diagnostics.length > 0);
      assert.match(diagnostics[0].message, /Unexpected character/);

      const goodUri = 'file:///tmp/good.kin';
      const good = 'reka n = 2\ntangaza_amakuru(n)\nKIN_IMIBARE.umuzikare(n)\n';
      lsp.notify('textDocument/didOpen', {
        textDocument: {
          uri: goodUri,
          languageId: 'kinlang',
          version: 1,
          text: good,
        },
      });

      await lsp.waitFor(
        (n) =>
          n.method === 'textDocument/publishDiagnostics' &&
          (n.params as { uri: string }).uri === goodUri,
      );

      const hover = await lsp.request('textDocument/hover', {
        textDocument: { uri: goodUri },
        position: { line: 1, character: 4 },
      });
      const hoverValue = (
        hover.result as { contents: { value: string } }
      ).contents.value;
      assert.match(hoverValue, /tangaza_amakuru/);
      assert.match(hoverValue, /\*\*Arguments\*\*/);

      const completions = await lsp.request('textDocument/completion', {
        textDocument: { uri: goodUri },
        position: { line: 2, character: 'KIN_IMIBARE.'.length },
      });
      const labels = (
        completions.result as Array<{ label: string }>
      ).map((c) => c.label);
      assert.ok(labels.includes('umuzikare'));
      assert.ok(labels.includes('pi'));
      assert.ok(!labels.includes('reka'));

      const sig = await lsp.request('textDocument/signatureHelp', {
        textDocument: { uri: goodUri },
        position: {
          line: 2,
          character: good.split('\n')[2].indexOf('(') + 1,
        },
      });
      const sigResult = sig.result as {
        signatures: Array<{ label: string }>;
      };
      assert.match(sigResult.signatures[0].label, /umuzikare/);
    } finally {
      lsp.stop();
    }
  });
});
