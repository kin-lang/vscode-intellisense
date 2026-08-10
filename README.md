# Kin for Visual Studio Code

Official [Kin](https://github.com/kin-lang/kin) language support.

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pacifiquem.kinlang) or search **kinlang** in the Extensions view.

## Features

- Syntax highlighting for `.kin` files
- Syntax diagnostics from the Kin parser (red squiggles as you type)
- Completions for keywords, built-ins (`tangaza_amakuru`, `KIN_IMIBARE`, …), and names in the current file
- Hover and signature help: what each built-in does and what every argument means
- Snippets for `reka`, `niba`, `subiramo_niba`, `porogaramu_ntoya`, `gereranya`

## Requirements

None to edit and check syntax. To **run** a program you still need the [Kin CLI](https://www.npmjs.com/package/@kin-lang/kin):

```bash
npm i -g @kin-lang/kin
kin run hello.kin
```

## Language server

The extension starts `kin-lsp` (`dist/server/main.js`) over stdio. Other editors can launch the same binary:

```bash
node dist/server/main.js --stdio
```

Language id: `kinlang`.

## Develop

```bash
npm install
npm run compile
npm test
```

`Cmd+Shift+P` → **Debug: Start Debugging** → **Run Kin extension** (do not use F5 on a Mac — that starts Dictation).

## Publish (maintainers)

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. `npm test` then `npm run package` (writes a `.vsix`).
3. Publish:
   - GitHub Actions: **Actions → Publish to Marketplace → Run workflow** (needs repo secret `VSCE_PAT`), or
   - Locally: `VSCE_PAT=… npm run publish:vsce`
4. Tag `vX.Y.Z` to match the marketplace version.

Create a Personal Access Token at [Azure DevOps](https://dev.azure.com) with **Marketplace → Manage** for publisher `pacifiquem`, then store it as `VSCE_PAT`.

## License

Apache License 2.0.
