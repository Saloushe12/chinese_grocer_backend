---
timestamp: 'Fri Nov 07 2025 21:06:03 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210603.73918336.md]]'
content_id: 3e7ca333b5037a796b8738c3b6d0abb46c519d2734e12ab320a80edbd185c891
---

# Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User`)
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String)`
  * **Requires:** The `userId` must exist. The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language.
* `clearUserLanguage(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes the preferred language setting for the specified `userId`.
* `getLanguage(userId: String): String`
  * **Effect:** Returns the user's currently set preferred language. If no preference is set, a default language (e.g., "en") could be returned or handled by the calling application/sync.

***
