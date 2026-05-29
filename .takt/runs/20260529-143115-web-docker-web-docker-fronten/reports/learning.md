# 学習ドキュメント

## 何を作ったか（概要）
`docker compose` で起動する Web アプリ開発用の 2 コンテナ環境を、空のリポジトリ（グリーンフィールド＝既存コードのない新規プロジェクト）から構築した。成果物は次の通り（すべて実ファイルで確認済み）。

- `docker-compose.yml`（ルート）: `backend` / `frontend` の 2 サービスを定義。`version:` は記載なし。
- `backend/`: Node.js + Express 5 + TypeScript。クリーンアーキテクチャで層分割。`GET /health` を 200 で返す。
- `frontend/`: React 19 + Vite 8 + TypeScript（公式 react-ts ベース）。`vite.config.ts` に `server.host: true`。
- 各サービスの `Dockerfile`（`node:24-bookworm-slim`、非 root `node` 実行）と `.dockerignore`、ルートの `README.md`（起動・確認・停止手順）。
- 学習用解説として `docs/LEARNING.md` を作成。

完了条件（order.md）は「`docker compose up` で両コンテナ起動 / frontend は Vite 画面 / backend は `/health` が 200 / ソース編集が反映（ホットリロード）」。

## なぜその実装にしたのか
order.md には未確定の技術選択（Open Questions）が 4 つあり、推測ではなく公式ドキュメント一次情報（research.md）を根拠に planner が確定した。

| 論点 | 決定 | 理由（確認した事実） |
|------|------|------|
| 言語 | TypeScript（両側） | frontend が React+Vite で TS 標準。backend も統一し型の恩恵を得る |
| backend FW | Express 5（`^5.2.1`） | 「最小ヘルスチェック1本」要件に対し学習容易性・情報量で選択。`/health` は静的パスで v5 の path-to-regexp 破壊的変更の影響を受けない |
| DB | 含めない | order.md 要件外。後から `services:` を足せる構成にとどめた |
| Node | Node 24（Active LTS, bookworm-slim） | Vite 8 の Node 要件（20.19+/22.12+）を満たす。Alpine ではなく slim を選好（musl 由来のネイティブモジュール互換問題回避） |
| ホットリロード | bind mount 方式 | 完了条件が「`docker compose up` 単体」。公式推奨の Compose Watch は `docker compose watch` 起動前提のため、`up` 単体で満たす bind mount を基本線にした |

backend は Node 24 のネイティブ型ストリップ（型注釈を実行時に除去して `.ts` を直接実行する機能）を使い、`tsc`/`tsx` のビルド段を持たない（`"dev": "node --watch src/main.ts"`）。トレードオフとして型ストリップは型チェックをしないため、型検査は `"build": "tsc --noEmit"` に分離し dev 起動には含めない。

## 使用した技術
すべて 2026-05-29 時点の公式ドキュメント一次情報。実値は `package.json` / `Dockerfile` で確認。

- backend: `express ^5.2.1`、`@types/node ^24.10.2`、`typescript ^5.9.3`。テストは Node 標準 `node:test`/`node:assert` ＋ `supertest`（外部 FW 不使用）。実行基盤 `node:24-bookworm-slim`。
- frontend: `react ^19.2.3` / `react-dom ^19.2.3`、`vite ^8.0.0`、`@vitejs/plugin-react ^5.1.1`。テストは `vitest ^4.0.14` ＋ `@testing-library/react` ＋ `jsdom`。
- 参照公式ドキュメント（research.md より）: Docker Compose（file-watch / develop spec / version-and-name）、Node.js development with containers、React development with containers、Vite Server Options、Node.js TypeScript（型ストリップ）、Express v5、React versions。

調査で得た落とし穴（実装に反映済み）:
- compose の top-level `version:` は obsolete（書くと警告）→ 記載していない。
- Vite は `server.host: true`（0.0.0.0 で listen）が必須。未設定だとコンテナ外から `:5173` にアクセス不可（最頻出の罠）。実装は `host: true` + `port: 5173` + `strictPort: true`。
- bind mount だけだとホスト側 `node_modules` がコンテナ側を覆い隠す → 匿名ボリューム `- /app/node_modules` で回避（※この手法は Docker 公式 develop ガイドに明示なし＝コミュニティ知識・未確認と research が明記）。
- Vite の `usePolling` は公式が「高 CPU」と明記、常用しない。HMR 不調時の最終手段として README に `CHOKIDAR_USEPOLLING=true` を補足。

## 重要な設計判断
**クリーンアーキテクチャ**（ビジネスロジックを FW・I/O・UI から切り離し、依存方向を外→内の一方向に保つ設計）を backend に適用。実 import を追跡して依存方向を検証した。

層構成（実ファイル）:
- `domain/health.ts`: `HealthStatus` 型と `createHealthStatus`（`uptimeSeconds < 0` を弾く不変条件検証）。何も import しない最内核。
- `usecases/ports.ts`: `RuntimeStatusSource`（`now(): Date` / `uptimeSeconds(): number`）= DIP の境界となるインターフェース。
- `usecases/checkHealth.ts`: `RuntimeStatusSource` を受け取り `HealthStatus` を組み立てる。Express も Date も知らない。
- `adapters/http/`: `router.ts`（`GET /health` 配線）/ `healthController.ts`（usecase 実行 → `res.status(200).json(...)`）。express の型は adapter 層に限定。
- `infrastructure/`: `server.ts`（express 生成・listen）/ `systemRuntimeStatusSource.ts`（`new Date()`・`process.uptime()` をここだけに隔離）/ `port.ts`（`resolvePort`）。
- `main.ts`: Composition Root。`resolvePort(process.env) → createSystemRuntimeStatusSource → createServer → startServer` と結線。

確認結果: 内側が外側を import する逆流は 0 件。

**DIP（依存性逆転）の実証**: 上位（usecase）が具体実装に依存せず、両者が抽象 `RuntimeStatusSource` に依存する。`new Date()`/`process.uptime()` の実体は infrastructure に閉じ込め `main.ts` で注入。テストでは固定時刻を返す偽実装を渡せるため、非決定的な外界に依存せず検証できる。なお plan では「Clock ポート」だったが、uptime も扱うため実装で `RuntimeStatusSource` に改名された（名前が責務を表す好例）。

**採用したトレードオフ**:
- 投機的ポート（Repository/Logger）を作らず、唯一の外部依存（時刻・uptime）だけを隔離（YAGNI）。
- DB・認証・本番マルチステージビルド・CI は order.md 要件外として対象外。後から `services:` を足せる形にとどめた。
- 型チェックを dev 起動から外し、起動速度と構成の単純さを優先。

**review をまたいだ改善**: 初版はポート解決ロジックが `main.ts` の副作用に埋め込まれテスト不能だった（review iteration 1 のブロッキング指摘）。`infrastructure/port.ts` に `resolvePort(env: NodeJS.ProcessEnv): number` を純粋関数として抽出し、`process.env` を引数注入する形にしたことで、`port.test.ts`（正常 / 未定義 / 非数値 / 非整数 / 末尾文字混入 / 0・負 の 6 ケース）でテスト可能になった。「テストしづらいは設計の臭い」という教訓。

**計画との差分（再現時の注意・正直に記録）**:
1. compose ファイル名は推奨 `compose.yaml` ではなく実際は `docker-compose.yml`（レガシー名）。`docker compose config` は EXIT 0。経緯は未確認だが推奨名でも動作する。
2. ポート解決は plan の `process.env.PORT ?? 3000` フォールバックから fail-fast（未設定・不正値で例外）に変更。`docker-compose.yml` の backend で `environment: PORT: "3000"` を必ず渡す前提。
3. test は `--experimental-strip-types`（Node 22.6+）を明示。ローカル Node 20 では `npm test` 起動不能（EXIT 9・環境起因）。Node 24 環境では backend 13 件 pass / 0 fail、frontend 1 件 pass、型チェック・frontend ビルド・`docker compose config` すべて成功。`docker compose up` の実起動・ブラウザ表示・実 HMR は本ワークフロー内では未確認。

## 今後学ぶべき内容
1. **Compose Watch（`develop.watch`）への移行**: 公式推奨の `sync`/`rebuild`、`node_modules` 衝突回避を匿名ボリュームから `ignore` ベースへ。匿名ボリューム手法の公式裏付け（未確認）も自分で検証する。
2. **frontend → backend 連携**: `VITE_API_URL` の env 化、サービス名 DNS（`http://backend:3000`）通信、CORS。
3. **本番用マルチステージビルド**: dev 専用構成から build ステージ + 軽量 runtime ステージへ（frontend 静的配信、backend 型チェック込みビルド）。
4. **クリーンアーキテクチャの拡張**: 実データを扱う Repository ポートを追加し DIP の境界を時刻以外へ拡大。test double の作り方も併せて。
5. **型安全の強化**: 型ストリップは型検査しないため CI で `tsc --noEmit` を必須化。Express 5 の path-to-regexp 破壊的変更も動的ルート導入時に再確認。
6. **lint / format 基盤**: 現状ゼロ。ESLint（または Biome）+ Prettier を導入し `lint` スクリプトを追加。
7. **HTTP の堅牢化**: graceful shutdown（SIGTERM で `server.close()`）、readiness/liveness 分離、エラーハンドリングミドルウェア。