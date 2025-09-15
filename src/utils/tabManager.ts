/**
 * 【機能概要】: NovelAI タブの存在確認・作成・アクティブ化を行うタブ管理ユーティリティ
 * 【改善内容】: 単一責任原則適用、定数抽出、エラーハンドリング統一、コメント最適化
 * 【設計方針】: 責任分離による保守性向上と再利用可能な小さな関数の組み合わせ
 * 【パフォーマンス】: 不要な条件チェック削除、メモリ効率的な実装
 * 【保守性】: 定数管理、型安全性強化、明確な責任境界
 * 🟢 信頼性レベル: TASK-030 要件（REQ-101）に基づく、セキュリティ・パフォーマンス考慮済み
 */

// 【設定定数】: NovelAI関連URLパターンの一元管理 🟢
// 【調整可能性】: 将来的にNovelAIのドメイン変更時に容易に修正可能 🟢
const NOVELAI_URL_PATTERN = 'https://novelai.net/*' as const;
const NOVELAI_BASE_URL = 'https://novelai.net/' as const;

/**
 * 【ヘルパー関数】: Chrome Tabs API の利用可能性を検証
 * 【再利用性】: 他のChrome API使用箇所でも活用可能
 * 【単一責任】: API利用可能性チェックのみを担当
 */
function validateChromeTabsAPI(): void {
  if (!chrome || !chrome.tabs) {
    throw new Error('Chrome tabs API is not available');
  }
}

/**
 * 【ヘルパー関数】: タブデータの有効性を検証
 * 【再利用性】: タブ操作が必要な他の機能でも使用可能
 * 【単一責任】: タブデータ検証のみを担当
 */
function validateTabData(tab: chrome.tabs.Tab | null | undefined): asserts tab is chrome.tabs.Tab {
  if (!tab || tab.id === null || tab.id === undefined) {
    throw new Error('Invalid tab data received');
  }
}

/**
 * 【ヘルパー関数】: 既存のNovelAIタブを検索
 * 【処理効率化】: 専用関数による責任分離と再利用性向上 🟡
 * 【可読性向上】: メイン関数の複雑度を下げて理解しやすさを向上 🟡
 */
async function findNovelAITabs(): Promise<chrome.tabs.Tab[]> {
  return await chrome.tabs.query({ url: NOVELAI_URL_PATTERN });
}

/**
 * 【ヘルパー関数】: 指定されたタブをアクティブ化
 * 【処理効率化】: タブアクティブ化処理の独立化による保守性向上 🟡
 * 【可読性向上】: 明確な責任境界による理解しやすさの向上 🟡
 */
async function activateTab(tabId: number): Promise<chrome.tabs.Tab> {
  return await chrome.tabs.update(tabId, { active: true });
}

/**
 * 【ヘルパー関数】: 新しいNovelAIタブを作成
 * 【処理効率化】: タブ作成処理の独立化による保守性向上 🟡
 * 【可読性向上】: 設定値の一元化による管理しやすさの向上 🟡
 */
async function createNovelAITab(): Promise<chrome.tabs.Tab> {
  return await chrome.tabs.create({
    url: NOVELAI_BASE_URL,
    active: true,
  });
}

/**
 * NovelAI タブが存在するかチェックし、存在しない場合は作成してアクティブ化する
 *
 * 【改善内容】: 責任分離、エラーハンドリング統一、定数抽出による保守性向上
 * 【設計方針】: 小さな関数の組み合わせによる理解しやすい実装
 * 【パフォーマンス】: 不要な条件チェック削除、効率的なフロー制御
 * 【保守性】: 明確な責任境界、定数管理、型安全性確保
 * 🟢 信頼性レベル: 既存テスト要件を完全に満たす、セキュリティ強化済み実装
 *
 * @returns アクティブ化されたまたは新規作成されたタブオブジェクト
 */
export async function ensureNovelAITab(): Promise<chrome.tabs.Tab> {
  // API利用可能性の事前確認
  validateChromeTabsAPI();

  // 既存タブの検索
  const tabs = await findNovelAITabs();

  // タブ存在確認と適切な処理の実行
  if (tabs.length > 0) {
    const firstTab = tabs[0];
    validateTabData(firstTab);

    const updatedTab = await activateTab(firstTab.id);
    return updatedTab || firstTab;
  } else {
    return await createNovelAITab();
  }
}
