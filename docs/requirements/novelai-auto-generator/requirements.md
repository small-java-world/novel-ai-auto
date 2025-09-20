# NovelAI Auto Generator Requirements Specification

## Overview

The extension automates NovelAI's image generation workflow by injecting a control surface into the web UI, applying predefined prompt presets, and orchestrating batch downloads through a background service worker. It aims to deliver consistent output with minimal operator effort while staying within Chrome Extension Manifest V3 constraints.

## User Stories

### Story 1: Guided Batch Generation
- **As a** visual storyteller using NovelAI for concept art
- **I want** to launch a batch run from saved prompt presets with a single interaction
- **So that** I can explore variations quickly without re-entering parameters

### Story 2: Reliable Asset Capture
- **As a** production assistant preparing assets for downstream use
- **I want** every generated image to download automatically with clear filenames
- **So that** I never lose track of which prompt produced which asset

### Story 3: Prompt Librarian
- **As a** workflow engineer maintaining prompt libraries
- **I want** to validate prompt definitions and surface issues before execution
- **So that** the automation never stalls because of malformed inputs

## Functional Requirements (EARS)

### Normal Requirements
- REQ-001: The system shall load prompt presets from `config/prompts.json` when the extension initializes.
- REQ-002: The system shall inject a control panel into the NovelAI image generation interface that lists available prompt presets and run controls.
- REQ-003: The system shall apply the selected prompt, negative prompt, and parameter set to the NovelAI UI before triggering generation.
- REQ-004: The system shall queue the requested number of images and display progress (queued, running, completed, failed) in the control panel.
- REQ-005: The system shall instruct the background service worker to download each completed image using unique, human-readable filenames that include preset identifier and timestamp.
- REQ-006: The system shall persist the last-used preset and run configuration to extension storage for reuse on the next session.

### Conditional Requirements
- REQ-101: When the user changes the selected preset, the system shall show the preset summary (prompt, negative prompt, key parameters) before any generation starts.
- REQ-102: When the NovelAI workspace has not fully rendered, the system shall delay DOM injection until the target editor elements become available.
- REQ-103: When NovelAI reports insufficient credits or generates an error banner, the system shall halt the remaining queue and surface a clear recovery message.
- REQ-104: When an image download fails, the system shall retry the background fetch up to three times before marking the item as failed.
- REQ-105: When the user cancels an active batch run, the system shall stop issuing new DOM interactions and leave the UI in an idle-ready state.

### State Requirements
- REQ-201: While the system is idle, it shall refrain from modifying NovelAI input fields or sending generation commands.
- REQ-202: While a batch run is active, the system shall serialize generation requests so that only one image is requested at a time.
- REQ-203: While the background worker processes an image blob, the system shall validate the payload size and format before saving it to disk.

### Optional Requirements
- REQ-301: The system may allow inline editing of prompt parameters (steps, sampler, CFG scale) inside the control panel before execution.
- REQ-302: The system may expose a keyboard shortcut to repeat the most recent batch configuration without opening the popup UI.

### Constraint Requirements
- REQ-401: The system must operate entirely within Chrome Extension Manifest V3 capabilities, using a service worker instead of persistent background pages.
- REQ-402: The system must avoid storing NovelAI credentials, session tokens, or generated images outside Chrome-managed storage and downloads APIs.
- REQ-403: The system must remain functional without requiring changes to NovelAI backend services or private APIs.
- REQ-404: The system must log operational events using console logging that can be disabled in production builds to respect performance limits.

## Non-Functional Requirements

### Performance
- NFR-001: The system shall render the control panel within two seconds after the NovelAI editor becomes interactive.
- NFR-002: The system shall complete each download handoff to the service worker within one second of the image appearing in the DOM.

### Security
- NFR-101: The system shall ensure all requests originate from the user's authenticated NovelAI session and shall not proxy credentials through third-party services.
- NFR-102: The system shall sanitize any user-entered prompt overrides before injecting them into the DOM to prevent script injection.

### Usability
- NFR-201: The system shall provide status messaging (success, retrying, error) that remains visible until the user dismisses or the issue resolves.
- NFR-202: The system shall maintain accessible contrast ratios (WCAG AA) for any controls injected into the NovelAI UI.

## Edge Cases

### Error Handling
- EDGE-001: If the NovelAI session has expired, the system shall detect the login prompt and pause automation until the user signs in.
- EDGE-002: If a preset entry in `config/prompts.json` lacks required fields, the system shall exclude it from the selectable list and display a validation warning.
- EDGE-003: If downloads are blocked by Chrome policies (e.g., user denied permission), the system shall prompt the user to adjust settings and mark items as undownloaded.

### Boundary Conditions
- EDGE-101: The system shall enforce a minimum batch size of one and a maximum batch size aligned with NovelAI rate limits (default 50) and warn when limits are exceeded.
- EDGE-102: The system shall cap concurrent retries to prevent more than two simultaneous download retries from running.

## Acceptance Criteria

### Functional Tests
- [ ] Selecting each preset loads the expected prompt text and parameter values into the NovelAI UI.
- [ ] Starting a batch of three images produces three downloads with unique filenames and progress indicators reaching 100%.
- [ ] Cancelling a run mid-way halts further DOM automation and leaves the NovelAI UI in a usable state.
- [ ] Triggering a simulated credit exhaustion banner stops the queue and surfaces an actionable error message.

### Non-Functional Tests
- [ ] Control panel injection completes within two seconds on a cold load in Chrome.
- [ ] Injected controls meet WCAG AA contrast requirements when audited with Lighthouse.
- [ ] Security scanning confirms no storage of NovelAI credentials or custom network endpoints beyond `https://novelai.net/`.
