## Changes

Added `POST /rules/unsubscribe` endpoint for batch rule unsubscription. Takes `rule_ids` and `client_id` in request body.

Implementation removes subscriptions while keeping rules available for future re-subscription. O(n) time complexity as specified.

## Test Cases

- Success case with partial unsubscription (rule remains if other clients subscribed)
- Orphaned rules remain available (not deleted)
- Orphaned rule resubscription
- Nonexistent rule handling (no-op)
- Empty list edge case

All tests pass.

## Checklist

- [x] All commits are tagged with the ticket number
- [x] No linting errors / newline at end of file warnings
- [x] All code follows repository-configured prettier formatting
- [x] No merge conflicts
- [x] All checks passing
- [x] Remove any non-applicable sections of this template
- [ ] Request reviewers & ping on Slack
- [x] PR is linked to the ticket (see below)

Closes #498
