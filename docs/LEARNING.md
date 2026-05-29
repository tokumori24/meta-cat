# 学習ドキュメント: Web アプリ開発用 Docker 環境の構築

> 対象読者: このリポジトリを後から読む学習者。
> 目的: 「何を作ったか」だけでなく「なぜそう判断したか」を理解し、同じものを再現できるようにする。
> 記述方針: 実ファイル・テスト結果で確認した事実のみを書く。未確認の点は「未確認」と明記する。

---

## 0. このプロジェクトで作ったもの（全体像）

`docker compose` で起動する開発用の 2 コンテナ環境。

```
リポジトリルート/
├── docker-compose.yml      # 2サービス(backend / frontend)を定義
├── README.md               # 起動・確認・停止手順
├── backend/                # Node.js + Express 5 + TypeScript（クリーンアーキテクチャ）
│   ├── Dockerfile / .dockerignore
│   ├── src/                # domain / usecases / adapters / infrastructure / main.ts
│   └── test/               # 各層の単体・統合テスト
└── frontend/               # React 19 + Vite 8 + TypeScript（公式 react-ts ベース）
    ├── Dockerfile / .dockerignore
    ├── vite.config.ts      # server.host: true がコンテナ公開の肝
    └── src/
```

完了条件（order.md）は「`docker compose up` で両コンテナ起動 / frontend は Vite 画面 / backend は `/health` が 200 / ソース編集が反映（ホットリロード）」。

---

## 1. なぜこの実装にしたのか（背景・要件・判断理由）

### 1-1. 出発点
- リポジトリは**グリーンフィールド**（空の `README.md` と `.takt/` のみ。既存ソースなし）。
  - 「グリーンフィールド」= 既存コードの制約がない新規プロジェクト。設計の自由度が高い反面、規約を自分で決める必要がある。
- order.md には **Open Questions**（未確定の技術選択）が 4 つ提示されていた: 言語 / backend フレームワーク / DB の有無 / 各バージョン。
  - → 「調査(researcher)で根拠を集め、設計(planner)が決める」というワークフローの構造で確定させた。**推測ではなく一次情報（公式ドキュメント）を根拠にする**のがこの learning-dev ワークフローの趣旨。

### 1-2. 確定した技術選択と理由（research.md / plan.md より）

| 論点 | 決定 | 理由（確認した事実ベース） |
|------|------|------|
| 言語 | **TypeScript**（両側） | frontend が React+Vite で TS が標準。backend も統一して型の恩恵を得る |
| backend FW | **Express 5**（5.2.1） | 「最小ヘルスチェック1本」要件に対し学習容易性・情報量で選択。`/health` は静的パスで v5 の破壊的変更（path-to-regexp）の影響を受けない |
| DB | **含めない** | order.md 要件外。後から `services:` を足せる構成にとどめた |
| Node | **Node 24（Active LTS, bookworm-slim）** | Vite 8 の Node 要件（20.19+/22.12+）を満たす。Alpine ではなく slim を選好（musl 由来のネイティブモジュール互換問題を避ける） |
| ホットリロード | **bind mount 方式** | 完了条件が「`docker compose up` 単体」。公式推奨の Compose Watch は `docker compose watch` 起動前提のため、`up` 単体で要件を満たす bind mount を基本線にした |

「Active LTS」= 長期サポート版のうち、最新機能も入る現役世代。新規プロジェクトの安全な既定値。

### 1-3. backend を TS のまま“ビルドなし”で動かす判断
- Node 24 の**ネイティブ型ストリップ**（型注釈を実行時に取り除いて `.ts` を直接実行する機能）を使い、`tsc`/`tsx` などのビルド段を持たない。
  - 実コードでの裏付け: `backend/package.json` の `"dev": "node --watch src/main.ts"`、`"test": "node --test --experimental-strip-types ..."`。
  - トレードオフ: **型ストリップは型チェックをしない**。型検査は `"build": "tsc --noEmit"`（`tsconfig.json` で `noEmit`/`erasableSyntaxOnly`）で別運用。dev 起動には含めない。
  - 制約: `enum` / ランタイムを伴う `namespace` / パラメータプロパティ / import エイリアスは使えない。`tsconfig.json` の `erasableSyntaxOnly: true` がこの制約をコンパイラ側でも強制している。

---

## 2. 使用した技術（バージョンと調査要点）

すべて 2026-05-29 時点の公式ドキュメント一次情報（research.md 参照）。実際に `package.json` / `Dockerfile` で確認した値を併記する。

### backend（`backend/package.json` 実値）
- `express ^5.2.1` — Express 5（GA 済み）。
- `@types/node ^24.10.2` / `typescript ^5.9.3`。
- テスト: Node 標準テストランナー（`node:test` / `node:assert`）＋ `supertest`（HTTP 統合テスト）。外部テストフレームワーク不使用。
- 実行基盤: `node:24-bookworm-slim`（Dockerfile）。

### frontend（`frontend/package.json` 実値）
- `react ^19.2.3` / `react-dom ^19.2.3`。
- `vite ^8.0.0` / `@vitejs/plugin-react ^5.1.1`。
- テスト: `vitest ^4.0.14` ＋ `@testing-library/react` ＋ `jsdom`。

### 調査で得た「落とし穴」要点（research.md）
- **compose の top-level `version:` は obsolete**（書くと警告）。→ 本実装でも書いていない。
- **Vite は `server.host: true`（=0.0.0.0 で listen）が必須**。未設定だとコンテナ内 localhost のみ待受になり、ホストの `:5173` から見えない（最頻出の罠）。
- **bind mount だけだとホスト側 `node_modules` がコンテナ側を覆い隠す**。→ 匿名ボリューム `- /app/node_modules` で回避（※この回避策は Docker 公式 develop ガイドに明示なし＝**コミュニティ知識・未確認**と research が明記）。
- **Vite の `usePolling` は常用しない**（公式が「高 CPU 使用」と明記）。HMR 不調時の最終手段として README に `CHOKIDAR_USEPOLLING=true` を補足。

---

## 3. 重要な設計判断（クリーンアーキテクチャの観点）

### 3-1. クリーンアーキテクチャとは（最小限の補足）
- ビジネスロジック（ドメイン）を、フレームワーク・I/O・UI といった「外側の都合」から切り離す設計思想。
- **依存の向きは常に「外側 → 内側」の一方向**。内側（ドメイン）は外側（Express や Date）を知らない。
- 利点: ドメイン/ユースケースが Express にも Date にも依存しないので、**純粋関数として単体テストできる**。

### 3-2. backend の層構成（実ファイルで確認）

```
main.ts                         ← Composition Root（依存を結線して起動）
  └ infrastructure/             ← 外界(Express, Date, process.env)を隔離
      ├ server.ts               createServer / startServer
      ├ systemRuntimeStatusSource.ts   new Date()・process.uptime() をここだけに閉じ込め
      ├ port.ts                 resolvePort(env): PORT 環境変数の検証
      └ constants.ts            PORT_ENV_VAR = 'PORT'
  └ adapters/http/              ← HTTP という入出力形式への変換
      ├ router.ts               GET /health を配線
      ├ healthController.ts     usecase 実行 → res.status(200).json(...)
      └ constants.ts            HEALTH_ROUTE_PATH = '/health'
  └ usecases/                   ← アプリ固有の操作
      ├ ports.ts                RuntimeStatusSource（インターフェース＝DIP の境界）
      └ checkHealth.ts          checkHealth(source): HealthStatus
  └ domain/                     ← 最内核。FW も I/O も知らない
      └ health.ts               HealthStatus 型 + createHealthStatus（不変条件を検証）
```

**依存方向の検証（import を実際に確認）**:
- `domain/health.ts` … 何も import しない（最内核として正しい）。
- `usecases/checkHealth.ts` … `domain` と同層 `ports` のみ import。Express も Date も知らない。
- `adapters/http/healthController.ts` … `usecases` と express の**型**（`Request`/`Response`）のみ。
- `infrastructure/server.ts` … express 実体と adapters/usecases を結線。
- `main.ts` … 全部を import して `resolvePort → createSystemRuntimeStatusSource → createServer → startServer` と結線。

逆流（内側が外側を import）は 0 件。これがクリーンアーキテクチャの最重要ルール。

### 3-3. DIP（依存性逆転の原則）の実証ポイント
- 「DIP」= 上位（usecase）が下位（具体実装）に依存せず、**両者が抽象（インターフェース）に依存する**原則。
- 本実装の境界は `usecases/ports.ts` の `RuntimeStatusSource`:
  ```ts
  export type RuntimeStatusSource = {
    now(): Date;
    uptimeSeconds(): number;
  };
  ```
- `usecases/checkHealth.ts` はこの**型だけ**に依存する。実体（`new Date()` / `process.uptime()`）は `infrastructure/systemRuntimeStatusSource.ts` が提供し、`main.ts` で注入する。
- 効果: テストでは偽の `RuntimeStatusSource`（固定時刻を返す）を渡せるので、時刻という非決定的な外界に依存せずユースケースを検証できる。
- 補足（設計の進化）: plan.md ではこの境界を「Clock ポート」と呼んでいたが、実装では uptime も扱うため `RuntimeStatusSource` という名前に発展している。**名前は責務を表す**という良い例。

### 3-4. 採用したトレードオフ（意図的に「やらなかった」こと）
- **投機的なポートを作らない**: Repository や Logger のポートは作らず、唯一の外部依存（時刻・uptime）だけを隔離した。「将来使うかも」で抽象を増やさない判断（YAGNI）。
- **DB・認証・本番マルチステージビルド・CI は対象外**: order.md が「開発用環境」に限定しているため。あとから `services:` を足せる形にとどめた。
- **型チェックを dev 起動から外す**: 起動速度と構成の単純さを優先し、型検査は `npm run build`（`tsc --noEmit`）に分離した。

### 3-5. review で入った改善（iteration をまたいだ学び）
- 初版では**ポート解決ロジックが `main.ts` の副作用の中に埋め込まれていた**ため、単体テストできなかった（review iteration 1 のブロッキング指摘）。
- 改善後: `infrastructure/port.ts` に `resolvePort(env: NodeJS.ProcessEnv): number` を**純粋関数**として抽出し、`process.env` を引数で注入する形にした。これで `port.test.ts`（6 ケース: 正常 / 未定義 / 非数値 / 非整数 / 末尾文字混入 / 0・負）でテスト可能になった。
- 学び: **「テストしづらい」は設計の臭い**。副作用（環境変数読み取り）と純粋なロジック（検証）を分離すると、テスト可能性と合成ルートの薄さが同時に手に入る。

---

## 4. 実装と計画の差分（再現時に知っておくべき事実）

調査・計画と最終実装で**食い違っている点**を、誤解防止のため正直に記録する。

1. **compose ファイル名**: research/plan は推奨名 `compose.yaml` を指示していたが、実ファイルは **`docker-compose.yml`**（レガシー名）。どちらも Docker Compose が認識し、test では `docker compose config` が EXIT 0。なぜレガシー名になったかの経緯は**未確認**。再現時は `compose.yaml` でも動作する。
2. **ポート解決の方針**: plan は `process.env.PORT ?? 3000`（既定値フォールバック）だったが、実装は **fail-fast**（`PORT` 未設定や不正値なら例外）。`docker-compose.yml` の backend で `environment: PORT: "3000"` を必ず渡す前提に変わった。「暗黙の既定値」より「明示的な設定の強制」を選んだ形。
3. **テストフラグ**: `backend/package.json` の test は `--experimental-strip-types`（Node 22.6+ のフラグ）を明示。research では「23.6.0+ で default 有効」とあるが、明示フラグにより Node 22.6〜23.5 でも動く。**ローカルが Node 20 だと `npm test` は起動不能**（test-report の EXIT 9）。Docker の Node 24 環境では 13 件 pass。

---

## 5. 検証結果（test-report.md の事実）

| 対象 | コマンド | 結果 |
|------|---------|------|
| backend 型チェック | `tsc --noEmit` | ✅ EXIT 0 |
| backend テスト（Node24 / node:24-bookworm-slim） | `node --test --experimental-strip-types` | ✅ 13 pass / 0 fail |
| backend テスト（ローカル Node20） | 同上 | ❌ EXIT 9（`--experimental-strip-types` 非対応＝環境起因。ロジック起因ではない） |
| frontend ビルド | `tsc -b && vite build` | ✅ EXIT 0 |
| frontend テスト | `vitest run` | ✅ 1 pass |
| compose 構成 | `docker compose config` | ✅ EXIT 0 |

- **未確認**: `docker compose up` による実コンテナ常駐起動・ブラウザでの Vite 画面表示・実際の HMR 動作は、本ワークフロー内では未実施（構成検証と Node24 イメージでのテスト実行までを確認）。再現時はここを手元で確認すること。
- lint は設定・スクリプトが存在しないため未実施。

---

## 6. 今後学ぶべきこと（次に深掘りするテーマ）

優先度順。いずれも「このプロジェクトの自然な次の一歩」。

1. **Compose Watch（`develop.watch`）への移行** — 今は bind mount。公式推奨の `sync`/`rebuild` を学び、`node_modules` 衝突回避を匿名ボリュームから `ignore` ベースへ。匿名ボリューム手法の公式裏付けが未確認である点も自分で確かめる。
2. **frontend → backend の連携** — 今は両者独立。`VITE_API_URL` の env 化、サービス名 DNS（`http://backend:3000`）での通信、CORS の扱い。
3. **本番用マルチステージビルド** — dev 専用の現状から、`build` ステージ + 軽量 runtime ステージへ。frontend は静的配信、backend は型チェック込みのビルド。
4. **クリーンアーキテクチャの拡張** — 実データを扱う Repository ポートを追加し、DIP の境界を時刻以外にも広げる。DB 導入時が好機。テストでの test double（偽実装）の作り方も合わせて。
5. **型安全の強化** — 型ストリップは型チェックしない。CI で `tsc --noEmit` を必須化する。Express 5 の破壊的変更（path-to-regexp）も動的ルート導入時に再確認。
6. **lint / format 基盤** — 現状ゼロ。ESLint（または Biome）+ Prettier を導入し、`package.json` に `lint` スクリプトを足す。
7. **HTTP の堅牢化** — graceful shutdown（SIGTERM で `server.close()`）、ヘルスチェックの readiness/liveness 分離、エラーハンドリングミドルウェア。

---

## 付録: 最短再現手順

```sh
# 1. 起動（イメージビルド込み）
docker compose up --build

# 2. 確認
#   frontend: ブラウザで http://localhost:5173
curl http://localhost:3000/health      # backend: {"status":"ok",...} を 200 で返す

# 3. ホットリロード確認
#   frontend/src/App.tsx を編集 → ブラウザが更新
#   backend/src 配下を編集 → node --watch が再起動

# 4. 停止
docker compose down

# ローカル(Docker外)でテストする場合は Node 22.6+ が必要
npm --prefix backend test     # Node 24 推奨
npm --prefix frontend test
```
