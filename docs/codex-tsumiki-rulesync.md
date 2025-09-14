# Codex CLI × Tsumiki × rulesync 最小運用ガイド（novel-ai-auto）

> 目的：Claude Code のスラッシュコマンド（`/kairo-*` 等）を **Codex CLI** 上で “擬似コマンド”として実行し、  
> 仕様化 → 設計化 → タスク分割 → TDD 実装までを **リポ直下で反復運用**する。

---

## TL;DR（最短手順）

```bash
# 1) Tsumiki コマンド群を導入（未導入なら）
npx -y tsumiki install

# 2) 最小 rulesync 設定ファイルを配置
#    （→ 下の「rulesync.jsonc（最小例）」をプロジェクト直下に保存）

# 3) 擬似コマンドを生成（Codex 用）
npx -y rulesync generate \
  --targets codexcli \
  --features commands,subagents \
  --experimental-simulate-commands \
  --experimental-simulate-subagents

# 4) リポ直下で Codex を起動（AGENTS.md が自動読込される）
codex
　ｃｃ