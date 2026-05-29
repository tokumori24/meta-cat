# 学習ドキュメント: frontend への Phaser 導入

> 対象タスク: React 19 + Vite + TypeScript + Vitest 構成の `frontend/` に Phaser（ブラウザゲーム描画フレームワーク）を導入し、Chrome 上で「動作が視認できる最小サンプル」を描画する。
>
> このドキュメントは、調査 → 設計 → 実装 → テスト → レビューの過程を学習者が後から読んで**理解・再現**できるようにまとめたものです。記述はすべて成果物（`research.md` / `plan.md` / `test-report.md`）と実コード・実コマンド出力で確認した事実に基づきます。推測は含めていません。

---

## 用語の前提（初出補足）

- **Phaser**: HTML5 のブラウザゲーム/2D 描画フレームワーク。内部で `<canvas>` を生成し、WebGL または Canvas API で図形・テキスト・画像を描画する。
- **クリーンアーキテクチャ**: 「ビジネスロジック（ドメイン）を、フレームワークや UI、入出力（I/O）から分離し、依存の向きを常に内側（＝ドメイン）へ一方向に保つ」設計原則。外側（React/Phaser）は内側（純粋データ）を知ってよいが、内側は外側を知らない。
- **DIP（依存性逆転の原則）**: 上位/中核のロジックが、下位の具体実装（フレームワーク）に依存しないようにすること。本タスクでは「ドメインが Phaser を import しない」形で担保している。
- **StrictMode**: React の開発時専用モード。副作用（effect）を意図的に2回実行し（`setup → cleanup → setup`）、後始末漏れを早期に発見させる仕組み。
- **jsdom**: Node.js 上でブラウザ DOM を擬似的に再現するライブラリ。Vitest のテスト環境で使われるが、`<canvas>` の `getContext()` や WebGL は実装されていない。

---

## 1. 各フェーズの要約

### フェーズ1: 調査（researcher）

**何を行ったか**: 既存構成（`package.json` / `vite.config.ts` / `tsconfig.app.json` / `src/*`）を実ファイルで確認し、Phaser の最新安定版・公式 React 統合パターン・React 19 の変更点・jsdom/Vitest でのテスト方針・Vite ビルド注意点を一次情報で調査した。

**何が分かったか**:
- Phaser の npm `latest` は **`4.1.0`**（ESM 提供・型定義同梱・peer 依存/engines 指定なし）。→ Vite + TS に追加設定なしで載りやすい。
- 公式 React+TS テンプレート（`phaserjs/template-react-ts`）の定石は「`useLayoutEffect` で `Game` 生成 → cleanup で `game.destroy(true)` + 参照 null 化」「`type: AUTO`」。
- **落とし穴3点**:
  1. React 19 で `forwardRef` が非推奨化 → `ref` を通常の prop として受け取る方式が推奨。
  2. StrictMode 二重マウント → cleanup で確実に破棄しないと canvas 二重生成・リーク。
  3. jsdom は canvas/WebGL 未実装 → テストで実 `Game` を生成すると失敗するため、`phaser` をモックする。
- **未確認事項として明記**: Phaser 4.1.0 × Vite 8 × @vitejs/plugin-react 5 の実動作、`Scene` の名前付き export 可否、HEADLESS レンダラの jsdom 挙動（→ いずれも実装/テスト工程で実検証する性質）。

### フェーズ2: 設計（planner）

**何を行ったか**: 調査結果を踏まえ、クリーンアーキテクチャ前提で要件を16項目に分解し、層マッピング・採否したアプローチ・テスト方針・確認手順（完了条件）を確定した。

**何が決まったか**:
- **4モジュール分割**を採用（domain / phaser / react の3ディレクトリ）。「Renderer ポートで厳密に DIP 反転」は図形1つ＋テキストに対し過度な抽象化として**却下**し、ドメインの純粋性（Phaser 依存ゼロ）で依存方向を担保する判断。
- 依存方向: `App.tsx → PhaserGame.tsx → createGame.ts → DemoScene.ts → sceneContent.ts`（外→内の一方向）。`constants.ts` は依存を持たない契約の葉。
- レンダラ（Open Question の回答）は **`type: AUTO`**（Chrome=WebGL、不可環境は Canvas フォールバック）。テストはモックでレンダラ非依存。
- import 形式は `import * as Phaser from 'phaser'`（名前空間）に統一。`Scene` の名前付き export 可否が未確認のため、`AUTO`/`Game`/`Scene` を一括参照でき `vi.mock` とも整合する形を選択。
- テスト方針: `phaser` をモックし「生成・破棄・props（設定契約）」を検証。`App.test.tsx` は `PhaserGame` をモックして Phaser から隔離。

### フェーズ3: 実装（implement）

**何を行ったか**: 計画どおり内→外の順でファイルを作成・更新し、`npm install`（phaser 追加）→ `build` → `test` → `dev` を実行した。

**何が分かった／決まったか**:
- `npm view phaser version` で `4.1.0` を確認し、`package.json` に `"phaser": "^4.1.0"` を追加。
- 実装中の発見: テストで Phaser `Game` のモックを arrow function にすると `new` で呼べず失敗した → `new Phaser.Game(...)` と同じ契約で呼べる function モックへ修正。`vi.mock` の巻き上げ対策に `vi.hoisted` を使用。
- `npm run dev` は `http://127.0.0.1:5173/` で 200 応答を確認。ただし**ヘッドレス Chrome での実描画確認は環境側の制約で失敗**（`open` が `kLSNoExecutableErr`、headless が exit -1）。→ Chrome 目視確認は手動手順として引き継ぎ。

### フェーズ4: テスト（test）

**何を行ったか**: `npm run build` / `tsc -b --force` / `npm run test` を実行し結果を記録した。

**結果（実コマンド出力）**:
- `npm run build`（`tsc -b && vite build`）: **成功**（警告1件のみ）。
- `tsc -b --force`: exit 0、型エラーなし。
- `npm run test`（`vitest run` v4.1.7）: **4ファイル / 5テスト すべて pass**（Duration 892ms）。
- 警告（非ブロッキング）: `Some chunks are larger than 500 kB` — Phaser バンドルで `index-*.js` が 1,544.61 kB（gzip 412.34 kB）。
- **未実施を明記**: lint（ツール未設定）、Chrome 実描画（ヘッドレス環境のため目視不可）。

### フェーズ5: レビュー（review）

**何を行ったか**: 全実装ファイルの import を実際に追跡し、依存方向・責務分離・ライフサイクル・契約定数・テスト十分性を検証した。

**結論**: **APPROVE**。REJECT 基準（`any`・フォールバック乱用・説明コメント・未使用コード・エラー握りつぶし・DRY 違反・テスト無しの新振る舞い等）に該当なし。指摘は全て非ブロッキング:
1. `DemoScene.create()` の描画自体は未テスト（live レンダラ依存。表示データを `sceneContent.ts` に抽出してテスト済みのため妥当）。
2. 背景色 `#1d2433` が `constants.ts` と `App.css` で二重定義（CSS から TS 定数を参照できない実務的トレードオフ）。
3. シーン内レイアウトのマジックナンバー（契約文字列ではないため必須ではない）。

---

## 2. 学びの観点

### なぜこの実装にしたのか（背景・要件・判断理由）

タスクの本質は「**Phaser という描画 I/O を持つフレームワークを、React アプリのライフサイクルと安全に統合する**」こと。ここで2つのリスクが要件を駆動した:

1. **リーク・二重生成**: Phaser の `Game` は `<canvas>` という重い DOM リソースを抱える。React のマウント/アンマウント（とくに StrictMode の二重実行）に破棄が追従しないと、canvas が積み重なりメモリリークする。
   → だから「生成は effect 内、破棄は cleanup で `game.destroy(true)`」というライフサイクル整合が必須要件になった。

2. **テスト不能性**: jsdom には canvas/WebGL が無いため、本物の `Game` を生成するテストは必ず落ちる。
   → だから「描画そのものは検証せず、生成・破棄・設定契約に絞り、Phaser をモックする」方針になった。さらに「**画面に出す文言を純粋データ（`sceneContent.ts`）に切り出す**」ことで、描画に依存せずコンテンツを単体テストできるようにした。

### 使用した技術（バージョン・調査要点）

| 技術 | バージョン（確認済み） | 要点 |
|------|----------------------|------|
| Phaser | `^4.1.0` | ESM・型定義同梱・peer 依存なし。`@types/phaser` 不要。`type: AUTO` で WebGL→Canvas フォールバック |
| React | `^19.2.3` | `forwardRef` 非推奨化（`ref` を prop 化）。最小サンプルでは ref 公開自体を省略 |
| Vite | `^8.0.0` | 追加の Phaser 専用設定（`optimizeDeps`/`define`）不要。大バンドルの chunk 警告は許容 |
| TypeScript | `^5.9.3` | `strict: true` / `moduleResolution: Bundler`。import に `.ts` 拡張子付き |
| Vitest | `^4.0.14` | `environment: jsdom` / `globals: true`。`vi.mock` + `vi.hoisted` で Phaser を差し替え |

### 重要な設計判断（クリーンアーキテクチャの観点とトレードオフ）

実コードで確認した層構造と import（依存方向は外→内の一方向）:

```
App.tsx                      （UI）
  └─ PhaserGame.tsx          （react層: import react, constants, createGame）
       └─ createGame.ts      （phaser層: import phaser, constants, DemoScene）
            └─ DemoScene.ts   （phaser層: import phaser, constants, sceneContent）
                 └─ sceneContent.ts （domain: import なし＝純粋データ・型のみ）
constants.ts                 （契約の葉: 依存なし）
```

- **核心**: 最内の `sceneContent.ts` は Phaser も React も import しない（実ファイルで確認: import 0件）。表示文言という「ドメイン知識」がフレームワークから完全に独立している。これが DIP を抽象化レイヤーなしで実現する最小の形。
- **責務集約**: Phaser インスタンスの生成・破棄は `createGame.ts` の1関数に集約（高凝集）。React 側はそれを呼ぶだけ（低結合）。
- **ライフサイクル境界**: `PhaserGame.tsx` は `useLayoutEffect(deps=[])` で生成、cleanup で `game.destroy(true)`。`containerRef.current === null` を**明示的に throw**してエラーを握りつぶさない。
- **採用したトレードオフ**:
  - Renderer ポート/インターフェース層を**入れなかった**: 最小サンプルに対して過剰。純粋ドメインで依存方向を担保すれば十分という判断。
  - 背景色の二重定義（`constants.ts` と `App.css`）を**許容**: CSS から TS 定数を直接参照できないための実務的妥協。CSS 変数化すれば一元化できるが本タスクでは不要。
  - `forwardRef` を**使わない**: React 19 で非推奨。後方互換不要・最シンプルという制約に沿う。

### 再現手順（Chrome 描画確認）

実装レポート記載の手順（自動検証では Chrome 目視は未実施のため手動）:
1. `frontend/` で `npm install`（phaser 追加後）→ `npm run dev`
2. Chrome で `http://localhost:5173/` を開く
3. `TAKT Frontend` の見出しの下に、800×600 の Phaser 領域・青い矩形・`Phaser is running` のテキストが表示されることを確認
4. 再読み込みで canvas が二重生成されないことを目視確認
5. 完了条件: `npm run build`（型エラーなし）/ `npm run test`（全 pass）/ Chrome 描画

### 今後学ぶべき内容（次の深掘りテーマ）

1. **E2E での描画検証**: jsdom では描画を確認できない。Playwright 等で実ブラウザに canvas を出し、スクリーンショット比較する手法（レビュー nice-to-have で挙がった `DemoScene.create()` の描画テスト）。
2. **バンドル分割（code splitting）**: Phaser で `index.js` が 1.5MB 超。`React.lazy` / 動的 import / Vite の `manualChunks` でゲーム部分を遅延ロードする最適化。
3. **React 19 の effect とライフサイクル**: `useLayoutEffect` vs `useEffect` の使い分け、StrictMode 二重実行が前提とする「冪等な setup/cleanup」の設計。
4. **クリーンアーキテクチャの発展**: 今回省いた Renderer ポート（インターフェース）を、ゲームが複雑化（複数シーン・状態管理・入力処理）した場合にどこで導入すべきか。「いつ抽象化するか」の判断軸。
5. **Phaser のシーン設計**: 複数 Scene 間の遷移、`preload`/`create`/`update` ライフサイクル、アセット管理（今回は外部アセット不使用）。

---

## 3. researcher が参照した公式ドキュメント URL 一覧

> `research.md` 記載のものを正確に転記（推測 URL・リンク切れは含まない）。

| ドキュメント名 | URL | 対象バージョン／確認内容 |
|---------------|-----|------------------------|
| npm registry (phaser) | `https://registry.npmjs.org/phaser/latest` | phaser `4.1.0`（`module: ./dist/phaser.esm.js`、`types: ./types/phaser.d.ts`、peerDependencies/engines 記載なし） |
| 公式 React+TS テンプレート | `https://github.com/phaserjs/template-react-ts` | pin: `phaser@4.0.0`, `react@^19.0.0`, `vite@^6.3.1`, `typescript@~5.7.2`, `@vitejs/plugin-react@^4.3.4` |
| Phaser 公式 docs (Project Templates) | `https://docs.phaser.io/phaser/getting-started/project-templates` | プロジェクトテンプレート構成 |
| Phaser 公式 docs (Core Types / GameConfig) | `https://docs.phaser.io/api-documentation/typedef/types-core` | GameConfig: `type/width/height/parent/backgroundColor/scene`、renderer `AUTO/CANVAS/WEBGL/HEADLESS` |
| Phaser 公式 news (Phaser 3 vs 4) | `https://phaser.io/news/2026/05/phaser-3-vs-phaser-4` | Phaser 4 は 2026-04-10 正式リリース、API 概ね維持 |
| Phaser 公式 news (v4 RC6) | `https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out` | RC6 以降 production-ready |
| React 公式 (forwardRef) | `https://react.dev/reference/react/forwardRef` | forwardRef 非推奨化・ref を prop 化 |
| React 公式 (React 19 blog) | `https://react.dev/blog/2024/12/05/react-19` | React 19 の変更点（ref を prop として受け取る） |
| React 公式 (StrictMode) | `https://react.dev/reference/react/StrictMode` | 二重マウント挙動 |
| jsdom Issue #1782 | `https://github.com/jsdom/jsdom/issues/1782` | canvas `getContext` 未実装 |
| vitest Issue #274 | `https://github.com/vitest-dev/vitest/issues/274` | jsdom 環境での canvas テスト制約 |
| dev.to 記事 (Testing Phaser with Vitest) | `https://dev.to/davidmorais/testing-phaser-games-with-vitest-3kon` | `phaser` モックによるテスト確立手法 |

---

## 付録: 確認した実コード（抜粋）

**`src/game/domain/sceneContent.ts`**（純粋ドメイン・import なし）
```ts
export interface SceneContent {
  readonly title: string;
  readonly subtitle: string;
}
export const DEMO_SCENE_CONTENT: SceneContent = {
  title: 'Phaser is running',
  subtitle: 'React 19 + Vite + TypeScript',
};
```

**`src/game/phaser/createGame.ts`**（生成責務の集約）
```ts
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: GAME_BACKGROUND_COLOR,
    scene: [DemoScene],
  });
}
```

**`src/game/react/PhaserGame.tsx`**（ライフサイクル境界）
```tsx
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (containerRef.current === null) {
      throw new Error('Phaser container was not mounted');
    }
    const game = createGame(containerRef.current);
    return () => {
      game.destroy(true); // StrictMode 二重マウント・アンマウントで確実に破棄
    };
  }, []);
  return <div id={GAME_CONTAINER_ID} ref={containerRef} className="phaser-game" />;
}
```
