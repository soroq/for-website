// Minimal ambient declarations for the Node built-in test/assert modules used by
// consoleModel.test.ts. The project tsconfig does not auto-include @types/node
// for `node:` imports, and tsconfig is outside this task's allowed files — this
// script .d.ts (no imports/exports) keeps `tsc -b` / `npm run build` green
// without adding a dependency. Actual runtime is provided by Node.

declare module "node:test" {
  const test: (name: string, fn: () => void | Promise<void>) => void;
  export default test;
}

declare module "node:assert/strict" {
  interface AssertStrict {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(value: string, regExp: RegExp, message?: string): void;
  }
  const assert: AssertStrict;
  export default assert;
}
