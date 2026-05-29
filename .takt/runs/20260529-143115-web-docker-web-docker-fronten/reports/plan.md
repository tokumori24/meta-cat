# タスク計画

## 元の要求
Web アプリ開発のための開発用 Docker 環境を構築する。frontend / backend の 2 コンテナ構成（frontend: React + Vite、backend: Node.js）を作成し、`docker compose` で起動できる状態まで実装する。`docker compose up` で両コンテナが起動し、frontend は Vite 初期画面が表示され、backend は起動確認用エンドポイントが HTTP 200 を返し、ローカルのソース編集がコンテナに反映される（ホットリロード）状態を完了条件とする。設計はクリーンアーキテクチャの原理（依存方向は外→内の一方向、DIP 遵守、ビジネスロジックをフレームワーク・I/O・UI から分離、層の責務と境界の明確化）を前提とする。

## 分析結果

### 目的
React+Vite（frontend）と Node.js（backend）の 2 コンテナ開発環境を新規構築し、`docker compose up` 単体で両者が起動・ホットリロードし、backend のヘルスチェックが 200 を返す状態にする。リポジトリは空のグリーンフィールド（空の `README.md`・`.git`・`.takt/` のみ。既存ソースなし）。

### 分解した要件
| # | 要件 | 種別 | 備考 |
|---|------|------|------|
| 1 | ルートに `compose.yaml` を作成し frontend / backend の 2 サービスを定義 | 明示 | |
| 2 | 各サービスのポートを公開（frontend 5173 / backend 3000） | 明示 | |
| 3 | ソース変更を反映する volume マウントを設定 | 明示 | bind mount |
| 4 | ホットリロードが効く構成 | 明示 | backend `node --watch` / frontend Vite HMR |
| 5 | `backend/Dockerfile`（開発用）で依存インストール→dev サーバ起動まで通す | 明示 | |
| 6 | `frontend/Dockerfile`（開発用）で Vite dev server をコンテナ外から参照可能に | 明示 | `server.host: true` |
| 7 | `backend/` を初期化し起動確認用エンドポイント（ヘルスチェック）を 1 つ実装 | 明示 | `GET /health → 200` |
| 8 | `frontend/` を React+Vite で初期化し初期テンプレートが起動する状態に | 明示 | 公式 `react-ts` |
| 9 | 各サービスに `.dockerignore`（`node_modules` 等除外） | 明示 | 優先度:中 |
| 10 | 起動・停止コマンドと動作確認手順を README に記載 | 明示 | 優先度:中 |
| 11 | クリーンアーキテクチャ（層分離・依存方向・DIP）で backend を設計 | 明示 | 指示で必須化 |
| 12 | 言語を TypeScript に確定 | 暗黙 | 要件1・8（React+Vite と統一）から確定。Open Questions #1 |
| 13 | backend フレームワークを確定 | 暗黙 | 要件7 を満たす FW 選定。Open Questions #2 |
| 14 | Node / ベースイメージのバージョンを確定 | 暗黙 | 要件5・6 の前提。Open Questions #4 |

### 参照資料の調査結果
参照資料は researcher の `research.md`（出典付き、2026-05-29 時点の公式ドキュメント一次情報）。主要点と本計画への反映:
- Compose の top-level `version:` は obsolete（警告）→ 書かない。`compose.yaml` に `services:` 直書き。
- Vite は `server.host: true`（0.0.0.0）が必須。未設定だとコンテナ外から 5173 にアクセス不可（最頻出の落とし穴）。
- ホットリロードは Compose Watch が公式推奨だが `docker compose watch` 起動前提。完了条件「`docker compose up` 単体」を満たすため **bind mount を基本線**とする。
- node_modules の host/container 衝突は匿名ボリューム（`- /app/node_modules`）で回避。ただし**この手法は公式 develop ガイドに明示なし＝コミュニティ知識（未確認）**。
- Node 24（Active LTS）/ `node:24-bookworm-slim` / React 19.2.x / Vite 8.x / Express 5.2.1 / Fastify 5.8.5 を確認。
- Node 24 のネイティブ型ストリップ（23.6.0+ デフォルト有効）で backend は `.ts` を `tsc`/`tsx` なしに直接実行可。ただし `enum`・`namespace`・パラメータプロパティ・import エイリアスは非対応、型チェックは別運用。

### スコープ
新規作成: `compose.yaml`（ルート）、`backend/`（プロジェクト一式＋`Dockerfile`＋`.dockerignore`）、`frontend/`（React+Vite scaffold＋`Dockerfile`＋`.dockerignore`）、ルート `README`（起動手順）。既存ソースの改変は発生しない（空 `README.md` への追記のみ）。

### 検討したアプローチ
| アプローチ | 採否 | 理由 |
|-----------|------|------|
| ホットリロード: bind mount | 採用 | 完了条件「`docker compose up` 単体で起動＋反映」を満たす |
| ホットリロード: Compose Watch | 不採用 | 公式推奨だが `docker compose watch` 起動前提で `up` 単体を満たさない（`develop.watch` 追記で将来移行可） |
| backend FW: Express 5 | 採用 | 学習容易性・情報量（学習重視ワークフローの趣旨）。`/health` 静的パスは v5 破壊的変更の影響なし |
| backend FW: Fastify 5 | 不採用 | 性能は同等以上だが今回の最小要件で優位性が出ない |
| backend 実行: Node ネイティブ型ストリップ | 採用 | 追加ツール・ビルド段なしで `.ts` 直実行。dev 環境で型チェック非実行は許容 |
| backend 実行: tsx / tsc ビルド | 不採用 | 依存・ビルド段が増え dev 構成が複雑化 |
| node_modules 保護: 匿名ボリューム | 採用 | bind mount 単独だと host 側が覆い被さる。広く使われる回避策（※公式裏付け未確認） |
| 依存導入: `npm ci` | 採用（フォールバック `npm install`） | lockfile 前提で再現性が高い。scaffold 時に lockfile 生成が必要 |
| DIP 実証: Clock ポート 1 つ | 採用 | 唯一の外部依存（時刻・uptime）を隔離する最小実証。投機的ポート（Repository/Logger）は作らない |
| DB コンテナ | 不採用 | order.md 要件外。後から `services:` 追加可能な構成にする |

### 実装アプローチ
1. **frontend**: 公式 Vite `react-ts` テンプレートで scaffold。`vite.config.ts` に `server: { host: true, port: 5173, strictPort: true }`。`Dockerfile`（`node:24-bookworm-slim`、非 root `node`、`package*.json` 先 COPY→`npm ci`→`COPY . .`、`EXPOSE 5173`、`CMD ["npm","run","dev"]`）と `.dockerignore` を追加。
2. **backend**: クリーンアーキテクチャでディレクトリを構成（下記ガイドライン）。`GET /health` で `{ status:'ok', uptimeSeconds, timestamp }` を 200 で返す。ESM（`"type":"module"`）+ 相対 import は `.ts` 拡張子明記。`scripts.dev = "node --watch src/main.ts"`。型チェック専用 `tsconfig.json`（実行には使わない）。`Dockerfile`・`.dockerignore` 追加（backend は `EXPOSE 3000`）。
3. **compose.yaml**: ルートに作成（`version:` なし）。backend `3000:3000`／frontend `5173:5173`、各々 `./service:/app` の bind mount ＋ `- /app/node_modules` 匿名ボリューム、backend に `PORT=3000`。
4. **README**: `docker compose up --build` / `docker compose down`、動作確認（frontend `http://localhost:5173`、backend `curl http://localhost:3000/health`）、ホットリロード確認、HMR 不調時の `CHOKIDAR_USEPOLLING=true` 補足を記載。

### 到達経路・起動条件
| 項目 | 内容 |
|------|------|
| 利用者が到達する入口 | frontend: `http://localhost:5173`（Vite 初期画面）／ backend: `GET http://localhost:3000/health`。起動入口は `docker compose up --build` |
| 更新が必要な呼び出し元・配線 | なし（新規作成のみ。frontend→backend 連携はスコープ外で配線不要） |
| 起動条件 | 実行環境に Docker / docker compose が導入済みであること |
| 未対応項目 | なし |

## 実装ガイドライ���

### backend ディレクトリ構成（クリーンアーキテクチャ）
```
backend/
├── src/
│   ├── domain/health.ts              # Entities: HealthStatus 型と純粋な組み立て。FW/IO 非依存
│   ├── usecases/ports.ts             # Clock ポート（interface）= DIP の境界
│   ├── usecases/checkHealth.ts       # Use Case: getHealthStatus(deps) → HealthStatus。Express も Date も知らない
│   ├── adapters/http/healthController.ts  # Use Case 実行→res.status(200).json(...) に整形
│   ├── adapters/http/router.ts       # router.get('/health', healthController)
│   ├── infrastructure/systemClock.ts # Clock 実装。new Date()/process.uptime() をここに隔離
│   ├── infrastructure/server.ts      # express() 生成・app.use(router)・listen(PORT)
│   └── main.ts                       # Composition Root: 依存を結線して起動
├── package.json / tsconfig.json / Dockerfile / .dockerignore
```
- **依存方向は外→内の一方向**: `main → infrastructure → adapters → usecases → domain`。内側は外側を import しない。
- **DIP**: `usecases/ports.ts` の `Clock`（`now(): Date` と uptime 取得）を `infrastructure/systemClock.ts` が実装し、`main.ts` で注入。`Date`・`process.uptime()`・Express への依存は infrastructure/adapters に閉じ込める。
- **PORT** は `process.env.PORT ?? 3000`。
- Node 型ストリップ制約: `enum` / ランタイムを伴う `namespace` / パラメータプロパティ / import エイリアスを使わない。`interface`・`type`・通常の `class` のみ。
- ESM + 相対 import は拡張子 `.ts` を明記（例: `import { getHealthStatus } from './usecases/checkHealth.ts'`）。
- dev 起動は `node --watch src/main.ts`。型チェックは `tsconfig.json`（`noEmit`/`allowImportingTsExtensions`）で手動運用とし CMD には含めない。

### frontend
- 公式 `react-ts` テンプレートを温存し、不要な再構造化をしない（App コンポーネント＝Presentation 層）。
- `vite.config.ts` に `server: { host: true, port: 5173, strictPort: true }`。`host: true` は必須。
- `server.watch.usePolling` は常用しない（公式が高 CPU と明記）。bind mount で HMR 不調時のみ `CHOKIDAR_USEPOLLING=true` を最終手段として README 補足。

### Docker
- `compose.yaml` に top-level `version:` を書かない（obsolete 警告）。
- 両 Dockerfile: `FROM node:24-bookworm-slim` / `WORKDIR /app` / `COPY package*.json ./` → `RUN npm ci`（lockfile 前提、フォールバック `npm install`）→ `COPY . .` → `USER node` → `EXPOSE`（backend 3000 / frontend 5173）→ `CMD ["npm","run","dev"]`。
- bind mount により実行時はソースが上書きされるため `COPY . .` はイメージ単体起動時のフォールバック。
- `npm ci` は lockfile 必須のため、scaffold 時に `npm install` で `package-lock.json` を生成すること。
- `.dockerignore`（各サービス）: `node_modules`, `.git`, `dist`, `build`, `*.log`, `npm-debug.log*`, `.env`, `Dockerfile`, `.dockerignore`。

## スコープ外
| 項目 | 除外理由 |
|------|---------|
| DB コンテナ（PostgreSQL 等） | order.md 要件外。後から `services:` 追加可能な構成にとどめる |
| frontend→backend の API 連携・`VITE_API_URL` 等の env 化 | 完了条件は両者独立（frontend は初期画面、backend は `/health` 200）。連携要件なし |
| 認証・権限・本番用マルチステージビルド | order.md は開発用環境のみを要求 |
| テスト基盤・CI | order.md 要件外 |
| backend の実行時型チェック | 型ストリップは型検査しない。`tsconfig` による手動運用にとどめ dev 起動には含めない |

## 確認事項
以下は後続ステップ（implement / test）の実行で解決でき、ユーザー回答は不要（Open Questions は research＋本計画で確定済み）。着手前に一次確認すること:
- **実行環境への Docker / docker compose 導入有無**（`docker compose version`）。本計画段階では sandbox 承認が必要で未実行＝**未確認**。test で `docker compose up` を通すには必須。
- **匿名ボリューム（`- /app/node_modules`）による node_modules 保護の公式裏付けが未確認**のまま採用している点（広く使われる回避策）。
- `@vitejs/plugin-react` の版番号は `react-ts` テンプレート scaffold 出力で確定（事前指定不要）。
- Express 5 の path-to-regexp 破壊的変更は `/health` 静的パスのみ使用のため影響なしと判断（動的ルート不使用）。