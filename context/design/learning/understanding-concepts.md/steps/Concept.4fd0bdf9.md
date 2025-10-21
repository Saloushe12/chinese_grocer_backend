---
timestamp: 'Sun Oct 19 2025 20:16:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_201645.51c61581.md]]'
content_id: 4fd0bdf9d38154b91f98b7e35d06da5e4ee9809419eb5e4f52dcc81163c6106c
---

# Concept: Localization

**purpose**\
Track a user’s preferred display language.

**state**\
Each Localization record:

* userId: String
* preferredLanguage: String

**actions**

* setLanguage(userId: String, language: String)\
  *requires* language is supported\
  *effect* sets user preference

* getLanguage(userId: String): String\
  *effect* returns user’s preferred language

***
