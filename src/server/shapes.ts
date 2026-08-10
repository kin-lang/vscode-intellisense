import { Parser } from '@kin-lang/kin';

export interface PropertyInfo {
  key: string;
  /** Identifier the property was bound to, e.g. `add` in `{ addNumbers: add }`. */
  boundName?: string;
  nested?: ObjectShape;
}

export interface ObjectShape {
  properties: Map<string, PropertyInfo>;
}

export type KinNode = {
  kind?: string;
  [key: string]: unknown;
};

export function isNumericKey(key: string): boolean {
  return /^\d+$/.test(key);
}

export function shapeFromLiteral(node: KinNode | undefined): ObjectShape | undefined {
  if (!node || node.kind !== 'ObjectLiteral') return undefined;
  const properties = new Map<string, PropertyInfo>();
  const props = (node.properties as KinNode[] | undefined) ?? [];
  for (const prop of props) {
    const key = prop.key as string | undefined;
    if (!key) continue;
    const value = prop.value as KinNode | undefined;
    const nested = shapeFromLiteral(value);
    const boundName =
      value?.kind === 'Identifier' ? (value.symbol as string) : undefined;
    properties.set(key, { key, boundName, nested });
  }
  return { properties };
}

function recordBinding(
  env: Map<string, ObjectShape>,
  name: string | undefined,
  value: KinNode | undefined,
): void {
  if (!name) return;
  const shape = shapeFromLiteral(value);
  if (shape) env.set(name, shape);
}

function walk(node: KinNode | undefined, env: Map<string, ObjectShape>): void {
  if (!node || typeof node !== 'object') return;

  switch (node.kind) {
    case 'Program':
      for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, env);
      return;
    case 'VariableDeclaration':
      recordBinding(env, node.identifier as string, node.value as KinNode);
      walk(node.value as KinNode, env);
      return;
    case 'FunctionDeclaration':
      for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, env);
      return;
    case 'LoopStatement':
      walk(node.condition as KinNode, env);
      for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, env);
      return;
    case 'ConditionalStatement':
      walk(node.condition as KinNode, env);
      for (const stmt of (node.body as KinNode[]) ?? []) walk(stmt, env);
      for (const stmt of (node.alternate as KinNode[]) ?? []) walk(stmt, env);
      return;
    case 'AssignmentExpression': {
      const assigne = node.assigne as KinNode | undefined;
      if (assigne?.kind === 'Identifier') {
        recordBinding(env, assigne.symbol as string, node.value as KinNode);
      }
      walk(node.value as KinNode, env);
      return;
    }
    default:
      break;
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'kind' in item) {
          walk(item as KinNode, env);
        }
      }
    } else if (value && typeof value === 'object' && 'kind' in (value as KinNode)) {
      walk(value as KinNode, env);
    }
  }
}

const MEMBER_CHAIN =
  '[A-Za-z_][A-Za-z0-9_]*(?:\\s*(?:\\.\\s*[A-Za-z_][A-Za-z0-9_]*|\\[\\s*[^\\]\\n]+\\s*\\]))*';

/**
 * Completing after `obj.` / `list[0].` makes the file unparseable. Drop the
 * open `.member` so the earlier `reka obj = { ... }` still parses.
 */
export function sourceForShapes(text: string, offset?: number): string {
  if (offset === undefined) return text;
  const head = text.slice(0, offset);
  const tail = text.slice(offset);
  const stripped = head.replace(
    new RegExp(
      `(${MEMBER_CHAIN})\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_]*)?$`,
    ),
    '$1',
  );
  return stripped + tail;
}

/**
 * Drop dangling `.` / `(` that appear while typing so diagnostics do not
 * scream at an incomplete member or call.
 */
export function recoverSource(text: string): string {
  let src = text.replace(
    new RegExp(`(${MEMBER_CHAIN})\\s*\\.\\s*$`, 'gm'),
    '$1',
  );
  // Strip an incomplete call (`foo(`, `obj.m(1, `) so the rest of the file parses.
  let prev = '';
  while (src !== prev) {
    prev = src;
    src = src.replace(
      /([A-Za-z_][A-Za-z0-9_]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_]*)*)\s*\([^()]*$/gm,
      '$1',
    );
  }
  return src;
}

/** Object literals bound to names in this file (`reka obj = { ... }`). */
export function collectObjectShapes(
  text: string,
  offset?: number,
): Map<string, ObjectShape> {
  const env = new Map<string, ObjectShape>();
  const candidates = [
    offset !== undefined ? sourceForShapes(text, offset) : text,
    recoverSource(offset !== undefined ? sourceForShapes(text, offset) : text),
    recoverSource(text),
  ];
  const seen = new Set<string>();
  for (const src of candidates) {
    if (seen.has(src)) continue;
    seen.add(src);
    try {
      const ast = new Parser().produceAST(src) as unknown as KinNode;
      walk(ast, env);
      return env;
    } catch {
      continue;
    }
  }
  return env;
}

/** Walk `obj.key4.sub` through collected shapes. */
export function resolveShape(
  env: Map<string, ObjectShape>,
  path: string[],
): ObjectShape | undefined {
  if (path.length === 0) return undefined;
  let shape = env.get(path[0]);
  for (let i = 1; i < path.length; i++) {
    if (!shape) return undefined;
    shape = shape.properties.get(path[i])?.nested;
  }
  return shape;
}

export function lookupUserProperty(
  env: Map<string, ObjectShape>,
  object: string,
  member: string,
): PropertyInfo | undefined {
  return env.get(object)?.properties.get(member);
}
