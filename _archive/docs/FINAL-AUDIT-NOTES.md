EXECUTIA Engine — Final audit notes

Base selected: EXECUTIA-Engine-Live-Final 11111.zip (v1/final)
Reason: preserves V4 auth/session/audit/runtime safety, fixes provider registry compatibility, and avoids broken provider overlay introduced in v3.

Patch applied:
- Added export ALLOWED_FIELD_NAMES in engine/canonical-context.js to satisfy governance/generate-rule.js import.

Audit findings:
- v2/v3 overlay changed provider-registry API and broke imports in api/execute-and-dispatch.js.
- All variants had a governance import mismatch for ALLOWED_FIELD_NAMES.
- Tests are minimal placeholders and do not validate full runtime or live DB integration.
