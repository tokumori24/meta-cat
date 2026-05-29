学習ドキュメントを `docs/LEARNING.md` に作成しました。実ファイル（ソース・設定・テスト）と各レポートで確認した事実のみに基づいています。

## 作成内容の要点

**ドキュメント構成（7章＋付録）**
1. **全体像** — 2コンテナ構成のディレクトリツリーと完了条件
2. **なぜこの実装か** — Open Questions 4つの確定（TypeScript / Express 5 / DB除外 / Node 24）と、その判断根拠
3. **使用技術** — `package.json`/`Dockerfile` の実バージョンと、調査で得た落とし穴（`version:` obsolete、Vite `host: true` 必須、node_modules 衝突、`usePolling` 非推奨）
4. **クリーンアーキテクチャ** — 実 import を追跡した依存方向の検証、`RuntimeStatusSource` による DIP の実証、採用したトレードオフ
5. **計画との差分**（後述）
6. **検証結果** — test-report の事実
7. **今後学ぶべきこと** — Compose Watch、frontend→backend連携、本番マルチステージ等

## 特に重視した点

**初学者向けの用語補足**：グリーンフィールド、Active LTS、型ストリップ、DIP、クリーンアーキテクチャを初出時に短く説明。

**事実に忠実・脚色なし**：判断前にソースを再読し、計画と実装の**食い違いを正直に記録**しました。
- compose ファイルが推奨名 `compose.yaml` ではなく実際は **`docker-compose.yml`**（経緯は未確認と明記）
- ポート解決が計画の `?? 3000` フォールバックから **fail-fast の `resolvePort`** に変わった
- `docker compose up` の実起動・HMR 実動作は本ワークフロー内**未確認**である点を明示

**設計の進化を学びとして言語化**：review iteration 1 で「`main.ts` に埋もれてテスト不能だったポート解決」を純粋関数 `resolvePort(env)` に抽出した経緯を、「テストしづらいは設計の臭い」という教訓として記載しました。

なお、ご指示（commit/push/add 禁止）に従い、ファイル作成のみで Git 操作は行っていません。