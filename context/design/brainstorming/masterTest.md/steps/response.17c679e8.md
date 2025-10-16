---
timestamp: 'Wed Oct 15 2025 09:03:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_090358.baa59886.md]]'
content_id: 17c679e8609006a9d2f1da0666bfb7e55accc7e0599f5281c745d4a68e47ae63
---

# response:

The error `NotCapable: Requires read access to ".env", run again with the --allow-read flag` indicates that your Deno test runner is attempting to read a `.env` file (likely for database connection details or other configurations) but doesn't have the necessary file system read permissions.

Deno, by default, runs with strict security and requires explicit permissions for file system access, network access, environment variables, etc.

To resolve this, you need to add the `--allow-read` flag to your Deno test command.

**Original Command (likely):**

```bash
deno test
```

**Corrected Command:**

```bash
deno test --allow-read
```

If your test also interacts with a database (which it does, `testDb` suggests network activity), you might also need `--allow-net`:

```bash
deno test --allow-read --allow-net
```

It's good practice to be explicit about the permissions needed for your tests.

**Why this happened:**
The line `return parse(Deno.readTextFileSync(filepath));` within `@std/dotenv` (which `testDb` likely uses) is trying to read your `.env` file synchronously. Without `--allow-read`, Deno prevents this.
