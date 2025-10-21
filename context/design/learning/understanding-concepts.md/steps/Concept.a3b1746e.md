---
timestamp: 'Sun Oct 19 2025 20:16:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201654.4997e51b.md]]'
content_id: a3b1746e3cb01c021addb585f6abf27546eac0267f3cf5967b9e91678967e6b5
---

# Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User` concept - assumed for now)
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String)`
  * **Requires:** The `userId` must exist (assumed user concept). The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language.
* `getLanguage(userId: String): String`
  * **Effect:** Returns the user's currently set preferred language. If no preference is set, a default language (e.g., "en") could be returned or handled by the calling application/sync.

***
