まず指定された task と Report Directory の一次情報、Policy/Knowledge の元ファイルを読み直します。実装範囲を実ファイルで確認してからスコープ宣言を出します。
指定された `context/reports` は存在しないため、同じ context 配下の利用可能ファイルを確認します。Report Directory が別名で置かれている可能性があるので、まず実在する一次情報だけで進めます。
レビューの差し戻し内容は previous_responses にあり、Report Directory は存在しません。補助情報としてそのレビューを確認し、実コードと照合して最小修正します。
# 変更スコープ宣言

## タスク
レビューで指摘された backend ポート解決ロジックの抽出と単体テスト追加

## 変更予定
| 種別 | ファイル |
|------|---------|
| 作成 | `backend/src/infrastructure/port.ts` |
| 作成 | `backend/test/infrastructure/port.test.ts` |
| 変更 | `backend/src/main.ts` |

## 推定規模
Small

## 影響範囲
- backend 起動時の `PORT` 環境変数バリデーション
- backend infrastructure 層の単体テスト
- backend build/test 実行結果
これから `main.ts` の環境変数解決を infrastructure の純粋関数へ移します。挙動は変えず、未定義・非数値・小数/サフィックス混入・0以下をテストで固定します。
編集は完了しました。ビルド前の自己チェックとして、Policy の全 `##` セクションを列挙済みなので、変更差分に対して REJECT 条件（フォールバック、責務混在、契約不整合、未完成コードなど）を機械検索と目視で照合します。
自己チェックでは、変更ファイルに TODO/FIXME、`any`、空 catch、`console.log`、`??` フォールバック、stateful regex は検出されませんでした。`context` 直下に Report Directory は実在せず、一次情報として参照できたのは task/policy/knowledge と previous_responses です。
backend の型チェックは成功しました。変更は backend だけですが、リポジトリ全体の完了条件に近い確認として frontend の build も続けて実行します。
backend テストは追加分を含めて 13 件すべて成功しました。frontend も既存テストを実行して、今回の変更で全体のテスト状態が崩れていないことを確認します。
## 作業結果
- `context/reports` は存在しなかったため、`task/policy/knowledge` と補助情報として `previous_responses/review...` を確認しました。
- レビュー指摘の `PORT` 解決ロジックを純粋関数化し、単体テストを追加しました。
- Policy 全 `##` セクションを列挙し、変更差分に REJECT 該当がないことを確認しました。

## 変更内容
- 作成: [backend/src/infrastructure/port.ts](/Users/tokuyamamorimasa/mori/takt/takt-worktrees/20260529T1431-tasuku-web-apuri-docker-no-web/backend/src/infrastructure/port.ts:1)
  - `resolvePort(env)` を追加。
  - `PORT` 未定義、非数値、非整数、末尾文字混入、0 以下を fail fast。
- 変更: [backend/src/main.ts](/Users/tokuyamamorimasa/mori/takt/takt-worktrees/20260529T1431-tasuku-web-apuri-docker-no-web/backend/src/main.ts:1)
  - 起動時のポート解決を `resolvePort(process.env)` に委譲。
- 作成: [backend/test/infrastructure/port.test.ts](/Users/tokuyamamorimasa/mori/takt/takt-worktrees/20260529T1431-tasuku-web-apuri-docker-no-web/backend/test/infrastructure/port.test.ts:1)
  - 正常系と各エラー分岐を追加。

## ビルド結果
- `backend`: `npm run build` 成功
- `frontend`: `npm run build` 成功

## テスト結果
- `backend`: `npm run test` 成功、13 tests passed
- `frontend`: `npm run test` 成功、1 test passed

# 決定ログ

## 1. ポート数値化に `Number()` を使用
- **背景**: `Number.parseInt('3000abc', 10)` は `3000` として通すため、positive integer の検証として不十分。
- **検討した選択肢**: `Number.parseInt` 継続 / `Number()` に変更
- **理由**: `3000abc` や `3000.5` を正しく reject でき、レビュー指摘の非整数分岐を明確にテストできるため。