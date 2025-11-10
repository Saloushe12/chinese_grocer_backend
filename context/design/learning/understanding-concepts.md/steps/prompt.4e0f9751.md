---
timestamp: 'Fri Nov 07 2025 23:10:50 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_231050.86fa1195.md]]'
content_id: 4e0f9751d10513d17fbf7e83e2e3b6323a525c4fd7231130ed70b7d2a547dffc
---

# prompt: Look at the following proposal and see if it fits the current backend code. Analyze the code for mistakes.

Engine-driven changes: what to fix and why

1. where must use underscored queries that return arrays

Frames.query(...) expects a function that returns an array (or Promise<array>).

Methods whose names start with \_ are not instrumented and are called directly—perfect for queries.

Non-underscored methods are actions, not queries, and shouldn’t be used inside where.

Do this: add \_get... helpers in concepts that return arrays and call them from where.

2. Every when: actions(...) needs an output mapping

Keep specifying output bindings in when clauses (e.g., { request }, { userId }, { error }, or {} if truly empty), because the engine matches on both inputs and outputs.

3. Paths in syncs exclude the base URL

In syncs, match Requesting.request on paths like "/User/registerUser" (no /api).

In passthrough.ts, routes do include the base (default /api).

A) Add underscored array-returning queries to concepts
User concept: queries for where clauses
// In UserConcept.ts
// Queries MUST start with "\_" and return arrays for Frames.query(...)

async \_getUserById(
{ userId }: { userId: ID }
): Promise\<Array<{ userId: ID }>> {
const user = await this.users.findOne(
{ \_id: userId },
{ projection: { \_id: 1 } }
);
return user ? \[{ userId: user.\_id }] : \[];
}

async \_getUserByUsernameOrEmail(
{ usernameOrEmail }: { usernameOrEmail: string }
): Promise\<Array<{ userId: ID }>> {
const user = await this.users.findOne(
{ $or: \[{ username: usernameOrEmail }, { email: usernameOrEmail }] },
{ projection: { \_id: 1 } }
);
return user ? \[{ userId: user.\_id }] : \[];
}

Store concept: lightweight existence query (for where)
// In StoreConcept.ts
async \_getStore(
{ storeId }: { storeId: ID }
): Promise\<Array<{ storeId: ID }>> {
const store = await this.stores.findOne({ \_id: storeId }, { projection: { \_id: 1 } });
return store ? \[{ storeId: store.\_id }] : \[];
}

(If you prefer not to expose \_getStore, you can create a minimal \_exists({ storeId }) => \[{ ok: true }] | \[] instead.)

Review concept (optional)
// In ReviewConcept.ts
async \_getReviewsByUser(
{ userId }: { userId: ID }
): Promise\<Array<{ reviewId: ID }>> {
const docs = await this.reviews.find(
{ authorId: userId },
{ projection: { \_id: 1 } }
).toArray();
return docs.map(d => ({ reviewId: d.\_id }));
}

B) Use underscored queries inside where
Protect Review.createReview with auth & store existence
// src/syncs/review.sync.ts
import { actions, Sync } from "@engine";
import { Requesting, User, Review, Rating, Store } from "@concepts";

export const CreateReviewRequest: Sync = ({ request, userId, storeId, rating, text }) => ({
when: actions(
\[Requesting.request, { path: "/Review/createReview", userId, storeId, rating, text }, { request }],
),
// WHERE: authorize that user and store exist
where: (frames) =>
frames
.query(User.\_getUserById, { userId }, { userId })
.query(Store.\_getStore, { storeId }, { storeId }),
then: actions(
\[Review.createReview, { userId, storeId, rating, text }, {}],
\[Rating.updateRating, { storeId }, {}],        // maintain derived rating
\[Requesting.respond, { request }, {}],         // ack the request
),
});

(Any other validation you need belongs here as additional .query(...) steps.)

C) Keep the request/response split for excluded routes

Your request→action and success/error response syncs are structurally correct for the engine:

export const UserRegistrationRequest: Sync = ({ request, username, email, password }) => ({
when: actions(\[Requesting.request, { path: "/User/registerUser", username, email, password }, { request }]),
then: actions(\[User.registerUser, { username, email, password }, {}]),
});

export const UserRegistrationResponseSuccess: Sync = ({ request, userId }) => ({
when: actions(
\[Requesting.request, { path: "/User/registerUser" }, { request }],
\[User.registerUser, {}, { userId }],
),
then: actions(\[Requesting.respond, { request, userId }, {}]),
});

export const UserRegistrationResponseError: Sync = ({ request, error }) => ({
when: actions(
\[Requesting.request, { path: "/User/registerUser" }, { request }],
\[User.registerUser, {}, { error }],
),
then: actions(\[Requesting.respond, { request, error }, {}]),
});

Same pattern applies to authenticateUser.

D) Cascade syncs: outputs

If your delete actions truly return {} (empty), leaving the when output mapping as {} is fine:

export const CascadeUserDeletion: Sync = ({ userId }) => ({
when: actions(\[User.deleteUser, { userId }, {}]),
then: actions(
\[Review.deleteReviewsByUser, { userId }, {}],
\[Localization.clearUserLanguage, { userId }, {}],
),
});

If your action returns something (e.g., { ok: true }), change the mapping to { ok } (and you may ignore it later).

E) passthrough.ts (include only safe public reads)
// src/concepts/Requesting/passthrough.ts
const BASE = Deno.env.get("REQUESTING\_BASE\_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

export const inclusions: Record\<string, string> = {
// Public read-only Store queries
\[R("Store", "listStores")]: "Public read; no side-effects",
\[R("Store", "getStoreById")]: "Public read; no side-effects",

// Public read-only Tagging queries
\[R("Tagging", "listTagsForStore")]: "Public read; safe",
\[R("Tagging", "\_getStoresByTag")]: "Public exploration; safe ids-only",

// Public read-only Review queries (if you expose them)
\[R("Review", "getReviewsForStore")]: "Public read; safe",
\[R("Review", "getReviewsByUser")]: "Public read; safe",
};

export const exclusions: string\[] = \[
// User: protected or needs centralized logic
R("User", "registerUser"),
R("User", "authenticateUser"),
R("User", "updateUserEmail"),
R("User", "deleteUser"),

// Review: protected + derived updates
R("Review", "createReview"),
R("Review", "deleteReview"),

// Rating: mutation should be internal-only (triggered by sync)
R("Rating", "updateRating"),

// Tagging mutations: protected (auth/ownership)
R("Tagging", "addTag"),
R("Tagging", "removeTag"),

// Store mutations: protected (admin-only)
R("Store", "createStore"),
R("Store", "deleteStore"),

// Decide policy for these; exclude by default to gate them
R("Store", "\_getStoresByName"),
R("Store", "\_getStoresByAddress"),
];

If you want \_getStoresByName/\_getStoresByAddress public, move them to inclusions and justify their openness.

Frontend impact (minimal)

Endpoints remain the same (/api/...). Excluded routes are reified as requests and handled by syncs—the HTTP shape stays.

Request bodies remain the same unless a sync’s where now requires additional params (e.g., a session token). Add only where needed.

Error handling: keep surfacing error strings; syncs may return richer messages.

After mutations: refresh derived reads—e.g., reload rating after create/delete review.

Example refresh pattern
await reviewStore.createReview(reviewData);
await loadRating();  // derived by sync via Rating.updateRating
await loadReviews();
