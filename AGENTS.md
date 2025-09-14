# Codex CLI エージェント設定

## Slash command aliases (for Codex CLI)

### Kairo Commands (包括的開発フロー)
- When I type `/kairo-requirements <feature>`, do the following:
  1) Open `.claude/commands/kairo-requirements.md` and follow it.
  2) Use `<feature>` to derive a slug (lowercase, spaces→`-`).
  3) Write the result to `docs/requirements/<slug>/requirements.md`.

- When I type `/kairo-design <feature>`, do the following:
  1) Open `.claude/commands/kairo-design.md` and follow it.
  2) Use the same slug.
  3) Write to `docs/design/<slug>/design.md`.

- When I type `/kairo-tasks <feature>`, do the following:
  1) Open `.claude/commands/kairo-tasks.md` and follow it.
  2) Write to `docs/tasks/<slug>/backlog.md`.

- When I type `/kairo-implement <feature>`, do the following:
  1) Open `.claude/commands/kairo-implement.md` and follow it.
  2) Follow TDD cycle: Red → Green → Refactor
  3) Write implementation to appropriate source files.

### TDD Commands (テスト駆動開発)
- When I type `/tdd-requirements <feature>`, do the following:
  1) Open `.claude/commands/tdd-requirements.md` and follow it.
  2) Write TDD requirements for the feature.

- When I type `/tdd-testcases <feature>`, do the following:
  1) Open `.claude/commands/tdd-testcases.md` and follow it.
  2) Generate comprehensive test cases.

- When I type `/tdd-red <feature>`, do the following:
  1) Open `.claude/commands/tdd-red.md` and follow it.
  2) Write failing tests first.

- When I type `/tdd-green <feature>`, do the following:
  1) Open `.claude/commands/tdd-green.md` and follow it.
  2) Write minimal implementation to make tests pass.

- When I type `/tdd-refactor <feature>`, do the following:
  1) Open `.claude/commands/tdd-refactor.md` and follow it.
  2) Improve code quality while keeping tests green.

- When I type `/tdd-verify-complete <feature>`, do the following:
  1) Open `.claude/commands/tdd-verify-complete.md` and follow it.
  2) Verify TDD completion and quality.

### Reverse Engineering Commands (リバースエンジニアリング)
- When I type `/rev-tasks`, do the following:
  1) Open `.claude/commands/rev-tasks.md` and follow it.
  2) Analyze existing codebase and extract task breakdown.

- When I type `/rev-design`, do the following:
  1) Open `.claude/commands/rev-design.md` and follow it.
  2) Generate design documentation from existing code.

- When I type `/rev-specs`, do the following:
  1) Open `.claude/commands/rev-specs.md` and follow it.
  2) Generate test specifications from existing code.

- When I type `/rev-requirements`, do the following:
  1) Open `.claude/commands/rev-requirements.md` and follow it.
  2) Extract implicit requirements from existing code.

### Utility Commands (ユーティリティ)
- When I type `/init-tech-stack`, do the following:
  1) Open `.claude/commands/init-tech-stack.md` and follow it.
  2) Identify and document the technology stack.

- When I type `/clear`, do the following:
  1) Open `.claude/commands/clear.md` and follow it.
  2) Clean up development environment.

Always show a brief diff summary after writing files and list open questions.

## Project Context

This is a NovelAI Chrome Extension project that automates image generation using predefined prompts.

### Technology Stack
- Chrome Extension Manifest V3
- JavaScript/TypeScript
- DOM manipulation for NovelAI web interface
- Background service worker for downloads

### Development Workflow
1. Requirements definition using EARS notation
2. Technical design documentation
3. Task breakdown and estimation
4. Test-driven development (TDD)
5. Implementation and refactoring

### File Structure
```
novelai-auto-generator/
├── manifest.json          # Extension manifest
├── background.js          # Service Worker
├── content.js            # Content Script
├── popup/
│   ├── popup.html        # Popup UI
│   ├── popup.js          # Popup logic
│   └── popup.css         # Styles
├── config/
│   └── prompts.json      # Prompt configurations
└── utils/
    ├── dom-helper.js     # DOM utilities
    └── storage.js        # Storage management
```

### Quality Standards
- All code must have corresponding tests
- Follow TDD cycle: Red → Green → Refactor
- Maintain code coverage above 80%
- Use semantic commit messages
- Document all public APIs
