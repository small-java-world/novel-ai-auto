# TDD Redフェーズ設計: TASK-071 Network Recovery Handler

## 対象テストケース
- **TC-071-204**: null/undefined入力値での安全な処理（doc/implementation/TASK-071-testcases.md参照）

## テスト目的と狙い
- nullやundefinedが渡された場合でもNetwork Recovery Handlerが安全にスキップすることを先に検証し、異常系の仕様を明確化する
- Greenフェーズで実装すべき分岐（actionをskip_processingへ設定）を先に可視化する

## テスト設計（Given / When / Then）
- **Given**: navigatorがオフラインを報告し、timestampは未指定、jobIdはnull
- **When**: `detectNetworkStateChange(event, undefined, null)` を呼び出し、null安全分岐を通過させる
- **Then**: handled=true, fallback='Date.now()', action='skip_processing' が返ることを期待（現状はaction='skipped'のため失敗）

## 必要なスタブ/モック
- 既存の `mockNavigator` を利用し、beforeEachで `onLine=false` に更新
- Eventオブジェクトは `{ type: 'offline' } as Event` のシンプルなスタブで再現

## 期待される失敗シナリオ
- 失敗メッセージ例: `Expected: "skip_processing" / Received: "skipped"`
- Redフェーズのゴール: action文字列の不一致を可視化し、Greenフェーズでの修正対象を明確にする

## 次のステップ
- `/tdd-green network-recovery-handler` を実行し、`detectNetworkStateChange` が skip_processing を返すよう実装を更新
