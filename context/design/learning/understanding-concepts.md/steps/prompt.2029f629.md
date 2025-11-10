---
timestamp: 'Sun Nov 09 2025 00:27:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251109_002740.c7ece4a6.md]]'
content_id: 2029f6295cef6c636cb1234e0fad5ac089643561abff9fafed21ee4275170f98
---

# prompt: Look at the four updated sync implementation files linked above. Here is my current passthrough file:

/\*\*

* The Requesting concept exposes passthrough routes by default,
* which allow POSTs to the route:
*
* /{REQUESTING\_BASE\_URL}/{Concept name}/{action or query}
*
* to passthrough directly to the concept action or query.
* This is a convenient and natural way to expose concepts to
* the world, but should only be done intentionally for public
* actions and queries.
*
* This file allows you to explicitly set inclusions and exclusions
* for passthrough routes:
* * inclusions: those that you can justify their inclusion
* * exclusions: those to exclude, using Requesting routes instead
    \*/

/\*\*

* INCLUSIONS
*
* Each inclusion must include a justification for why you think
* the passthrough is appropriate (e.g. public query).
*
* inclusions = {"route": "justification"}
  \*/

export const inclusions: Record\<string, string> = {
// User Concept - Query Actions (Public)
"/api/User/\_getUserById":
"Public query to get user profile information (non-sensitive data only)",
"/api/User/getUserById":
"Public read operation to get user profile (non-sensitive data only)",

// Store Concept - Query Actions (Public)
"/api/Store/\_getStore": "Public query to get store details",
"/api/Store/\_getStoresByName": "Public query to search stores by name",
"/api/Store/\_getStoresByAddress": "Public query to search stores by address",
"/api/Store/getStore": "Public read operation to get store details",
"/api/Store/listStores": "Public read operation to list all stores",
"/api/Store/getStoreById": "Public read operation to get full store details",

// Review Concept - Query Actions (Public)
"/api/Review/\_getReviewById": "Public query to get review details",
"/api/Review/\_getReviewsForStore":
"Public query to get review IDs for a store",
"/api/Review/\_getReviewsByUser": "Public query to get review IDs by user",
"/api/Review/getReviewsForStore":
"Public read operation to get review IDs for a store",
"/api/Review/listReviewsForStore":
"Public read operation to get full review objects for a store",
"/api/Review/getReviewsByUser":
"Public read operation to get review IDs by user",
"/api/Review/listReviewsByUser":
"Public read operation to get full review objects by user",

// Rating Concept - Query Actions (Public)
"/api/Rating/\_getRating": "Public query to get store rating",
"/api/Rating/getRating": "Public read operation to get store rating",

// Tagging Concept - Query Actions (Public)
"/api/Tagging/\_getStoresByTag": "Public query to get stores by tag",
"/api/Tagging/getStoresByTag": "Public read operation to get stores by tag",
"/api/Tagging/listTagsForStore":
"Public read operation to get tags for a store",

// Localization Concept - Read Operations (Public)
"/api/Localization/getLanguage":
"Public read operation to get user's language preference",

// Internal Actions (Called by syncs, not directly from HTTP)
// These are included because they're only called by syncs internally
"/api/Review/deleteReviewsForStore":
"Internal action called by CascadeStoreDeletion sync",
"/api/Review/deleteReviewsByUser":
"Internal action called by CascadeUserDeletion sync",
"/api/Rating/updateRating":
"Internal action called by AggregateReviewRating and AdjustRatingOnReviewDeletion syncs",
"/api/Rating/deleteRatingForStore":
"Internal action called by CascadeStoreDeletion sync",
"/api/Tagging/deleteTagsForStore":
"Internal action called by CascadeStoreDeletion sync",
"/api/Localization/clearUserLanguage":
"Internal action called by CascadeUserDeletion sync",

// Tagging Actions (Public)
"/api/Tagging/removeTag": "Public action to remove a tag from a store",
};

/\*\*

* EXCLUSIONS
*
* Excluded routes fall back to the Requesting concept, and will
* instead trigger the normal Requesting.request action. As this
* is the intended behavior, no justification is necessary.
*
* These routes are handled by syncs for security, validation, and orchestration.
  \*/

export const exclusions: Array<string> = \[
// User Concept - Excluded (handled by syncs)
"/api/User/registerUser", // Handled by UserRegistrationRequest sync
"/api/User/authenticateUser", // Handled by UserAuthenticationRequest sync
"/api/User/updateUserEmail", // May want sync for validation/notification
"/api/User/deleteUser", // Handled by CascadeUserDeletion sync

// Store Concept - Excluded (handled by syncs)
"/api/Store/createStore", // Handled by CreateStoreRequest sync
"/api/Store/deleteStore", // Handled by CascadeStoreDeletion sync

// Review Concept - Excluded (handled by syncs)
"/api/Review/createReview", // Handled by CreateReviewRequest sync (with user validation)
"/api/Review/deleteReview", // Handled by AdjustRatingOnReviewDeletion sync

// Tagging Concept - Excluded (handled by syncs)
"/api/Tagging/addTag", // Handled by AddTagRequest sync

// Localization Concept - Excluded (handled by syncs)
"/api/Localization/setLanguage", // Handled by SetLanguageRequest sync (with user validation)
];

Verify that the passthrough file works correctly with the syncs. If not, tell me the errors and fix them.
