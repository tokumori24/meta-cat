全ファイルと事実確認を完了しました。レビュー結果を報告します。

---

# コードレビューレポート（review ステップ）

## 総合判定: **REJECT（差し戻し）**

クリーンアーキテクチャの層分離・依存方向は非常に良く守られており、設計の骨格は高品質です。ただしポリシーの REJECT 基準「テストがない新しい振る舞い」に該当する箇所が 1 件あり、加えて完了条件に関わる未検証リスクがあるため差し戻します。

---

## 良い点（事実ベース）

- **依存方向が内向き一方向**で徹底されている。`domain/health.ts`（無依存）← `usecases/`（domain のみ依存）← `adapters/http/`（usecases 依存）← `infrastructure/`（adapters/usecases 依存）← `main.ts`（合成ルート）。外側→内側の一方向で、逆流なし。
- **依存性逆転（DIP）が正しい**。`usecases/ports.ts` に `RuntimeStatusSource` ポートを定義し、`infrastructure/systemRuntimeStatusSource.ts` が実装。usecase は `Date`/`process.uptime()` を直接触らずポート経由（`checkHealth.ts`）。テストもこの注入を活用して時刻を固定（`checkHealth.test.ts:8-10`）。
- **エンティティの不変条件を検証**：`createHealthStatus` が `uptimeSeconds < 0` で throw（`health.ts:10-12`）し、専用テストあり（`health.test.ts`）。
- **定数を層ごとに分離**：`HEALTH_ROUTE_PATH`（adapters）、`PORT_ENV_VAR`（infrastructure）、`ROOT_ELEMENT_ID`（frontend）。マジック値の散在なし。
- `tsconfig.json` の `strict` + `erasableSyntaxOnly` により Node の type-stripping と整合。`any` 不使用、フォールバック濫用・空 catch・TODO 残骸なし。
- compose のポート整合が取れている：backend `PORT=3000`/`EXPOSE 3000`/`3000:3000`、frontend vite `port:5173 strictPort host:true`/`EXPOSE 5173`/`5173:5173`。`host:true` で 0.0.0.0 バインド＝コンテナ外参照可（仕様の `--host` 要件を満たす）。
- `*.tsbuildinfo` はルート `.gitignore` で除外確認済（`git check-ignore` exit 0）。生成物がコミット対象に混入しない。

---

## must（要修正・ブロッキング）

### 1. `main.ts` のポート解決ロジックが未テスト（テストのない新しい振る舞い）

**根拠**（`backend/src/main.ts:5-15`）:
```ts
const portText = process.env[PORT_ENV_VAR];
if (portText === undefined) { throw new Error(...required); }
const port = Number.parseInt(portText, 10);
if (!Number.isInteger(port) || port <= 0) { throw new Error(...positive integer); }
```
- `backend/test/` 全 6 ファイルを検索したが、`main.ts` / `PORT_ENV_VAR` / `parseInt` を参照するテストは**ゼロ**（grep 結果 No matches）。
- これは「未定義」「非整数」「0 以下」の 3 つのエラー分岐を持つ**振る舞い**であり、ポリシーの REJECT 基準「テストがない新しい振る舞い」に該当する。
- 他の層は徹底的にテスト可能な純粋関数へ分離されているのに、このバリデーションだけがトップレベル副作用（`startServer` を import 時に実行）に埋め込まれ、テスト不能な形で残っている点で設計の一貫性も欠く。

**修正方針**: ポート解決を純粋関数として抽出し（例：`infrastructure/` に `resolvePort(env: NodeJS.ProcessEnv): number`）、`main.ts` はそれを呼ぶだけにする。抽出した関数に対し「正常」「未定義で throw」「非整数で throw」「0/負で throw」のテストを追加する。合成ルートが薄くなり、自分たちの DIP 設計とも整合する。

---

## should（改善推奨）

### 2. Dockerfile の `USER node` と root 所有 `node_modules`（匿名ボリューム）の組み合わせ ※実行未検証

**根拠**（`frontend/Dockerfile:5-10`, `docker-compose.yml:16-18`）:
- `npm ci` を root で実行 → イメージの `/app/node_modules` は root 所有。その後 `USER node`。
- compose の匿名ボリューム `- /app/node_modules` はイメージ内容（root 所有）で初期化され、コンテナは `node`（uid 1000）で起動。
- Vite はデフォルトで依存事前バンドルのキャッシュを `node_modules/.vite` に書き込むため、root 所有の `node_modules` 配下へ `node` ユーザーが書けず EACCES になる可能性がある。これは完了条件「`docker compose up` で frontend 起動／ホットリロード」に直結する。

**重要な注記**: 本ステップは編集禁止かつ当環境で Docker 実行不可のため、**この事象は実コンテナでは未検証**。test ステップも `docker compose config` のみで `docker compose up` の実起動・HMR は未確認（後述 #3）。断定ではなくリスクとして提示する。

**修正方針（いずれか）**: ①`npm ci` 後に `RUN chown -R node:node /app` してから `USER node`、②`vite.config.ts` で `cacheDir` を書き込み可能な場所へ、③開発用途として `USER node` を外す判断も可。backend(`node --watch`)は読み取りのみのため影響は小さいが、frontend は要確認。

### 3. 完了条件（`docker compose up` の実起動・ホットリロード）がパイプライン上で未検証

test ステップのレポート上、検証されたのは `docker compose config`（構成妥当性）まで。仕様の完了条件「両コンテナ起動・Vite 初期画面表示・/health が 200・ホットリロード反映」の**エンドツーエンド実起動は未確認**。#2 のリスクもあるため、learning/後続で実際に `docker compose up --build` を 1 度通すことを推奨。

---

## nice-to-have（軽微）

- **4.** `frontend/vite.config.ts:4` の `export const FRONTEND_DEV_SERVER_PORT` は、grep の結果**同一ファイル内でのみ使用**（外部 import なし）。`export` は不要。ローカル `const` で十分。
- **5.** `backend/package.json:9` の `test` は `--experimental-strip-types` 付き、一方 `dev`(L7) は無し。Node 24 では type-stripping は既定で有効のためフラグは不要かつ整合性に欠ける。揃えると分かりやすい（test ステップで Node 24 では動作確認済のため機能上の問題ではない）。
- **6.** compose に `healthcheck` 未定義。`/health` があるので backend に healthcheck を入れると依存制御・起動確認が容易。

---

## クリーンアーキテクチャ観点まとめ

| 観点 | 判定 | 根拠 |
|------|------|------|
| 依存方向（外→内 一方向） | ✅ 遵守 | domain←usecases←adapters←infrastructure←main、逆流なし |
| 依存性逆転 | ✅ 遵守 | `RuntimeStatusSource` ポートを usecases に定義、infrastructure が実装 |
| 層の責務分離 | ✅ 良好 | entity/usecase/adapter/framework が各ディレクトリに分離 |
| パブリック境界 | ✅ 良好 | express の Request/Response は adapter 層に限定、内部実装漏れなし |
| テスト十分性 | ⚠️ 不足 | usecase/adapter/domain は網羅。`main.ts` の解決ロジックのみ未テスト（must #1） |

**結論**: 設計は高水準。must #1（`main.ts` 解決ロジックの抽出＋テスト）を解消すれば APPROVE 相当。should #2/#3 は完了条件保証のため併せて対応・検証を推奨します。