# Known Test Failures

Track pre-existing test failures here so the preflight gate (Phase 3→4 workflow step) can
distinguish between new failures introduced by a task and failures that already existed.

Format:
```
## <service> — <test name or file>
- **First seen:** YYYY-MM-DD
- **Status:** investigating | accepted | fixed in <commit>
- **Why it fails:** brief description
- **Impact:** does it block any feature?
```

---

*No known failures as of 2026-05-26. Add entries here when a pre-existing failure is identified
during preflight — never silently ignore a failing test.*
