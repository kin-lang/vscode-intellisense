import { Parser } from '@kin-lang/kin';
import {
  CONSTANT_NAMES,
  FUNCTION_NAMES,
  KEYWORD_NAMES,
  NAMESPACE_NAMES,
  lookupMember,
  lookupSymbol,
} from './catalog';
import { isIdentifierToken, locateTokens, type LocatedToken } from './locate';
import { recoverSource, shapeFromLiteral, sourceForShapes, type KinNode, type ObjectShape } from './shapes';
import { positionAt } from './text';

export type BindingKind = 'var' | 'const' | 'function' | 'param' | 'builtin';

export type Inferred =
  | 'number'
  | 'string'
  | 'boolean'
  | 'object'
  | 'array'
  | 'function'
  | 'null'
  | 'unknown';

export interface TextRange {
  start: number;
  end: number;
  line: number;
  character: number;
}

export interface Binding {
  name: string;
  kind: BindingKind;
  constant: boolean;
  range: TextRange;
  params?: string[];
  docComment?: string;
  shape?: ObjectShape;
  boundName?: string;
  inferred: Inferred;
}

export interface IdentUse {
  name: string;
  range: TextRange;
  role: 'decl' | 'ref' | 'property' | 'key';
  binding?: Binding;
  objectName?: string;
}

export interface UserFunction {
  name: string;
  params: string[];
  docComment?: string;
  range: TextRange;
  binding: Binding;
}

export interface ScopeNode {
  kind: 'file' | 'function' | 'block' | 'loop';
  start: number;
  end: number;
  parent?: ScopeNode;
  children: ScopeNode[];
  bindings: Map<string, Binding>;
}

export interface Issue {
  code: string;
  message: string;
  range: TextRange;
  severity: 'error' | 'warning';
}

export interface Analysis {
  text: string;
  tokens: LocatedToken[];
  ast: KinNode | null;
  root: ScopeNode;
  bindings: Binding[];
  uses: IdentUse[];
  functions: UserFunction[];
  issues: Issue[];
}

const BUILTIN_MUTABLE = new Set(['ikosa']);

export const BUILTIN_NAMES: ReadonlySet<string> = new Set([
  ...CONSTANT_NAMES,
  ...FUNCTION_NAMES,
  ...NAMESPACE_NAMES,
  'hagarara',
]);

export function rangeFromToken(token: LocatedToken): TextRange {
  return {
    start: token.start,
    end: token.end,
    line: token.line,
    character: token.startChar,
  };
}

export function rangeFromOffsets(
  text: string,
  start: number,
  end: number,
): TextRange {
  const pos = positionAt(text, start);
  return { start, end, line: pos.line, character: pos.character };
}

function syntheticRange(): TextRange {
  return { start: 0, end: 0, line: 0, character: 0 };
}

export function parseKin(text: string, offset?: number): KinNode | null {
  const candidates: string[] = [];
  if (offset !== undefined) candidates.push(sourceForShapes(text, offset));
  candidates.push(text, recoverSource(text));
  const seen = new Set<string>();
  for (const src of candidates) {
    if (seen.has(src)) continue;
    seen.add(src);
    try {
      return new Parser().produceAST(src) as unknown as KinNode;
    } catch {
      continue;
    }
  }
  return null;
}

export function leadingComment(text: string, offset: number): string | undefined {
  const pos = positionAt(text, offset);
  const lines = text.split('\n');
  const collected: string[] = [];
  for (let l = pos.line - 1; l >= 0; l--) {
    const m = lines[l].match(/^\s*#\s?(.*)$/);
    if (!m) {
      if (/^\s*$/.test(lines[l])) continue;
      break;
    }
    collected.unshift(m[1]);
  }
  const doc = collected.join('\n').trim();
  return doc || undefined;
}

class IdentCursor {
  constructor(private readonly tokens: LocatedToken[]) {}
  i = 0;

  take(name: string): LocatedToken | undefined {
    while (this.i < this.tokens.length) {
      const t = this.tokens[this.i++];
      if (isIdentifierToken(t) && t.lexeme === name) return t;
    }
    return undefined;
  }
}

function inferFromNode(node: KinNode | undefined): {
  inferred: Inferred;
  shape?: ObjectShape;
  boundName?: string;
} {
  if (!node) return { inferred: 'null' };
  switch (node.kind) {
    case 'NumericLiteral':
      return { inferred: 'number' };
    case 'StringLiteral':
      return { inferred: 'string' };
    case 'ObjectLiteral': {
      const shape = shapeFromLiteral(node);
      const keys = [...(shape?.properties.keys() ?? [])];
      const isArray = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
      return { inferred: isArray ? 'array' : 'object', shape };
    }
    case 'Identifier': {
      const symbol = node.symbol as string;
      if (symbol === 'nibyo' || symbol === 'sibyo') return { inferred: 'boolean' };
      if (symbol === 'ubusa') return { inferred: 'null' };
      return { inferred: 'unknown', boundName: symbol };
    }
    case 'UnaryExpr':
      return { inferred: 'boolean' };
    default:
      return { inferred: 'unknown' };
  }
}

function seedBuiltins(scope: ScopeNode): void {
  const add = (
    name: string,
    kind: BindingKind,
    inferred: Inferred,
    constant: boolean,
  ) => {
    scope.bindings.set(name, {
      name,
      kind,
      constant,
      range: syntheticRange(),
      inferred,
    });
  };
  for (const name of CONSTANT_NAMES) {
    const inferred: Inferred =
      name === 'nibyo' || name === 'sibyo'
        ? 'boolean'
        : name === 'ubusa'
          ? 'null'
          : name === 'filename'
            ? 'string'
            : 'unknown';
    add(name, 'builtin', inferred, !BUILTIN_MUTABLE.has(name));
  }
  for (const name of FUNCTION_NAMES) {
    add(name, 'builtin', 'function', true);
  }
  for (const name of NAMESPACE_NAMES) {
    add(name, 'builtin', 'object', true);
  }
  add('hagarara', 'builtin', 'function', true);
}

function matchingCloseBrace(text: string, open: number): number {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '"') inString = false;
      else if (ch === '\n') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '#') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

function braceBlockAfter(text: string, from: number): { start: number; end: number } {
  let i = Math.max(0, from);
  let inString = false;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === '"') inString = false;
      else if (ch === '\n') inString = false;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = true;
      i++;
      continue;
    }
    if (ch === '#') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '{') {
      return { start: i, end: matchingCloseBrace(text, i) };
    }
    i++;
  }
  return { start: from, end: text.length };
}

function childScope(
  parent: ScopeNode,
  kind: ScopeNode['kind'],
  start: number,
  end: number,
): ScopeNode {
  const child: ScopeNode = {
    kind,
    start,
    end,
    parent,
    children: [],
    bindings: new Map(),
  };
  parent.children.push(child);
  return child;
}

function resolveBinding(scope: ScopeNode, name: string): Binding | undefined {
  let cur: ScopeNode | undefined = scope;
  while (cur) {
    const hit = cur.bindings.get(name);
    if (hit) return hit;
    cur = cur.parent;
  }
  return undefined;
}

function minMaxArgs(name: string, binding?: Binding): {
  min: number;
  max: number | undefined;
  label: string;
} | null {
  if (binding?.kind === 'function' && binding.params) {
    return {
      min: binding.params.length,
      max: binding.params.length,
      label: `${name}(${binding.params.join(', ')})`,
    };
  }
  const cat = lookupSymbol(name);
  if (cat && (cat.kind === 'function' || cat.kind === 'method')) {
    const args = cat.args ?? [];
    const hasRest = args.some((a) => a.name.startsWith('...'));
    const requiredFixed = args.filter(
      (a) => a.required && !a.name.startsWith('...'),
    ).length;
    const requiredRest = args.some((a) => a.required && a.name.startsWith('...'))
      ? 1
      : 0;
    return {
      min: requiredFixed + requiredRest,
      max: hasRest ? undefined : args.length,
      label: name,
    };
  }
  return null;
}

export function analyze(text: string, offset?: number): Analysis {
  const tokens = locateTokens(text);
  const identTokens = tokens.filter(isIdentifierToken);
  const ast = parseKin(text, offset);
  const root: ScopeNode = {
    kind: 'file',
    start: 0,
    end: text.length,
    children: [],
    bindings: new Map(),
  };
  seedBuiltins(root);

  const bindings: Binding[] = [];
  const uses: IdentUse[] = [];
  const functions: UserFunction[] = [];
  const issues: Issue[] = [];
  const seen = new WeakSet<object>();
  const cursor = new IdentCursor(identTokens);

  const take = (name: string): LocatedToken | undefined => cursor.take(name);

  const declare = (
    scope: ScopeNode,
    binding: Binding,
    redeclareRange: TextRange,
  ): void => {
    if (scope.bindings.has(binding.name)) {
      issues.push({
        code: 'kin.redeclare',
        severity: 'error',
        range: redeclareRange,
        message:
          `Cannot redeclare \`${binding.name}\`. / Ntushobora kwandika \`${binding.name}\` inshuro ebyiri.`,
      });
      return;
    }
    scope.bindings.set(binding.name, binding);
    if (binding.kind !== 'builtin') bindings.push(binding);
  };

  const recordUse = (use: IdentUse): void => {
    uses.push(use);
  };

  const walk = (node: KinNode | undefined, scope: ScopeNode): void => {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    switch (node.kind) {
      case 'Program': {
        for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, scope);
        return;
      }
      case 'VariableDeclaration': {
        const name = node.identifier as string;
        const tok = take(name);
        const range = tok ? rangeFromToken(tok) : rangeFromOffsets(text, 0, 0);
        if (tok) {
          recordUse({ name, range, role: 'decl' });
        }
        walk(node.value as KinNode | undefined, scope);
        const inferred = inferFromNode(node.value as KinNode | undefined);
        let boundName = inferred.boundName;
        let inferredKind = inferred.inferred;
        let shape = inferred.shape;
        if (boundName) {
          const target = resolveBinding(scope, boundName);
          if (target?.kind === 'function' || target?.inferred === 'function') {
            inferredKind = 'function';
            if (target.kind === 'function') boundName = target.name;
          } else if (target?.shape) {
            shape = target.shape;
            inferredKind = target.inferred;
          }
        }
        const binding: Binding = {
          name,
          kind: node.constant ? 'const' : 'var',
          constant: !!node.constant,
          range,
          shape,
          boundName: inferredKind === 'function' ? boundName : undefined,
          inferred: inferredKind,
        };
        if (tok) {
          const use = uses[uses.length - 1];
          if (use && use.role === 'decl' && use.name === name) use.binding = binding;
        }
        declare(scope, binding, range);
        return;
      }
      case 'TypeAliasDeclaration': {
        // Types live in a separate namespace; skip value bindings.
        return;
      }
      case 'ClassDeclaration': {
        const name = node.name as string;
        const nameTok = take(name);
        const range = nameTok
          ? rangeFromToken(nameTok)
          : rangeFromOffsets(text, 0, 0);
        const binding: Binding = {
          name,
          kind: 'const',
          constant: true,
          range,
          inferred: 'function',
        };
        if (nameTok) {
          recordUse({ name, range, role: 'decl', binding });
        }
        declare(scope, binding, range);
        // Methods / constructor bodies: walk for nested symbols.
        // ClassConstructor lives on AST field `constructor` (not Function).
        const rawCtor = (node as Record<string, unknown>)['constructor'];
        if (
          rawCtor &&
          typeof rawCtor === 'object' &&
          rawCtor !== null &&
          'body' in (rawCtor as object)
        ) {
          for (const stmt of ((rawCtor as KinNode).body as KinNode[]) ?? []) {
            walk(stmt, scope);
          }
        }
        for (const m of (node.methods as KinNode[]) ?? []) {
          for (const stmt of (m.body as KinNode[]) ?? []) walk(stmt, scope);
        }
        return;
      }
      case 'ImportDeclaration': {
        // koresha "path" nka alias — alias is a constant namespace object.
        const alias = node.alias as string | undefined;
        if (alias) {
          const tok = take(alias);
          const range = tok
            ? rangeFromToken(tok)
            : rangeFromOffsets(text, 0, 0);
          const binding: Binding = {
            name: alias,
            kind: 'const',
            constant: true,
            range,
            inferred: 'object',
          };
          if (tok) recordUse({ name: alias, range, role: 'decl', binding });
          declare(scope, binding, range);
        }
        return;
      }
      case 'ExportDeclaration': {
        // emerera_gukoresha { names } — mark names as referenced exports.
        for (const name of (node.names as string[]) ?? []) {
          const tok = take(name);
          if (tok) {
            recordUse({
              name,
              range: rangeFromToken(tok),
              role: 'ref',
            });
          }
        }
        return;
      }
      case 'FunctionDeclaration': {
        const name = node.name as string;
        // Support both legacy string[] params and typed { name, typeAnnotation }[].
        const rawParams = (node.parameters as unknown[]) ?? [];
        const params = rawParams.map((p) =>
          typeof p === 'string'
            ? p
            : ((p as { name?: string })?.name ?? String(p)),
        );
        const nameTok = take(name);
        const range = nameTok
          ? rangeFromToken(nameTok)
          : rangeFromOffsets(text, 0, 0);
        const docComment = nameTok
          ? leadingComment(text, nameTok.start)
          : undefined;
        const binding: Binding = {
          name,
          kind: 'function',
          constant: true,
          range,
          params,
          docComment,
          inferred: 'function',
        };
        if (nameTok) {
          recordUse({ name, range, role: 'decl', binding });
        }
        declare(scope, binding, range);
        functions.push({ name, params, docComment, range, binding });

        const fnStart = nameTok?.start ?? scope.start;
        const braces = braceBlockAfter(text, nameTok?.end ?? fnStart);
        const fnScope = childScope(scope, 'function', fnStart, braces.end);
        for (const param of params) {
          const pTok = take(param);
          const pRange = pTok
            ? rangeFromToken(pTok)
            : rangeFromOffsets(text, fnStart, fnStart);
          const pBind: Binding = {
            name: param,
            kind: 'param',
            constant: false,
            range: pRange,
            inferred: 'unknown',
          };
          if (pTok) recordUse({ name: param, range: pRange, role: 'decl', binding: pBind });
          declare(fnScope, pBind, pRange);
        }
        let sawReturn = false;
        for (const stmt of (node.body as KinNode[]) ?? []) {
          if (stmt.kind === 'FunctionTerminator') continue;
          if (sawReturn) {
            const before = uses.length;
            walk(stmt, fnScope);
            const hit = uses[before] ?? uses[uses.length - 1];
            issues.push({
              code: 'kin.after-tanga',
              severity: 'warning',
              range: hit?.range ?? range,
              message:
                'Statement after `tanga` is not run. / Ibyanditswe nyuma ya `tanga` ntibikora.',
            });
          } else {
            walk(stmt, fnScope);
          }
          if (stmt.kind === 'ReturnExpr') sawReturn = true;
        }
        return;
      }
      case 'LoopStatement': {
        const condStart = identTokens[cursor.i]?.start ?? 0;
        const braces = braceBlockAfter(text, condStart);
        const loop = childScope(scope, 'loop', condStart, braces.end);
        walk(node.condition as KinNode, loop);
        const body = childScope(loop, 'block', braces.start, braces.end);
        for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, body);
        return;
      }
      case 'ConditionalStatement': {
        const condStart = identTokens[cursor.i]?.start ?? 0;
        walk(node.condition as KinNode, scope);
        const braces = braceBlockAfter(
          text,
          identTokens[Math.max(0, cursor.i - 1)]?.end ?? condStart,
        );
        const body = childScope(scope, 'block', braces.start, braces.end);
        for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, body);
        const alternate = (node.alternate as KinNode[] | undefined) ?? [];
        if (
          alternate.length === 1 &&
          alternate[0]?.kind === 'ConditionalStatement'
        ) {
          walk(alternate[0], scope);
        } else if (alternate.length > 0) {
          const altBraces = braceBlockAfter(text, braces.end);
          const alt = childScope(scope, 'block', altBraces.start, altBraces.end);
          for (const stmt of alternate) walk(stmt, alt);
        }
        return;
      }
      case 'AssignmentExpression': {
        const assigne = node.assigne as KinNode | undefined;
        walk(assigne, scope);
        walk(node.value as KinNode, scope);
        if (assigne?.kind === 'Identifier') {
          const name = assigne.symbol as string;
          const binding = resolveBinding(scope, name);
          if (binding?.constant) {
            const use = [...uses].reverse().find((u) => u.name === name && u.role === 'ref');
            issues.push({
              code: 'kin.assign-to-const',
              severity: 'error',
              range: use?.range ?? rangeFromOffsets(text, 0, 0),
              message:
                `Cannot assign to constant \`${name}\`. / Ntushobora guhindura ntahinduka \`${name}\`.`,
            });
          }
        }
        return;
      }
      case 'Identifier': {
        const name = node.symbol as string;
        const tok = take(name);
        if (!tok) return;
        const range = rangeFromToken(tok);
        const binding = resolveBinding(scope, name);
        recordUse({ name, range, role: 'ref', binding });
        if (!binding && !BUILTIN_NAMES.has(name) && !KEYWORD_NAMES.has(name)) {
          issues.push({
            code: 'kin.unresolved',
            severity: 'error',
            range,
            message:
              `Cannot resolve \`${name}\`. / \`${name}\` ntiyabonetse.`,
          });
        }
        return;
      }
      case 'MemberExpression': {
        walk(node.object as KinNode, scope);
        if (node.computed) {
          walk(node.property as KinNode, scope);
        } else {
          const prop = node.property as KinNode | undefined;
          if (prop?.kind === 'Identifier') {
            const name = prop.symbol as string;
            const tok = take(name);
            if (tok) {
              const obj = node.object as KinNode;
              const objectName =
                obj?.kind === 'Identifier' ? (obj.symbol as string) : undefined;
              recordUse({
                name,
                range: rangeFromToken(tok),
                role: 'property',
                objectName,
              });
            }
          } else {
            walk(prop, scope);
          }
        }
        return;
      }
      case 'ObjectLiteral': {
        for (const prop of (node.properties as KinNode[]) ?? []) {
          const key = prop.key as string | undefined;
          if (key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            const tok = take(key);
            if (tok) {
              recordUse({ name: key, range: rangeFromToken(tok), role: 'key' });
            }
          }
          if (prop.value) walk(prop.value as KinNode, scope);
          else if (key) {
            // shorthand `{ key }` looks up `key`
            const binding = resolveBinding(scope, key);
            if (!binding && !BUILTIN_NAMES.has(key)) {
              const use = [...uses].reverse().find((u) => u.name === key && u.role === 'key');
              if (use) {
                issues.push({
                  code: 'kin.unresolved',
                  severity: 'error',
                  range: use.range,
                  message:
                    `Cannot resolve \`${key}\`. / \`${key}\` ntiyabonetse.`,
                });
              }
            }
          }
        }
        return;
      }
      case 'CallExpression': {
        walk(node.caller as KinNode, scope);
        for (const arg of (node.args as KinNode[]) ?? []) walk(arg, scope);
        checkCall(node, scope, uses, issues, functions);
        return;
      }
      case 'UnaryExpr': {
        const name = node.variable as string;
        if (name) {
          const tok = take(name);
          if (tok) {
            const range = rangeFromToken(tok);
            const binding = resolveBinding(scope, name);
            recordUse({ name, range, role: 'ref', binding });
            if (!binding && !BUILTIN_NAMES.has(name)) {
              issues.push({
                code: 'kin.unresolved',
                severity: 'error',
                range,
                message:
                  `Cannot resolve \`${name}\`. / \`${name}\` ntiyabonetse.`,
              });
            }
          }
        }
        return;
      }
      case 'ReturnExpr': {
        walk(node.value as KinNode | undefined, scope);
        return;
      }
      case 'FunctionTerminator':
        return;
      default:
        break;
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'kind' in item) {
            walk(item as KinNode, scope);
          }
        }
      } else if (value && typeof value === 'object' && 'kind' in (value as KinNode)) {
        walk(value as KinNode, scope);
      }
    }
  };

  if (ast) walk(ast, root);

  return { text, tokens, ast, root, bindings, uses, functions, issues };
}

function checkCall(
  node: KinNode,
  scope: ScopeNode,
  uses: IdentUse[],
  issues: Issue[],
  functions: UserFunction[],
): void {
  const caller = node.caller as KinNode | undefined;
  const args = (node.args as KinNode[]) ?? [];
  const argCount = args.length;

  const pushArity = (
    range: TextRange,
    label: string,
    min: number,
    max: number | undefined,
  ) => {
    if (argCount < min || (max !== undefined && argCount > max)) {
      const expect =
        max === undefined ? `at least ${min}` : min === max ? `${min}` : `${min}–${max}`;
      issues.push({
        code: 'kin.arity',
        severity: 'error',
        range,
        message:
          `\`${label}\` expects ${expect} argument(s), got ${argCount}. / \`${label}\` isaba argument ${expect}, wakoresheje ${argCount}.`,
      });
    }
  };

  const pushNotCallable = (range: TextRange, label: string) => {
    issues.push({
      code: 'kin.not-callable',
      severity: 'error',
      range,
      message:
        `Cannot call \`${label}\` — it is not a function. / Ntushobora guhamagara \`${label}\` — si porogaramu_ntoya.`,
    });
  };

  if (caller?.kind === 'Identifier') {
    const name = caller.symbol as string;
    const use = [...uses].reverse().find((u) => u.name === name && u.role === 'ref');
    const range = use?.range ?? rangeFromOffsets('', 0, 0);
    const cat = lookupSymbol(name);
    if (cat) {
      if (cat.kind === 'function') {
        const mm = minMaxArgs(name);
        if (mm) pushArity(range, name, mm.min, mm.max);
      } else if (name === 'hagarara') {
        // npm 0.4.3: identifier + native exit. Local Kin: keyword, never an Identifier.
        pushArity(range, name, 1, 1);
      } else {
        pushNotCallable(range, name);
      }
      return;
    }
    const binding = resolveBinding(scope, name);
    if (!binding) return;
    if (binding.kind === 'function' || binding.inferred === 'function') {
      const fn =
        binding.kind === 'function'
          ? binding
          : functions.find((f) => f.name === binding.boundName)?.binding;
      const params = fn?.params ?? binding.params;
      if (params) pushArity(range, name, params.length, params.length);
      return;
    }
    if (binding.inferred !== 'unknown') {
      pushNotCallable(range, name);
    }
    return;
  }

  if (caller?.kind === 'MemberExpression' && !caller.computed) {
    const obj = caller.object as KinNode | undefined;
    const prop = caller.property as KinNode | undefined;
    if (obj?.kind !== 'Identifier' || prop?.kind !== 'Identifier') return;
    const object = obj.symbol as string;
    const member = prop.symbol as string;
    const use = [...uses]
      .reverse()
      .find((u) => u.role === 'property' && u.name === member);
    const range = use?.range ?? rangeFromOffsets('', 0, 0);
    const qualified = `${object}.${member}`;
    const cat = lookupMember(object, member) ?? lookupSymbol(qualified);
    if (cat) {
      if (cat.kind === 'method' || cat.kind === 'function') {
        const mm = minMaxArgs(qualified);
        if (mm) pushArity(range, qualified, mm.min, mm.max);
      } else {
        pushNotCallable(range, qualified);
      }
      return;
    }
    const objBind = resolveBinding(scope, object);
    const propInfo = objBind?.shape?.properties.get(member);
    if (propInfo?.boundName) {
      const fn = functions.find((f) => f.name === propInfo.boundName);
      if (fn) {
        pushArity(range, member, fn.params.length, fn.params.length);
        return;
      }
    }
    if (propInfo?.nested || (propInfo && !propInfo.boundName)) {
      // known data property
      if (!propInfo.boundName) pushNotCallable(range, qualified);
    }
  }
}

export function scopeAt(root: ScopeNode, offset: number): ScopeNode {
  let current = root;
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of current.children) {
      if (offset >= child.start && offset <= child.end) {
        current = child;
        changed = true;
        break;
      }
    }
  }
  return current;
}

export function bindingsInScope(
  scope: ScopeNode,
  offset: number,
): Binding[] {
  const seen = new Set<string>();
  const out: Binding[] = [];
  let cur: ScopeNode | undefined = scope;
  while (cur) {
    for (const binding of cur.bindings.values()) {
      if (seen.has(binding.name)) continue;
      if (binding.kind === 'builtin') continue;
      if (binding.range.start >= offset && binding.kind !== 'param') continue;
      seen.add(binding.name);
      out.push(binding);
    }
    cur = cur.parent;
  }
  return out;
}

export function lookupUserFunction(
  analysis: Analysis,
  name: string,
): UserFunction | undefined {
  return analysis.functions.find((f) => f.name === name);
}

export function useAt(analysis: Analysis, offset: number): IdentUse | undefined {
  const covering = analysis.uses.filter(
    (u) => offset >= u.range.start && offset <= u.range.end,
  );
  if (covering.length === 0) {
    // Allow clicking just next to the ident (common for F12 at end).
    return analysis.uses.find(
      (u) => offset === u.range.end || offset === u.range.start,
    );
  }
  return covering[covering.length - 1];
}

export { resolveBinding };
