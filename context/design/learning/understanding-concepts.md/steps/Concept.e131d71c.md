---
timestamp: 'Sun Oct 19 2025 20:52:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_205209.85371aa0.md]]'
content_id: e131d71cc7266e9ab21e5636e6af4cb5def8e845082f441382c60e1c2be3c465
---

# Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User`) // Now explicitly references the new User concept
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String)`
  * **Requires:** The `userId` must exist. The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language.
* `getLanguage(userId: String): String`
  * **Effect:** Returns the user's currently set preferred language. If no preference is set, a default language (e.g., "en") could be returned or handled by the calling application/sync.

***
