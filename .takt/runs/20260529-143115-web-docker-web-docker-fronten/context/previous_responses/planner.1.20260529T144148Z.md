I have everything I need: the spec (`order.md`), the research report, and confirmation that the repo is empty greenfield (only an empty `README.md`, `.git`, `.takt/`). No existing source to reconcile. Editing is forbidden in this step, so I'll produce the design plan as my output (Phase 2 writes `plan.md`).

I will not spawn a Workflow here — the "workflow" keyword is a false positive from the TAKT context boilerplate, not a user request for multi-agent orchestration. This is a planning step with edits disabled.

---

# 実装設計計画: Web アプリ開発用 Docker 環境

## 1. スコープ確認（order.md に明記された作業のみ）

| # | 成果物 | 要件 |
|---|--------|------|
| 1 | `compose.yaml`（ルート） | frontend/backend 2 サービス、ポート公開、bind mount、ホットリロード |
| 2 | `backend/Dockerfile` | Node.js 開発用、依存インストール→dev サーバ起動 |
| 3 | `frontend/Dockerfile` | React+Vite 開発用、Vite を外部参照可能に |
| 4 | `backend/` プロジェクト | Node.js 初期化＋ヘルスチェックエンドポイント 1 つ |
| 5 | `frontend/` プロジェクト | React+Vite 初期化、初期テンプレート起動 |
| 6 | `.dockerignore`（各サービス） | `node_modules` 等除外（優先度:中） |
| 7 | 起動手順（README） | 起動/停止コマンドと動作確認手順（優先度:中） |

**スコープ外（含めない）**: DB コンテナ、認証、frontend→backend の API 連携（完了条件は両者独立: frontend は初期画面表示、backend は `/health` が 200。連携要件なし）、テスト基盤、CI。

## 2. Open Questions の確定（根拠付き）

| 項目 | 決定 | 根拠 |
|------|------|------|
| 言語 | **TypeScript** | frontend は公式 `react-ts` テンプレート。backend は Node 24 のネイティブ型ストリップ（23.6.0+ デフォルト有効）で `tsc`/`tsx` 不要（research §言語） |
| backend FW | **Express 5（`^5`）** | 学習容易性・情報量で第一候補（research §backend）。`/health` 静的パスは path-to-regexp 破壊的変更の影響を受けない |
| DB | **含めない（スコープ外）** | order.md 要件外。後から `services:` 追加可能な構成にする |
| バージョン | **Node 24 / `node:24-bookworm-slim`** | Active LTS（Krypton）、Vite 8 の Node 要件（20.19+/22.12+）充足、slim で musl 互換問題回避（research §ベースイメージ） |
| ホットリロード方式 | **bind mount を基本線**（Compose Watch は不採用） | 完了条件が「`docker compose up` で起動＋反映」。Compose Watch は `docker compose watch` 起動前提で `up` 単体を満たさない（research 引き継ぎ #2） |

## 3. クリーンアーキテクチャ設計（backend）

ヘルスチェック 1 本でも、層の責務と依存方向を明示する。**依存は外→内の一方向**、内側は外側を一切 import しない。

### ディレクトリ構成
```
backend/
├── src/
│   ├── domain/
│   │   └── health.ts          # Entities: HealthStatus 型と純粋な生成ロジック
│   ├── usecases/
│   │   ├── ports.ts           # Clock ポート（インターフェース）= DIP の境界
│   │   └── checkHealth.ts     # Use Case: getHealthStatus(clock) → HealthStatus
│   ├── adapters/
│   │   └── http/
│   │       ├── healthController.ts  # Use Case 実行→HTTP レスポンス整形
│   │       └── router.ts            # ルート定義（GET /health）
│   ├── infrastructure/
│   │   ├── systemClock.ts     # Clock ポートの実装（Date 依存をここに隔離）
│   │   └── server.ts          # Express app 構築・listen
│   └── main.ts                # Composition Root: 依存を結線して起動
├── package.json
├── tsconfig.json              # 型チェック用（tsc --noEmit）。実行は Node 直接
├── Dockerfile
└── .dockerignore
```

### 層の責務と依存方向
```
main.ts ─→ infrastructure ─→ adapters ─→ usecases ─→ domain
(外側) ────────────────────────────────────────→ (内側)
            └ systemClock が usecases/ports.ts の Clock を実装（依存性逆転）
```

- **domain/health.ts（Entities）**: `HealthStatus = { status: 'ok'; uptimeSeconds: number; timestamp: string }`。フレームワーク・IO 非依存の純粋な型と組み立て関数のみ。
- **usecases/ports.ts**: `interface Clock { now(): Date }`。ユースケースが必要とする抽象を内側で宣言（DIP の核）。
- **usecases/checkHealth.ts**: `getHealthStatus(clock: Clock): HealthStatus`。`process.uptime()` のような Node 直接依存も避け、必要な外部値はポート経由で受け取る（uptime もポートに含めるか、main で注入。実装時は Clock に `uptimeSeconds()` を足すか別ポートにするかを 1 ポートで簡潔に）。Express も Date も知らない。
- **adapters/http/healthController.ts**: ユースケースを呼び、結果を `res.status(200).json(...)` に整形。Express の `Request/Response` 型に依存してよい（外側）。
- **adapters/http/router.ts**: `router.get('/health', healthController)`。
- **infrastructure/systemClock.ts**: `Clock` 実装。`new Date()` / `process.uptime()` をここだけに閉じ込める。
- **infrastructure/server.ts**: `express()` 生成、`app.use(router)`、`listen(PORT)`。`PORT` は `process.env.PORT ?? 3000`。
- **main.ts**: `systemClock` を生成→controller/usecase に注入→server 起動（合成ルート）。

### DIP に関するトレードオフ（自己レビューで詳述）
Clock ポート 1 つだけ導入し、`Date`/`process.uptime()` という IO・ランタイム依存を `infrastructure` に隔離する。これは「指示で必須化された DIP の最小実証」であり、ヘルス値（時刻・uptime）が唯一の外部依存であるため過剰抽象ではない。Repository やロガー等の投機的ポートは作らない（スコープ規律）。

### Node ネイティブ型ストリップの制約（実装ガイドライン）
- **`enum` / `namespace`（ランタイム生成を伴うもの）/ パラメータプロパティ / import エイリアスを使わない**（型ストリップ非対応。research §注意点）。`interface`・`type`・通常の `class` のみ。
- **ESM（`"type": "module"`）+ 相対 import は拡張子 `.ts` を明記**（例: `import { getHealthStatus } from './usecases/checkHealth.ts'`）。Node の ESM 解決要件。
- dev 起動コマンド: **`node --watch src/main.ts`**（標準 watch でホットリロード、nodemon 不要）。`package.json` の `scripts.dev` に設定。
- `tsconfig.json` は **型チェック専用**（`noEmit`, `allowImportingTsExtensions`, `module: nodenext` 系）。実行時には使わない。型検査はスコープ外の手動運用とし CMD には含めない。

## 4. frontend 設計

完了条件は「初期テンプレートが起動・初期画面表示」のみ（backend 連携なし）。**公式 `react-ts` テンプレートをそのまま採用**し、過剰な構造化はしない（スコープ規律）。

```
frontend/
├── src/                 # Vite react-ts テンプレート（App.tsx 等 = Presentation 層）
├── index.html
├── package.json
├── vite.config.ts       # server.host を含む（下記）
├── tsconfig*.json        # テンプレート同梱
├── Dockerfile
└── .dockerignore
```

`vite.config.ts`（research §frontend / 引き継ぎ #3）:
```ts
server: { host: true, port: 5173, strictPort: true }
```
- `host: true`（0.0.0.0）が**必須**。未設定だとコンテナ外から 5173 にアクセス不可（最頻出の落とし穴）。
- dev スクリプトは `vite`（config で host 指定）。Dockerfile 側で冗長に `--host` を付けてもよいが config で一元化する。
- `server.watch.usePolling` は**常用しない**（公式が高 CPU と明記）。bind mount で HMR が効かない場合のみ `CHOKIDAR_USEPOLLING=true` を最終手段として README に補足。

frontend は backend を呼ばないため、API base URL の env 化（research 引き継ぎ #7）は**今回スコープ外**（将来連携時に `VITE_API_URL` を導入）。

## 5. Docker 設計

### `compose.yaml`（ルート、`version:` を書かない — obsolete 警告回避）
```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
    volumes:
      - ./backend:/app
      - /app/node_modules        # 匿名ボリュームで host の覆い被さりを防ぐ
    environment:
      - PORT=3000
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    volumes:
      - ./frontend:/app
      - /app/node_modules
```
- **ホットリロード**: bind mount（`./service:/app`）でホスト編集をコンテナに反映。`docker compose up` 単体で完了条件を満たす。
- **node_modules 衝突対策**: 匿名ボリューム `- /app/node_modules` でコンテナ内 `node_modules` を保護。**※この手法は Docker 公式 develop ガイドに明示がなくコミュニティ知識（research §注意点・未確認）**。実装ガイドラインとして採用するが、レポートに「公式裏付け未確認」を明記。
- サービス間通信はサービス名 DNS（今回未使用だが将来 frontend→`http://backend:3000`）。

### Dockerfile（両サービス共通方針）
ベース `node:24-bookworm-slim`、**非 root（`node`）ユーザ実行**、レイヤキャッシュのため `package*.json` を先に COPY。
```dockerfile
FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci          # lockfile 前提・再現性重視（フォールバック: npm install）
COPY . .
USER node
EXPOSE 3000         # frontend は 5173
CMD ["npm", "run", "dev"]
```
- `npm ci` は **lockfile（`package-lock.json`）必須**。greenfield のため **implement ステップが scaffold 時に `npm install` で lockfile を生成・コミット対象に含める**こと。lockfile を生成できない場合のフォールバックは `npm install`（research §Dockerfile）。
- backend `CMD`: `npm run dev`（=`node --watch src/main.ts`）。frontend `CMD`: `npm run dev`（=`vite`、host は config）。
- bind mount により実行時はソースが上書きされるため、Dockerfile 内 `COPY . .` はイメージ単体起動時のフォールバック。

### `.dockerignore`（各サービス）
`node_modules`, `.git`, `dist`, `build`, `*.log`, `npm-debug.log*`, `.env`, `Dockerfile`, `.dockerignore`。

## 6. README / 起動手順（優先度:中）
ルート README に記載: 前提（Docker / docker compose）、`docker compose up --build`、停止 `docker compose down`、動作確認（frontend: `http://localhost:5173` で Vite 初期画面 / backend: `curl http://localhost:3000/health` が 200）、ホットリロード確認手順、HMR が効かない場合の `CHOKIDAR_USEPOLLING` 補足。

## 7. 実装ステップ着手前の確認事項（implement / test 向け）
コードで確認不能・実行環境依存のため、後続ステップが着手前に一次確認すること:
1. **Docker / docker compose の導入有無**（`docker compose version`）。本ステップは sandbox 承認が必要で未実行＝**未確認**。test ステップで `docker compose up` まで通すには必須。
2. `@vitejs/plugin-react` の版番号 — `react-ts` テンプレート scaffold 出力で確定（事前指定不要）。
3. 匿名ボリューム手法の公式裏付け — **未確認**のまま採用（上記明記）。
4. Express 5 path-to-regexp 破壊差分 — `/health` 静的パスのみ使用のため影響なしと判断（動的ルート不使用）。

> 確認事項はいずれもユーザー回答ではなく後続ステップの実行で解決できるため、**ユーザーへの確認質問は不要**（Open Questions は research＋本計画で確定済み）。

---

## 8. 自己レビュー（設計・品質・保守性）

### 採用した判断とトレードオフ
- **Clock ポートによる DIP 実証 vs 過剰抽象**: ヘルスチェック単体なら `Date`/`process.uptime()` 直書きが最短。しかし指示で DIP 遵守が必須。唯一の外部依存（時刻・uptime）を 1 ポートに隔離する形に留め、Repository/Logger 等の投機ポートは作らない。**結論**: 必須要件を満たす最小実証。仮に DIP 必須でなければ Clock も省略する設計だった点を明記。
- **bind mount vs Compose Watch**: Compose Watch が公式の現代的推奨だが、完了条件「`docker compose up` 単体」を満たさない。**保守性より要件適合を優先**し bind mount を採用。Watch への移行余地は残る（`develop.watch` 追記のみ）。
- **匿名ボリューム（公式裏付け未確認）**: bind mount だけだと host の `node_modules` 欠如/不整合がコンテナを壊す。広く使われる匿名ボリュームで回避するが、公式 develop ガイドに明示がない＝コミュニティ知識である点をリスクとして残す。
- **Node ネイティブ型ストリップ vs tsx/tsc ビルド**: 追加ツール・ビルド段なしで `.ts` 直実行でき開発体験が単純。代償は型チェックが実行時に走らない・enum 等の構文制約。dev 環境では許容（型検査は別運用）。
- **Express 5 vs Fastify 5**: 性能では Fastify が同等以上だが、学習容易性・情報量で Express を採用（学習重視ワークフローの趣旨に合致）。静的 `/health` のみのため v5 破壊的変更の影響なし。
- **npm ci vs npm install**: 再現性で `npm ci`（lockfile 必須）。greenfield では scaffold 時の lockfile 生成が前提となる依存があるため、フォールバックを明記。

### 構造・保守性の確認
- **層の責務分離**: domain（純粋）/ usecases（アプリ規則＋ポート）/ adapters（HTTP 変換）/ infrastructure（Express・Date・listen）が分離。依存は外→内の一方向、内側は外側を import しない。
- **高凝集・低結合**: HTTP 関連は `adapters/http/` に集約、IO（Date/uptime/listen）は `infrastructure/` に隔離。循環依存なし。
- **ファイルサイズ**: 各ファイル数十行で 200 行基準を大きく下回る。分割過多のリスクはあるが、層境界の明確化を優先（学習重視ワークフローの趣旨）。
- **スコープ規律**: DB・API 連携・認証・テスト・env 化は order.md 範囲外として除外。frontend は公式テンプレートを温存し不要な再構造化をしない。

### 既知のリスク（未確認＝後続で要検証）
Docker 導入有無（最大リスク／test で要確認）、匿名ボリュームの公式裏付け、型ストリップのデフォルト挙動が Node 24 の当該マイナーで有効であること。いずれも本計画に明記済み。