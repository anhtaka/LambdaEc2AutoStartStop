# 改善案・追加機能案

> 作成日: 2026-05-08

---

## 1. バグ・コード品質の修正

### 1-1. 文字列比較による時刻バリデーションの誤り

**対象:** `app.js` `validValue()` (82–88行)

```js
// 現状: 文字列比較のため "9" >= "24" → true になってしまう
if (getHour(value) >= 24 || getHour(value) < 0) { ... }
```

`Number()` でキャストしてから比較する必要がある。

```js
if (Number(getHour(value)) >= 24 || Number(getHour(value)) < 0) { ... }
if (Number(getMinute(value)) >= 60 || Number(getMinute(value)) < 0) { ... }
```

---

### 1-2. `getDayOffBootFlg` と `getTagValue` の重複実装

**対象:** `app.js` 97–116行

両関数はまったく同じ実装。`getDayOffBootFlg` を削除し、呼び出し側で `getTagValue` を使えばよい。

---

### 1-3. 1インスタンスの失敗が全体処理を止める

**対象:** `app.js` `handler()` 内のインスタンスループ

現状では `startInstance` / `stopInstance` がエラーを `throw` すると、残りのインスタンス処理がスキップされる。
各インスタンスを個別に try-catch で囲み、失敗ログを出力しつつ処理を継続させるべき。

---

### 1-4. `moment` の非推奨依存 ✅ 対応済み

`moment` を `jstDate.js`（ネイティブ `Intl.DateTimeFormat` 実装）に置き換え、npm 依存を除去した。

---

### 1-5. グローバル変数への依存

`NOWDATE`・`AryHoliday` がモジュールスコープのグローバル変数として存在する。
Lambda の Warm Start では前回の値が残る可能性がある（`getHoliday()` は毎回クリアしているが `NOWDATE` はそうでない）。
`handler` 関数内のローカル変数として管理するのが安全。

---

### 1-6. DescribeInstances のページネーション未対応

AWS API は1回のレスポンスで返せるインスタンス数に上限がある。
`NextToken` を使ったページネーション処理を追加しないと、インスタンス数が多い環境では取りこぼしが発生する。

---

## 2. 設定・運用の改善

### 2-1. ハードコードされた固定時刻の外部化

以下の値が `app.js` 内にハードコードされており、変更するたびにデプロイが必要。

| 箇所 | 現状の値 |
|------|---------|
| `AutoStart = "1"` のデフォルト起動時刻 | `08:30` |
| `AutoStop = "1"` のデフォルト停止時刻 | `20:00` / `23:00` |

これらを Lambda 環境変数（例: `DEFAULT_START_TIME`、`DEFAULT_STOP_TIME`）として外部化する。

---

### 2-2. タイムゾーンのハードコード解消

現状 JST (`+09:00`) 固定。環境変数 `TZ` または `TIMEZONE` で切り替えられるようにすることで、他タイムゾーンの環境でも再利用できる。

---

### 2-3. 週次スケジュールのタグ対応

現状は「平日／休日」の2値のみ。`AutoStartDays` タグで曜日指定（例: `Mon,Tue,Wed`）ができると柔軟性が上がる。

---

## 3. 新機能の追加案

### 3-1. 起動・停止通知（SNS / SES）

インスタンスの起動・停止操作を行った際に、SNS トピックへメッセージを発行し、メール通知を受け取れるようにする。
エラー発生時の通知も含める。

**必要な追加権限:**
- `sns:Publish`

---

### 3-2. DryRun モード

実際には操作を行わず、「このインスタンスに何をするか」だけをログ出力するモード。
環境変数 `DRY_RUN=true` で有効化し、本番適用前の動作確認に使う。

---

### 3-3. 複数リージョン対応

現状は Lambda が動いているリージョン1つのみ対象。
環境変数 `TARGET_REGIONS` にカンマ区切りでリージョンを指定し、複数リージョンの EC2 を一括管理できるようにする。

---

### 3-4. 操作履歴の記録（DynamoDB / CloudWatch Metrics）

誰がどのインスタンスをいつ起動・停止したか（Lambda の場合はスケジュール実行）を DynamoDB に記録する。
または CloudWatch カスタムメトリクスとして起動・停止回数を送信し、ダッシュボードで可視化する。

---

### 3-6. IaC テンプレートの追加

Lambda 関数・IAM ロール・CloudWatch Events（EventBridge）ルールを Infrastructure as Code で管理できるよう、以下のいずれかを追加する：

- **AWS CDK** (TypeScript)
- **Terraform** (HCL)
- **SAM** (AWS Serverless Application Model)

---

## 4. CI/CD の改善

### 4-1. GitHub Actions の Node バージョン更新

`.github/workflows/npm-publish-github-packages.yml` の `node-version: 16` は EOL。
`app.js` や `package.json` の実態に合わせて `22` に統一する。

### 4-2. テストの実装

現状 `package.json` の `"test": ""` が空で、CI でテストが実行されていない。
以下を追加することを推奨：

- **ユニットテスト**: `vitest` または `jest` で `handleInstance()`・`validValue()`・`getDateValue()` 等のロジックをテスト
- **モックテスト**: `@aws-sdk/client-ec2` を mock して `startInstance` / `stopInstance` の呼び出しを検証

### 4-3. CircleCI 設定の改善（対応済み）

`.circleci/config.yml` はリポジトリURLがハードコードされており fork すると壊れる状態だったため、
設定ごと削除し `.github/workflows/ci.yml`（GitHub Actions）へ移行した。
チェックアウトは `actions/checkout` を使うため、この問題は解消している。

---

## 5. セキュリティ

### 5-1. IAM 最小権限のドキュメント整備

README には `ec2:DescribeInstances`・`ec2:StartInstances`・`ec2:StopInstances` の3権限が記載されているが、
特定のリソース ARN に絞った IAM ポリシーのサンプルを README に追記することで、過剰な権限付与を防ぐ。

### 5-2. 環境変数の機密情報管理

`holidaylist` 程度であれば問題ないが、将来的に認証情報が環境変数に入らないよう、
Secrets Manager / Parameter Store 利用のガイドラインを README に明記する。

---

## 優先度サマリ

| 優先度 | 項目 |
|--------|------|
| 高 | 1-1 バリデーションバグ修正 |
| 高 | 1-2 重複関数の削除 |
| 高 | 1-3 インスタンス個別エラーハンドリング |
| 高 | 4-2 テストの実装 |
| 中 | 1-6 ページネーション対応 |
| 中 | 2-1 デフォルト時刻の環境変数化 |
| 中 | 3-1 SNS 通知 |
| 中 | 3-2 DryRun モード |
| ~~低~~ | ~~1-4 moment → Day.js 移行~~ ✅ 対応済み |
| 低 | 3-3 複数リージョン対応 |
| 低 | 3-6 IaC テンプレート追加 |
