# Remaining IDE work

Short backlog for the Kin VS Code extension.

## Language alignment

- Depend on `@kin-lang/kin@^0.5.0` once published; keep catalog and TextMate in sync with keywords (`komeza`, `hagarara` as break).
- Prefer `Parser.parse()` diagnostics (multi-error, spans) over a single throw.

## Editor features

- Scope-aware completions (block / function locals only).
- Go to definition, find references, rename using AST spans.
- Hover and signature help for user-defined functions.
- Kinyarwanda as the default hover language with an EN setting.

## Docs

- Catalog and wiki should describe the same runtime behaviour (arrays as `urutonde`, `ifite` full scan, string `+`, truthiness).
