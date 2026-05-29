# テスト・検証レポート

## 検証対象
implement 2回目の変更（`resolvePort` 抽出と単体テスト追加）を含む実装一式。本ステップは検証担当（編集禁止）のため、新規テストの作成は行っていない。

## 検証対象テスト
| ファイル | 種別 | テスト数 | 概要 |
|---------|------|---------|------|
| `backend/test/infrastructure/port.test.ts` | 単体 | 6 | 今回追加。`resolvePort` の正常系/未定義/非数値/非整数/末尾文字混入/0以下を検証 |
| backend 既存テスト一式 | 単体/統合 | 7 | health controller, http router, createServer, startServer, runtime status source, checkHealth, createHealthStatus |
| `frontend/src/App.test.tsx` | 単体 | 1 | 既存 frontend テスト |

## 実行環境
- ローカル: Node `v20.20.0` / npm `10.8.2`
- 想定実行環境: Node 24（両 Dockerfile・`@types/node ^24`）。検証用に `node:24-bookworm-slim`（実体 `v24.16.0`）で実行
- Docker: `24.0.7`

## 実行結果サマリ

| 項目 | 対象 | コマンド | ローカル(Node20) | 想定環境(Node24) |
|------|------|---------|------------------|-------------------|
| ビルド/型チェック | backend | `npm --prefix backend run build`（`tsc --noEmit`） | ✅ EXIT 0 | — |
| テスト | backend | `npm --prefix backend test`（`node --test --experimental-strip-types`） | ❌ EXIT 9（起動不能） | ✅ 13 pass / 0 fail |
| ビルド | frontend | `npm --prefix frontend run build`（`tsc -b && vite build`） | ✅ EXIT 0 | 未実施 |
| テスト | frontend | `npm --prefix frontend test`（`vitest run`） | ✅ 1 pass / EXIT 0 | 未実施 |
| lint | 両プロジェクト | （スクリプト・設定なし） | ⚠️ 未実施 | — |
| compose 構成 | ルート | `docker compose config` | ✅ EXIT 0 | — |

## 詳細

### ✅ backend ビルド（型チェック）
`tsc --noEmit` がローカルで EXIT 0。新規 `port.ts` / `port.test.ts` を含めて型エラーなし。

### ✅ backend テスト（想定環境 Node24）
`node:24-bookworm-slim`（v24.16.0）で全 **13 件 pass / 0 fail / 0 skipped**。今回追加の `resolvePort` テスト6件すべて pass：
- `resolvePort returns a configured positive integer port`
- `resolvePort rejects a missing port`
- `resolvePort rejects a non-numeric port`
- `resolvePort rejects a non-integer numeric port`
- `resolvePort rejects a port with trailing text`
- `resolvePort rejects zero and negative ports`

`resolvePort(env)` は `process.env` を引数注入する純粋関数で、再現性・独立性あり。Given-When-Then 相当の構造。

### ❌ backend テスト（ローカル Node20）— 環境起因
- 再現コマンド: `npm --prefix backend test`
- 出力: `node: bad option: --experimental-strip-types`（EXIT 9）
- 該当箇所: `backend/package.json:9` — `"test": "node --test --experimental-strip-types \"test/**/*.test.ts\""`
- 原因（事実）: `--experimental-strip-types` は Node 22.6+ のフラグ。ローカル Node `v20.20.0` には存在せず起動拒否。前回レポートと同一事象であり、今回の変更による退行ではない。テストロジック起因の失敗ではなく実行環境起因。

### ✅ frontend ビルド
`tsc -b && vite build`（vite `v8.0.14`）EXIT 0。17 modules 変換、`dist/` 生成を確認。

### ✅ frontend テスト
`vitest run`（`v4.1.7`）EXIT 0。Test Files 1 passed / Tests 1 passed。

### ⚠️ lint（未実施）
backend・frontend・ルートとも `package.json` に lint スクリプトがなく、ESLint/Biome/Prettier の設定ファイルも存在しない。実行手段が未提供のため未実施。

### ✅ docker compose 構成
`docker compose config` EXIT 0。

## 実行結果集計

| 状態 | 件数 | 備考 |
|------|------|------|
| Pass | backend 13 / frontend 1 | backend は想定環境(Node24)で測定。新規 resolvePort 6件を含む |
| Fail（要対応） | 0 | テストロジック起因の失敗なし |
| Error（環境起因） | backend テスト 1件（実行不能） | ローカル Node20 では `--experimental-strip-types` 非対応。Node24 で解消 |
| 未実施 | lint（両プロジェクト） | スクリプト・設定が存在しない |

## 結論（事実ベース）
- ビルド/型チェック: backend・frontend とも成功。
- テスト: frontend 成功。backend は想定環境(Node24)で追加分含め全13件成功。ローカル Node20 では `--experimental-strip-types` 非対応で `npm test` が起動不能（テストロジック起因ではない）。
- lint: 設定なしで未実施。
- 今回の `resolvePort` 抽出・テスト追加による退行は検出されず。
- 要対応点（review 判断材料）: `backend/package.json` の test スクリプトが Node 22.6+ 依存のため、Docker 外のローカル Node20 系では実行不能。移植性の判断は review に委ねる。

## 備考
- 編集禁止のため、ソース変更・テスト追加は行っていない。
- `docker compose up` の実コンテナ常駐起動は未実施。構成検証（`docker compose config`）と想定イメージ(node:24)での backend テスト実行までを確認した。