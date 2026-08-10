# Changelog

## 0.2.0

Language server and highlighting overhaul. Closes [#5](https://github.com/kin-lang/vscode-intellisense/issues/5) and [#6](https://github.com/kin-lang/vscode-intellisense/issues/6).

- Embedded Kin LSP: diagnostics from the real parser, completions, hover, signature help
- Hover/signature docs for every keyword and built-in (arguments, returns, examples)
- TextMate grammar rewritten: `hagarara`, `niba`/`subiramo_niba` no longer look like functions, no fake single-quoted strings, operators and `KIN_*` namespaces scoped separately
- Semantic tokens on top of TextMate
- Marketplace packaging: npm `@kin-lang/kin`, `vsce` scripts, CI + publish workflow

## 0.0.1

Initial marketplace release: TextMate highlighting for `.kin` files.
