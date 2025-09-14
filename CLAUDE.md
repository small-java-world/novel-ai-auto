# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **novel-ai-auto** - a Chrome extension (Manifest V3) that automates NovelAI's Web UI to generate and save multiple images with predefined prompts. The project uses **Tsumiki**, an AI-driven development support framework, for efficient development from requirements definition to implementation.

## AI-Driven Development Environment

This project uses **Tsumiki** for AI-driven development with extensive custom slash commands available in both Claude Code and Codex CLI.

### Available Slash Commands

#### Kairo Commands (Comprehensive Development Flow)
- `/kairo-requirements <feature>` - Requirements definition using EARS notation
- `/kairo-design <feature>` - Design document generation (architecture, components, interfaces)
- `/kairo-tasks <feature>` - Task breakdown and estimation
- `/kairo-implement <feature>` - Implementation execution with TDD approach

#### TDD Commands (Test-Driven Development)
- `/tdd-requirements <feature>` - TDD requirements definition
- `/tdd-testcases <feature>` - Test case creation
- `/tdd-red <feature>` - Test implementation (Red phase)
- `/tdd-green <feature>` - Minimal implementation (Green phase)  
- `/tdd-refactor <feature>` - Refactoring phase
- `/tdd-verify-complete <feature>` - TDD completion verification

#### Reverse Engineering Commands
- `/rev-tasks` - Generate task list from existing code
- `/rev-design` - Generate design document from existing code
- `/rev-specs` - Generate test specifications from existing code
- `/rev-requirements` - Generate requirements document from existing code

#### Utility Commands
- `/direct-setup` - Direct setup commands
- `/direct-verify` - Direct verification
- `/start-server` - Start development server

## Architecture Overview

The Chrome extension follows a **MV3 Event-driven Extension + Message Passing** pattern with three main components:

### Core Components
1. **Popup UI** - Generation start/stop, prompt selection, progress display
2. **Content Script** - DOM manipulation of NovelAI page (prompt application, generation trigger, progress monitoring, image URL extraction)
3. **Service Worker (Background)** - Download management, tab control, retry logic, persistent logging
4. **Storage** - Uses `chrome.storage` for settings, prompts, history, and job state
5. **Config** - Static `config/prompts.json` for prompt definitions

### Key Design Patterns
- **Message-driven communication** using `runtime.sendMessage` and `tabs.sendMessage`
- **Exponential backoff retry** (base 500ms, multiplier 2.0, max 5 attempts)
- **File naming template**: `{date}_{prompt}_{seed}_{idx}` with sanitization
- **Minimal permissions**: `activeTab`, `scripting`, `downloads`, `storage`, `tabs`

## Development Workflow

### Recommended Development Flow
1. Use `/kairo-requirements` to define requirements with EARS notation
2. Use `/kairo-design` to create architecture and design documents  
3. Use `/kairo-tasks` to break down implementation into manageable tasks
4. Use `/kairo-implement` with TDD cycle: `/tdd-red` → `/tdd-green` → `/tdd-refactor`
5. Use `/tdd-verify-complete` to ensure acceptance criteria are met

### For Existing Code Analysis
1. Use `/rev-tasks` to understand current implementation structure
2. Use `/rev-design` to document existing architecture
3. Use `/rev-requirements` to extract implicit requirements

## Key Documentation Files

- `docs/spec/novelai-auto-generator-requirements.md` - Detailed requirements with EARS notation
- `docs/design/novelai-auto-generator/architecture.md` - System architecture and component design
- `docs/tasks/novelai-auto-generator-tasks.md` - Implementation task breakdown
- `codex-workflow-templates.md` - Workflow templates and command usage examples

## Development Commands

Since this is currently a documentation and design phase project without implemented code yet, there are no build/test commands. The project structure indicates this will be a Chrome extension, so typical commands would likely include:

- Chrome extension development and packaging commands (to be determined during implementation)
- Testing framework commands (to be determined based on chosen testing approach)
- Linting and code quality checks (to be determined based on chosen tools)

## File Structure

```
docs/
├── spec/                    # Requirements and specifications
├── design/                  # Architecture and design documents
└── tasks/                   # Task breakdowns and implementation plans

.claude/commands/            # Claude Code custom commands (21 commands)
.codex/commands/             # Codex CLI custom commands (4 commands)
```

## Important Notes

- This project is in the planning/design phase - no actual Chrome extension code exists yet
- All requirements and design documents are in Japanese, indicating this is a Japanese development project
- The Tsumiki framework provides comprehensive AI-driven development support with structured workflows
- RulesSync configuration (`rulesync.jsonc`) supports multiple AI development tools (Copilot, Cursor, Claude Code, Codex CLI)

## Next Steps for Implementation

When ready to implement:
1. Create Chrome extension manifest.json (Manifest V3)
2. Set up TypeScript/JavaScript build process
3. Implement popup UI, content scripts, and service worker
4. Set up testing framework and CI/CD pipeline
5. Configure proper build, lint, and test commands