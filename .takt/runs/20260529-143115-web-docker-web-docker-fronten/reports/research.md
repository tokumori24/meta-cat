# 技術調査レポート

## 調査対象と前提
- **タスク**: Web アプリ開発用 Docker 環境の新規構築（`context/task/order.md`）。frontend(React+Vite) / backend(Node.js) の 2 コンテナを `docker compose` で起動可能にする。
- **リポジトリ状態**: グリーンフィールド（空の `README.md` と `.takt/` のみ）。既存ソースなし。
- **調査範囲**: ① Docker Compose 開発構成、② Node.js バージョン/ベースイメージ、③ Node ネイティブ TypeScript 実行、④ 採用ライブラリ版、⑤ backend フレームワーク、⑥ React+Vite の Docker 構成、⑦ 開発用 Dockerfile、⑧ `.dockerignore`。
- **調査日**: 2026-05-29。公式ドキュメントを一次情報として優先。未確認点は明記。
- **確認できたバージョン（2026-05 時点・一次情報）**: Node.js v24（Krypton, Active LTS）/ React 19.2.x / Vite 8.x（Node 20.19+ または 22.12+ 必須）/ Express 5.2.1（v5 GA）/ Fastify 5.8.5。

## 参照した公式ドキュメント
- Use Compose Watch — https://docs.docker.com/compose/how-tos/file-watch/
- Compose Develop Specification — https://docs.docker.com/reference/compose-file/develop/
- Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Node.js development with containers — https://docs.docker.com/guides/nodejs/develop/
- Containerize a Node.js application — https://docs.docker.com/guides/nodejs/containerize/
- React.js development with containers — https://docs.docker.com/guides/reactjs/develop/
- Vite Server Options — https://vite.dev/config/server-options
- Vite Guide / Troubleshooting — https://vite.dev/guide/ ／ https://vite.dev/guide/troubleshooting
- Node.js Releases / Release Schedule — https://nodejs.org/en/about/previous-releases ／ https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
- Node.js Modules: TypeScript — https://nodejs.org/api/typescript.html ／ https://nodejs.org/learn/typescript/run-natively
- React Versions — https://react.dev/versions ／ https://react.dev/blog/2025/10/01/react-19-2
- Express v5 — https://expressjs.com/2024/10/15/v5-release.html ／ https://www.npmjs.com/package/express
- Fastify — https://fastify.dev/docs/latest/Reference/TypeScript/ ／ https://www.npmjs.com/package/fastify

## 推奨する実装パターン／ベストプラクティス

### Docker Compose
- **top-level `version:` を書かない**。公式記載（verbatim）: *"The top-level `version` property is defined by the Compose Specification for backward compatibility. It is only informative and you'll receive a warning message that it is obsolete if used."* → ファイル名は `compose.yaml`（推奨名）に `services:` を直接定義。
- ホットリロードは公式が推す **Compose Watch（`develop.watch`）** が現代的選択。アクション: `sync`（HMR 対応向け）/ `rebuild`（`package.json` 変更など）/ `sync+restart`（設定変更, Compose 2.23.0+）/ `sync+exec`（2.32.0+, ※版番号は検索由来で本文未確認）。React 公式例:
  ```yaml
  react-dev:
    ports: ["5173:5173"]
    develop:
      watch:
        - action: sync
          path: .
          target: /app
  ```
- サービス間通信はサービス名 DNS（例: frontend → `http://backend:3000`）。ポート公開は frontend `5173:5173` / backend `3000:3000`。

### Node.js / ベースイメージ
- **Node 24（Active LTS, Krypton）を採用**（30 か月のクリティカル修正保証）。タグは **`node:24-bookworm-slim`** 推奨（Alpine は musl 由来のネイティブモジュール互換問題を避けるため slim を選好）。Vite 8 の Node 要件（20.19+/22.12+）も Node 24 で充足。

### 言語（TypeScript）
- frontend は公式 `react-ts` テンプレート。backend は **Node 24 のネイティブ型ストリップ（v24.12.0 で stable、23.6.0 以降デフォルト有効）** により `tsc`/`tsx` なしで `.ts` を直接実行可（型チェックは行わない点に留意）。

### backend フレームワーク
- 「最小ヘルスチェック 1 エンドポイント」要件に対し、学習容易性・情報量から **Express 5（5.2.1, GA 済み）を第一候補**。性能・スキーマ駆動・TS 親和性重視なら **Fastify 5（5.8.5, Node 20+）** も同等以上に妥当。`GET /health → 200` は両者数行で実装可。

### frontend（React + Vite）
- **`server.host: true`（=0.0.0.0）必須**（コンテナ外公開）。加えて React 公式 Docker ガイド準拠で `port: 5173` + `strictPort: true`。
  ```ts
  server: { host: true, port: 5173, strictPort: true }
  ```
  または dev スクリプトを `vite --host` に。

### 開発用 Dockerfile
- `package*.json` を先に COPY → `npm ci` → ソース COPY（レイヤキャッシュ）。**非 root（`node`）ユーザ実行**。開発監視は Node 標準 `--watch` または nodemon。`npm ci` は lockfile 必須・再現性が高く推奨。
- 各サービスに `.dockerignore` を置き `node_modules` / `.git` / `dist` / `*.log` / `.env` を除外。

## 注意点（非推奨 API・落とし穴・バージョン差異）
- **`docker compose up` と Compose Watch の不一致**: order.md の完了条件は「`docker compose up` で起動」「ソース編集が反映」。Compose Watch は `docker compose watch`（または `up --watch`）起動が前提のため、**`up` 単体で要件を満たすには bind mount 方式を基本線**にし、Watch は補助に位置づけるのが安全（planner が最終決定）。
- **Vite の `server.host` 未設定**: コンテナ内 localhost のみ listen となり、ホストから 5173 へアクセス不可（最頻出の落とし穴）。
- **node_modules の host/container 衝突**: bind mount のみだとホスト側 `node_modules` がコンテナ側を覆い隠す。Compose Watch の `ignore: [node_modules/]`、または匿名ボリューム（`- /app/node_modules`）で回避。※**匿名ボリューム手法は Docker 公式 develop ガイド抜粋に明示なし＝コミュニティ知識（未確認）**。
- **Vite の `usePolling`**: Docker/WSL2 でファイル監視が効かない場合 `server.watch.usePolling: true`（または `CHOKIDAR_USEPOLLING=true`）で回避できるが、公式が *"leads to high CPU utilization"* と明記。常用しない。
- **Node バージョン**: v20 は 2026-03 EOL、v22 も Maintenance 入りのため新規は v24。古い Node イメージだと Vite 8 が起動失敗。
- **Express 5 の破壊的変更**: `path-to-regexp` 更新によりルート文字列の正規表現/ワイルドカード記法が一部非互換。Express 4 前提のサンプル流用は壊れうる。※具体差分は移行ガイド本文**未確認**。
- **型ストリップの制限**: `enum`・parameter properties・ランタイムを伴う `namespace`・import alias は型ストリップ単体では非対応。型検査は別途 `tsc --noEmit` 等が必要。

## 設計者への引き継ぎ事項
1. **`version:` を書かない**（obsolete・警告）。`compose.yaml` に `services:` 直書き。
2. **ホットリロード方式の決定が要件と直結**。完了条件「`docker compose up`＋ソース反映」を満たすため bind mount 方式を基本線とし、Compose Watch は補助。判断と根拠をレポートに明記すること。
3. **Vite は `server.host: true` 必須**＋`strictPort: true`。
4. **node_modules 衝突対策**を方式に応じて選定（Watch の ignore / 匿名ボリューム）。匿名ボリュームを採る場合は公式裏付けが未確認である旨を踏まえる。
5. **Node 24 + `node:24-bookworm-slim`**、TypeScript 採用（frontend `react-ts` / backend ネイティブ型ストリップ、型チェックは別途）。
6. **DB は今回スコープ外**（order.md 要件外）。後から service 追加できる構成に。
7. **サービス間は service 名 DNS**。frontend の API 向き先は環境変数化を推奨。

### 未確認事項（着手前に一次確認を推奨）
- `@vitejs/plugin-react` の正確な最新版番号（npm 未取得）。
- 匿名ボリュームによる `node_modules` 保護の公式裏付け。
- `node:*-alpine` vs `-slim` の Docker 公式/Docker Hub 明示記述（`_/node` ページ未取得）。
- Compose Watch `sync+exec` の最小対応バージョン（file-watch 本文での裏付け未取得）。
- Express 5 の path-to-regexp 破壊的変更の具体差分（v5 移行ガイド本文未取得）。
- Node 22 の正確な EOL 日付（取得ページ表記が曖昧）。
- **実行環境への Docker / docker compose 導入有無**（`docker --version` はサンドボックス承認が必要で本ステップ未実行＝未確認）。