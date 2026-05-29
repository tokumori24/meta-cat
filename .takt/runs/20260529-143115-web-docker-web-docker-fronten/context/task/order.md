# タスク指示書: Web アプリ開発用 Docker 環境の構築

## 概要
Web アプリ開発のための開発用 Docker 環境を構築する。frontend / backend の 2 コンテナ構成を作成し、`docker compose` で起動できる状態まで実装する。

## 確定要件（ユーザー明示）
- 開発用の Docker 環境を作成する
- frontend: **React + Vite**
- backend: **Node.js**

## 作業内容

### 優先度: 高
| 対象 | 作業内容 |
|------|---------|
| `docker-compose.yml`（リポジトリルート） | frontend / backend の 2 サービスを定義する開発用 compose を作成。ポート公開、ソース変更を反映する volume マウント、ホットリロードが効く構成にする |
| `backend/Dockerfile`（開発用） | Node.js ベースの開発用 Dockerfile を作成。依存インストール・開発サーバ起動まで通す |
| `frontend/Dockerfile`（開発用） | React + Vite の開発用 Dockerfile を作成。Vite dev server をコンテナ外から参照可能にする（`--host` 等のバインド設定を含む） |
| `backend/` プロジェクト | Node.js の backend プロジェクトを初期化し、起動確認用の最小エンドポイント（ヘルスチェック等）を 1 つ実装 |
| `frontend/` プロジェクト | React + Vite プロジェクトを初期化し、初期テンプレートが起動する状態にする |

### 優先度: 中
| 対象 | 作業内容 |
|------|---------|
| `.dockerignore`（各サービス） | `node_modules` 等をビルドコンテキストから除外 |
| `README` または起動手順 | コンテナの起動・停止コマンドと動作確認手順を記載 |

## 確認方法 / 完了条件
- `docker compose up` で frontend / backend 両コンテナが起動する
- frontend: ブラウザで Vite 初期画面が表示される
- backend: 起動確認用エンドポイントが HTTP 200 を返す
- ローカルのソース編集がコンテナに反映される（ホットリロードが動作する）

## やらないこと（ユーザー明示の範囲）
- （ユーザーから明示された除外事項はなし）

## Open Questions（技術的な未確定点）
以下は会話で確定していないため、researcher の調査結果とベストプラクティスに基づき planner が方針を決定すること。決定はレポートに根拠付きで明記する。

1. **言語**: TypeScript か JavaScript か（React+Vite と統一する場合 TypeScript が候補）
2. **backend フレームワーク**: 素の Node.js / Express / Fastify など、どれを採用するか
3. **DB コンテナ**: 今回の環境に DB（PostgreSQL 等）を含めるか、後続対応とするか
4. **Node.js / 各イメージのバージョン**: 採用する LTS / ベースイメージのタグ

---

この指示書を learning-dev ワークフロー（調査 → 設計 → 実装）に投入してよろしいでしょうか。Open Questions について先に方針を確定したい場合はお知らせください。確定不要であれば、調査結果に基づき各エージェントが決定して進めます。