技術調査が完了しました。`research.md` に出典付きでまとめました。

## 調査結果サマリ

リポジトリは空のグリーンフィールド環境（空 README.md のみ）で、frontend(React+Vite)/backend(Node.js) の 2 コンテナ開発環境を新規構築するタスクです。公式ドキュメントを一次情報として調査しました。

**Open Questions への推奨方針（根拠付き）**
- **言語**: TypeScript。frontend は公式 `react-ts` テンプレート、backend は Node 24 のネイティブ型ストリップ（stable・デフォルト有効）で追加ツール不要
- **backend FW**: Express 5（5.2.1 GA）を第一候補。性能重視なら Fastify 5（5.8.5）も妥当
- **DB**: 今回はスコープ外（order.md 要件外）。後から追加可能な構成に
- **バージョン**: Node 24（Active LTS, Krypton）/ `node:24-bookworm-slim` / React 19.2.x / Vite 8.x

**設計で押さえる重要ポイント**
1. Compose の top-level `version:` は **obsolete**（書くと警告）→ 書かない
2. Vite は **`server.host: true`（0.0.0.0）必須** — これがないとコンテナ外から見えない（最頻出の落とし穴）
3. ホットリロードは公式推奨の **Compose Watch（`develop.watch`）** か bind mount 方式。ただし完了条件が「`docker compose up` で起動＋ソース反映」なので、`up` 単体で成立する **bind mount 方式を基本線**にすべき（Watch は `docker compose watch` 起動が前提）
4. **node_modules の host/container 衝突**問題（匿名ボリュームで保護する手法は公式裏付け未確認＝コミュニティ知識）
5. Vite 8 の Node 要件（20.19+/22.12+）は Node 24 で充足

**未確認事項**（planner/implement が着手前に一次確認すべき）
- `@vitejs/plugin-react` の正確な版番号
- 匿名ボリューム手法の公式裏付け
- Express 5 の path-to-regexp 破壊的変更の具体差分
- 実行環境への Docker / docker compose 導入有無（`docker --version` はサンドボックス承認が必要で本ステップ未実行）

なお、調査ワークフローの実行を試みましたが承認ゲートが入ったため、確実性を優先し WebSearch/WebFetch で直接一次情報を確認しました。後続の planner はこのレポートを判断材料に設計を進めてください。