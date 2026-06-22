# Observation Widget

This repository currently centers on a browser-based observation widget implemented as a custom element in `/home/runner/work/observation-widget-/observation-widget-/src/components/BugReportLayer.js`, plus supporting product and privacy documentation.

## Current implementation

The shipped component is `bug-report-layer`, a fixed-position overlay that presents:

- a parallax, multi-layer observability panel
- a caller-provided URL/context line
- an in-memory log stream with the latest three visible entries
- live runtime metrics such as FPS, frame time, residual motion, log count, and event rate

The widget is visual and diagnostic today. It does **not** yet implement report submission, persisted history, sanitization, or consent/review workflows.

## Public surface

### Custom element

```html
<bug-report-layer url="/settings/profile"></bug-report-layer>
```

### Supported attributes

- `url`: updates the context line shown in the widget
- `status`: currently observed by the element, but not yet rendered in the UI

### Public method

- `pushLog(message, type = 'info')`: appends a log entry to the in-memory queue and refreshes the visible log stream

## Internal architecture

The current implementation is organized around four classes in a single module:

- `Renderer`: updates DOM content, layer transforms, logs, and metrics
- `ObservationEngine`: smooths pointer movement and computes runtime metrics
- `InputController`: handles widget interaction, attribute updates, and log buffering
- `BugReportLayer`: custom element lifecycle and render loop orchestration

## Current behavior

- Renders inside shadow DOM to isolate styles
- Uses `requestAnimationFrame` for the animation/render loop
- Tracks pointer movement over the widget and applies smoothed parallax transforms
- Keeps up to 100 log entries in memory while showing only the latest 3
- Formats timestamps with `Intl.DateTimeFormat`
- Resets the parallax target when the pointer leaves the widget

## Repository files

- `/home/runner/work/observation-widget-/observation-widget-/README.md`: current project overview
- `/home/runner/work/observation-widget-/observation-widget-/IMPLEMENTATION_GUIDE.md`: forward-looking implementation guidance
- `/home/runner/work/observation-widget-/observation-widget-/PRIVACY_POLICY.md`: draft privacy position for future data collection features
- `/home/runner/work/observation-widget-/observation-widget-/src/components/BugReportLayer.js`: current widget implementation

## Known gaps

The current codebase does not yet include:

- report submission flows
- structured context collection
- privacy review controls
- history-based autofill
- local persistence
- automated build, lint, or test tooling

## Relationship to the other docs

The implementation guide and privacy policy describe where the widget can evolve next. They should be read as planning documents, not as a description of behavior already present in the component today.
