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
}

export interface KinSymbolDoc {
  name: string;
  kind: 'keyword' | 'constant' | 'function' | 'namespace' | 'method' | 'property';
  detail: string;
  documentation: string;
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
      'Creates a name you can change later.\n\n' +
      '- `reka izina = agaciro` assigns a value (no semicolon).\n' +
      '- `reka izina;` declares it empty (`ubusa`). Semicolon is required here.\n\n' +
      'Kinyarwanda: *reka* = let / allow.',
    snippet: 'reka ${1:izina} = ${2:0}',
  },
  {
    name: 'ntahinduka',
    kind: 'keyword',
    detail: 'Declare a constant',
    documentation:
      'Creates a name that cannot be reassigned. An initializer is required — ' +
      '`ntahinduka x;` is a parse error.\n\nKinyarwanda: *nta hinduka* = does not change.',
    snippet: 'ntahinduka ${1:IZINA} = ${2:0}',
  },
  {
    name: 'porogaramu_ntoya',
    kind: 'keyword',
    detail: 'Define a function',
    documentation:
      'Declares a named function. Parameters are identifiers only. ' +
      'Use `tanga` to return a value. A function that never returns yields `ubusa`.\n\n' +
      'Kinyarwanda: *porogaramu ntoya* = small program / subroutine.',
    snippet:
      'porogaramu_ntoya ${1:izina}(${2:a}) {\n\t${3:tanga a}\n}',
  },
  {
    name: 'tanga',
    kind: 'keyword',
    detail: 'Return from a function',
    documentation:
      'Leaves the current function.\n\n' +
      '- `tanga agaciro` returns that value (no semicolon).\n' +
      '- `tanga;` returns `ubusa`. The semicolon marks the omitted value.\n\n' +
      '`tanga` is a statement, not an expression — you cannot write `foo(tanga 1)`.\n\n' +
      'Kinyarwanda: *tanga* = give.',
    snippet: 'tanga ${1:agaciro}',
  },
  {
    name: 'niba',
    kind: 'keyword',
    detail: 'If',
    documentation:
      'Runs the block when the condition is `nibyo` (true).\n\n' +
      'Chain with `nanone_niba` (else-if) and finish with `niba_byanze` (else).\n\n' +
      'Kinyarwanda: *niba* = if.',
    snippet: 'niba (${1:nibyo}) {\n\t$0\n}',
  },
  {
    name: 'nanone_niba',
    kind: 'keyword',
    detail: 'Else if',
    documentation:
      'Tried only when the previous `niba` / `nanone_niba` was false. ' +
      'You may repeat it. Must follow a `niba`.\n\nKinyarwanda: *nanone niba* = again if.',
    snippet: 'nanone_niba (${1:nibyo}) {\n\t$0\n}',
  },
  {
    name: 'niba_byanze',
    kind: 'keyword',
    detail: 'Else',
    documentation:
      'Runs when every preceding `niba` / `nanone_niba` was false. No condition.\n\n' +
      'Kinyarwanda: *niba byanze* = if it failed.',
    snippet: 'niba_byanze {\n\t$0\n}',
  },
  {
    name: 'subiramo_niba',
    kind: 'keyword',
    detail: 'While loop',
    documentation:
      'Repeats the block while the condition is `nibyo`. Check the condition yourself ' +
      '(there is no `for`). Use `hagarara` to leave early.\n\n' +
      'Kinyarwanda: *subiramo niba* = repeat if.',
    snippet:
      'subiramo_niba (${1:i} < ${2:10}) {\n\t$0\n\t${1:i} = ${1:i} + 1\n}',
  },
  {
    name: 'hagarara',
    kind: 'keyword',
    detail: 'Break out of a loop',
    documentation:
      'Exits the nearest `subiramo_niba`. A semicolon after it is optional.\n\n' +
      'Note: globals.ts also registers a native `hagarara(code)` that would call ' +
      '`process.exit`, but the lexer always treats `hagarara` as this keyword, so ' +
      'that exit function cannot be called from source.\n\n' +
      'Kinyarwanda: *hagarara* = stop.',
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
      'drops that default body.\n\nKinyarwanda: *gereranya* = compare.',
    snippet:
      'gereranya (${1:x}) {\n\tusanze ${2:1}:\n\t\t$0\n\tibindi:\n\t\ttangaza_amakuru("ikindi")\n}',
  },
  {
    name: 'usanze',
    kind: 'keyword',
    detail: 'Switch case',
    documentation:
      'One arm of `gereranya`. Written `usanze label:` followed by statements. ' +
      'There is no fall-through — the first matching arm runs.\n\n' +
      'Kinyarwanda: *usanze* = if you find / in case of.',
    snippet: 'usanze ${1:1}:\n\t$0',
  },
  {
    name: 'ibindi',
    kind: 'keyword',
    detail: 'Switch default',
    documentation:
      'Default arm of `gereranya`. Runs when no `usanze` matched. Must be last.\n\n' +
      'Kinyarwanda: *ibindi* = the others / otherwise.',
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
    'Always returns `ubusa`.\n\nKinyarwanda: *tangaza amakuru* = announce information.',
  args: [
    {
      name: '...values',
      type: 'any',
      required: false,
      documentation: 'Values to print, in order. You may pass zero or more.',
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
    'Kinyarwanda: *injiza amakuru* = enter information.',
  args: [
    {
      name: '...prompt',
      type: 'any',
      required: true,
      documentation:
        'Pieces of the prompt shown to the user. At least one argument is required. ' +
        'They are concatenated the same way `tangaza_amakuru` prints.',
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
    'This is powerful and dangerous: the command runs with your user permissions. ' +
    'Prefer it for learning, not for untrusted files.\n\n' +
    'Kinyarwanda: *sisitemu* = system.',
  args: [
    {
      name: 'command',
      type: 'string',
      required: true,
      documentation: 'The shell command to execute, e.g. `"ls"` or `"date"`.',
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
    'Returns the Kin type name of its argument as a string: ' +
    '`number`, `string`, `boolean`, `object`, `fn`, `native-fn`, or `null`.\n\n' +
    'Arrays are `object` (they are maps keyed `"0"`, `"1"`, …).\n\n' +
    'Kinyarwanda: *ubwoko* = kind / type.',
  args: [
    {
      name: 'value',
      type: 'any',
      required: true,
      documentation: 'Any Kin value.',
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
    documentation: 'The true value. Printed as `nibyo`.\n\nKinyarwanda: *nibyo* = it is true.',
  },
  {
    name: 'sibyo',
    kind: 'constant',
    detail: 'Boolean false',
    documentation: 'The false value. Printed as `sibyo`.\n\nKinyarwanda: *sibyo* = it is not true.',
  },
  {
    name: 'ubusa',
    kind: 'constant',
    detail: 'Null',
    documentation:
      'The empty value. Uninitialized `reka x;` starts as `ubusa`. ' +
      'Printed as `ubusa`.\n\nKinyarwanda: *ubusa* = empty / nothing.',
  },
  {
    name: 'ikosa',
    kind: 'constant',
    detail: 'Error slot',
    documentation:
      'A mutable global, initially `ubusa`. Reserved as an error holder; ' +
      'the runtime does not currently write to it automatically.\n\n' +
      'Kinyarwanda: *ikosa* = error / mistake.',
  },
  {
    name: 'filename',
    kind: 'constant',
    detail: 'Path of the running file',
    documentation:
      'A string: the path passed to `kin run`, or the REPL working directory. ' +
      'File helpers under `KIN_INYANDIKO` resolve relative to this path.',
  },
];

const KIN_IMIBARE: KinSymbolDoc = {
  name: 'KIN_IMIBARE',
  kind: 'namespace',
  detail: 'Mathematics helpers',
  documentation:
    'Built-in math: π, square root, random integers, rounding, and trigonometry.\n\n' +
    'Kinyarwanda: *imibare* = numbers / mathematics.',
  members: {
    pi: {
      name: 'pi',
      kind: 'property',
      detail: 'π (pi)',
      documentation:
        'The constant π ≈ 3.14159… (JavaScript `Math.PI`). This is a number, not a function — write `KIN_IMIBARE.pi`, not `KIN_IMIBARE.pi()`.',
      returns: 'number',
    },
    umuzikare: {
      name: 'umuzikare',
      kind: 'method',
      detail: 'Square root',
      documentation: 'Square root of a number (`Math.sqrt`).\n\nKinyarwanda: *umuzikare* = square root.',
      args: [
        {
          name: 'x',
          type: 'number',
          required: true,
          documentation: 'The number to take the square root of.',
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
        'Inclusive random integer from `min` to `max` (`Math.random`, then floor).\n\n' +
        'Kinyarwanda: *umubare utazwi* = unknown number.',
      args: [
        {
          name: 'min',
          type: 'number',
          required: true,
          documentation: 'Lower bound (ceiled).',
        },
        {
          name: 'max',
          type: 'number',
          required: true,
          documentation: 'Upper bound (floored).',
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
        'Rounds a number with `Math.round` (0.5 goes up).\n\n' +
        'Kinyarwanda: *kuraho ibice* = remove the fractions.',
      args: [
        {
          name: 'x',
          type: 'number',
          required: true,
          documentation: 'The number to round.',
        },
      ],
      returns: 'number',
      example: 'KIN_IMIBARE.kuraho_ibice(3.6)    # 4',
    },
    sin: {
      name: 'sin',
      kind: 'method',
      detail: 'Sine',
      documentation: 'Sine of an angle in **radians** (`Math.sin`).',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
        },
      ],
      returns: 'number',
    },
    cos: {
      name: 'cos',
      kind: 'method',
      detail: 'Cosine',
      documentation: 'Cosine of an angle in **radians** (`Math.cos`).',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
        },
      ],
      returns: 'number',
    },
    tan: {
      name: 'tan',
      kind: 'method',
      detail: 'Tangent',
      documentation: 'Tangent of an angle in **radians** (`Math.tan`).',
      args: [
        {
          name: 'radians',
          type: 'number',
          required: true,
          documentation: 'Angle in radians, not degrees.',
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
    'Work with text: join, length, character at index, upper/lower case, split.\n\n' +
    'Kinyarwanda: *amagambo* = words.',
  members: {
    huza: {
      name: 'huza',
      kind: 'method',
      detail: 'Join strings',
      documentation:
        'Concatenates every argument into one string. Arguments should be strings.\n\n' +
        'Kinyarwanda: *huza* = join / unite.',
      args: [
        {
          name: '...parts',
          type: 'string',
          required: false,
          documentation: 'String pieces, in order. Zero arguments yield an empty string.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.huza("Mu", "ra", "ho")    # "Muraho"',
    },
    ingano: {
      name: 'ingano',
      kind: 'method',
      detail: 'String length',
      documentation:
        'Number of characters in a string.\n\nKinyarwanda: *ingano* = size / amount.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to measure.',
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
        'Returns the character at `index` (0-based). Out of range yields an empty string.\n\n' +
        'Kinyarwanda: *inyuguti* = letter.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to index.',
        },
        {
          name: 'index',
          type: 'number',
          required: true,
          documentation: '0-based character position.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.inyuguti("Kin", 0)    # "K"',
    },
    inyuguti_nkuru: {
      name: 'inyuguti_nkuru',
      kind: 'method',
      detail: 'Uppercase',
      documentation:
        'Copies the string in CAPITAL LETTERS.\n\nKinyarwanda: *inyuguti nkuru* = big letters.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to convert.',
        },
      ],
      returns: 'string',
      example: 'KIN_AMAGAMBO.inyuguti_nkuru("kin")    # "KIN"',
    },
    inyuguti_ntoya: {
      name: 'inyuguti_ntoya',
      kind: 'method',
      detail: 'Lowercase',
      documentation:
        'Copies the string in small letters.\n\nKinyarwanda: *inyuguti ntoya* = small letters.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to convert.',
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
        'Splits `text` on `separator` and returns an array (object keyed `"0"`, `"1"`, …).\n\n' +
        'Kinyarwanda: *tandukanya* = separate.',
      args: [
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'The string to split.',
        },
        {
          name: 'separator',
          type: 'string',
          required: true,
          documentation: 'Delimiter. Use `""` to split into characters.',
        },
      ],
      returns: 'array (object)',
      example: 'KIN_AMAGAMBO.tandukanya("a,b,c", ",")',
    },
  },
};

const KIN_URUTONDE: KinSymbolDoc = {
  name: 'KIN_URUTONDE',
  kind: 'namespace',
  detail: 'Array helpers',
  documentation:
    'Kin arrays are objects whose keys are `"0"`, `"1"`, `"2"`, … ' +
    'These helpers treat that shape as a list.\n\nKinyarwanda: *urutonde* = list.',
  members: {
    ingano: {
      name: 'ingano',
      kind: 'method',
      detail: 'Array length',
      documentation: 'How many entries the array currently has (`Map.size`).',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array (object) to measure.',
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
        'Adds `value` at the end of `list` **in place** and returns the new length.\n\n' +
        'Kinyarwanda: *ongera ku musozo* = add at the end.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to mutate.',
        },
        {
          name: 'value',
          type: 'any',
          required: true,
          documentation: 'Value to append.',
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
        'Deletes the last entry **in place** and returns the new length (not the removed value).\n\n' +
        'Kinyarwanda: *siba ku musozo* = delete at the end.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to mutate.',
        },
      ],
      returns: 'number (new length)',
    },
    injiza_ahabanza: {
      name: 'injiza_ahabanza',
      kind: 'method',
      detail: 'Prepend',
      documentation:
        'Returns a **new** array with `value` at index 0. The original list is not changed.\n\n' +
        'Kinyarwanda: *injiza ahabanza* = insert at the front.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The source array.',
        },
        {
          name: 'value',
          type: 'any',
          required: true,
          documentation: 'Value to put at the front.',
        },
      ],
      returns: 'array (new)',
    },
    siba_ahabanza: {
      name: 'siba_ahabanza',
      kind: 'method',
      detail: 'Drop first element',
      documentation:
        'Returns a **new** array without index 0. The original list is not changed.\n\n' +
        'Kinyarwanda: *siba ahabanza* = delete at the front.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The source array.',
        },
      ],
      returns: 'array (new)',
    },
    ifite_ikirango: {
      name: 'ifite_ikirango',
      kind: 'method',
      detail: 'Has key',
      documentation:
        'True if `list` has a property named `key` (for arrays, keys are `"0"`, `"1"`, …).\n\n' +
        'Kinyarwanda: *ifite ikirango* = has a label / key.',
      args: [
        {
          name: 'list',
          type: 'object',
          required: true,
          documentation: 'Array or object to inspect.',
        },
        {
          name: 'key',
          type: 'string',
          required: true,
          documentation: 'Property name, e.g. `"0"` or `"izina"`.',
        },
      ],
      returns: 'boolean',
    },
    ifite: {
      name: 'ifite',
      kind: 'method',
      detail: 'Contains value (first only)',
      documentation:
        'Currently compares `value` to the **first** element only — it does not scan the rest. ' +
        'Documented here as the runtime behaves today.\n\nKinyarwanda: *ifite* = has.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'The array to search.',
        },
        {
          name: 'value',
          type: 'string',
          required: true,
          documentation: 'Value to look for (compared via `.value`).',
        },
      ],
      returns: 'boolean',
    },
    kora_ijambo: {
      name: 'kora_ijambo',
      kind: 'method',
      detail: 'Join array into a string',
      documentation:
        'Concatenates each element’s `.value` with no separator.\n\n' +
        'Kinyarwanda: *kora ijambo* = make a word.',
      args: [
        {
          name: 'list',
          type: 'array',
          required: true,
          documentation: 'Array of strings or numbers.',
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
    'Reads the current clock via `moment`. No arguments.\n\nKinyarwanda: *igihe* = time.',
  members: {
    isaha: {
      name: 'isaha',
      kind: 'method',
      detail: 'Current time',
      documentation: 'Wall-clock time as `HH:mm:ss`.\n\nKinyarwanda: *isaha* = hour / clock.',
      args: [],
      returns: 'string',
      example: 'KIN_IGIHE.isaha()    # "14:05:09"',
    },
    umunsi: {
      name: 'umunsi',
      kind: 'method',
      detail: 'Day of week',
      documentation:
        'English weekday name from `moment`, e.g. `"Monday"`.\n\nKinyarwanda: *umunsi* = day.',
      args: [],
      returns: 'string',
    },
    itariki: {
      name: 'itariki',
      kind: 'method',
      detail: 'Calendar date',
      documentation:
        'Date formatted `Do MMM YY`, e.g. `"10th Aug 26"`.\n\nKinyarwanda: *itariki* = date.',
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
    'of `filename` (the running `.kin` file).\n\nOn failure these functions return an ' +
    'error string instead of throwing.\n\nKinyarwanda: *inyandiko* = document / file.',
  members: {
    soma: {
      name: 'soma',
      kind: 'method',
      detail: 'Read a file',
      documentation:
        'Reads the whole file as UTF-8. On error, returns the error message string.\n\n' +
        'Kinyarwanda: *soma* = read.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the running program’s directory.',
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
        'or an error string on failure.\n\nKinyarwanda: *andika* = write.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the running program’s directory.',
        },
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'Entire new contents.',
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
        'Appends `text` to the file. Returns `nibyo` on success, or an error string.\n\n' +
        'Kinyarwanda: *vugurura* = update.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the running program’s directory.',
        },
        {
          name: 'text',
          type: 'string',
          required: true,
          documentation: 'Text to add at the end.',
        },
      ],
      returns: 'boolean | string',
    },
    siba: {
      name: 'siba',
      kind: 'method',
      detail: 'Delete a file',
      documentation:
        'Deletes the file. Returns `nibyo` on success, or an error string.\n\n' +
        'Kinyarwanda: *siba* = erase.',
      args: [
        {
          name: 'path',
          type: 'string',
          required: true,
          documentation: 'File path relative to the running program’s directory.',
        },
      ],
      returns: 'boolean | string',
    },
  },
};

export const NAMESPACES: KinSymbolDoc[] = [
  KIN_IMIBARE,
  KIN_AMAGAMBO,
  KIN_URUTONDE,
  KIN_IGIHE,
  KIN_INYANDIKO,
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

export function formatMarkdown(sym: KinSymbolDoc, qualifiedName?: string): string {
  const title = qualifiedName ?? sym.name;
  const lines: string[] = [`### \`${title}\``, '', sym.detail, '', sym.documentation];
  if (sym.args && sym.args.length > 0) {
    lines.push('', '**Arguments**');
    for (const arg of sym.args) {
      const req = arg.required ? 'required' : 'optional';
      lines.push(`- \`${arg.name}\` (\`${arg.type}\`, ${req}) — ${arg.documentation}`);
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
