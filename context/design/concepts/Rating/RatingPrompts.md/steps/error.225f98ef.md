---
timestamp: 'Tue Oct 21 2025 08:09:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_080923.dcb65ed4.md]]'
content_id: 225f98ef2df564d08e245a3c6699dd917bff185ef10939e4eea1a7e2f5bed4e6
---

# error: Leaks detected: A TLS connection was opened/accepted before the test started, but was closed during the test. Do not close resources in a test that were not created during that test. A timer was started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. An async call to op\_read was started before the test, but completed during the test. Async operations should not complete in a test if they were not started in that test. To get more details where leaks occurred, run again with the --trace-leaks flag.
