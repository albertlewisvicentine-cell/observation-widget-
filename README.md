# Observation Widget

This repository contains documentation for two UX/product features for a bug-reporting widget:

1. **Smart Defaults & Context Awareness**
2. **Intelligent History Autofill**

The goal is to reduce user effort, improve report quality, and preserve user trust through privacy-aware data collection and sharing controls.

## Feature Overview

### 1. Smart Defaults & Context Awareness
The widget should reduce manual input by pre-populating useful diagnostic context.

#### Proposed behaviors
- Capture the current page URL when the widget is opened.
- Detect relevant user session flags already available in the host application.
- Read safe hardware/environment metadata exposed by the browser or host runtime.
- Collect the last three console error lines to help debugging.
- Present the captured values to the user before submission.

#### Recommended implementation approach
- Build a **context collector** layer that gathers available metadata from the browser and host app.
- Normalize collected data into a structured payload, for example:
  - `url`
  - `timestamp`
  - `sessionFlags`
  - `environment`
  - `recentConsoleErrors`
- Add a **review panel** in the widget UI so users can see, edit, or remove captured context.
- Add feature flags so collection sources can be turned on or off independently.
- Gracefully degrade when data is unavailable.

#### Suggested system components
- `ContextCollector`
- `ConsoleErrorBuffer`
- `EnvironmentAdapter`
- `SubmissionSanitizer`

### 2. Intelligent History Autofill
Instead of showing empty fields, the widget should suggest historically successful values.

#### Proposed behaviors
- Store previously used values for common fields such as:
  - category
  - component
  - reproduction environment
  - severity
- Rank suggestions based on:
  - recent usage
  - frequency of successful submission
  - contextual relevance to current page or flow
- Fill fields with high-confidence suggestions or show inline suggestions.
- Allow the user to easily clear or reject suggestions.

#### Recommended implementation approach
- Store history in secure local storage or another approved client-side persistence layer.
- Save only minimal, non-sensitive field values needed for suggestions.
- Track successful submissions and use them as the source for suggestion ranking.
- Add a `SuggestionEngine` that scores candidates using:
  - exact page match
  - workflow match
  - recent successful use
  - frequency
- Prefer suggest-over-autosubmit behavior for potentially sensitive fields.

#### Suggested system components
- `HistoryStore`
- `SuggestionEngine`
- `FieldConfidenceScorer`
- `AutofillController`

## Implementation Plan

## Phase 1: Define scope and data contracts
- Identify which metadata fields are useful and safe to capture.
- Define a submission payload schema.
- Define which form fields are eligible for history-based suggestions.
- Establish retention and deletion rules for stored history.

### Deliverables
- Context payload schema
- History record schema
- Privacy classification for each field

## Phase 2: Build context capture infrastructure
- Implement `ContextCollector`.
- Add browser URL capture.
- Add host-provided session flag integration.
- Implement a bounded in-memory `ConsoleErrorBuffer`.
- Add environment metadata extraction with allowlisted attributes only.

### Deliverables
- Context collection service
- Error buffer utility
- Unit tests for missing/unavailable sources

## Phase 3: Add user review and consent controls
- Render collected metadata in a reviewable panel.
- Add per-field include/exclude toggles.
- Add clear explanations for why each field is collected.
- Require explicit user action before sharing optional diagnostics.

### Deliverables
- Review UI
- Consent text
- Field-level opt-out controls

## Phase 4: Build history storage and suggestion engine
- Implement `HistoryStore` with expiration support.
- Persist only approved fields.
- Record successful submissions.
- Add scoring logic for suggestions.
- Integrate suggestions into eligible fields.

### Deliverables
- History persistence module
- Suggestion ranking logic
- Autofill UI behavior tests

## Phase 5: Privacy hardening and sanitization
- Redact tokens, email addresses, IDs, and other sensitive values from collected diagnostics.
- Exclude console logs that contain likely secrets.
- Strip query parameters from URLs unless explicitly needed and approved.
- Add size limits and validation on captured payloads.

### Deliverables
- Sanitization utilities
- Redaction rules
- Security review checklist

## Phase 6: Measure effectiveness
- Track whether autofill reduces time-to-submit.
- Track acceptance/rejection rates for suggestions.
- Track how often users remove collected context.
- Use these metrics to tune defaults while preserving control.

### Deliverables
- Product metrics dashboard definition
- Experiment plan for tuning defaults

## Privacy Considerations for Sharing

Privacy should be treated as a product requirement, not a post-processing task.

### Key risks
- **URL leakage**: URLs may contain IDs, search terms, tokens, or private route information.
- **Console sensitivity**: Console errors may include stack traces, emails, auth tokens, request payloads, or internal endpoints.
- **Session flags**: Session metadata may reveal account state, entitlements, experiments, or internal roles.
- **Environment fingerprinting**: Hardware and environment details can become identifying when combined.
- **Historical memory**: Stored autofill values may contain personal or sensitive information if unrestricted.

### Privacy controls
- Collect only data required to improve debugging or form completion.
- Default to **preview before share** for all auto-captured diagnostics.
- Use an allowlist rather than a broad scrape strategy.
- Redact likely secrets and personal data before rendering or submission.
- Strip or hash sensitive identifiers when full values are unnecessary.
- Set retention limits for local history and provide a one-click clear action.
- Do not store freeform text history unless explicitly justified.
- Separate **local suggestion memory** from **server-submitted report content**.
- Document what is collected, where it is stored, and when it is sent.

### Recommended sharing model
- **Automatically capture** into a local draft state.
- **Never silently submit** sensitive diagnostics.
- Let the user review each shared metadata group.
- Mark sensitive sections clearly, such as:
  - URL details
  - console diagnostics
  - environment details
- Provide a “remove all diagnostics” option.

## Suggested Acceptance Criteria

### Smart Defaults & Context Awareness
- Widget captures current page URL on open.
- Widget stores no more than the last three console error entries.
- Unavailable metadata sources do not break widget rendering.
- Users can review and remove any captured metadata before submission.
- Sensitive values are redacted before display and submission.

### Intelligent History Autofill
- Eligible fields display ranked suggestions based on prior successful submissions.
- Users can accept, edit, or ignore autofill suggestions.
- Stored history respects retention limits.
- Users can clear stored history from the widget UI.
- Sensitive or freeform content is excluded from stored history by default.

## Non-Goals
- Full session replay
- Continuous background monitoring beyond bounded local capture
- Silent submission of diagnostics
- Long-term storage of raw console output

## Example Data Model

```json
{
  "context": {
    "url": "/settings/profile",
    "sessionFlags": ["beta-user", "has-upload-access"],
    "environment": {
      "platform": "web",
      "browser": "Chrome",
      "viewport": "1440x900"
    },
    "recentConsoleErrors": [
      "TypeError at upload step",
      "Failed to fetch feature config",
      "Unhandled promise rejection"
    ]
  },
  "historySuggestions": {
    "category": ["Bug", "UI"],
    "severity": ["Medium"],
    "component": ["Profile Settings"]
  }
}
```

## Recommended Next Steps
- Confirm the approved metadata allowlist.
- Confirm which fields can use suggestion memory.
- Decide retention duration for local history.
- Implement sanitization before UI rendering and before submission.
- Add tests for privacy-sensitive edge cases.
