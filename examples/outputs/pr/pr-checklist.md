# PR Review Checklist

- [ ] Confirm the PR describes the safe generated change rather than the blocked destructive request.
- [ ] Confirm the generated file list matches `ARTIFACT_MANIFEST.json`.
- [ ] Confirm the sandbox evidence artifact is `PASS` and references the same run and passport context.
- [ ] Confirm the owner brief matches the impacted downstream owners.
- [ ] Confirm no token, credential, or source data row appears in the packet.
- [ ] Confirm merge does not imply immediate source-field removal.
- [ ] Confirm any write-back or deployment step remains outside the PR packet.
