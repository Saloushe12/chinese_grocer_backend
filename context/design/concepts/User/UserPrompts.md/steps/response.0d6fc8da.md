---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 0d6fc8da2594cdefe8a3fbf9a304ffc14cebb4b78498fff8d1a784ba978e8aaa
---

# response:

You've hit a common Deno module resolution issue when using `npm:` specifiers directly in your code without a proper `deno.json` configuration. Deno wants you to declare external dependencies (like `bcrypt` from npm) in a `deno.json` file.

Here's how to fix it:

1. **Create or Update `deno.json`:**
   If you don't already have a `deno.json` file in your project root, create one. If you do, update it. You need to add `npm:bcrypt` to the `imports` map and enable `nodeModulesDir: "auto"` for Deno to automatically manage npm dependencies.

   Your `deno.json` should look something like this:

   ```json
   // deno.json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "react"
     },
     "imports": {
       // Add your existing imports here if you have them, e.g.:
       "@utils/types.ts": "./utils/types.ts",
       "@utils/database.ts": "./utils/database.ts",
       // Add bcrypt here:
       "bcrypt": "npm:bcrypt@^5.1.1", // Use the latest stable version you prefer
       "npm:mongodb": "npm:mongodb@^6.3.0", // Ensure MongoDB is also correctly listed
       "npm:bcrypt": "npm:bcrypt@^5.1.1" // Explicitly add this if it's not already in other imports
     },
     "nodeModulesDir": true // Or "auto", which is equivalent to true in newer Deno versions
   }
   ```

   **Important:**

   * Make sure `bcrypt` is listed in the `imports` section. I've used `^5.1.1` as an example, but you can choose a specific version or range.
   * `"nodeModulesDir": true` (or `"nodeModulesDir": "auto"`) tells Deno to create a `node_modules` directory if necessary and manage npm packages there, which makes it compatible with tooling that expects `node_modules`.

2. **Update your `UserConcept.ts` imports:**
   Once you've defined the `bcrypt` import in `deno.json`, you can reference it using its bare specifier in your TypeScript file:

   ```typescript
   // src/User/UserConcept.ts
   import { Collection, Db } from "npm:mongodb"; // Keep npm: for mongodb unless you map it too
   import { Empty, ID } from "@utils/types.ts";
   import { freshID } from "@utils/database.ts";
   import { hash, compare } from "bcrypt"; // <--- CHANGE THIS LINE
   //                                         No "npm:" prefix here anymore
   // ... rest of your code ...
   ```

3. **Run Deno with caching:**
   After making these changes, run your Deno application. Deno will automatically detect the new `deno.json` and download/cache the npm dependencies.

   ```bash
   deno cache src/User/UserConcept.ts
   # or, if you're running your main application:
   deno run --allow-net --allow-env --allow-read --allow-write <your_main_app_file.ts>
   ```

   The `--allow-*` flags are just examples of common Deno permissions you might need. Deno will likely prompt you for the necessary permissions if you omit them.

By following these steps, Deno will correctly resolve `bcrypt` and other npm dependencies.
