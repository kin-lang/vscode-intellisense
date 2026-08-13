/**
 * Educational catalog of Kin keywords and built-ins.
 *
 * Source of truth for names: kin/src/lexer/lexer.ts (keywords) and
 * kin/src/runtime/globals.ts (built-ins). Docs describe what the
 * runtime actually does, including known limits.
 */

export interface KinArgumentDoc {
  name: string;
  type: string;
  required: boolean;
  documentation: string;
  documentation_rw?: string;
}

export interface KinSymbolDoc {
  name: string;
  kind: 'keyword' | 'constant' | 'function' | 'namespace' | 'method' | 'property';
  detail: string;
  /** English teaching paragraph. */
  documentation: string;
  /** Full Kinyarwanda teaching paragraph (not a one-line gloss). */
  documentation_rw: string;
  insertText?: string;
  snippet?: string;
  args?: KinArgumentDoc[];
  returns?: string;
  example?: string;
  members?: Record<string, KinSymbolDoc>;
}

export const KEYWORDS: KinSymbolDoc[] = [
  {
    name: 'reka',
    kind: 'keyword',
    detail: 'Declare a variable',
    documentation:
      'Creates a name you can change later. This is not `const` and not `let` — the keyword is `reka`.\n\n' +
      '- `reka izina = agaciro` assigns a value (no semicolon).\n' +
      '- `reka izina;` declares it empty (`ubusa`). The semicolon is **required** when you omit the initializer; without it the parser rejects the line.',
    documentation_rw:
      'Ijambo `reka` rirema ihinduragaciro ushobora guhindura nyuma muri porogaramu. Ntabwo ari `const` cyangwa `let` — muri Kin ukoresha `reka`.\n\n' +
      '- `reka izina = agaciro` rishyira agaciro (ntakadomo `;`).\n' +
      '- `reka izina;` rirema izina ririmo `ubusa`. Hano `;` ni **ngombwa**. Niba utarisize, parser iranga ikosa.',
    snippet: 'reka ${1:izina} = ${2:0}',
  },
  {
    name: 'ntahinduka',
    kind: 'keyword',
    detail: 'Declare a constant',
    documentation:
      'Creates a name that cannot be reassigned. An initializer is required — ' +
      '`ntahinduka x;` is a parse error. Always write `ntahinduka IZINA = agaciro`.',
    documentation_rw:
      'Ijambo `ntahinduka` rirema ihinduragaciro idahinduka: ntushobora kuyihindura nyuma. ' +
      'Ugomba kuyiha agaciro ako kanya — `ntahinduka x;` ni ikosa rya parser. ' +
      'Andika buri gihe `ntahinduka IZINA = agaciro`.',
    snippet: 'ntahinduka ${1:IZINA} = ${2:0}',
  },
  {
    name: 'porogaramu_ntoya',
    kind: 'keyword',
    detail: 'Define a function',
    documentation:
      'Declares a named function. Parameters are identifiers only (letters, digits, underscore; must start with a letter or `_`). ' +
      '`$` is not legal in a name. Use `tanga` (not `return`) to give a value back. ' +
      'A function that never hits `tanga` yields `ubusa`.',
    documentation_rw:
      'Ijambo `porogaramu_ntoya` rirema umumaro ufite izina. Ibipimo ni amazina gusa (inyuguti, imibare, `_`; ritangira ku nyuguti cyangwa `_`). ' +
      'Ikimenyetso `$` ntikemewe mu izina. Kugarura agaciro ukoresha `tanga` (si `return`). ' +
      'Umumaro utagera kuri `tanga` usubiza `ubusa`.',
    snippet:
      'porogaramu_ntoya ${1:izina}(${2:a}) {\n\t${3:tanga a}\n}',
  },
  {
    name: 'tanga',
    kind: 'keyword',
    detail: 'Return from a function',
    documentation:
      'Leaves the current function. This is Kin’s return keyword — do not write `return`.\n\n' +
      '- `tanga agaciro` returns that value (no semicolon).\n' +
      '- `tanga;` returns `ubusa`. The semicolon marks the omitted value.\n\n' +
      '`tanga` is a statement, not an expression — you cannot write `foo(tanga 1)`. ' +
      'Statements written after `tanga` in the same function are not executed; the runtime does not throw, it simply returns.',
    documentation_rw:
      '`tanga` ni ijambo rya Kin ryo gusubiza agaciro uva mu mumaro — ntukandike `return`.\n\n' +
      '- `tanga agaciro` gisubiza ako gaciro (ntakadomo `;`).\n' +
      '- `tanga;` gisubiza `ubusa`. Akadomo `;` kerekana ko agaciro kabuze.\n\n' +
      '`tanga` ni statement, si expression — ntushobora kwandika `foo(tanga 1)`. ' +
      'Ibyanditswe nyuma ya `tanga` muri uwo mumaro ntibikora; runtime ntiyanga ikosa, isubiza gusa.',
    snippet: 'tanga ${1:agaciro}',
  },
  {
    name: 'niba',
    kind: 'keyword',
    detail: 'If',
    documentation:
      'Runs the block when the condition is truthy. `sibyo`, `ubusa`, and `0` are false; everything else is true. ' +
      'Chain with `nanone_niba` (else-if: a **new** condition) and finish with `niba_byanze` (else: no condition). ' +
      'The `niba` / `niba_byanze` body runs in a fresh scope.',
    documentation_rw:
      '`niba` gikora igice cya kode iyo igipimo ari ukuri (truthy). `sibyo`, `ubusa`, n’`0` ni ukinyoma; ibindi byose ni ukuri. ' +
      'Ushobora gukomeza na `nanone_niba` (nanone niba: igipimo **gishya**) hanyuma kurangiza na `niba_byanze` (niba byanze: nta gipimo). ' +
      'Umubiri wa `niba` / `niba_byanze` ukorera mu rwego rushya rw’amazina.',
    snippet: 'niba (${1:nibyo}) {\n\t$0\n}',
  },
  {
    name: 'nanone_niba',
    kind: 'keyword',
    detail: 'Else if',
    documentation:
      'Tried only when the previous `niba` / `nanone_niba` was false. ' +
      'You write a **new** condition in parentheses. You may repeat `nanone_niba`. It must follow a `niba`. ' +
      'Do not confuse it with `niba_byanze`, which is else and has no condition.',
    documentation_rw:
      '`nanone_niba` gigeragezwa gusa iyo `niba` cyangwa `nanone_niba` yabanjirije yari `sibyo`. ' +
      'Wandika igipimo **gishya** mu makugiro. Ushobora kugisubiramo. Kigomba gukurikira `niba`. ' +
      'Ntukivange na `niba_byanze`, icyo ni *else* kandi nta gipimo gifite.',
    snippet: 'nanone_niba (${1:nibyo}) {\n\t$0\n}',
  },
  {
    name: 'niba_byanze',
    kind: 'keyword',
    detail: 'Else',
    documentation:
      'Runs when every preceding `niba` / `nanone_niba` was false. No condition. ' +
      'This is else, not else-if — else-if is `nanone_niba`.',
    documentation_rw:
      '`niba_byanze` gikora iyo buri `niba` / `nanone_niba` yabanjirije yari `sibyo`. Nta gipimo. ' +
      'Iki ni *else*, si *else-if* — *else-if* ni `nanone_niba`.',
    snippet: 'niba_byanze {\n\t$0\n}',
  },
  {
    name: 'subiramo_niba',
    kind: 'keyword',
    detail: 'While loop',
    documentation:
      'Repeats the block while the condition is truthy (`sibyo`, `ubusa`, and `0` are false). ' +
      'Use `hagarara` to leave early and `komeza` to skip to the next iteration. ' +
      'Each iteration (and the loop itself) uses a fresh scope.',
    documentation_rw:
      '`subiramo_niba` gisubiramo igice cya kode igihe igipimo kikiri ukuri (`sibyo`, `ubusa`, n’`0` ni ukinyoma). ' +
      'Kuvamo hakiri kare ukoresha `hagarara`; gusimbuka kigeragezo ukoresha `komeza`. ' +
      'Buri kigeragezo (n’uruziga rwose) rukorera mu rwego rushya.',
    snippet:
      'subiramo_niba (${1:i} < ${2:10}) {\n\t$0\n\t${1:i} = ${1:i} + 1\n}',
  },
  {
    name: 'hagarara',
    kind: 'keyword',
    detail: 'Break out of a loop',
    documentation:
      'Exits the nearest `subiramo_niba`. A semicolon after it is optional. Write it as a statement, not `hagarara(0)`.\n\n' +
      'This is a **keyword** (break), not a function that stops the Kin process. ' +
      '`globals.ts` still registers a native `hagarara(code)` that would call `process.exit`, ' +
      'but the lexer always treats `hagarara` as this keyword, so that exit function cannot be called from source.',
    documentation_rw:
      '`hagarara` giva mu `subiramo_niba` yegereye. Akadomo `;` nyuma yacyo si ngombwa. ' +
      'Kigakoresha nk’ijambo ry’ingenzi, si `hagarara(0)`.\n\n' +
      'Iki ni **ijambo ry’ingenzi** (break), si umumaro uhagarika porogaramu ya Kin. ' +
      '`globals.ts` iracyandika umumaro `hagarara(code)` waka `process.exit`, ' +
      'ariko lexer ihora ifata `hagarara` nk’iki jambo, bityo uwo murimo wo kuva muri porogaramu ntushobora guhamagarwa mu kode.',
  },
  {
    name: 'komeza',
    kind: 'keyword',
    detail: 'Continue the next loop iteration',
    documentation:
      'Skips the rest of the current `subiramo_niba` iteration and checks the condition again. ' +
      'A semicolon after it is optional. Only valid inside a loop body.',
    documentation_rw:
      '`komeza` gisimbuka ibisigaye by’ako kigeragezo cya `subiramo_niba` hanyuma gisuzuma condition inshuro ikurikira. ' +
      'Akadomo `;` nyuma yacyo si ngombwa. Gikoreshwa gusa mu mubiri w’uruziga.',
  },
  {
    name: 'gereranya',
    kind: 'keyword',
    detail: 'Switch',
    documentation:
      'Compares one value against `usanze` labels with `==`.\n\n' +
      'The value in parentheses and each label must be a **primary** ' +
      '(identifier, number, or string) — not a full expression.\n\n' +
      'A switch that contains only `ibindi` is accepted but the current parser ' +
      'drops that default body.',
    documentation_rw:
      '`gereranya` kigereranya agaciro kamwe n’utubonero twa `usanze` hakoreshejwe `==`.\n\n' +
      'Agaciro mu makugiro n’utubonero twose bigomba kuba **primary** ' +
      '(izina, umubare, cyangwa ijambo) — si expression yuzuye.\n\n' +
      '`gereranya` irimo `ibindi` gusa yemererwa, ariko parser yaubu isiba uwo mubiri wa default.',
    snippet:
      'gereranya (${1:x}) {\n\tusanze ${2:1}:\n\t\t$0\n\tibindi:\n\t\ttangaza_amakuru("ikindi")\n}',
  },
  {
    name: 'usanze',
    kind: 'keyword',
    detail: 'Switch case',
    documentation:
      'One arm of `gereranya`. Written `usanze label:` followed by statements. ' +
      'There is no fall-through — the first matching arm runs, then the switch ends.',
    documentation_rw:
      '`usanze` ni ukuboko kumwe kwa `gereranya`. Wandika `usanze agaciro:` ukakurikize ibyanditswe. ' +
      'Nta fall-through — ukuboko kwa mbere kuhuye n’agaciro ni ko gukora, hanyuma `gereranya` irangira.',
    snippet: 'usanze ${1:1}:\n\t$0',
  },
  {
    name: 'ibindi',
    kind: 'keyword',
    detail: 'Switch default',
    documentation:
      'Default arm of `gereranya`. Runs when no `usanze` matched. Must be last. ' +
      'If it is the only arm, that body still runs.',
    documentation_rw:
      '`ibindi` ni ukuboko rusange kwa `gereranya`. Gikora iyo nta `usanze` yahuye. Kigomba kuba iheruka. ' +
      'Niba ari ko gusa, umubiri wacyo ukora.',
    snippet: 'ibindi:\n\t$0',
  },
];

const TANGAZA: KinSymbolDoc = {
  name: 'tangaza_amakuru',
  kind: 'function',
  detail: 'Print to the console',
  documentation:
    'Writes every argument to standard output, one after another, with no extra spaces. ' +
    'Booleans print as `nibyo` / `sibyo`. `ubusa` prints as `ubusa`. Objects print as a map.\n\n' +
    'Always returns `ubusa`. You may pass zero or more arguments.',
  documentation_rw:
    '`tangaza_amakuru` yandika buri mpamvu ku igaragazamakuru, imwe nyuma y’iyindi, nta ntera yongerwaho. ' +
    'Boolean yandikwa `nibyo` / `sibyo`. `ubusa` yandikwa `ubusa`. Ibyegeranyo byandikwa nk’ikarita.\n\n' +
    'Ihora isubiza `ubusa`. Ushobora gutanga impamvu nta na imwe cyangwa nyinshi.',
  args: [
    {
      name: '...values',
      type: 'any',
      required: false,
      documentation: 'Values to print, in order. You may pass zero or more.',
      documentation_rw: 'Agaciro ko kwandika, ku murongo. Ushobora gutanga nta na kamwe cyangwa menshi.',
    },
  ],
  returns: 'ubusa',
  example: 'tangaza_amakuru("Hello ", izina, "!")',
};

const INJIZA: KinSymbolDoc = {
  name: 'injiza_amakuru',
  kind: 'function',
  detail: 'Read a line from the user',
  documentation:
    'Shows a prompt built from its arguments, then waits for a line of input.\n\n' +
    '- If the line looks like a number (`-3`, `4.2`), the result is a number.\n' +
    '- Otherwise the result is a string.\n' +
    '- Cancel / EOF yields `ubusa`.\n\n' +
    'At least one argument is required.',
  documentation_rw:
    '`injiza_amakuru` igaragaza ubutumwa bwubatswe ku mpamvu zayo, hanyuma itegereza umurongo umukoresha yanditse.\n\n' +
    '- Niba umurongo usa n’umubare (`-3`, `4.2`), igisubizo ni umubare.\n' +
    '- Ikindi cyose gisubizwa nk’ijambo (string).\n' +
    '- Guhagarika / EOF bitanga `ubusa`.\n\n' +
    'Impamvu imwe ni ngombwa.',
  args: [
    {
      name: '...prompt',
      type: 'any',
      required: true,
      documentation:
        'Pieces of the prompt shown to the user. At least one argument is required. ' +
        'They are concatenated the same way `tangaza_amakuru` prints.',
      documentation_rw:
        'Ibice by’ubutumwa bigaragazwa umukoresha. Impamvu imwe ni ngombwa. ' +
        'Bihuza nk’uko `tangaza_amakuru` yandika.',
    },
  ],
  returns: 'number | string | ubusa',
  example: 'reka izina = injiza_amakuru("Andika izina: ")',
};

const SISITEMU: KinSymbolDoc = {
  name: 'sisitemu',
  kind: 'function',
  detail: 'Run a shell command',
  documentation:
    'Runs a system command with the host shell and returns its trimmed stdout as a string.\n\n' +
    '**Danger:** the command runs with your user permissions. A line such as ' +
    '`sisitemu("sudo shutdown now")` can shut the machine down. ' +
    'Use it only for commands you understand, on files you trust. Prefer `"echo muraho"` or `"date"` while learning.',
  documentation_rw:
    '`sisitemu` ikoresha itegeko rya sisiteme ku shell y’imashini yawe, hanyuma isubiza stdout yayongewe (trimmed) nk’ijambo.\n\n' +
    '**Ingaruka:** iryo tegeko rikora n’uburenganzira bwawe. Umurongo nka ' +
    '`sisitemu("sudo shutdown now")` ushobora kuzimya mudasobwa. ' +
    'Koresha amategeko usobanukiwe gusa, kuri dosiye wizeye. Mu kwiga koresha `"echo muraho"` cyangwa `"date"`.',
  args: [
    {
      name: 'command',
      type: 'string',
      required: true,
      documentation: 'The shell command to execute, e.g. `"ls"` or `"date"`. Do not paste untrusted text here.',
      documentation_rw: 'Itegeko rya shell, urugero `"ls"` cyangwa `"date"`. Ntushyiremo inyandiko utizeye.',
    },
  ],
  returns: 'string',
  example: 'reka out = sisitemu("echo muraho")',
};

const UBWOKO: KinSymbolDoc = {
  name: 'ubwoko',
  kind: 'function',
  detail: 'Runtime type of a value',
  documentation:
    'Returns the Kin runtime type name of its argument as a **string**. For `ubwoko(5)` that string is `"number"`, ' +
    'not `umubare`. Other values: `"string"`, `"boolean"`, `"object"`, `"urutonde"` (arrays), `"fn"`, `"native-fn"`, or `"null"`.',
  documentation_rw:
    '`ubwoko` isubiza **ijambo** (string) ry’ubwoko bwa runtime: kuri `ubwoko(5)` ni `"number"`, ' +
    'si `umubare`. Izindi: `"string"`, `"boolean"`, `"object"`, `"urutonde"` (urutonde), `"fn"`, `"native-fn"`, cyangwa `"null"`.',
  args: [
    {
      name: 'value',
      type: 'any',
      required: true,
      documentation: 'Any Kin value whose runtime type you want.',
      documentation_rw: 'Agaciro ka Kin ushaka kumenya ubwoko bwako.',
    },
  ],
  returns: 'string',
  example: 'ubwoko(12)    # "number"',
};

export const CONSTANTS: KinSymbolDoc[] = [
  {
    name: 'nibyo',
    kind: 'constant',
    detail: 'Boolean true',
    documentation: 'The true value. Printed as `nibyo`. Use it in `niba` conditions and comparisons.',
    documentation_rw:
      '`nibyo` ni agaciro k’ukuri (boolean true). Iyo uyanditse ku igaragazamakuru ugaragaza `nibyo`. ' +
      'Koresha muri `niba` no mu kugereranya.',
  },
  {
    name: 'sibyo',
    kind: 'constant',
    detail: 'Boolean false',
    documentation: 'The false value. Printed as `sibyo`.',
    documentation_rw:
      '`sibyo` ni agaciro k’ikinyoma (boolean false). Iyo uyanditse ugaragaza `sibyo`.',
  },
  {
    name: 'ubusa',
    kind: 'constant',
    detail: 'Null',
    documentation:
      'The empty value. Uninitialized `reka x;` starts as `ubusa`. Printed as `ubusa`.',
    documentation_rw:
      '`ubusa` ni agaciro kabuze (null). `reka x;` itagize agaciro itangira nk’`ubusa`. ' +
      'Iyo uyanditse ugaragaza `ubusa`.',
  },
  {
    name: 'ikosa',
    kind: 'constant',
    detail: 'Error slot',
    documentation:
      'A mutable global, initially `ubusa`. It is reserved as an error holder. ' +
      'The runtime does not currently write to it automatically — your program may assign it. ' +
      'It is not a keyword.',
    documentation_rw:
      '`ikosa` ni ihinduragaciro rusange rihinduka, ritangira riri `ubusa`. ' +
      'Ryateganyijwe kubika ikosa. Runtime ntiyandikamo ubwayo ubu — porogaramu yawe ni yo ishobora kuryiha agaciro. ' +
      'Ntabwo ari ijambo ry’ingenzi.',
  },
  {
    name: 'filename',
    kind: 'constant',
    detail: 'Path of the running file',
    documentation:
      'A **string** (not a function): the path passed to `kin run`, or the REPL working directory. ' +
      'Every `KIN_INYANDIKO` helper (`soma`, `andika`, `vugurura`, `siba`) resolves relative paths ' +
      'against the directory of `filename`. Write `filename`, not `filename()`.',
    documentation_rw:
      '`filename` ni **ijambo** (string), si umumaro: inzira yawe yahaye `kin run`, cyangwa ububiko bwa REPL. ' +
      'Buri murimo wa `KIN_INYANDIKO` (`soma`, `andika`, `vugurura`, `siba`) ushyira inzira igoye ' +
      'ku bubiko `filename` irimo. Andika `filename`, si `filename()`.',
  },
];

const KIN_IMIBARE: KinSymbolDoc = {
  name: 'KIN_IMIBARE',
  kind: 'namespace',
  detail: 'Mathematics helpers',
  documentation:
    'Built-in math namespace (not a function — write `KIN_IMIBARE.pi`, never `KIN_IMIBARE()`). ' +
    'Members: π, square root, random integers, rounding, and trigonometry in radians.',
  documentation_rw:
    '`KIN_IMIBARE` ni umuryango w’imibare wubatse muri Kin (si umumaro — andika `KIN_IMIBARE.pi`, ntukandike `KIN_IMIBARE()`). ' +
    'Harimo π, umuzikare, umubare utazwi, kuraho ibice, n’ubutonde bwa sine/cosine/tangent mu radians.',
  members: {
    pi: {
      name: 'pi',
      kind: 'property',
      detail: 'π (pi)',
      documentation:
        'The constant π ≈ 3.14159… stored as a Kin `number` (`MK_NUMBER(Math.PI)`). ' +
        'This is a property, not a function — write `KIN_IMIBARE.pi`, not `KIN_IMIBARE.pi()`. ' +
        'You can compute with it: `KIN_IMIBARE.pi + 1`, `KIN_IMIBARE.pi * 2`.',
      documentation_rw:
        '`KIN_IMIBARE.pi` ni π ≈ 3.14159…, ubitswe nk’umubare wa Kin (`MK_NUMBER(Math.PI)`). ' +
        'Ni property, si umumaro — andika `KIN_IMIBARE.pi`, si `KIN_IMIBARE.pi()`. ' +
        'Ushobora kubara nayo: `KIN_IMIBARE.pi + 1`, `KIN_IMIBARE.pi * 2`.',
      returns: 'number',
    },
    umuzikare: {
      name: 'umuzikare',
      kind: 'method',
      detail: 'Square root',
      documentation:
        'Square root of a number (`Math.sqrt`). `KIN_IMIBARE.umuzikare(9)` is `3`.',
      documentation_rw:
        '`umuzikare` ni umuzikare w’umubare (`Math.sqrt`). `KIN_IMIBARE.umuzikare(9)` ni `3`.',
      args: [
        {
          name: 'x',
          type: 'number',
          required: true,
          documentation: 'The number to take the square root of.',
          documentation_rw: 'Umubare ushaka umuzikare.',
        },
      ],
      returns: 'number',
      example: 'KIN_IMIBARE.umuzikare(9)    # 3',
    },
    umubare_utazwi: {
      name: 'umubare_utazwi',
      kind: 'method',
      detail: 'Random integer in a range',
      documentation:
        'Inclusive random integer from `min` (ceiled) to `max` (floored), using `Math.random` then floor. ' +
        '`KIN_IMIBARE.umubare_utazwi(1, 6)` is a dice roll.',
      documentation_rw:
        'Umubare wuzuye utazwi uhereye kuri `min` (ceil) kugeza kuri `max` (floor), ukoresheje `Math.random`. ' +
        '`KIN_IMIBARE.umubare_utazwi(1, 6)` ni nk’uruziga rw’amafoto.',
      args: [
        {
          name: 'min',
          type: 'number',
          required: true,
          documentation: 'Lower bound (ceiled).',
          documentation_rw: 'Imipaka yo hasi (ceil).',
        },
        {
          name: 'max',
          type: 'number',
          required: true,
          documentation: 'Upper bound (floored).',
          documentation_rw: 'Imipaka yo hejuru (floor).',
        },
      ],
      returns: 'number',
      example: 'KIN_IMIBARE.umubare_utazwi(1, 6)    # dice roll',
    },
    kuraho_ibice: {
      name: 'kuraho_ibice',
      kind: 'method',
      detail: 'Round to nearest integer',
      documentation:
        'Rounds a number with `Math.round` (0.5 goes up). `KIN_IMIBARE.kuraho_ibice(3.6)` is `4`.',
      documentation_rw:
        '`kuraho_ibice` ikuraho ibice hakoreshejwe `Math.round` (0.5 ijya hejuru). ' +
        '`KIN_IMIBARE.kuraho_ibice(3.6)` ni `4`.',
      args: [
        {
          name: 'x',
          type: 'number',
          required: true,
          documentation: 'The number to round.',
          documentation_rw: 'Umubare ushaka gukubita.',
        },
      ],
      returns: 'number',
      example: 'KIN_IMIBARE.kuraho_ibice(3.6)    # 4',
    },
    sin: {
      name: 'sin',
      kind: 'method',
      detail: 'Sine',
      documentation:
        'Sine of an angle in **radians** (`Math.sin`), not degrees. ' +
        '`KIN_IMIBARE.sin(KIN_IMIBARE.pi / 2)` is about `1`.',
      documentation_rw:
        '`sin` ni sine y’impande mu **radians** (`Math.sin`), si degrees. ' +
        '`KIN_IMIBARE.sin(KIN_IMIBARE.pi / 2)` hafi `1`.',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
          documentation_rw: 'Impande mu radians, si degrees.',
        },
      ],
      returns: 'number',
    },
    cos: {
      name: 'cos',
      kind: 'method',
      detail: 'Cosine',
      documentation:
        'Cosine of an angle in **radians** (`Math.cos`), not degrees.',
      documentation_rw:
        '`cos` ni cosine y’impande mu **radians** (`Math.cos`), si degrees.',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
          documentation_rw: 'Impande mu radians, si degrees.',
        },
      ],
      returns: 'number',
    },
    tan: {
      name: 'tan',
      kind: 'method',
      detail: 'Tangent',
      documentation:
        'Tangent of an angle in **radians** (`Math.tan`), not degrees.',
      documentation_rw:
        '`tan` ni tangent y’impande mu **radians** (`Math.tan`), si degrees.',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
          documentation_rw: 'Impande mu radians, si degrees.',
        },
      ],
      returns: 'number',
    },
  },
};

const KIN_AMAGAMBO: KinSymbolDoc = {
  name: 'KIN_AMAGAMBO',
  kind: 'namespace',
  detail: 'String helpers',
  documentation:
    'Work with text: join, length, character at index, upper/lower case, split. ' +
    'A namespace, not a call — write `KIN_AMAGAMBO.ingano(s)`, never `KIN_AMAGAMBO()`.',
  documentation_rw:
    '`KIN_AMAGAMBO` ikorana n’amagambo: huza, ingano, inyuguti ku mwanya, inyuguti nkuru/ntoya, tandukanya. ' +
    'Ni umuryango, si umumaro — andika `KIN_AMAGAMBO.ingano(s)`, ntukandike `KIN_AMAGAMBO()`.',
  members: {
    huza: {
      name: 'huza',
      kind: 'method',
      detail: 'Join strings',
      documentation:
        'Concatenates every argument into one string. Arguments should be strings. ' +
        'Zero arguments yield an empty string. You may pass as many pieces as you want.',
      documentation_rw:
        '`huza` ihuza buri mpamvu ikaba ijambo rimwe. Impamvu zigomba kuba amagambo. ' +
        'Nta mpamvu itanga ijambo ririmo ubusa. Ushobora gutanga ibice byinshi uko ubishaka.',
      args: [
        {
          name: '...parts',
          type: 'string',
          required: false,
          documentation: 'String pieces, in order. Zero arguments yield an empty string.',
          documentation_rw: 'Ibice by’ijambo, ku murongo. Nta mpamvu itanga ijambo ririmo ubusa.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.huza("Mu", "ra", "ho")    # "Muraho"',
    },
    ingano: {
      name: 'ingano',
      kind: 'method',
      detail: 'String length',
      documentation: 'Number of characters in a string. `KIN_AMAGAMBO.ingano("Kin")` is `3`.',
      documentation_rw:
        '`ingano` ni umubare w’inyuguti ziri mu jambo. `KIN_AMAGAMBO.ingano("Kin")` ni `3`.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to measure.',
          documentation_rw: 'Ijambo ushaka gupima.',
        },
      ],
      returns: 'number',
      example: 'KIN_AMAGAMBO.ingano("Kin")    # 3',
    },
    inyuguti: {
      name: 'inyuguti',
      kind: 'method',
      detail: 'Character at index',
      documentation:
        'Returns the character at `index` (0-based). Needs **two** arguments: the string and the index. ' +
        '`KIN_AMAGAMBO.inyuguti("Kin", 0)` is `"K"`. `KIN_AMAGAMBO.inyuguti(8)` is wrong. ' +
        'Out of range yields an empty string.',
      documentation_rw:
        '`inyuguti` isubiza inyuguti iri ku `index` (itangira kuri 0). Ikeneye impamvu **ebyiri**: ijambo n’umwanya. ' +
        '`KIN_AMAGAMBO.inyuguti("Kin", 0)` ni `"K"`. `KIN_AMAGAMBO.inyuguti(8)` ni ikosa. ' +
        'Niba umwanya uri hanze, isubiza ijambo ririmo ubusa.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to index.',
          documentation_rw: 'Ijambo ushaka gufatamo inyuguti.',
        },
        {
          name: 'index',
          type: 'number',
          required: true,
          documentation: '0-based character position.',
          documentation_rw: 'Umwanya w’inyuguti, utangira kuri 0.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.inyuguti("Kin", 0)    # "K"',
    },
    inyuguti_nkuru: {
      name: 'inyuguti_nkuru',
      kind: 'method',
      detail: 'Uppercase',
      documentation: 'Copies the string in CAPITAL LETTERS. `KIN_AMAGAMBO.inyuguti_nkuru("kin")` is `"KIN"`.',
      documentation_rw:
        '`inyuguti_nkuru` ikoporora ijambo mu NYUGUTI NKURU. `KIN_AMAGAMBO.inyuguti_nkuru("kin")` ni `"KIN"`.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to convert.',
          documentation_rw: 'Ijambo ushaka guhindura.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.inyuguti_nkuru("kin")    # "KIN"',
    },
    inyuguti_ntoya: {
      name: 'inyuguti_ntoya',
      kind: 'method',
      detail: 'Lowercase',
      documentation: 'Copies the string in small letters. `KIN_AMAGAMBO.inyuguti_ntoya("KIN")` is `"kin"`.',
      documentation_rw:
        '`inyuguti_ntoya` ikoporora ijambo mu nyuguti ntoya. `KIN_AMAGAMBO.inyuguti_ntoya("KIN")` ni `"kin"`.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to convert.',
          documentation_rw: 'Ijambo ushaka gukubita mu ntoya.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.inyuguti_ntoya("KIN")    # "kin"',
    },
    tandukanya: {
      name: 'tandukanya',
      kind: 'method',
      detail: 'Split a string',
      documentation:
        'Splits `text` on `separator` and returns an array (`urutonde`). ' +
        'Printing the whole result shows `[Object Object]` — read `result[0]`, `result[1]`, … instead. ' +
        'Use `""` as separator to split into characters.',
      documentation_rw:
        '`tandukanya` itandukanya `text` ku `separator` isubiza urutonde. ' +
        'Kuyandika yose bigaragaza `[Object Object]` — soma `result[0]`, `result[1]`, … ' +
        'Koresha `""` nka separator kugira ngo utandukanye ku nyuguti.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to split.',
          documentation_rw: 'Ijambo ushaka gutandukanya.',
        },
        {
          name: 'separator',
          type: 'string',
          required: true,
          documentation: 'Delimiter. Use `""` to split into characters.',
          documentation_rw: 'Ikimenyetso gitandukanya. Koresha `""` kugira ngo utandukanye ku nyuguti.',
        },
      ],
      returns: 'urutonde',
      example: 'KIN_AMAGAMBO.tandukanya("a,b,c", ",")',
    },
  },
};

const KIN_URUTONDE: KinSymbolDoc = {
  name: 'KIN_URUTONDE',
  kind: 'namespace',
  detail: 'Array helpers',
  documentation:
    'Kin arrays are a dedicated array type (`ubwoko` returns `urutonde`). ' +
    'These helpers treat that shape as a list. Access elements with `urutonde[0]`, not `urutonde.0`. ' +
    'A namespace, not a call — write `KIN_URUTONDE.ingano(list)`.',
  documentation_rw:
    'Urutonde rwa Kin ni ubwoko bwihariye (`ubwoko` isubiza `urutonde`). ' +
    'Iyi mimaro iyifata nk’urutonde. Injira mu bice ukoresheje `urutonde[0]`, si `urutonde.0`. ' +
    'Ni umuryango, si umumaro — andika `KIN_URUTONDE.ingano(list)`.',
  members: {
    ingano: {
      name: 'ingano',
      kind: 'method',
      detail: 'Array length',
      documentation:
        'How many entries the array currently has (`Map.size`). `KIN_URUTONDE.ingano([10, 20])` is `2`.',
      documentation_rw:
        '`ingano` ni umubare w’ibice biri mu rutonde ubu (`Map.size`). `KIN_URUTONDE.ingano([10, 20])` ni `2`.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array (object) to measure.',
          documentation_rw: 'Urutonde (icyegeranyo) ushaka gupima.',
        },
      ],
      returns: 'number',
      example: 'KIN_URUTONDE.ingano([10, 20])    # 2',
    },
    ongera_kumusozo: {
      name: 'ongera_kumusozo',
      kind: 'method',
      detail: 'Push (append)',
      documentation:
        'Adds `value` at the end of `list` **in place** and returns the **new length**, not the array. ' +
        'The original list is mutated.',
      documentation_rw:
        '`ongera_kumusozo` yongera `value` ku musozo wa `list` **ahantu hamwe** kandi isubiza **ingano nshya**, si urutonde. ' +
        'Urutonde rwambere rurahinduka.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to mutate.',
          documentation_rw: 'Urutonde ruzahinduka.',
        },
        {
          name: 'value',
          type: 'any',
          required: true,
          documentation: 'Value to append.',
          documentation_rw: 'Agaciro ko kongera ku musozo.',
        },
      ],
      returns: 'number (new length)',
      example: 'KIN_URUTONDE.ongera_kumusozo(urutonde, 99)',
    },
    siba_kumusozo: {
      name: 'siba_kumusozo',
      kind: 'method',
      detail: 'Pop (remove last)',
      documentation:
        'Deletes the last entry **in place** and returns the **new length** (not the removed value).',
      documentation_rw:
        '`siba_kumusozo` isiba icya nyuma **ahantu hamwe** kandi isubiza **ingano nshya** (si agaciro kasibwe).',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to mutate.',
          documentation_rw: 'Urutonde ruzahinduka.',
        },
      ],
      returns: 'number (new length)',
    },
    injiza_ahabanza: {
      name: 'injiza_ahabanza',
      kind: 'method',
      detail: 'Prepend',
      documentation:
        'Returns a **new** array with `value` at index 0. The original list is not changed.',
      documentation_rw:
        '`injiza_ahabanza` isubiza urutonde **rushya** `value` iri ku mwanya 0. Urutonde rwambere ntiruhinduka.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The source array.',
          documentation_rw: 'Urutonde rw’isoko.',
        },
        {
          name: 'value',
          type: 'any',
          required: true,
          documentation: 'Value to put at the front.',
          documentation_rw: 'Agaciro ko gushyira imbere.',
        },
      ],
      returns: 'array (new)',
    },
    siba_ahabanza: {
      name: 'siba_ahabanza',
      kind: 'method',
      detail: 'Drop first element',
      documentation:
        'Returns a **new** array without index 0. The original list is not changed.',
      documentation_rw:
        '`siba_ahabanza` isubiza urutonde **rushya** nta mwanya 0. Urutonde rwambere ntiruhinduka.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The source array.',
          documentation_rw: 'Urutonde rw’isoko.',
        },
      ],
      returns: 'array (new)',
    },
    ifite_ikirango: {
      name: 'ifite_ikirango',
      kind: 'method',
      detail: 'Has key',
      documentation:
        'True if `list` has a property named `key` (for arrays, keys are `"0"`, `"1"`, …). ' +
        'This checks the **key**, not the value. Use `ifite` for a value.',
      documentation_rw:
        '`ifite_ikirango` ni `nibyo` niba `list` ifite ikirango (`key`) — ku rutonde ni `"0"`, `"1"`, … ' +
        'Igenzura **ikirango**, si agaciro. Kugenzura agaciro koresha `ifite`.',
      args: [
        {
          name: 'list',
          type: 'object',
          required: true,
          documentation: 'Array or object to inspect.',
          documentation_rw: 'Urutonde cyangwa icyegeranyo usuzuma.',
        },
        {
          name: 'key',
          type: 'string',
          required: true,
          documentation: 'Property name, e.g. `"0"` or `"izina"`.',
          documentation_rw: 'Izina ry’ikirango, urugero `"0"` cyangwa `"izina"`.',
        },
      ],
      returns: 'boolean',
    },
    ifite: {
      name: 'ifite',
      kind: 'method',
      detail: 'Contains value',
      documentation:
        'Returns `nibyo` when any element equals `value` (by runtime value). ' +
        'Also available as `list.ifite(value)`.',
      documentation_rw:
        'Isubiza `nibyo` iyo hari igice icyo ari cyo cyose kingana na `value` (ku gaciro ka runtime). ' +
        'Ihaboneka kandi nka `list.ifite(value)`.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to search. Only index `"0"` is read.',
          documentation_rw: 'Urutonde rusuzumwa. Soma umwanya `"0"` gusa.',
        },
        {
          name: 'value',
          type: 'string',
          required: true,
          documentation: 'Value to look for.',
          documentation_rw: 'Agaciro ushakisha.',
        },
      ],
      returns: 'boolean',
    },
    kora_ijambo: {
      name: 'kora_ijambo',
      kind: 'method',
      detail: 'Join array into a string',
      documentation:
        'Concatenates each element’s `.value` with **no** separator. ' +
        '`KIN_URUTONDE.kora_ijambo(["K", "i", "n"])` is `"Kin"`.',
      documentation_rw:
        '`kora_ijambo` ihuza `.value` ya buri gice **nta** kimenyetso gitandukanya. ' +
        '`KIN_URUTONDE.kora_ijambo(["K", "i", "n"])` ni `"Kin"`.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'Array of strings or numbers.',
          documentation_rw: 'Urutonde rw’amagambo cyangwa imibare.',
        },
      ],
      returns: 'string',
      example: 'KIN_URUTONDE.kora_ijambo(["K", "i", "n"])    # "Kin"',
    },
  },
};

const KIN_IGIHE: KinSymbolDoc = {
  name: 'KIN_IGIHE',
  kind: 'namespace',
  detail: 'Date and time',
  documentation:
    'Reads the current clock via `moment`. This is a **namespace**, not a function — write `KIN_IGIHE.isaha()`, never `KIN_IGIHE()`.',
  documentation_rw:
    '`KIN_IGIHE` isoma isaha iriho ikoresheje `moment`. Ni **umuryango**, si umumaro — andika `KIN_IGIHE.isaha()`, ntukandike `KIN_IGIHE()`.',
  members: {
    isaha: {
      name: 'isaha',
      kind: 'method',
      detail: 'Current time',
      documentation: 'Wall-clock time as `HH:mm:ss` (24-hour clock), e.g. `"14:05:09"`. No arguments.',
      documentation_rw:
        '`isaha` ni isaha y’urukuta mu buryo `HH:mm:ss` (amasaha 24), urugero `"14:05:09"`. Nta mpamvu.',
      args: [],
      returns: 'string',
      example: 'KIN_IGIHE.isaha()    # "14:05:09"',
    },
    umunsi: {
      name: 'umunsi',
      kind: 'method',
      detail: 'Day of week',
      documentation:
        'English weekday name from `moment().format("dddd")`, e.g. `"Monday"`, `"Tuesday"`. ' +
        'Not Kinyarwanda names such as *Kuwa Mbere*.',
      documentation_rw:
        '`umunsi` isubiza izina ry’umunsi mu Cyongereza (`moment().format("dddd")`), urugero `"Monday"`, `"Tuesday"`. ' +
        'Si amazina y’Ikinyarwanda nka *Kuwa Mbere*.',
      args: [],
      returns: 'string',
    },
    itariki: {
      name: 'itariki',
      kind: 'method',
      detail: 'Calendar date',
      documentation:
        'Date formatted `Do MMM YY` (moment), e.g. `"10th Aug 26"`. ' +
        'This is **not** `YYYY-MM-DD`.',
      documentation_rw:
        '`itariki` yandikwa mu buryo `Do MMM YY` (moment), urugero `"10th Aug 26"`. ' +
        '**Si** `YYYY-MM-DD`.',
      args: [],
      returns: 'string',
    },
  },
};

const KIN_INYANDIKO: KinSymbolDoc = {
  name: 'KIN_INYANDIKO',
  kind: 'namespace',
  detail: 'File helpers',
  documentation:
    'Read, write, append, and delete files. Paths are resolved relative to the directory ' +
    'of the global `filename` (the running `.kin` file), not the process working directory alone.\n\n' +
    'On failure these functions return an **error message string**, not `sibyo`, and they do not throw.',
  documentation_rw:
    '`KIN_INYANDIKO` ifasha gusoma, kwandika, kongeramo, no gusiba dosiye. Inzira zishyirwa ku bubiko ' +
    'bwa `filename` (dosiye `.kin` irimo gukorwa), si gusa ububiko process irimo.\n\n' +
    'Iyo byanze, iyi mimaro isubiza **ijambo ry’ubutumwa bw’ikosa**, si `sibyo`, kandi ntiyanga ikosa.',
  members: {
    soma: {
      name: 'soma',
      kind: 'method',
      detail: 'Read a file',
      documentation:
        'Reads the whole file as UTF-8. On error, returns the error message **string** (does not throw).',
      documentation_rw:
        '`soma` isoma dosiye yose nk’UTF-8. Iyo habaye ikosa, isubiza **ijambo** ry’ubutumwa bw’ikosa (ntiyanga).',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the directory of `filename`.',
          documentation_rw: 'Inzira ya dosiye iva ku bubiko bwa `filename`.',
        },
      ],
      returns: 'string',
      example: 'reka ibiri = KIN_INYANDIKO.soma("amakuru.txt")',
    },
    andika: {
      name: 'andika',
      kind: 'method',
      detail: 'Write a file',
      documentation:
        'Overwrites (or creates) the file with `text`. Returns `nibyo` on success, ' +
        'or an **error message string** on failure — never `sibyo`. Check `ubwoko(result)` or compare to `nibyo`.',
      documentation_rw:
        '`andika` yandika (cyangwa irema) dosiye ifite `text`. Isubiza `nibyo` iyo byagenze neza, ' +
        'cyangwa **ijambo ry’ikosa** iyo byanze — ntiyigeze isubiza `sibyo`. Genzura `ubwoko(result)` cyangwa ugereranye na `nibyo`.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the directory of `filename`.',
          documentation_rw: 'Inzira ya dosiye iva ku bubiko bwa `filename`.',
        },
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'Entire new contents.',
          documentation_rw: 'Ibirimo bishya byose.',
        },
      ],
      returns: 'boolean | string',
      example: 'KIN_INYANDIKO.andika("out.txt", "muraho")',
    },
    vugurura: {
      name: 'vugurura',
      kind: 'method',
      detail: 'Append to a file',
      documentation:
        'Appends `text` to the file. Returns `nibyo` on success, or an **error message string** on failure — never `sibyo`.',
      documentation_rw:
        '`vugurura` yongeramo `text` muri dosiye. Isubiza `nibyo` iyo byagenze neza, cyangwa **ijambo ry’ikosa** iyo byanze — si `sibyo`.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the directory of `filename`.',
          documentation_rw: 'Inzira ya dosiye iva ku bubiko bwa `filename`.',
        },
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'Text to add at the end.',
          documentation_rw: 'Inyandiko yo kongeramo ku musozo.',
        },
      ],
      returns: 'boolean | string',
    },
    siba: {
      name: 'siba',
      kind: 'method',
      detail: 'Delete a file',
      documentation:
        'Deletes the file. Returns `nibyo` on success, or an **error message string** on failure — never `sibyo`.',
      documentation_rw:
        '`siba` isiba dosiye. Isubiza `nibyo` iyo byagenze neza, cyangwa **ijambo ry’ikosa** iyo byanze — si `sibyo`.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the directory of `filename`.',
          documentation_rw: 'Inzira ya dosiye iva ku bubiko bwa `filename`.',
        },
      ],
      returns: 'boolean | string',
    },
  },
};

const KIN_URUBUGA: KinSymbolDoc = {
  name: 'KIN_URUBUGA',
  kind: 'namespace',
  detail: 'Networking helpers',
  documentation:
    'HTTP client for Kin programs. First slice: synchronous requests via `saba`.\n\n' +
    'Only `http://` and `https://` URLs are supported. TCP/UDP is not available yet.\n\n' +
    'On transport failure (bad URL, 30s timeout → `"Request timed out"`, DNS, connection refused, ' +
    'oversized body, …) methods return an **error message string**, not `sibyo`, and do not throw.\n\n' +
    'Redirects are **not** followed. Response bodies are UTF-8 text. Response header keys use ' +
    'underscores (`content_type`) so they work as Kin identifiers.',
  documentation_rw:
    '`KIN_URUBUGA` ifasha gukoresha urubuga. Icyiciro cya mbere: icyifuzo cya HTTP cya sync binyuze kuri `saba`.\n\n' +
    'Gusa URLs za `http://` na `https://` zemewe. TCP/UDP ntabwo zihari ubu.\n\n' +
    'Iyo byanze ku murongo (URL mbi, timeout ya amasegonda 30 → `"Request timed out"`, DNS, …), ' +
    'isubiza **ijambo ry’ubutumwa bw’ikosa**, si `sibyo`, kandi ntiyanga.\n\n' +
    'Redirects ntabwo zikurikirwa. Umubiri ni UTF-8. Imfunguzo z’imitwe zikoresha `_` (`content_type`).',
  members: {
    saba: {
      name: 'saba',
      kind: 'method',
      detail: 'HTTP request',
      documentation:
        'Performs a blocking HTTP request.\n\n' +
        '- `saba(url)` — GET\n' +
        '- `saba(url, method)` — custom method (`"GET"`, `"POST"`, …)\n' +
        '- `saba(url, method, body)` — with UTF-8 body string\n' +
        '- `saba(url, method, body, headers)` — headers object; identifier keys use `_` for hyphens ' +
        '(`Content_Type` → `Content-Type`)\n\n' +
        'Success: object `{ kode, umubiri, imitwe }`. `imitwe` keys are underscore form (`content_type`).\n' +
        'Non-2xx (including 302 redirects, which are **not** followed) still return this object.\n' +
        'Failure: error message **string** (e.g. `"Request timed out"` after 30s).',
      documentation_rw:
        '`saba` ikora icyifuzo cya HTTP gihagarika porogaramu.\n\n' +
        '- `saba(url)` — GET\n' +
        '- `saba(url, method)` — method (`"GET"`, `"POST"`, …)\n' +
        '- `saba(url, method, body)` — n’umubiri wa UTF-8\n' +
        '- `saba(url, method, body, headers)` — n’imitwe; `_` ihinduka hyphen ' +
        '(`Content_Type` → `Content-Type`)\n\n' +
        'Byagenze neza: icyegeranyo `{ kode, umubiri, imitwe }` (`content_type` mu imitwe).\n' +
        'Kode zitari 2xx n’`302` (redirects ntabwo zikurikirwa) nazo zisubizwa nk’icyegeranyo.\n' +
        'Byanze: **ijambo** ry’ubutumwa bw’ikosa (urugero `"Request timed out"`).',
      args: [
        {
          name: 'url',
          type: 'string',
          required: true,
          documentation: 'Full `http://` or `https://` URL.',
          documentation_rw: 'URL yuzuye ya `http://` cyangwa `https://`.',
        },
        {
          name: 'method',
          type: 'string',
          required: false,
          documentation: 'HTTP method. Defaults to GET when omitted.',
          documentation_rw: 'Method ya HTTP. Niba idashyizweho iba GET.',
        },
        {
          name: 'body',
          type: 'string',
          required: false,
          documentation: 'Request body text (UTF-8).',
          documentation_rw: 'Umubiri w’icyifuzo nk’inyandiko (UTF-8).',
        },
        {
          name: 'headers',
          type: 'object',
          required: false,
          documentation:
            'Request headers. Use underscores for hyphenated names (`Content_Type`).',
          documentation_rw:
            'Imitwe y’icyifuzo. Koresha `_` aho hari hyphen (`Content_Type`).',
        },
      ],
      returns: 'object | string',
      example:
        'reka res = KIN_URUBUGA.saba("https://example.com")\ntangaza_amakuru(res.kode)\ntangaza_amakuru(res.imitwe.content_type)',
    },
  },
};

export const NAMESPACES: KinSymbolDoc[] = [
  KIN_IMIBARE,
  KIN_AMAGAMBO,
  KIN_URUTONDE,
  KIN_IGIHE,
  KIN_INYANDIKO,
  KIN_URUBUGA,
];

export const FUNCTIONS: KinSymbolDoc[] = [TANGAZA, INJIZA, SISITEMU, UBWOKO];

const BY_NAME = new Map<string, KinSymbolDoc>();

function indexSymbol(sym: KinSymbolDoc, qualified?: string): void {
  BY_NAME.set(qualified ?? sym.name, sym);
  if (sym.members) {
    for (const member of Object.values(sym.members)) {
      indexSymbol(member, `${sym.name}.${member.name}`);
    }
  }
}

for (const group of [KEYWORDS, CONSTANTS, FUNCTIONS, NAMESPACES]) {
  for (const sym of group) indexSymbol(sym);
}

export const KEYWORD_NAMES = new Set(KEYWORDS.map((k) => k.name));
export const CONSTANT_NAMES = new Set(CONSTANTS.map((c) => c.name));
export const FUNCTION_NAMES = new Set(FUNCTIONS.map((f) => f.name));
export const NAMESPACE_NAMES = new Set(NAMESPACES.map((n) => n.name));

export function lookupSymbol(name: string): KinSymbolDoc | undefined {
  return BY_NAME.get(name);
}

export function lookupMember(
  object: string,
  member: string,
): KinSymbolDoc | undefined {
  return BY_NAME.get(`${object}.${member}`);
}

export function allTopLevelSymbols(): KinSymbolDoc[] {
  return [...KEYWORDS, ...CONSTANTS, ...FUNCTIONS, ...NAMESPACES];
}

/** Every catalog entry including `KIN_*` members. */
export function allCatalogSymbols(): KinSymbolDoc[] {
  const out: KinSymbolDoc[] = [];
  const walk = (sym: KinSymbolDoc): void => {
    out.push(sym);
    if (sym.members) {
      for (const member of Object.values(sym.members)) walk(member);
    }
  };
  for (const sym of allTopLevelSymbols()) walk(sym);
  return out;
}

export function formatMarkdown(sym: KinSymbolDoc, qualifiedName?: string): string {
  const title = qualifiedName ?? sym.name;
  const lines: string[] = [`### \`${title}\``, '', sym.detail];
  // Always Kinyarwanda first, then English.
  lines.push('', '**Kinyarwanda**', '', sym.documentation_rw);
  lines.push('', '**English**', '', sym.documentation);
  if (sym.args && sym.args.length > 0) {
    lines.push('', '**Arguments**');
    for (const arg of sym.args) {
      const req = arg.required ? 'required' : 'optional';
      const rw = arg.documentation_rw ? `${arg.documentation_rw} / ` : '';
      lines.push(`- \`${arg.name}\` (\`${arg.type}\`, ${req}) — ${rw}${arg.documentation}`);
    }
  } else if (sym.args && sym.args.length === 0 && sym.kind === 'method') {
    lines.push('', '**Arguments:** none.');
  }
  if (sym.returns) {
    lines.push('', `**Returns:** \`${sym.returns}\``);
  }
  if (sym.example) {
    lines.push('', '**Example**', '', '```kin', sym.example, '```');
  }
  return lines.join('\n');
}

export function formatSignature(sym: KinSymbolDoc, qualifiedName?: string): string {
  const name = qualifiedName ?? sym.name;
  if (sym.kind === 'property' || (sym.kind === 'constant' && !sym.args)) {
    return name;
  }
  const args = (sym.args ?? [])
    .map((a) => (a.required ? a.name : `[${a.name}]`))
    .join(', ');
  return `${name}(${args})`;
}
