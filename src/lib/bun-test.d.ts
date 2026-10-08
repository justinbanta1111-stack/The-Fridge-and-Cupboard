// Minimal types for Bun's test runner, kept local so Bun's global types don't override the app's fetch types.
declare module "bun:test" {
  type Fn = () => void | Promise<void>;
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: Fn): void;
  export const it: typeof test;
  export function expect(value: unknown): any;
}
