/**
 * 【機能概要】: Chrome拡張機能用のプレースホルダーアイコンを生成する
 * 【実装方針】: テストで拡張機能が正常に読み込まれるための最小限のアイコンファイル作成
 * 【テスト対応】: TC-081-001で拡張機能読み込みテストを通すための実装
 * 🔴 信頼性レベル: テスト用のプレースホルダー、実際のアイコンデザインは未定
 */

const fs = require('fs');
const path = require('path');

// 【アイコンサイズ定義】: Chrome拡張機能で必要なアイコンサイズ 🟢
const iconSizes = [16, 32, 48, 128];

// 【シンプルなPNG生成】: 最小限のPNGファイルを作成 🔴
// 実際のアイコンデザインは後のフェーズで作成予定
function createSimplePNG(size) {
  // 【PNGヘッダー】: 最小限のPNGファイル構造
  const pngHeader = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG シグネチャ
    0x00,
    0x00,
    0x00,
    0x0d, // IHDR チャンクサイズ
    0x49,
    0x48,
    0x44,
    0x52, // "IHDR"
    0x00,
    0x00,
    0x00,
    size, // 幅
    0x00,
    0x00,
    0x00,
    size, // 高さ
    0x08,
    0x02,
    0x00,
    0x00,
    0x00, // bit depth, color type, compression, filter, interlace
    0x00,
    0x00,
    0x00,
    0x00, // CRC (簡易化のため0)
    0x00,
    0x00,
    0x00,
    0x00, // IEND chunk size
    0x49,
    0x45,
    0x4e,
    0x44, // "IEND"
    0xae,
    0x42,
    0x60,
    0x82, // IEND CRC
  ]);

  return pngHeader;
}

// 【アイコンディレクトリ作成】: アイコン格納用ディレクトリの作成
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('Icons directory created');
}

// 【各サイズのアイコン作成】: 必要なサイズのアイコンファイルを生成
iconSizes.forEach((size) => {
  // 【SVGベースのアイコン生成】: より適切なアイコンファイルの作成 🟡
  const svgContent = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#4A90E2"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="white" font-family="Arial" font-size="${Math.floor(size / 3)}">N</text>
    </svg>
  `;

  // 【アイコンファイル保存】: SVGからPNG変換は簡易化し、SVGを保存
  const iconPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(iconPath, svgContent);

  // 【代替PNG作成】: ブラウザ互換性のため簡易PNGも作成 🔴
  const pngPath = path.join(iconsDir, `icon${size}.png`);
  const simplePng = createSimplePNG(size);
  fs.writeFileSync(pngPath, simplePng);

  console.log(`Created icon${size}.png and icon${size}.svg`);
});

console.log('All placeholder icons created successfully');
