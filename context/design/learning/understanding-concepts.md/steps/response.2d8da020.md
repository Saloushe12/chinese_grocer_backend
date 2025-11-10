---
timestamp: 'Sun Nov 09 2025 00:16:25 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251109_001625.f6437e09.md]]'
content_id: 2d8da02032b380bb4712ae7900603ca43d356a2fe6d0fc0a0a9b456070c5dd6a
---

# response:

Great job! Completing all the sync implementations is a significant milestone. Your backend system is now capable of translating incoming HTTP requests into complex, multi-concept workflows, and enforcing data integrity through synchronizations.

The next (and final) step for this phase is to **update the `passthrough.ts` file** to properly configure which API routes should be directly exposed by the `Requesting` concept (passthrough) and which should always trigger a `Requesting.request` action (excluded) to be handled by your newly created syncs.

This configuration is critical for security, control, and ensuring that your syncs are actually engaged when intended.

***

## Your Next Step: Update `src/concepts/Requesting/passthrough.ts`

Here's the revised content for your `passthrough.ts` file. It's designed based on the final concept specifications and sync definitions, following these principles:

* **Inclusions:** Primarily underscored queries (`_get...`, `_list...`) that are publicly safe, read-only operations providing data to the frontend.
* **Exclusions:** All actions (non-underscored methods) that modify state, or complex query/action flows that you want your custom syncs to orchestrate. Also, internal helper queries (like `_userExists`) are excluded as they're not meant for direct public access.

### File: `src/concepts/Requesting/passthrough.ts`

```typescript
import "jsr:@std/dotenv/load";

const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

export const inclusions: Record<string, string> = {
    // --- Public read-only Store queries ---
    [R("Store", "_listAllStores")]: "Public read; returns all stores with full details.",
    [R("Store", "_getStoreDetails")]: "Public read; returns single store details by ID.",
    [R("Store", "_getStoresByName")]: "Public read; safe to search stores by name.",
    [R("Store", "_getStoresByAddress")]: "Public read; safe to search stores by address.",

    // --- Public read-only Tagging queries ---
    [R("Tagging", "_getTagsForStore")]: "Public read; returns tags for a specific store.",
    [R("Tagging", "_getStoresByTag")]: "Public read; returns IDs of stores with a given tag.",

    // --- Public read-only Review queries ---
    [R("Review", "_getReviewByIdFull")]: "Public read; returns full review details by ID.",
    [R("Review", "_getReviewsForStoreFull")]: "Public read; returns full review details for a store.",
    [R("Review", "_getReviewsByUserFull")]: "Public read; returns full review details by user.",

    // --- Public read-only Rating query ---
    [R("Rating", "_getRating")]: "Public read; returns aggregated rating for a store.",

    // --- Public read-only User queries ---
    [R("User", "_getUserDetails")]: "Public read; returns non-sensitive user profile details.",
};

export const exclusions: string[] = [
    // --- User: Actions that modify state or require authentication/authorization syncs ---
    R("User", "registerUser"),
    R("User", "authenticateUser"),
    R("User", "updateUserEmail"),
    R("User", "deleteUser"),
    // Internal validation queries (not for direct public exposure)
    R("User", "_userExists"),
    R("User", "_getUserByUsernameOrEmail"),

    // --- Store: Actions that modify state (typically admin-only) ---
    R("Store", "createStore"),
    R("Store", "deleteStore"),
    // Internal validation query
    R("Store", "_storeExists"),

    // --- Tagging: Actions that modify state or require authorization syncs ---
    R("Tagging", "addTag"),
    R("Tagging", "removeTag"),
    R("Tagging", "deleteTagsForStore"),

    // --- Review: Actions that modify state and trigger derived updates (rating aggregation) ---
    R("Review", "createReview"),
    R("Review", "deleteReview"),
    R("Review", "deleteReviewsForStore"),
    R("Review", "deleteReviewsByUser"),

    // --- Rating: Actions that modify state (always internal, triggered by syncs) ---
    R("Rating", "updateRating"),
    R("Rating", "deleteRatingForStore"),
];
```

***

### Why these inclusions and exclusions?

* **`User` Exclusions:** All `User` actions (`registerUser`, `authenticateUser`, `updateUserEmail`, `deleteUser`) are critical mutations or authentication flows. They are explicitly excluded from passthrough so that your `user_auth.sync.ts` synchronizations (e.g., `UserRegistrationRequest`, `UserAuthenticationRequest`, `DeleteUserRequest`, `UpdateUserEmailRequest`) will intercept the incoming HTTP requests and handle the logic, including pre-conditions and responses. Internal queries like `_userExists` are also excluded because they are meant for internal validation within syncs, not direct public API calls.
* **`Store` Exclusions:** `createStore` and `deleteStore` are mutation actions, likely requiring authorization or specific business logic that should be handled by your `stores.sync.ts` (e.g., `CreateStoreRequest`, `DeleteStoreRequest`). `_storeExists` is an internal query for sync validation.
* **`Tagging` Exclusions:** `addTag`, `removeTag`, `deleteTagsForStore` are mutations that need to be handled by your `tagging.sync.ts` (e.g., `AddTagRequest`, `RemoveTagRequest`).
* **`Review` Exclusions:** `createReview`, `deleteReview`, and the cascade deletion actions are core mutations that involve rating aggregation and data integrity. Your `reviews.sync.ts` (e.g., `CreateReviewRequest`, `DeleteReviewRequest`) is specifically designed to handle these.
* **`Rating` Exclusions:** `updateRating` and `deleteRatingForStore` are exclusively internal actions, designed to be triggered *only* by other synchronizations (like `AggregateReviewRating` or `DeleteReviewRequest`), never by direct external requests. This perfectly embodies the "completeness of functionality" and "separation of concerns" principles where `Rating` is a derived state.
* **Inclusions:** All included routes are underscored queries (`_get...`, `_list...`) that return data without side-effects. These are considered safe for direct public consumption, allowing frontends to fetch information efficiently without triggering complex sync workflows.

***

### Your final steps:

1. **Replace the content of `src/concepts/Requesting/passthrough.ts`** with the code provided above.
2. **Run `deno run build`** (if you haven't recently) to ensure your module imports are refreshed.
3. **Run `deno run start`** to launch your application.

Now, your application's API endpoints will behave exactly as defined by your syncs and passthrough configuration, providing a robust and modular backend powered by Concept Design!
