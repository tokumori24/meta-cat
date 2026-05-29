# 技術調査レポート: frontend への Phaser 導入

- 対象タスク: React 19 + Vite + TypeScript + Vitest 構成の `frontend/` に Phaser を導入し、Chrome 上で最小描画を確認する
- 調査日: 2026-05-30
- 担当: researcher（Step 1/6）

> 出典は「公式ドキュメント / 公式リポジトリ / npm registry」を一次情報として優先。確認できていない点は明示的に「未確認」と記載する。

---

## 1. 既存プロジェクトの確認済み事実（実ファイル参照）

`frontend/package.json` / `vite.config.ts` / `tsconfig.app.json` / `src/*` を直接読んで確認した事実。

| 項目 | 値 | 出典（実ファイル） |
|------|-----|------|
| react / react-dom | `^19.2.3` | `frontend/package.json` |
| vite | `^8.0.0` | `frontend/package.json` |
| vitest | `^4.0.14` | `frontend/package.json` |
| typescript | `^5.9.3` | `frontend/package.json` |
| jsdom | `^27.2.0` | `frontend/package.json` |
| @vitejs/plugin-react | `^5.1.1` | `frontend/package.json` |
| @types/node | `^24.10.2` | `frontend/package.json` |
| test 環境 | `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/testSetup.ts'` | `frontend/vite.config.ts` |
| dev サーバ | `port: 5173`, `host: true`, `strictPort: true` | `frontend/vite.config.ts` |
| TS 設定 | `strict: true`, `target/lib: ES2024`, `module: ESNext`, `moduleResolution: 'Bundler'`, `jsx: 'react-jsx'`, `types: ['vitest/globals']` | `frontend/tsconfig.app.json` |
| **StrictMode** | `main.tsx` で `<StrictMode>` 有効（開発時に effect が2回走る） | `frontend/src/main.tsx` |
| 既存定数 | `src/constants.ts` に `ROOT_ELEMENT_ID = 'root'` のみ | `frontend/src/constants.ts` |
| 既存テスト | `App.test.tsx` は `globals: true` 前提で `test()/expect()` を import 無しで使用、`@testing-library/react` の `render/screen` 使用 | `frontend/src/App.test.tsx` |
| testSetup | `import '@testing-library/jest-dom/vitest';` のみ | `frontend/src/testSetup.ts` |

### 設計に直結する重要点
- **StrictMode 有効**: 開発ビルドではマウント時に `setup→cleanup→setup` が走る。Phaser インスタンスの生成/破棄が cleanup で確実に行われないと **二重生成・リーク** が起きる。後述の公式テンプレートはこの前提でクリーンアップを実装している。
- **`globals: true`**: テストは `test/expect/vi` を import 不要で使用する規約。新規テストもこれに従う。
- **`moduleResolution: 'Bundler'` + `module: ESNext`**: Phaser の ESM（`import { AUTO, Game } from 'phaser'`）をそのまま解決できる構成。

---

## 2. Phaser のバージョンと安定性

| 項目 | 値 | 出典 |
|------|-----|------|
| npm 最新版 (`latest`) | **4.1.0** | npm registry `https://registry.npmjs.org/phaser/latest`（`version: "4.1.0"`） |
| パッケージ entry | `types: ./types/phaser.d.ts` / `module: ./dist/phaser.esm.js` / `main: ./src/phaser.js` | 同上（型定義同梱、ESM 提供） |
| Phaser 4.0 正式リリース | **2026-04-10**（Phaser 史上最大のリリース、WebGL レンダラを刷新。API は概ね維持） | phaser.io news「Phaser 3 vs Phaser 4」「Phaser 4 Renderer」 https://phaser.io/news/2026/05/phaser-3-vs-phaser-4 |
| 安定性 | RC6 以降が production-ready とされ、4.0 が正式版として公開済み（現在 4.1.0） | phaser.io news（RC6: https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out ） |
| `peerDependencies` / `engines` | **記載なし**（React 等への peer 依存制約なし） | npm registry（該当フィールドが存在しない） |

**結論（推奨）**: 「最新安定版」という指示に対し、`phaser@^4.1.0` の採用を推奨。理由:
1. npm `latest` タグが 4.1.0 で、4.0 はすでに正式安定版として公開済み（一次情報で確認）。
2. 型定義 (`.d.ts`) を同梱し、ESM (`dist/phaser.esm.js`) を提供 → Vite + TS 構成に追加設定なしで適合しやすい。
3. peer 依存の制約がなく、React 19 と独立して導入できる。

> 補足: 公式 React+TS テンプレートが現在 pin しているのは `phaser@4.0.0`（後述）。4.0 系で確立されたパターンは 4.1.0 でも有効と判断するが、**4.1.0 固有の挙動差は未確認**。実装時に `npm run build` / `npm run test` で実検証すること。

---

## 3. 採用を推奨する実装パターン（公式テンプレート準拠）

一次情報: **公式 React+TS テンプレート** `https://github.com/phaserjs/template-react-ts`（React の公式ドキュメント「Project Templates」からリンクされている公式テンプレート）。

### 3-1. 公式テンプレートが採用している構成（確認済み）

`template-react-ts/package.json`（確認済み）:
- `phaser: 4.0.0`, `react: ^19.0.0`, `react-dom: ^19.0.0`
- `vite: ^6.3.1`, `typescript: ~5.7.2`, `@vitejs/plugin-react: ^4.3.4`

> 本プロジェクトは Vite `^8` / `@vitejs/plugin-react ^5` / TS `^5.9` とテンプレートより新しい。**Vite 8 + Phaser 4.1.0 の組み合わせは未検証（テンプレートは Vite 6）。** ただし Phaser は単体 npm ライブラリであり、Vite 固有の特別設定は不要（後述）。

### 3-2. React ↔ Phaser 境界の定石（確認済み）

公式テンプレートの `src/PhaserGame.tsx`（内容確認済み、要点）:
- `forwardRef` でゲーム/シーン参照を親へ公開する `IRefPhaserGame { game, scene }` インターフェース。
- **`useLayoutEffect`** 内で `StartGame("game-container")` を呼び初回マウント時にゲーム生成。
- **cleanup（return）で `game.current.destroy(true)` を呼び、参照を null 化** → アンマウント/StrictMode 再マウントでの破棄を保証。
- レンダリングは `<div id="game-container" />` 1個のみ（Phaser がこの要素配下に canvas を挿入）。
- （任意）`current-scene-ready` イベントを `EventBus` 経由で受け、シーン参照をコールバックに渡す。

公式テンプレートの `src/game/main.ts`（内容確認済み）:
```ts
import { AUTO, Game } from 'phaser';
// ...scene imports
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,            // WebGL 優先、不可なら Canvas にフォールバック
  width: 1024,
  height: 768,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scene: [Boot, Preloader, MainMenu, MainGame, GameOver],
};
const StartGame = (parent: string) => new Game({ ...config, parent });
```
- **Phaser 4 は ESM 名前付きエクスポート**: `import { AUTO, Game } from 'phaser'`（確認済み）。`Scene` も同様に名前付きエクスポートされる想定（シーンクラスは `Phaser.Scene` を継承; **`import { Scene } from 'phaser'` 形は本調査で直接未確認**、`Phaser.Scene` 経由は型 namespace から利用可）。

### 3-3. 本タスク向けの最小化方針（推奨）
本タスクは「最小サンプル + デバッグ目的」なので、テンプレートをそのまま使わず**要点だけ移植**することを推奨:
1. Phaser ロジック（`Game` 生成/破棄 + 単一 `Scene`）を **1モジュールに集約**（指示書の「高凝集・低結合」「生成・破棄責務を1モジュールに」に合致）。例: `src/game/createGame.ts`（`StartGame(parent)` 相当）+ `src/game/scenes/BootScene.ts`。
2. React 側は薄いラッパコンポーネント（例 `src/PhaserGame.tsx`）でマウント用 `<div id={...} />` を出し、`useLayoutEffect`（または `useEffect`）で生成、cleanup で `destroy(true)`。
3. 最小描画は **外部アセット不要** の図形/テキストで実現:
   - `this.add.text(x, y, 'Phaser is running', { color: '#ffffff' })` や `this.add.rectangle(...)` を `create()` 内で描画（`docs.phaser.io` GameObjectFactory）。
4. `App.tsx` から当該コンポーネントを表示。
5. **契約文字列の定数化**（指示書要件）: DOM コンテナ id（例 `GAME_CONTAINER_ID`）、`GAME_WIDTH`/`GAME_HEIGHT` を `src/constants.ts` に集約。テンプレートの `'game-container'` ハードコードは踏襲せず定数化する。

### 3-4. React 19 における ref の扱い（重要・破壊的変更あり）
- 公式テンプレートは `forwardRef` を使用しているが、**React 19 では `forwardRef` は非推奨化が進み、`ref` を通常の prop として受け取る方式が公式推奨**。
  - 出典: React 公式 `https://react.dev/reference/react/forwardRef` および React v19 リリースノート `https://react.dev/blog/2024/12/05/react-19`（「In React 19 ... pass `ref` as a prop. `forwardRef` will be deprecated in a future release.」）。
- 本タスクは「後方互換不要・最もシンプルに」が制約なので、**`forwardRef` ではなく `function PhaserGame({ ref }) {...}` 形（ref を prop で受ける）を推奨**。そもそも最小サンプルでは親へ ref を公開する必要すらないため、**ref 公開自体を省略**してよい（マウント/アンマウントの生成・破棄だけ実装すれば足りる）。

---

## 4. テスト方針（Vitest + jsdom）

### 既知の落とし穴（確認済み）
- **jsdom は `HTMLCanvasElement.prototype.getContext()` を実装しておらず、WebGL も無い**。Phaser の `Game` を `type: AUTO`/`WEBGL`/`CANVAS` で実体生成するとテスト環境で canvas 取得に失敗する。
  - 出典: jsdom Issue #1782 `https://github.com/jsdom/jsdom/issues/1782`、vitest Issue #274 `https://github.com/vitest-dev/vitest/issues/274`、DEV「Testing Phaser Games with Vitest」`https://dev.to/davidmorais/testing-phaser-games-with-vitest-3kon`。
- 対処の選択肢（いずれも一次情報/コミュニティ確立手法）:
  1. **`vitest-canvas-mock` / `jest-canvas-mock` を `setupFiles` に追加**して canvas をモック。
  2. **`canvas`（node-canvas）パッケージ**を入れて `getContext` を実装で差し替え。
  3. **描画そのものをテストしない**: Phaser インスタンス生成は `vi.mock('phaser', ...)` でモックし、React コンポーネント側の「マウントで生成関数が呼ばれる / アンマウントで `destroy(true)` が呼ばれる / props・コンテナ id」だけを検証する。

### 推奨（本タスク）
- 指示書の方針（「描画ではなく生成・破棄・props の検証に絞る」）と整合する **選択肢3（`phaser` をモック）を第一推奨**。理由: 追加依存ゼロ、jsdom の canvas 制約を回避でき、StrictMode 下の二重生成/破棄ロジックの検証に集中できる。
- 既存規約に従う:
  - `globals: true` なので `test/expect/vi` は import 不要。
  - `@testing-library/react` の `render`/`cleanup` を使用（既存 `App.test.tsx` 準拠）。
  - 既存 `App.test.tsx` は `App` 内に Phaser コンポーネントが入ると `render(<App/>)` 時に Phaser 生成が走る可能性があるため、**`App.test.tsx` 側でも `phaser`（または Phaser ラッパ）をモックする更新が必要**になり得る。実装時に要確認。

---

## 5. Vite / ビルド設定上の注意

- 公式テンプレートの **dev 用 Vite 設定には Phaser 専用の特別設定は無い**（`optimizeDeps`/`define`/カスタム chunk なし）。最小サンプルでは **本プロジェクトの `vite.config.ts` に追加設定は不要**と判断。
  - 出典: `template-react-ts` の dev config を確認（Phaser 固有設定なし）。
- 本番ビルドの最適化（Phaser を別 chunk に分ける `manualChunks` 等）はテンプレートのプロダクション設定に存在するが、**本タスクのデバッグ目的には不要**。**テンプレート prod config の正確な内容は本調査で未確認**。
- `npm run build` は `tsc -b && vite build`。Phaser は型定義同梱なので `@types/phaser` の追加は不要（`types: ./types/phaser.d.ts`）。

---

## 6. Chrome での描画確認手順（実装後に成立させる手順）

1. `frontend/` で `npm install`（`phaser` 追加後）。
2. `npm run dev` → Vite が `http://localhost:5173/`（`vite.config.ts` で `port:5173, strictPort:true`）で起動。
3. Chrome で `http://localhost:5173/` を開く。
4. `#root` 内に Phaser の `<canvas>`（コンテナ `div` 配下）が描画され、図形/テキスト（例「Phaser is running」）が表示されることを確認。
5. DevTools Console に Phaser のバージョンログ（`Phaser vX.Y.Z`）が出ること、エラーが無いことを確認。
- レンダラは `type: AUTO` 推奨（Chrome では WebGL が使われる。WebGL 不可環境でも Canvas にフォールバックするため最小サンプルとして堅牢）。

---

## 7. 後続（planner）が押さえるべき重要概念まとめ

1. **境界分離**: Phaser（描画 I/O・フレームワーク）を React から分離し、Game 生成/破棄を1モジュールに集約（`createGame(parent)` + 単一 `Scene`）。
2. **ライフサイクル整合**: `useLayoutEffect`/`useEffect` で生成 → cleanup で `game.destroy(true)` + 参照 null 化。**StrictMode の二重マウント前提**でリーク/二重生成を防ぐ。
3. **React 19 の ref**: `forwardRef` は使わず ref を prop 化（最小サンプルでは ref 公開自体不要）。破壊的変更として認識。
4. **Phaser 4 系の API**: ESM 名前付き import（`import { AUTO, Game } from 'phaser'`）。`Scene` の継承で最小シーンを定義し `create()` で図形/テキスト描画（外部アセット不要）。
5. **定数集約**: コンテナ id・width・height を `src/constants.ts` に定義（契約文字列を1箇所に）。
6. **テスト**: jsdom の canvas 制約のため `phaser` をモックし、生成/破棄/props を検証。`App.test.tsx` も Phaser 導入に合わせ更新が必要になり得る。

---

## 8. 未確認・要実装時検証の事項（正直な明示）

- [ ] **Phaser 4.1.0 × Vite 8 × @vitejs/plugin-react 5 の実動作**（公式テンプレートは Vite 6 / plugin 4 / Phaser 4.0）。→ `npm run dev` / `npm run build` / `npm run test` で実検証する。
- [ ] **`Scene` が `phaser` の名前付きエクスポートか**（`import { Scene } from 'phaser'` の可否）。`Phaser.Scene`（型 namespace 経由）は利用可と判断。実装時に import 形を確定。
- [ ] **HEADLESS レンダラが jsdom で canvas を完全に回避できるか**（HEADLESS の詳細挙動は公式 typedef に明記なし）。テストは `phaser` モック方式を採るため依存しない方針。
- [ ] **テンプレート本番 Vite 設定（manualChunks 等）の正確な内容**（本タスクのデバッグ目的では不要のため未確認）。

---

## 9. 参照した一次情報（URL / 対象）

- npm registry: `https://registry.npmjs.org/phaser/latest`（phaser `version: 4.1.0`、ESM/型定義同梱を確認）
- 公式テンプレート: `https://github.com/phaserjs/template-react-ts`（`package.json` / `src/PhaserGame.tsx` / `src/game/main.ts` を確認）
- Phaser 公式 docs: `https://docs.phaser.io/phaser/getting-started/project-templates`、`https://docs.phaser.io/api-documentation/typedef/types-core`（GameConfig: type/width/height/parent/backgroundColor/scene、renderer AUTO/CANVAS/WEBGL/HEADLESS）
- Phaser 公式 news: `https://phaser.io/news/2026/05/phaser-3-vs-phaser-4`、`https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out`（Phaser 4 正式リリース・安定性）
- React 公式: `https://react.dev/reference/react/forwardRef`、`https://react.dev/blog/2024/12/05/react-19`（forwardRef 非推奨 / ref を prop 化）、`https://react.dev/reference/react/StrictMode`（二重マウント挙動）
- テスト関連（コミュニティ確立手法 + 一次 issue）: jsdom Issue #1782 `https://github.com/jsdom/jsdom/issues/1782`、vitest Issue #274 `https://github.com/vitest-dev/vitest/issues/274`、`https://dev.to/davidmorais/testing-phaser-games-with-vitest-3kon`
</content>
</invoke>
