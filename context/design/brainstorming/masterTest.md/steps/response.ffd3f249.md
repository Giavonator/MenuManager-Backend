---
timestamp: 'Wed Oct 15 2025 09:00:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_090023.06ca2a7b.md]]'
content_id: ffd3f249be78a1e11eb6af93bc62d0c424fd0fd8cf66f70146fcc6a95807e38e
---

# response:

A Deno master test that runs all other tests is typically not needed because Deno's built-in test runner handles this functionality automatically.

When you execute `deno test` from your project's root directory, Deno will by default:

1. **Discover Test Files**: Look for files matching patterns like `*.test.ts`, `*_test.ts`, `*.test.js`, etc., in the current directory and its subdirectories.
2. **Execute All Tests**: Run all the `Deno.test` definitions found within those discovered files.

So, to run all your tests (including `src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts` and any others you might add), you simply navigate to your project's root directory in your terminal and run:

```bash
deno test
```

If you only want to run tests within a specific directory or file, you can provide a path:

```bash
deno test src/concepts/UserAuthentication/
# or
deno test src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts
```

If you wanted to explicitly list files or control the execution order in a "master" script, you could technically create a Deno script that imports and runs test modules, but this is generally not recommended as it bypasses the standard test runner's features (like parallel execution, filtering, reporting, and `beforeAll`/`afterAll` hooks that are tied to the runner's lifecycle).

Therefore, the `deno test` command itself serves as the "master test" for your Deno project.
