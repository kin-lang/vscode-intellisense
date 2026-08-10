# vscode-intellisense gaps (strict review)

Generated against Kin implementation + wiki translations + gopls-class IDE bar.

Scope: `kin/` (lexer/parser/runtime/grammar/examples), `vscode-intellisense/` (LSP + TextMate + tests), `wiki/src/pages/` (EN + RW). Comparison bar is gopls / VS Code Go, mapped to Kin’s actual surface (no modules, no types, no interfaces). This is not a compliment sheet. Working features are one line in a matrix.

**Hard contradiction the rest of this file depends on:** the extension’s language package is npm `@kin-lang/kin@^0.4.3`. That published parser has **no** `hagarara` keyword and **no** `BreakStatement`. Local `kin/src/lexer/tokens.ts` **does**. Catalog, TextMate, `tests/fixtures/loops.kin`, and `kin/examples/loops.kin` document the unpublished break keyword. Wiki `utility-functions.mdx` documents the published `hagarara(0)` exit. The LSP is not talking about one language.

---

## P0 — must have for an educational LSP

### 1. Extension is bound to a different Kin than the repo it claims to describe

- **Go / main languages:** gopls is built with the same toolchain it analyzes. vscode-go refuses to “guess” a language the binary does not implement.
- **Kin language actually supports:** two incompatible `hagarara`s.
  - Local unpublished `kin/src/lexer/lexer.ts` (`lexeme === 'hagarara'` → `TokenType.HAGARARA`), `kin/src/parser/parser.ts` `parse_break_statement`, `kin/src/runtime/eval/statements.ts` `eval_break_statement`. `kin/examples/loops.kin` uses bare `hagarara` as break.
  - The same local `kin/src/runtime/globals.ts` still `declareVar('hagarara', MK_NATIVE_FN(process.exit))`. Dead: the lexer never yields an identifier named `hagarara`.
  - npm `@kin-lang/kin@0.4.3` used by the extension (`vscode-intellisense/package.json`, `node_modules/@kin-lang/kin/dist/src/lexer/tokens.js`): **no `HAGARARA` token**. `hagarara` is an identifier. `globals.js` registers the exit native. `hagarara(0)` **is** callable. Bare `hagarara` is a no-op expression (looks up the native-fn value).
  - Both trees still advertise version `0.4.3`.
- **Extension today:** `src/server/catalog.ts` documents `hagarara` as “break out of a loop” and states the exit native “cannot be called from source.” That is true only of unpublished local Kin. Diagnostics use `new Parser()` from the npm package (`src/server/diagnostics.ts`), so `hagarara` in a student file is **not** a keyword to the parser the LSP runs. `tests/diagnostics.test.ts` “accepts every example program” including `tests/fixtures/loops.kin` (`hagarara` as break) — it passes because the published parser treats it as an identifier expression, not because it parsed a break. TextMate and keyword completions still paint/offer `hagarara` as a keyword (`syntaxes/kinlang.tmLanguage.json`, `catalog.ts` `KEYWORDS`).
- **Kinyarwanda:** wiki EN+RW `docs/built-in/utility-functions.mdx` teach `hagarara(0)` as “stop Kin” / “guhagarika Kin”. Wiki EN+RW `Loops.mdx` never mention break. Three teachers, three stories.
- **Work:** pick one language. Publish the local Kin (or `file:`-depend on it). Delete or rename the exit native *before* adding the keyword, or keep the exit native and stop calling `hagarara` a keyword. Rewrite catalog, TextMate, fixtures, wiki utility-functions, and wiki Loops to match the shipped parser. Add a test that `collectDiagnostics` + the **same** Parser the LSP loads agree with every catalog keyword.

### 2. No go-to-definition, find-references, or rename

- **Go / main languages:** gopls: `textDocument/definition`, `references`, `rename`. Table stakes in VS Code (F12 / Shift+F12 / F2).
- **Kin language actually supports:** a single-file name graph. `VariableDeclaration.identifier`, `FunctionDeclaration.name` + `parameters`, object keys, `Identifier.symbol`, `MemberExpression`. No packages. Feasible today by walking the AST + a token scan. Precision is capped because `kin/src/parser/ast.ts` stores **no** `loc`/`span` and `kin/src/lexer/lexer.ts` `Token` has `line` only (no column).
- **Extension today:** `src/server/main.ts` `onInitialize` capabilities: sync, completion, hover, signatureHelp, semanticTokens. Nothing else. No `definitionProvider`, `referencesProvider`, `renameProvider`.
- **Kinyarwanda:** n/a (navigation is not a doc string).
- **Work:** add column to the lexer token; put `start`/`end` on AST nodes. Implement definition (decl of `reka`/`ntahinduka`/`porogaramu_ntoya`/param), references (every `Identifier` with that symbol in the resolved scope), rename (those plus object keys if requested). Until lexer columns exist, F12 to a line-range is still better than nothing — ship that rather than shipping nothing.

### 3. Hover and signature help ignore the student’s own functions and variables

- **Go / main languages:** hover on any ident = signature + doc comment. Signature help on `add(a, |)` shows `add(a int, b int)`.
- **Kin language actually supports:** `porogaramu_ntoya add(a, b) { tanga a + b }` is a `FunctionDeclaration` with `name` and `parameters`. Runtime rejects wrong arity (`kin/src/runtime/eval/expressions.ts` `eval_call_expr`). Object members can be that function (`kin/examples/functions.kin` `obj.addNumbers`, `kin/examples/objects.kin` `obj.key3`).
- **Extension today:**
  - `src/server/hover.ts`: catalog hit or user **object member**. `collectHover('reka xyz = 1', 6)` is explicitly tested to be `null` (`tests/completions-hover.test.ts`). Hover on the student’s `add` is `null`. Hover on `obj.addNumbers` says “Set to `add`” and then, because `add` is not in the catalog, stops.
  - `src/server/signatureHelp.ts`: `lookupSymbol(ctx.callee)` catalog only. `add(` and `obj.addNumbers(` return `null`. `callContextAt` already parses `obj.method` (`src/server/text.ts`); the data is thrown away.
  - `src/server/shapes.ts` records `boundName` but never looks up the user function’s parameter list.
- **Kinyarwanda:** even the catalog hover is English (see P0.7). User symbols have no language at all.
- **Work:** index user functions from the AST (name, params, optional leading `#` comments). Hover `add` → `porogaramu_ntoya add(a, b)`. Signature help on `add(` and on `obj.addNumbers(` via `boundName`. Hover `reka x = 1` → “variable `x` in this file”, with a guessed shape if it is an object/array literal.

### 4. Completions are not scoped — and after `.` on an array they insert illegal Kin

- **Go / main languages:** gopls completes identifiers **in scope**, selectors after `.`, and does not offer completions that will not parse.
- **Kin language actually supports:** nested environments. Function body: new env (`eval_call_expr`). `niba`/`niba_byanze` body: `eval_body(..., newEnv=true)` (`kin/src/runtime/eval/statements.ts`). Loop: fresh env per iteration. Shadowing is real. Arrays are objects keyed `"0"`, `"1"`, … (`parser.ts` `parse_array_expr`); access is `arr[0]`, **not** `arr.0` (`parse_member_expr` requires an Identifier after `.`; lexer identifiers cannot start with a digit). Nested `list4[1][0]` and `list3[0].key` are in `kin/examples/arrays.kin`. `foo().bar` is **illegal** (`grammar.bnf`).
- **Extension today:**
  - Top-level names: `collectDeclaredNames` in `src/server/text.ts` — three regexes plus a param scrape. Every `reka`/`ntahinduka`/`porogaramu_ntoya` and **every parameter of every function** is offered at every cursor. No block scope, no shadowing, no “not after this decl”, names inside comments/strings match.
  - `usanze`/`ibindi` are in the global keyword list only. No switch-context completion, no completion of in-scope constants as case labels.
  - Trigger characters: `['.']` only (`main.ts`).
  - After `obj.` / `obj.key4.`: `shapes.ts` works for identifier chains of `{ key: value }` literals, including `addNumbers: add` (`tests/completions-hover.test.ts`). That part is real.
  - After `reka list = [10, 20]\nlist.`: `shapeFromLiteral` treats the array as an `ObjectLiteral` with keys `"0"`, `"1"`. Completions offer `0`, `1`. Inserting them yields `list.0`, which the parser rejects (`Dot operator (".") is illegal without right-hand-side being an Identifier` / unexpected token).
  - After `list3[0].` or `obj["key4"].`: `memberPathAt` cannot walk `[` / `]`; it sees `0` or `]` and returns no path. Nested completions die the moment the student uses the access form Kin actually teaches.
- **Kinyarwanda:** snippets and details are English (`'name in this file'`, `'member of object'`).
- **Work:** build a scope tree from the AST at the cursor offset. Offer params only inside that function, block locals only in that block. Do **not** complete numeric keys after `.`. After `[`, offer nothing (or literals), not members. After `ident[index].`, resolve the element shape (nested object/array) and complete those keys. Suppress completions inside `#` comments and `"…"` strings. Add `usanze`/`ibindi` as the primary items inside `gereranya { … }`.

### 5. Diagnostics are “first lexer/parser explosion, maybe on the wrong line”

- **Go / main languages:** gopls reports many compile errors with exact ranges, and does not punish the whole file for a trailing `.` while you complete.
- **Kin language actually supports:** parse errors (lexer + parser) and a large class of **runtime** errors that are still deterministic from the AST: unresolved ident (`environment.ts` `resolve`), redeclare, assign to `ntahinduka`, call of non-fn, user-fn arity, native min-args, `+`/`-`/`*`/`/`/`%`/`^`/`</>` on non-numbers → `ubusa` (`eval_numeric_binary_expr` else branch), `hagarara` outside a loop (accepted by the local parser, ignored or sticky via static `loopBroken`), statements after `tanga` (wiki/`functions.kin` claim an error; `eval_call_expr` just skips them).
- **Extension today:** `collectDiagnostics` (`src/server/diagnostics.ts`) is `try { new Parser().produceAST(text) } catch { return [one] }`. One diagnostic. Incremental sync is declared (`TextDocumentSyncKind.Incremental`) but every change re-parses the whole buffer and publishes 0 or 1 error.
  - Lexer tokens have no column; `parseDiagnostic` guesses with `indexOf(token)` on the line, or the whole line, or **line 1**.
  - `ntahinduka x;` throws `new Error('Constant variables must be assigned a value')` with **no line** (`parser.ts` `parse_var_declaration`). Diagnostic lands on line 1 even if the bad const is at the bottom of the file.
  - Trailing `obj.` while typing: `parse_member_expr` → unexpected token / illegal dot. Squiggle, often on the wrong range. `shapes.ts` already strips the open `.member` for **completions**; diagnostics do not.
  - Runtime-class errors: never reported. `reka x = 1 reka x = 2` is green. `y` undeclared is green. `ntahinduka x = 1 x = 2` is green. `add(1)` wrong arity is green. `"a" + 1` is green (runtime `ubusa`). `tangaza_amakuru()` is fine; `injiza_amakuru()` (0 args) is green. Wiki and `functions.kin` tell students “statement after `tanga` is an error”; the LSP agrees with the runtime (silence), not with the docs they are reading.
- **Kinyarwanda:** diagnostic text is raw English from `LogError` / `throw`. No RW messages. No codes (`kin.const-needs-value`).
- **Work:** (1) columns on tokens, spans on AST. (2) Parse recovery, or at least continue after `;` / `}` so the second error exists. (3) Reuse `sourceForShapes` (or a dedicated “prefix parse”) so `obj.` / `foo(` mid-type do not scream. (4) A cheap AST pass: unresolved names, redeclare in the same env, assign to const, call of a known non-fn, arity vs user `FunctionDeclaration` and vs catalog `args`, `hagarara` not inside `subiramo_niba`, unreachable stmts after `tanga` (warning, matching the wiki). (5) Translate the messages.

### 6. Semantic tokens paint string contents as variables

- **Go / main languages:** gopls semantic tokens use the real token type. Strings are strings.
- **Kin language actually supports:** `TokenType.STRING = 24` (published and local). Lexer strips quotes and returns the body (`lexer.ts` `scanStringLiteral`).
- **Extension today:** `src/server/semanticTokens.ts` `classify()` never consults `TokenType.STRING`. Identifier-shaped bodies (`"Hello"`, `"Kin"`, `"a"`) match `/^[A-Za-z_][A-Za-z0-9_]*$/` and become `variable`. Only bodies with spaces/punctuation become `string`. Comment in that file claims `STRING = 31` — false in both trees. Members after `.` (`pi`, `ingano`, user keys) are `variable`, not `property`. Range tokens: not implemented (`full: true, range: false`).
- **Kinyarwanda:** n/a.
- **Work:** classify by `token.type`, not by lexeme shape. Map `STRING` → `string` (include the quotes in the painted span). Map `X.Y` where `Y` is a known member or a shape key → `property`. Delete the `STRING = 31` comment. Add a test: `reka s = "Hello"` yields a `string` token, not `variable`.

### 7. In-editor documentation is English. Kin exists so students do not need English.

- **Go / main languages:** hover is the language’s own docs (go doc). An educational language whose keywords are Kinyarwanda cannot ship English as the only teaching paragraph.
- **Kin language actually supports:** the whole surface is Kinyarwanda keywords + `KIN_*` names. Wiki has a full `rw/docs/**` tree.
- **Extension today:** `src/server/catalog.ts` is English `documentation` plus, on some entries, a one-line `Kinyarwanda: *word* = gloss`. `formatMarkdown` dumps that English. No `kinlang.locale` setting. Hover/signature never load wiki MDX.
  - **No RW paragraph at all (not even a gloss):** `filename`, `KIN_IMIBARE.pi`, `KIN_IMIBARE.sin`, `KIN_IMIBARE.cos`, `KIN_IMIBARE.tan`, `KIN_URUTONDE.ingano`.
  - **Gloss only (every other catalog entry).** List: `reka`, `ntahinduka`, `porogaramu_ntoya`, `tanga`, `niba`, `nanone_niba`, `niba_byanze`, `subiramo_niba`, `hagarara`, `gereranya`, `usanze`, `ibindi`, `nibyo`, `sibyo`, `ubusa`, `ikosa`, `tangaza_amakuru`, `injiza_amakuru`, `sisitemu`, `ubwoko`, `KIN_IMIBARE`, `umuzikare`, `umubare_utazwi`, `kuraho_ibice`, `KIN_AMAGAMBO`, `huza`, `KIN_AMAGAMBO.ingano`, `inyuguti`, `inyuguti_nkuru`, `inyuguti_ntoya`, `tandukanya`, `KIN_URUTONDE`, `ongera_kumusozo`, `siba_kumusozo`, `injiza_ahabanza`, `siba_ahabanza`, `ifite_ikirango`, `ifite`, `kora_ijambo`, `KIN_IGIHE`, `isaha`, `umunsi`, `itariki`, `KIN_INYANDIKO`, `soma`, `andika`, `vugurura`, `KIN_INYANDIKO.siba`.
- **Kinyarwanda:** missing as a teaching surface. Partial as a glossary.
- **Work:** add `documentation_rw` (full paragraphs, args, examples) for every catalog entry. Default hover to Kinyarwanda; setting to flip EN. Do not ship another gloss line and call it translated.

### 8. Catalog/wiki teach several runtime lies. An educational hover that repeats them is worse than no hover.

- **Go / main languages:** go doc matches the package you import.
- **Kin language actually supports:** see citations below.
- **Extension today:** catalog is closer to `globals.ts` than the wiki is, but still silent on the landmines students will hit in the first hour. Wiki is loaded by humans (and will be copy-pasted into “docs” later). Neither is wired to a single source of truth.
- **Kinyarwanda:** RW wiki copies the EN lies (and invents new ones, e.g. weekday names).
- **Work:** fix the facts in catalog first (that is what hover shows), then wiki. Required corrections:

  | Lie | Reality |
  | --- | --- |
  | `KIN_IMIBARE.pi` is a number you can compute with | `globals.ts` `.set('pi', Math.PI)` stores a **raw JS number**, not `MK_NUMBER`. `eval_numeric_binary_expr` then misses `lhs.type === 'number'` and returns `ubusa`. `KIN_IMIBARE.pi + 1` is empty. Catalog does not say this. |
  | Wiki `ubwoko(5)` prints `umubare` (`utility-functions.mdx` EN+RW) | `ubwoko` returns `args[0].type` → `"number"` (`globals.ts`, `values.ts` `ValueType`). |
  | Wiki `KIN_IGIHE.itariki()` is `(YYYY-MM-DD)` | `moment().format('Do MMM YY')` e.g. `"10th Aug 26"`. Catalog is correct; wiki is not. |
  | RW wiki `KIN_IGIHE.umunsi()` → `Kuwa Mbere, …` | `moment().format('dddd')` → English `"Monday"`. |
  | Wiki `KIN_URUTONDE.ifite` is “array includes” (`Arrays.mdx` EN+RW) | `globals.ts` `ifite` reads **one** `arr.next()?.value` — first element only. Catalog documents the quirk; wiki teaches the opposite with an example that only works because `"Hello"` is first. |
  | Wiki `KIN_INYANDIKO.andika`/`vugurura` return `sibyo` on failure | They `return MK_STRING(error.message)`. Success is `MK_BOOL()` (true). Never false. |
  | Wiki `hagarara(0)` stops the process | See P0.1. |
  | Wiki/Functions.kin: stmt after `tanga` is an error | `eval_call_expr` returns on the next iteration; no throw. |
  | Wiki `Functions.mdx` example uses `return a * b;` and says `$` is legal in names | Keyword is `tanga`. Lexer: `[A-Za-z_]` then `[A-Za-z0-9_]*`. No `$`. |
  | Wiki `Objects.mdx` example `const car = {` | Not Kin. `reka` / `ntahinduka`. |
  | Wiki `Data-types.mdx` `reka x        # Now x is undefined` | Parse error: omitted initializer requires `;`. |
  | Wiki `Conditions.mdx` intro swaps `nanone_niba` and `niba_byanze` | Else-if vs else. Body sections are correct; the intro is not. EN and RW. |
  | Wiki `Scope.mdx`: only function + global | `eval_body` creates an env for `niba`/`niba_byanze`; loops create envs. Block scope exists. |
  | Wiki `Loops.mdx`: no `hagarara` | Local Kin has break. Published Kin does not. Pick one and write it down. |
  | Wiki has **no** `KIN_IMIBARE` page | Entire math namespace is hover-only, English. |
  | Wiki Arrays omits `ongera_kumusozo`, `siba_kumusozo`, `injiza_ahabanza`, `siba_ahabanza`, `ifite_ikirango` | Five of eight list helpers are undocumented outside catalog. |
  | Wiki never mentions `filename` or `ikosa` | Both are globals. `filename` is how `KIN_INYANDIKO` resolves paths. |
  | Wiki `sisitemu("sudo shutdown now")` with no warning | Catalog warns. Wiki (EN+RW) offers shutdown as the example. |
  | Wiki EN `Strings.mdx` `KIN_AMAGAMBO.inyuguti(8)` | Needs `(str, 8)`. RW page fixed it; EN did not. |

---

## P1 — should have to match Go-like editing

### Document symbols, outline, breadcrumbs

- **Go / main languages:** gopls `documentSymbol` / `workspaceSymbol`. VS Code Outline and breadcrumbs.
- **Kin language actually supports:** top-level and nested `porogaramu_ntoya`, `reka`/`ntahinduka`, object keys. No packages; workspace symbol = grep `.kin` files.
- **Extension today:** not registered.
- **Kinyarwanda:** symbol kinds can stay generic; labels are the Kin names.
- **Work:** `documentSymbolProvider` from the AST. `workspaceSymbolProvider` over open / workspace `.kin` files.

### Folding and indentation

- **Go / main languages:** folding on functions/blocks; indent rules.
- **Kin language actually supports:** `{` `}` blocks for fn/if/else/loop/object; `gereranya` cases are colon-sections without braces.
- **Extension today:** `language-configuration.json` has brackets and auto-close for `{}[]()` and `"`. No `folding`, no `indentationRules`, no `onEnterRules`, no `foldingRangeProvider`.
- **Kinyarwanda:** n/a.
- **Work:** indent on `{` / `gereranya` / `usanze`. Fold `{…}` and `#` comment regions. Do not auto-close `'`.

### Code actions / quick fixes

- **Go / main languages:** gopls diagnostics carry `SuggestedFix` (and a long refactor list).
- **Kin language actually supports:** mechanical fixes: insert `;` after `reka x`, add initializer on `ntahinduka`, wrap `"…"` around a single-quoted attempt, replace `return`/`const`/`let` (wiki copy-paste), delete unreachable stmts after `tanga`, stub `porogaramu_ntoya`.
- **Extension today:** no `codeActionProvider`. Diagnostics have no `code` / `data`.
- **Kinyarwanda:** action titles should be RW (`Ongeraho ';'`, …).
- **Work:** attach codes to P0 diagnostics; ship the five fixes above first.

### Inlay hints for parameters

- **Go / main languages:** gopls parameter hints (optional).
- **Kin language actually supports:** catalog `args[].name` and user `FunctionDeclaration.parameters`.
- **Extension today:** signature help only, catalog only.
- **Kinyarwanda:** hint names are already Kin (`min`, `max`, `inyuguti`’s `index`, …). Prefer the Kin names.
- **Work:** `inlayHintProvider` for catalog + user calls.

### Formatting

- **Go / main languages:** `gofmt` via gopls `formatting` / `rangeFormatting`.
- **Kin language actually supports:** no official formatter. Whitespace is insignificant; `;` is meaningful only for omitted init/return (`grammar.bnf`, wiki `Syntax.mdx`).
- **Extension today:** no `documentFormattingProvider`.
- **Kinyarwanda:** n/a.
- **Work:** a conservative formatter (indent blocks, spaces around `=`, no semicolon insertion except the two required cases). Do not invent a style war. Do not run a JS formatter on `.kin`.

### Context-sensitive completions and snippets

- **Go / main languages:** gopls + vscode-go snippets (`func`, `if`, `for`). Completion does not fire inside strings. More trigger characters than `.`.
- **Kin language actually supports:** keyword forms in `catalog.ts` already have snippets (`reka`, `niba`, `subiramo_niba`, `porogaramu_ntoya`, `gereranya`, `usanze`, `ibindi`). No user-snippet file. `package.json` `contributes.snippets` is absent.
- **Extension today:** snippets only as `insertText` on those keyword items. No `KIN_URUTONDE.ingano(${1:urutonde})` snippet. Completion still runs inside `"…"` and `# …`. No `:` trigger for `usanze`.
- **Kinyarwanda:** snippet placeholders are already Kin (`izina`, `agaciro`) — keep that, don’t switch to `name`/`value`.
- **Work:** suppress in comments/strings. Add member-call snippets. Contribute a `snippets/kin.code-snippets` for the same prefixes when the LSP is down.

### Run the current file

- **Go / main languages:** vscode-go CodeLens / `Go: Run`.
- **Kin language actually supports:** `kin run path.kin` (`kin/README.md`, `bin/kin.ts`).
- **Extension today:** no command, no CodeLens, no task. README tells you to leave the editor.
- **Kinyarwanda:** command title `Kin: Koresha dosiye`.
- **Work:** `kinlang.runFile` → `kin run ${file}`. Surface stderr as diagnostics when possible.

### TextMate member list is a global highlighter

- **Go / main languages:** TextMate is conservative; semantic tokens do the precise work.
- **Kin language actually supports:** `siba` is `KIN_INYANDIKO.siba`. `sin` is `KIN_IMIBARE.sin`. `ingano` is two different methods. `pi` is a property. User variables may use any of these words.
- **Extension today:** `syntaxes/kinlang.tmLanguage.json` one regex paints `pi|umuzikare|…|siba|sin|ifite|ingano|…` as `support.function.member.kin` **anywhere**. `filename` is `support.function.kin` but is a string constant. `hagarara` keyword pattern is present (the old “missing keyword” bug is fixed). Single quotes are not strings (correct).
- **Kinyarwanda:** n/a.
- **Work:** require a `KIN_* .` prefix (or a `.` prefix) for member names. Recolor `filename` as a constant. Leave keyword/namespace/builtin-fn rules as they are.

### Nested / computed member hover

- **Go / main languages:** hover on `p.X.Y` resolves the chain.
- **Kin language actually supports:** `obj.key4.sub_obj.sub_sub_key` and `obj["key4"]["sub_obj"]` (`kin/examples/objects.kin`).
- **Extension today:** `symbolAt` / `lookupUserProperty` only do `object.member` one hop (`hover.ts`, `shapes.ts` `lookupUserProperty`). Completions walk nested identifier paths; hover does not.
- **Kinyarwanda:** partial (same as P0.7).
- **Work:** reuse `memberPathAt` + `resolveShape` for hover.

### DidChange quality

- **Go / main languages:** gopls is incremental and still useful on broken files.
- **Kin language actually supports:** files are small; full reparse is fine. Recovery is not.
- **Extension today:** Incremental sync + full `produceAST` on every change. First error only. Open-dot screams (P0.5).
- **Kinyarwanda:** n/a.
- **Work:** once recovery exists, debounce is optional. Until then, skip diagnostics when the only error is an incomplete trailing `.` / `(` / `{`.

---

## P2 — polish / later

### Call hierarchy, document highlight, selection range

- **Go / main languages:** gopls has all three.
- **Kin language actually supports:** call graph is trivial (no methods, no interfaces). Document highlight = same-name idents in scope.
- **Extension today:** none.
- **Kinyarwanda:** n/a.
- **Work:** after P0 references.

### Semantic tokens: range, modifiers, user decls

- **Go / main languages:** range requests; `definition`/`readonly` modifiers.
- **Kin language actually supports:** `ntahinduka` and all `KIN_*` / builtins are readonly; `reka` is not. Function names are declarations.
- **Extension today:** `declaration` bit never set. `readonly` only on `CONSTANT_NAMES`. `full` only.
- **Kinyarwanda:** n/a.
- **Work:** mark decls; mark `ntahinduka` readonly; implement `range: true`.

### Workspace-wide anything

- **Go / main languages:** gopls is a module-aware workspace server.
- **Kin language actually supports:** no import / no module. A “workspace” is a folder of unrelated `.kin` files. Completions/refs across files are a policy choice (today they do not exist).
- **Extension today:** `synchronize.fileEvents: **/*.kin` is registered and unused. Completions are current buffer only.
- **Kinyarwanda:** n/a.
- **Work:** decide. If Kin stays “one file = one program,” document that and drop the unused watcher. If not, index every `.kin` for workspace symbols only (do not pretend names in `a.kin` are in scope in `b.kin` — they are not, unless you run them as one).

### Debugger, tests UI, CodeLens

- **Go / main languages:** Delve + vscode-go.
- **Kin language actually supports:** tree-walk interpreter, no debug protocol, no `testing` package.
- **Extension today:** none. Correct to skip a debugger.
- **Kinyarwanda:** n/a.
- **Work:** do not build DAP. A “Run file” command (P1) is the whole story.

### Lexer leftovers the IDE should not pretend exist

- **Go / main languages:** gopls does not complete tokens the compiler rejects.
- **Kin language actually supports:** lexer tokenizes `++` `--` `&` and errors on lone `|`. Parser never accepts them (`grammar.bnf` “Unused tokens”). `'` is an unexpected character. No escapes in strings. `!` applies only to an identifier (`!x`, not `!(x==1)`). `&&`/`||` and relations do not chain.
- **Extension today:** no completion for `++`. TextMate still has a comparison/operator section (fine). No diagnostic *explaining* “`&&` does not chain” — the parser just stops at the first extra operator as a new expression/statement, which is worse.
- **Kinyarwanda:** missing explanations.
- **Work:** when `++`/`--`/`&`/`'` appear, diagnostic text should say “not Kin; use `x = x + 1` / `"`”. When `a && b || c` is written, warn. Catalog/hover on `!` should say “identifier only.”

### Language-configuration word pattern

- **Go / main languages:** word pattern matches identifiers.
- **Kin language actually supports:** `[A-Za-z_][A-Za-z0-9_]*`.
- **Extension today:** `language-configuration.json` `wordPattern` is the VS Code default-ish catch-all; it is fine for double-click. `#` is excluded. `.` is excluded (good for `KIN_IMIBARE.pi`).
- **Kinyarwanda:** n/a.
- **Work:** optional tighten to the real identifier regex. Not a P0.

### Tests do not lock the educational contract

- **Go / main languages:** gopls has marker tests for every feature.
- **Kin language actually supports:** seven example programs.
- **Extension today:** `tests/` cover catalog name lists, a few completions/hovers/signatures, parser diagnostics, TextMate smoke, one stdio round-trip. No test that:
  - hover is Kinyarwanda;
  - `arr.` does not offer `0`;
  - `"Hello"` is a string token;
  - user `add(` has signature help;
  - F12 works;
  - `hagarara` matches the Parser the LSP loads;
  - wiki/catalog/runtime agree on `ubwoko`/`itariki`/`ifite`/`pi`.
- **Kinyarwanda:** no RW assertion anywhere.
- **Work:** add those tests before claiming 0.3.0.

### Colocated `*.rw.mdx` vs `rw/docs/**`

- **Go / main languages:** one doc tree.
- **Kin language actually supports:** n/a (docs).
- **Extension today:** n/a. Wiki has **both** `docs/language-structure/Arrays.rw.mdx` (and Comments, Conditions) **and** `rw/docs/language-structure/Arrays.mdx`. Other pages live only under `rw/docs/`. Drift is guaranteed.
- **Kinyarwanda:** partial duplication.
- **Work:** one RW tree. Delete the colocated three or generate them.

---

## Coverage matrices

### Built-in docs: EN catalog vs wiki EN vs wiki RW

Every lexer keyword and every `globals.ts` binding, including nested `KIN_*` members. `hagarara` appears twice because the runtime still declares a native.

Legend: **full** = teaching paragraph; **gloss** = one-line `Kinyarwanda: …`; **name** = listed, no real docs; **wrong** = docs contradict runtime; **—** = absent.

| Symbol | catalog EN | catalog RW | wiki EN | wiki RW | Notes |
| --- | --- | --- | --- | --- | --- |
| `reka` | full | gloss | full (`Variables.mdx`) | full (`rw/docs/language-structure/Variables.mdx`) | OK as keyword. Snippet exists. |
| `ntahinduka` | full | gloss | full | full | Catalog correctly forbids `ntahinduka x;`. |
| `porogaramu_ntoya` | full | gloss | full (`Functions.mdx`) | full | Wiki EN uses `return` and `$` in the same page. |
| `tanga` | full | gloss | mentioned; examples mix `return` | same | Post-`tanga` “error” is a wiki/runtime split. |
| `niba` | full | gloss | full (`Conditions.mdx`) | full | |
| `nanone_niba` | full | gloss | full, but **intro text is swapped** with else | same swap | Intro: treat as wrong. |
| `niba_byanze` | full | gloss | full, intro swapped | same | |
| `subiramo_niba` | full | gloss | full (`Loops.mdx`) | full | No break documented on that page. |
| `hagarara` **keyword** | full (break) | gloss | — (Loops silent) | — | Only true on unpublished local Kin. LSP parser ≠ this. |
| `hagarara` **native** | mentioned as uncallable | gloss on keyword | **wrong** as `hagarara(0)` (`utility-functions.mdx`) | **wrong** same | Callable on `@kin-lang/kin@0.4.3` the LSP loads. |
| `gereranya` | full | gloss | full | full | Catalog notes primary-only discriminant + `ibindi`-only bug. Wiki does not. |
| `usanze` | full | gloss | full | full | No fall-through: catalog + wiki agree. |
| `ibindi` | full | gloss | full | full | Parser drops body if it is the only arm (`parser.ts`). Catalog yes, wiki no. |
| `nibyo` | full | gloss | name (`Data-types.mdx`) | name | |
| `sibyo` | full | gloss | name | name | |
| `ubusa` | full | gloss | full | full | |
| `ikosa` | full | gloss | — | — | Mutable global, initially `ubusa`. Runtime never writes it. |
| `filename` | full | **—** | — | — | Path `KIN_INYANDIKO` resolves against. Highlighted as a function. |
| `tangaza_amakuru` | full | gloss | full (`Input-Output.mdx`) | full | Variadic. Returns `ubusa`. |
| `injiza_amakuru` | full | gloss | partial (no number-coercion / EOF) | partial | Catalog: number regex / `ubusa` on cancel. Wiki silent. |
| `sisitemu` | full + danger | gloss | **name + `sudo shutdown now`, no danger** | same | |
| `ubwoko` | full (returns `number`/`string`/…) | gloss | **wrong** (`umubare`) | **wrong** (`umubare`) | |
| `KIN_IMIBARE` | full | gloss | **— no page** | **—** | Entire math library missing from wiki. |
| `KIN_IMIBARE.pi` | full | **—** | — | — | Stored as raw `Math.PI`. `pi + 1` → `ubusa`. Not `MK_NUMBER`. |
| `KIN_IMIBARE.umuzikare` | full | gloss | — | — | `Math.sqrt`. |
| `KIN_IMIBARE.umubare_utazwi` | full | gloss | — | — | Inclusive int. Native type-check is `&&` not `\|\|` (`globals.ts`). |
| `KIN_IMIBARE.kuraho_ibice` | full | gloss | — | — | `Math.round`. |
| `KIN_IMIBARE.sin` | full (radians) | **—** | — | — | |
| `KIN_IMIBARE.cos` | full (radians) | **—** | — | — | |
| `KIN_IMIBARE.tan` | full (radians) | **—** | — | — | |
| `KIN_AMAGAMBO` | full | gloss | full (`Strings.mdx`) | full | |
| `KIN_AMAGAMBO.huza` | full | gloss | full | full | Variadic. |
| `KIN_AMAGAMBO.ingano` | full | gloss | full | full | |
| `KIN_AMAGAMBO.inyuguti` | full | gloss | EN example **missing first arg** | full (fixed) | |
| `KIN_AMAGAMBO.inyuguti_nkuru` | full | gloss | name | name | |
| `KIN_AMAGAMBO.inyuguti_ntoya` | full | gloss | name | name | |
| `KIN_AMAGAMBO.tandukanya` | full | gloss | full | full | Returns array-object; wiki warns `[Object Object]`. |
| `KIN_URUTONDE` | full | gloss | partial (`Arrays.mdx`) | partial | Only 3/8 methods on the wiki page. |
| `KIN_URUTONDE.ingano` | full | **—** | full | full | |
| `KIN_URUTONDE.ongera_kumusozo` | full | gloss | — | — | Mutates, returns new length. |
| `KIN_URUTONDE.siba_kumusozo` | full | gloss | — | — | Mutates, returns new length (not popped value). |
| `KIN_URUTONDE.injiza_ahabanza` | full | gloss | — | — | Returns **new** array. |
| `KIN_URUTONDE.siba_ahabanza` | full | gloss | — | — | Returns **new** array. |
| `KIN_URUTONDE.ifite_ikirango` | full | gloss | — | — | Has **key**, not value. |
| `KIN_URUTONDE.ifite` | full (first-element-only) | gloss | **wrong** as includes | **wrong** | |
| `KIN_URUTONDE.kora_ijambo` | full | gloss | full | full | No separator. |
| `KIN_IGIHE` | full | gloss | full (`time.mdx`) | full | Wiki writes `KIN_IGIHE()` as if callable. It is a namespace. |
| `KIN_IGIHE.isaha` | full (`HH:mm:ss`) | gloss | full (says `HH:MM:SS`) | full | Close enough. |
| `KIN_IGIHE.umunsi` | full (English weekday) | gloss | name | **wrong** (`Kuwa Mbere`) | |
| `KIN_IGIHE.itariki` | full (`Do MMM YY`) | gloss | **wrong** (`YYYY-MM-DD`) | **wrong** | |
| `KIN_INYANDIKO` | full | gloss | full (`file-handling.mdx`) | full | Paths relative to `filename`. |
| `KIN_INYANDIKO.soma` | full | gloss | full | full | Error → string, not throw. |
| `KIN_INYANDIKO.andika` | full (`boolean \| string`) | gloss | **wrong** (`sibyo` on fail) | **wrong** | |
| `KIN_INYANDIKO.vugurura` | full | gloss | **wrong** (`sibyo` on fail) | **wrong** | |
| `KIN_INYANDIKO.siba` | full | gloss | name only (no example) | name only | Unused `args[1]` in `globals.ts`. |

### Wiki pages EN vs RW

| Page | EN | RW path | Status |
| --- | --- | --- | --- |
| Introduction | `docs/index.mdx` | `rw/docs/index.mdx` | ok |
| Getting started | `docs/getting-started.mdx` | `rw/docs/getting-started.mdx` | ok (IDE blurb both sides) |
| Syntax | `docs/language-structure/Syntax.mdx` | `rw/docs/language-structure/Syntax.mdx` | ok; no colocated `.rw.mdx` |
| Comments | `docs/language-structure/Comments.mdx` | `docs/language-structure/Comments.rw.mdx` **and** `rw/docs/language-structure/Comments.mdx` | duplicated |
| Variables | `docs/language-structure/Variables.mdx` | `rw/docs/language-structure/Variables.mdx` | ok; **no** `Variables.rw.mdx` next to EN |
| Operators | `docs/language-structure/Operators.mdx` | `rw/docs/language-structure/Operators.mdx` | ok; EN comparison table lists `!=` twice |
| Data types | `docs/language-structure/Data-types.mdx` | `rw/docs/language-structure/Data-types.mdx` | RW exists; EN `reka x` without `;` |
| Strings | `docs/language-structure/Strings.mdx` | `rw/docs/language-structure/Strings.mdx` | RW exists; EN `inyuguti` example broken |
| Arrays | `docs/language-structure/Arrays.mdx` | `Arrays.rw.mdx` **and** `rw/docs/language-structure/Arrays.mdx` | duplicated; both teach `ifite` wrong; 5 methods missing |
| Objects | `docs/language-structure/Objects.mdx` | `rw/docs/language-structure/Objects.mdx` | RW exists; both use invalid `const` |
| Functions | `docs/language-structure/Functions.mdx` | `rw/docs/language-structure/Functions.mdx` | **no** `Functions.rw.mdx` beside EN; both use `return`/`$` |
| Conditions | `docs/language-structure/Conditions.mdx` | `Conditions.rw.mdx` **and** `rw/docs/…/Conditions.mdx` | duplicated; intro swap |
| Loops | `docs/language-structure/Loops.mdx` | `rw/docs/language-structure/Loops.mdx` | RW exists; both omit `hagarara` |
| Scope | `docs/language-structure/Scope.mdx` | `rw/docs/language-structure/Scope.mdx` | RW exists; both omit block scope; EN has `\{` typo |
| Input/Output | `docs/language-structure/Input-Output.mdx` | `rw/docs/language-structure/Input-Output.mdx` | RW exists; EN has an unclosed string in one example |
| File handling | `docs/built-in/file-handling.mdx` | `rw/docs/built-in/file-handling.mdx` | RW exists; failure-value wrong both sides |
| Time | `docs/built-in/time.mdx` | `rw/docs/built-in/time.mdx` | RW exists; format + weekday wrong |
| Utility / others | `docs/built-in/utility-functions.mdx` | `rw/docs/built-in/utility-functions.mdx` | RW exists; `ubwoko` + `hagarara()` wrong both sides |
| Math (`KIN_IMIBARE`) | **missing** | **missing** | P0 hole |
| Editor / playground | `editor.mdx` (stub) | `rw/editor.mdx` | stub |

### IDE features vs gopls

| Feature | gopls | Kin feasible | vscode-intellisense | Verdict |
| --- | --- | --- | --- | --- |
| Keyword completion | yes | yes (12 keywords) | yes (`catalog.ts` `KEYWORDS`) | OK |
| Builtin / package completion | yes | yes (globals + `KIN_*`) | yes, top-level + `.` members of catalog namespaces | OK for names; docs language GAP |
| In-scope identifiers | yes | yes (env chain) | regex, file-wide, all params always | **GAP** |
| Selector completion after `.` | yes | yes (`obj.key`, nested idents) | user `{…}` shapes + `KIN_*` | Partial; **GAP** on arrays / `[i].` |
| Snippets | vscode-go + gopls | yes | keyword `insertText` only | Partial |
| Trigger characters | `.` and more | `.` `[` `(` `:` | `.` only | Partial |
| Hover (stdlib) | signature + doc | yes | catalog EN + gloss | **GAP** (RW) |
| Hover (user symbols) | yes | yes (AST) | object members only | **GAP** |
| Signature help (stdlib) | yes | yes | catalog functions/methods | OK (EN only) |
| Signature help (user `add(a,b)`) | yes | yes | no | **GAP** |
| Parse diagnostics | yes | yes | 0–1, weak ranges | **GAP** |
| Type / compile diagnostics | yes | runtime-class, no static types | none | **GAP** (do the ones that don’t need a type system) |
| Unused var / unreachable | yes | yes (`tanga`, dead `reka`) | no | **GAP** |
| Go to definition | yes | yes (need columns) | no | **GAP** |
| Find references | yes | yes | no | **GAP** |
| Rename | yes | yes (single file) | no | **GAP** |
| Document symbols / outline | yes | yes | no | **GAP** |
| Workspace symbols | yes | weak (no modules) | no | GAP, lower priority |
| Formatting | gofmt | optional simple | no | GAP (P1) |
| Inlay hints | optional | param names | no | GAP (P1) |
| Semantic highlighting | yes | yes | yes, but `"Hello"` → variable | **GAP** |
| Code actions / quick fixes | yes | yes (`;`, const init, …) | no | **GAP** |
| Folding | editor + gopls | `{` blocks | no | GAP (P1) |
| Breadcrumbs | via documentSymbol | yes | no | GAP (P1) |
| Call hierarchy | yes | yes, small | no | P2 |
| Implementations / type def | yes | N/A (no types) | no | N/A — do not build |
| Unimported completion | yes | N/A (no import) | no | N/A |
| Organize imports | yes | N/A | no | N/A |
| Fill struct / extract fn | yes | extract-fn possible | no | P2 |
| Run / test CodeLens | vscode-go | `kin run` | no | GAP (P1, run only) |
| Debug | Delve | no DAP | no | OK to skip |
| Incremental didChange | yes | full reparse OK | reparse + first error | **GAP** (quality) |

---

## What is fine (do not open work for these)

- Keyword set in `catalog.ts` matches local `lexer.ts` (including `gereranya`/`usanze`/`ibindi`/`hagarara` **as names**). The **semantics** of `hagarara` are not fine (P0.1).
- Every `globals.ts` binding has a catalog **name** (native `hagarara` is only a footnote).
- TextMate: `#` comments first, double-quoted strings only, `hagarara` in the keyword list, no `niba(` function rule, `KIN_*` vs builtins split.
- Signature help argument index, including nested commas (`tests/completions-hover.test.ts`).
- `sourceForShapes` stripping a trailing `.member` so `obj.` can still see `reka obj = {…}`.
- Auto-close pairs omit `'`.
- No module/generics/interface work is missing, because Kin does not have them.

---

## Suggested order

1. Freeze the language the LSP parses (P0.1). Until that commit, every other item is building on sand.
2. Lexer columns + AST spans. Everything in P0.2–P0.5 needs them.
3. Scope graph: completions, hover, signature, definition, references, rename, symbols all consume it.
4. Kinyarwanda catalog paragraphs + locale (P0.7) and the fact table (P0.8).
5. Semantic tokens + array completion (P0.4 leftover, P0.6).
6. P1: symbols, folding, run, code actions, format, TextMate members.
7. P2 last.
