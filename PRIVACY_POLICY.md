# Privacy Policy Draft

This document is a product-facing privacy draft for the Observation Widget. It explains what data may be collected, how it is used, what the user controls, and the safeguards applied before sharing.

> This is a working draft and should be reviewed by legal, privacy, and security stakeholders before production use.

## Overview

The Observation Widget helps users submit bug reports and feedback more quickly by:

- automatically preparing limited technical context
- suggesting previously successful structured field values
- allowing the user to review what will be shared before submission

The widget is designed to minimize collection, limit retention, and keep the user in control.

## What the widget may collect

Depending on product configuration, the widget may collect the following categories of information:

### 1. Current page information
- current page path or URL
- timestamp of widget activation

### 2. Technical diagnostics
- last three recent console error messages
- browser family
- viewport size
- limited environment details approved by the product team

### 3. Application state indicators
- selected session or feature flags that are explicitly allowlisted by the host application

### 4. Local suggestion memory
To improve future form completion, the widget may store a limited set of previously successful structured values on the user’s device, such as:
- category
- component
- severity
- reproduction environment

## What the widget does not collect by default

Unless separately approved and disclosed, the widget does not intentionally store or submit:
- authentication tokens
- passwords or secrets
- full query strings containing sensitive parameters
- unrestricted console logs
- continuous background activity history
- freeform bug description history for future autofill
- full device fingerprinting attributes

## How information is used

Information collected by the widget may be used to:
- reduce the amount of manual input required from the user
- improve the quality and reproducibility of bug reports
- suggest relevant structured field values based on successful prior submissions
- help support and engineering teams diagnose reported issues

## User controls

Users should be provided with controls that allow them to:
- review auto-captured diagnostics before submission
- remove individual diagnostic items
- disable optional diagnostic sections from a report
- clear locally stored suggestion history
- edit or ignore autofilled values

The product should not silently submit sensitive diagnostics without a user review step.

## Local storage and retention

Structured history used for autofill suggestions may be stored locally on the user’s device.

### Retention principles
- store only the minimum structured values needed for suggestions
- apply a retention window or expiration time
- support manual clearing by the user
- avoid storing freeform text unless there is a documented need and explicit approval

## Redaction and minimization

Before display or submission, the widget should apply sanitization and redaction rules designed to reduce the risk of exposing sensitive data.

These rules may include:
- removing URL query parameters
- masking secret-like values
- redacting email addresses or IDs where not required
- truncating oversized console messages
- excluding unsupported or high-risk metadata fields

## Sharing model

The recommended sharing model is:

1. Capture limited diagnostic context locally when the widget opens.
2. Sanitize the captured values.
3. Present the values to the user for review.
4. Share only the information the user chooses to include when submitting the report.

## Security considerations

To protect user data, the product should:
- use an allowlist-based collection model
- separate local suggestion memory from submitted server payloads
- validate and sanitize all outgoing data
- restrict access to submitted reports according to organizational policy
- periodically review collection scope for necessity and risk

## Children and sensitive categories

The widget should not be intentionally configured to collect sensitive personal data unless there is a documented business and legal basis, additional safeguards, and explicit disclosure.

## Policy updates

As the widget evolves, this privacy policy draft should be updated to reflect:
- new data types collected
- new retention behavior
- changes to review and consent controls
- changes to how diagnostic information is shared

## Recommended first-step policy position

For the first implementation step, the safest policy position is:

- collect only path-level URL data
- collect only the last three sanitized console errors
- collect only allowlisted session flags
- store only structured suggestion values locally
- require user review before sharing diagnostics

## Internal review checklist

Before release, confirm:
- [ ] the metadata allowlist is approved
- [ ] retention periods are documented
- [ ] clear-history controls exist
- [ ] sanitization rules are tested
- [ ] review-before-share UX is implemented
- [ ] legal/privacy review is complete
