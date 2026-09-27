# Contributing

Thanks for your interest in contributing!

## Workflow

1. Fork or branch from `master`.
2. Make your changes on a feature branch (e.g. `feature/your-change`).
3. Open a pull request into `master`.
4. At least **1 approving review** is required before merge.
5. Direct pushes and force pushes to `master` are disabled — all changes must go through a PR.

## CI Checks

On push/PR to `master`: Angular build (`ci.yml`). On push to `master`: auto-tag + GitHub Release + deployment (`cd-on-commit.yml`, `cd.yml`).

**Versioning is manual, not automatic.** `cd-on-commit.yml` only creates a new tag/release/deploy if the merge commit message contains a version number greater than the latest tag, in the form `vX.Y.Z` (e.g. `v4.17.0`). If your merge commit doesn't include a higher version, the workflow runs but skips tagging/deploying entirely.

To ship your change:
1. Check the latest tag: `gh release list --limit 1` (or see the Releases page).
2. Include a higher version in your PR title / squash-merge commit message, e.g. `v4.17.0: add time of day select`.
3. Merge — this triggers the tag, GitHub Release, and deployment in one go.

<!-- v4.16.2 -->
