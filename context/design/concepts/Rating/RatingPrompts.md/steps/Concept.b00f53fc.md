---
timestamp: 'Tue Oct 21 2025 07:46:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_074600.806f6bd4.md]]'
content_id: b00f53fc687c3df365f08b47844faf40b35a88567c8ff88513160b18b5ceff61
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
