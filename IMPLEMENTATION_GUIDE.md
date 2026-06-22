# Implementation Guide

This guide translates the product requirements in `README.md` into an actionable technical plan for the first implementation pass.

## Goals

Implement two user-facing capabilities for the observation widget:

1. **Smart Defaults & Context Awareness**
2. **Intelligent History Autofill**

This guide assumes a privacy-first design where all auto-captured diagnostics are reviewable before sharing.

## Architecture Overview

A simple, modular architecture is recommended so each collection or suggestion source can be enabled, tested, and audited independently.

### Proposed modules
- `ContextCollector`
- `ConsoleErrorBuffer`
- `EnvironmentAdapter`
- `SubmissionSanitizer`
- `HistoryStore`
- `SuggestionEngine`
- `AutofillController`
- `PrivacyReviewPanel`

## First-Step Implementation Scope

The first step should focus on creating safe foundations rather than full automation.

### Step 1 objectives
- Define the data contracts for captured context and stored suggestion history.
- Implement bounded local capture only.
- Add sanitization before anything is shown or submitted.
- Add a review experience so users can inspect captured values.
- Limit autofill to a small allowlisted set of structured fields.

## Recommended File/Module Layout

You can adapt these names to your stack, but this separation is recommended:

```text
src/
  context/
    ContextCollector.ts
    ConsoleErrorBuffer.ts
    EnvironmentAdapter.ts
    contextTypes.ts
  history/
    HistoryStore.ts
    SuggestionEngine.ts
    historyTypes.ts
  privacy/
    SubmissionSanitizer.ts
    redactionRules.ts
    privacyConfig.ts
  ui/
    PrivacyReviewPanel.tsx
    AutofillController.ts
  widget/
    ObservationWidget.tsx
```

## Data Contracts

## Context payload

```ts
export interface ContextPayload {
  url?: string;
  timestamp: string;
  sessionFlags: string[];
  environment?: {
    platform?: string;
    browser?: string;
    viewport?: string;
    locale?: string;
  };
  recentConsoleErrors: string[];
}
```

## History record

```ts
export interface HistoryRecord {
  fieldName: 'category' | 'component' | 'severity' | 'reproductionEnvironment';
  value: string;
  successCount: number;
  lastUsedAt: string;
  contextKey?: string;
}
```

## Suggested allowlist for initial release

### Auto-captured context
- path-only URL or sanitized URL
- timestamp
- allowlisted session flags
- viewport size
- browser family
- last three sanitized console errors

### History-backed fields
- category
- component
- severity
- reproduction environment

### Explicitly excluded initially
- full freeform bug description history
- raw auth/session tokens
- full query strings
- request payloads
- full stack traces unless sanitized
- full hardware fingerprint data

## Smart Defaults & Context Awareness

## 1. ContextCollector

The collector should orchestrate multiple small collectors and return a normalized payload.

### Responsibilities
- Call all enabled context sources.
- Handle missing or unsupported APIs safely.
- Return defaults instead of throwing.
- Pass all values through the sanitizer.

### Suggested pseudocode

```ts
async function collectContext(): Promise<ContextPayload> {
  const raw = {
    url: getCurrentUrl(),
    timestamp: new Date().toISOString(),
    sessionFlags: getAllowedSessionFlags(),
    environment: getEnvironmentDetails(),
    recentConsoleErrors: getRecentConsoleErrors(3),
  };

  return sanitizeContextPayload(raw);
}
```

## 2. ConsoleErrorBuffer

Use a bounded in-memory ring buffer to avoid persistent raw logging.

### Requirements
- store only error-level events
- retain only the latest 3 entries for submission
- cap message length
- sanitize on read and optionally on write
- never persist raw console history by default

### Suggested behavior
- patch `console.error` in a controlled wrapper if allowed by the host app
- store normalized strings only
- ignore non-string payloads unless safely serializable

## 3. EnvironmentAdapter

Use an allowlist for environment metadata.

### Safe fields
- browser family
- viewport dimensions
- operating system family if available
- locale/timezone if justified

### Avoid initially
- detailed device fingerprint attributes
- installed fonts/plugins
- unique identifiers

## Intelligent History Autofill

## 4. HistoryStore

Persist only minimal structured values needed for suggestions.

### Storage recommendations
- use local storage or another approved client store
- namespace keys clearly
- apply TTL expiration
- support `clearAll()` and `clearField(fieldName)`

### Example storage shape

```json
{
  "version": 1,
  "records": [
    {
      "fieldName": "component",
      "value": "Profile Settings",
      "successCount": 3,
      "lastUsedAt": "2026-06-22T16:00:00Z",
      "contextKey": "/settings/profile"
    }
  ]
}
```

## 5. SuggestionEngine

Suggestions should be ranked, not blindly inserted.

### Suggested scoring factors
- recent successful submission: high weight
- frequency of successful use: medium weight
- current page/path match: high weight
- exact field/value repetition: medium weight

### Example scoring formula

```ts
score =
  recencyWeight +
  frequencyWeight +
  contextMatchWeight;
```

### UX recommendation
- prefill only when confidence is above a threshold
- otherwise show top suggestions inline
- always allow editing

## Privacy and Sanitization Layer

## 6. SubmissionSanitizer

Run sanitization in two places:
- before rendering captured diagnostics in the UI
- before submission payload leaves the client

### Redaction targets
- tokens and secrets
- email addresses
- long numeric IDs if not needed
- query string parameters
- internal URLs or endpoints if policy requires masking

### Suggested rules
- strip query params from URLs by default
- truncate oversized console entries
- replace known secret-like patterns with `[REDACTED]`
- normalize unknown objects to safe strings

## UI Flow

## 7. PrivacyReviewPanel

The widget should expose a visible review step before final submission.

### Panel sections
- URL details
- session flags
- environment details
- console diagnostics

### Required controls
- include/exclude checkbox per section
- remove individual console items
- remove all diagnostics
- short explanation for each section

## 8. AutofillController

This controller should connect form fields to suggestion results.

### Responsibilities
- request suggestions per eligible field
- decide prefill vs suggestion-only mode
- track accept/edit/reject actions for analytics
- save successful structured values after submission

## Example End-to-End Flow

1. User opens widget.
2. `ContextCollector` gathers bounded local context.
3. `SubmissionSanitizer` cleans the payload.
4. `PrivacyReviewPanel` displays reviewable diagnostics.
5. `AutofillController` loads suggestions for allowlisted fields.
6. User edits fields and chooses what to share.
7. On successful submit, approved field values are stored in `HistoryStore`.

## Testing Strategy

## Unit tests
- collector handles missing browser APIs
- sanitizer redacts secrets and query strings
- history store expires old records
- suggestion engine ranking is deterministic

## Integration tests
- widget opens with sanitized defaults
- review panel can disable diagnostics
- suggestions appear only for allowlisted fields
- successful submit writes structured history only

## Privacy tests
- tokens are never shown in review UI
- raw query strings are removed
- freeform text is not saved to history
- more than 3 console errors are not retained

## First-Step Delivery Checklist

### Technical
- [ ] Add context payload types
- [ ] Add history record types
- [ ] Add sanitization rules
- [ ] Implement in-memory console error buffer
- [ ] Implement local history store with TTL
- [ ] Implement review panel shell

### Product/Privacy
- [ ] Approve metadata allowlist
- [ ] Approve eligible autofill fields
- [ ] Approve retention window
- [ ] Approve redaction policy language

## Suggested First Build Milestone

The first coded milestone should be:

**“Collect, sanitize, review, and optionally submit URL + last three console errors, while storing only structured field suggestions for category/component/severity.”**

This gives immediate product value with limited privacy exposure and creates the foundation for later iterations.
