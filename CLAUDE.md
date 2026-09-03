## Commit messages

Use a Conventional Commits prefix on every commit title: `type: short imperative summary`.

- `feat` — new capability or behavior (a new flag, a new source, a new output format)
- `fix` — bug fix
- `chore` — maintenance with no user-visible behavior change (deps, config, cleanup)
- `docs` — README/CLAUDE.md/comment-only changes
- `refactor` — code restructuring with no behavior change
- `test` — test-only changes
- `style` — formatting/whitespace, no logic change
- `perf` — performance improvement
- `revert` — reverts a previous commit

Keep the summary lowercase after the colon, imperative mood ("add", not "added"/"adds"), no trailing period, ideally under ~70 characters. Example: `feat: add minimal session panel to CLI output`.

For a commit that only touches one thing, the title alone is enough — skip the body. When a commit bundles several distinct changes (e.g. a new flag plus a rewritten function plus a doc update), add a blank line after the title and a short bullet per change:

```
feat: add minimal session panel to CLI output

- add --no-banner flag to suppress it for scripts/redirected logs
- add print_session_hud() — boxed Title/Source/Chapters/Workers/Output summary
- drop the old plain "Downloading chapters..." print in favor of the panel
```

Do not append a `Co-Authored-By: Claude ...` trailer to commits in this repo.

## Pull requests

Do not append a "🤖 Generated with [Claude Code]" footer (or similar attribution line) to pull request descriptions in this repo.
