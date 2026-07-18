# Suno Platform 公式API調査

調査日: 2026-07-16
対象: CrowdFMからSunoの公式APIを利用する方法
情報源: Suno公式ドメイン（`platform.suno.com`、`suno.com`、`help.suno.com`、`about.suno.com`）のみ

## 結論

Sunoは現在、公式の「Suno Platform」を `platform.suno.com` で提供している。ログイン前の公式ページでは、Sunoの音楽生成エンジンを「simple REST API」として利用でき、単一のプロンプトからオリジナル曲、カバー、マッシュアップを生成できると案内している。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

一方、公開状態で確認できるのはログインページだけであり、次の実装情報はログイン後のみ確認可能、または未確認である。

- APIキーの発行・失効・ローテーション方法
- 認証ヘッダーの形式
- APIのbase URL
- REST endpointのパス、HTTPメソッド、request/response schema
- 生成が同期処理か非同期ジョブか
- ジョブ状態の取得、ポーリング、Webhookの仕様
- 完成音源のダウンロード方法とURLの有効期限
- APIで選択できるモデル
- Suno Platform固有の料金、クレジット消費量
- API固有の商用利用条件
- レート制限、同時実行数、タイムアウト

未認証状態では、[Platformの `/docs`](https://platform.suno.com/docs) と [Platformの `/pricing`](https://platform.suno.com/pricing) もログイン画面へリダイレクトされる。そのため、公開ドキュメントや公開API料金ページとして参照することはできない。

したがって、CrowdFMへの実装を始める前に、Suno Platformへログインし、コンソール内のAPIドキュメントと契約条件を確認する必要がある。未確認のendpointや認証方式を、非公式Suno APIの仕様から流用してはならない。

## 公開情報と確認状態

| 項目 | 確認状態 | 公式に確認できた内容 |
|---|---|---|
| 公式APIの存在 | 確認済み | Suno自身が「Suno API」「simple REST API」と案内している。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| 登録・ログイン | 一部確認済み | Sunoアカウントに紐づくGoogleアカウントでログインする。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| APIアカウント管理 | 一部確認済み | ログイン後にAPIアカウントを管理する旨が表示される。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| APIキー | ログイン後のみ確認可能 | 公開ページには発行手順・形式・権限スコープの記載がない。 |
| 認証 | ログイン後のみ確認可能 | Bearer token、専用ヘッダー等の方式は公開ページでは未確認。 |
| REST endpoint | ログイン後のみ確認可能 | REST APIであることのみ確認済み。パス、method、schemaは未確認。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| オリジナル曲生成 | 確認済み | 単一プロンプトから生成可能と案内されている。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| カバー生成 | 確認済み | Platformの対応機能として案内されている。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| マッシュアップ生成 | 確認済み | Platformの対応機能として案内されている。[Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F) |
| 非同期ジョブ | 未確認 | ジョブID、status値、ポーリング、Webhookの公開仕様は確認できない。 |
| 音源ダウンロード | 未確認 | APIレスポンスに音源URLが含まれるか、別endpointが必要かは未確認。 |
| APIモデル | 未確認 | Suno全体ではv5.5等が提供されているが、Platformで利用できるモデルは未確認。 |
| API料金・クレジット | ログイン後のみ確認可能 | 通常のSunoプランとAPIアカウントの課金関係は公開ページでは未確認。 |
| API出力の商用権 | 未確認 | 一般のSuno有料プランには商用利用権があるが、Platform固有条件との関係は未確認。 |
| レート制限 | ログイン後のみ確認可能 | requests/minute、同時生成数、日次上限等は公開ページでは未確認。 |

## 1. 登録・ログイン

### Sunoアカウントを作る

通常のSuno Webでは、`suno.com` の「Sign Up」からGoogle等のSSOを使って登録できる。
出典: [How do I sign up or log in?](https://help.suno.com/en/articles/2408065)

### Suno Platformへログインする

1. [Suno Platform](https://platform.suno.com/) を開く。
2. 「Sign in with Google」を選ぶ。
3. 通常のSunoアカウントに紐づいているGoogleアカウントを選ぶ。

Platformのログインページは「Use the Google account linked to your Suno account」と明記している。通常のSunoで別のSSO方式を使っている場合にPlatformへどう接続するかは未確認であり、必要なら公式サポートへ確認する。
出典: [Suno Platform login](https://platform.suno.com/auth/login?returnTo=%2F)、[Suno公式サポート窓口](https://help.suno.com/en/articles/2551617)

## 2. APIキー

ログイン前の公式ページには、APIキーの作成画面、キーの形式、表示回数、権限スコープ、失効、ローテーションに関する説明がない。これらは**ログイン後のみ確認可能**である。
確認先: [Suno Platform](https://platform.suno.com/)

ログイン後は、少なくとも次を確認して記録する。

- APIキーを作成する画面名と操作手順
- キーが再表示可能か、一度だけ表示されるか
- test/live環境の区別
- キーごとの権限スコープ
- キーの失効・再発行方法
- チームメンバーやプロジェクト単位のキー分離

CrowdFMでは、確認したキーをブラウザやリポジトリへ置かず、サーバー側の環境変数またはsecret managerで管理する。環境変数名は実装側で `SUNO_API_KEY` としてよいが、これはCrowdFM内の命名であり、Suno公式が指定した変数名ではない。

## 3. 認証

Suno PlatformがREST APIであることは確認できるが、次の認証仕様は公開ページでは**未確認**である。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

- `Authorization: Bearer ...` を使うか
- `X-API-Key` 等の専用ヘッダーを使うか
- OAuthを使うか
- request signingが必要か
- API versionヘッダーが必要か

したがって、認証コードや`curl`例はログイン後の公式ドキュメントを確認するまで確定できない。非公式APIサービスやブラウザCookieを利用する実装は、公式Suno Platformの認証方法ではない。

## 4. REST endpoints

公式のログイン前ページは「simple REST API」であることだけを公開している。base URL、endpoint、HTTP method、request/response schemaは**ログイン後のみ確認可能**である。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

現時点では、次のようなendpoint名を推測して実装してはならない。

- `/generate`
- `/songs`
- `/jobs/{id}`
- `/status/{id}`
- `/download/{id}`

これらは一般的な命名例にすぎず、Suno公式Platformの実際のパスであることを確認できていない。

ログイン後に、少なくとも次のendpointを公式リファレンスから特定する。

| 必要な操作 | 確認事項 |
|---|---|
| 新規曲生成 | endpoint、method、prompt、lyrics、instrumental、model等のfield |
| カバー生成 | 入力音源の指定方法、権利確認、対応format、容量上限 |
| マッシュアップ生成 | 2つの入力音源の指定方法、対応format、容量上限 |
| 生成結果取得 | IDの種類、status値、失敗理由、再試行可否 |
| 音源取得 | MP3/WAV等のformat、URLの期限、認証の要否 |
| 使用量取得 | クレジット残量、課金単位、失敗時の返金 |

## 5. 生成リクエスト、非同期ジョブ、ポーリング、ダウンロード

### 公式に確認できること

Platformは、単一のプロンプトからオリジナル曲、カバー、マッシュアップを生成できると案内している。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

### 公式に確認できないこと

ログイン前の公式情報からは、生成requestが同期responseを返すのか、非同期job IDを返すのかを判断できない。ポーリングendpoint、推奨interval、Webhook、完了後の音源URL、URLの有効期限も**未確認**である。
確認先: [Suno Platform](https://platform.suno.com/)

そのため、現段階では次のフローを「Sunoの確定仕様」として扱わない。

```text
POST generation
  -> job_id
  -> GET job statusをポーリング
  -> audio_urlを取得
  -> 音源をダウンロード
```

これはCrowdFM側で備えるべき一般的な非同期provider adapterの形ではあるが、Suno Platformが同じ契約を採用しているかはログイン後のドキュメントで確認する必要がある。

ログイン後は、次を確認してから実装する。

1. 生成requestが返すHTTP status code
2. provider側のrequest IDまたはjob ID
3. pending、running、succeeded、failed等の正式なstatus値
4. `Retry-After`、推奨poll interval、最大待ち時間
5. Webhookの有無、署名検証方法、再送仕様
6. 生成失敗時のerror codeとクレジット処理
7. 音源URLが署名付きか、URLが失効するまでの時間
8. MP3、WAV、stems等の提供format
9. 生成物の保存期間と再ダウンロード可否

## 6. モデルと機能

### Platformで公開確認できる機能

Suno Platformのログイン前ページがAPI機能として明記しているのは、以下の3つである。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

- オリジナル曲
- カバー
- マッシュアップ

### Suno全体で公開されているモデル・機能

Suno全体ではv5.5が提供され、公式リリースノートは、より豊かなアレンジ、より明瞭なボーカル、幅広いジャンルでのダイナミックな音を特徴として挙げている。また、Voices、Custom Models、My Tasteをv5.5関連機能として案内している。
出典: [Introducing v5.5: Voices, Custom Models, and My Taste](https://suno.com/release-notes)

Sunoの通常サービスでは、v4.5-allがFree、v4・v4.5・v4.5+・v5・v5.5がPro/Premierのモデルとして料金ページに掲載されている。
出典: [Suno Pricing](https://suno.com/pricing)

ただし、これらのモデルやVoices、Custom Models、stems、extend等をSuno Platform APIから利用できるとは公開情報だけでは確認できない。**Platformの対応モデル名とfeature matrixはログイン後のみ確認可能**である。

## 7. 料金とクレジット

### Suno Platform API

Suno Platform固有の利用料金、無料枠、クレジット単価、生成1回あたりの消費量、失敗時の扱いはログイン前ページでは公開されていないため、**ログイン後のみ確認可能**である。
確認先: [Suno Platform](https://platform.suno.com/)

また、「Sign in to manage your API account」という記載からAPIアカウント管理画面が存在することは確認できるが、通常のSunoサブスクリプションとAPIアカウントの請求・クレジットが共通か別かは未確認である。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

### 通常のSunoプラン（参考。API料金ではない）

通常のSuno料金ページでは、年払い表示でFreeが月額0ドル、Proが月額換算8ドル、Premierが月額換算24ドルと掲載されている。Proは月2,500クレジット、Premierは月10,000クレジットである。
出典: [Suno Pricing](https://suno.com/pricing)

Freeの50クレジットは毎日、Proの2,500クレジットとPremierの10,000クレジットは毎月補充される。
出典: [What type of plan do I have?](https://help.suno.com/en/articles/2410049)

上記は通常のSuno Web/Appの料金情報であり、Suno Platform APIにそのまま適用されるとは確認できない。CrowdFMの原価試算には、Platformコンソールに表示されるAPI固有の単価を使用する。

## 8. 出力の商用利用権

### 一般のSuno利用条件

Sunoの公式ヘルプでは、ProまたはPremierの有料契約中に作成した曲には商用利用権が付与され、外部へのダウンロード、ストリーミング配信、映画・テレビ・ゲームでの利用、独立販売が可能と説明されている。
出典: [What rights do I have with a paid subscription?](https://help.suno.com/en/articles/9601665)

Suno利用規約は、ProまたはPremier契約中にユーザーのSubmissionから生成されたOutputについて、Sunoが所有する権利をユーザーへ譲渡すると定める一方、Outputに著作権が成立することは保証しないとしている。
出典: [Suno Terms of Service](https://about.suno.com/terms)

Free/Basicで生成したOutputは、合法的・内部的・個人的・非商用の目的に限られ、Sunoへの帰属表示が必要と規約に記載されている。
出典: [Suno Terms of Service](https://about.suno.com/terms)、[What rights do I have with the free plan?](https://help.suno.com/en/articles/9601601)

有料契約を後から開始しても、Freeプラン中に生成した曲へ商用利用権が原則として遡及しない。
出典: [If I subscribe, do I get rights for the songs I made before subscribing?](https://help.suno.com/en/articles/2425729)

### Suno Platform APIへの適用

APIアカウントがPro/Premierと同じ権利区分になるか、API料金に商用利用ライセンスが含まれるか、API経由のOutputがどの時点で「有料契約中の生成」と扱われるかは、公開情報では**未確認**である。

現行の一般向けSuno利用規約にはPro/PremierとFree/BasicのOutput条件はあるが、Suno PlatformのAPIアカウント、API課金、API経由Outputとの対応関係は明記されていない。したがって、一般向けPro/Premierの権利条件をAPI出力へ自動的に適用できるとは判断しない。
出典: [Suno Terms of Service](https://about.suno.com/terms)

CrowdFMでAPI生成曲を公開デモ、ハッカソン提出、収益化サービスに使う前に、Platformコンソール内の契約条件で次を確認する。

- API経由のOutputに商用利用権が付くプラン
- 権利が付与される生成時点
- 解約後も既存Outputの権利が維持されるか
- attributionの要否
- end user向けサービス内での再生・配信・ダウンロード許可
- 入力した歌詞・音声と生成物に関するSunoへのライセンス

Platform固有条件が表示されない場合は、公式サポート `support@suno.com` へAPI経由Outputの利用目的を明記して確認し、回答を保存する。公式ヘルプは、このメールアドレスを唯一の公式サポート窓口として案内している。
出典: [Something isn't working. How do I get help?](https://help.suno.com/en/articles/2551617)

## 9. レート制限

Suno Platform APIのrequests per minute、同時生成数、日次上限、payload size、timeout、429 response、`Retry-After`の仕様は、ログイン前の公式ページでは**未確認**である。
確認先: [Suno Platform](https://platform.suno.com/)

通常のSuno Pro/Premierプランにはpriority queueで最大10曲を同時生成できるとの記載があるが、これは通常サービスのプラン比較であり、APIのrate limitまたはconcurrency limitと同一とは確認できない。
出典: [Suno Pricing](https://suno.com/pricing)

CrowdFMでは、公式API制限を確認するまで同時実行数を1に制限し、429と5xxを安全に処理できるqueueを用意するのが保守的である。実際のretry回数、backoff、poll intervalは、ログイン後の公式仕様を優先する。

## 10. CrowdFMでの推奨統合フロー

以下はSunoの未公開仕様を断定するものではなく、ログイン後に確認した正式なAPI契約を差し込めるようにするためのCrowdFM側の推奨設計である。

```text
Listener request
  -> OpenAIで曲の意図・歌詞・スタイルを構造化
  -> CrowdFM DBへgeneration requestを保存
  -> Queue workerがSuno provider adapterを呼ぶ
  -> Sunoのrequest/job IDとraw responseを保存
  -> 公式仕様が非同期なら、指定intervalでpollまたはWebhookを検証
  -> 完成音源をCrowdFM管理ストレージへ取得
  -> MIME type、file size、duration、checksumを検証
  -> TTS opening/closingと結合
  -> READY
  -> 放送キューへ追加
```

### 推奨する境界

Suno固有の処理は、次のようなprovider adapterへ隔離する。

```ts
interface MusicGenerationProvider {
  create(request: MusicGenerationRequest): Promise<ProviderSubmission>;
  getStatus(providerRequestId: string): Promise<ProviderStatus>;
  fetchAssets(providerRequestId: string): Promise<GeneratedAsset[]>;
}
```

このinterfaceはCrowdFM側の設計例であり、Suno公式SDKまたは公式型ではない。Sunoが同期生成、Webhookのみ、別のasset取得方式を採用している場合は、ログイン後の公式仕様に合わせてadapter内部を変更する。

### 実装上の推奨事項

- APIキーはサーバー側だけで使用し、Web UIへ渡さない。
- listener requestを受けるHTTP request内で曲生成完了を待たず、queueへ移す。
- 同一requestの二重課金を避けるため、CrowdFM側でidempotency keyを持つ。
- provider request ID、HTTP status、error code、使用クレジットを監査ログへ残す。
- providerの一時URLを再生元にせず、利用条件で許される場合に限りCrowdFM管理ストレージへ保存する。
- 完成待ちの間は既存カタログ曲を流し、ライブ放送を止めない。
- タイムアウト、moderation拒否、クレジット不足、rate limitを別の失敗状態として扱う。
- API出力の商用権が確認できるまでは、公開提出物・本番配信に使用しない。

## 11. ログイン後の確認チェックリスト

実装前にPlatformコンソールで以下を埋める。

```text
API docs URL:
API base URL:
API version:
Authentication header:
API key creation URL:
Key rotation procedure:

Create original endpoint:
Create cover endpoint:
Create mashup endpoint:
Get status endpoint:
Download/assets endpoint:
Webhook supported:
Webhook signature:

Official status values:
Recommended polling interval:
Maximum job duration:
Audio formats:
Asset URL expiration:
Provider retention period:

Available API models:
Credits per operation:
Failed-job credit policy:
API pricing:
Commercial-use plan:
Rate limit:
Concurrency limit:
429 retry guidance:
```

## 12. 採用判断

公式Suno Platformは存在するため、非公式のCookie wrapperや第三者の「Suno API」を採用する必要はない。
出典: [Suno Platform](https://platform.suno.com/auth/login?returnTo=%2F)

ただし、2026-07-16時点のログイン前情報だけでは、CrowdFMへ安全に実装できるだけのAPI契約を確認できない。まずGoogle連携アカウントでPlatformへログインし、endpoint、認証、非同期処理、課金、商用権、rate limitを確認する。その確認が済むまでは、CrowdFMのハッカソン版では事前生成済みの権利確認済み音源を使い、Suno Platform統合をfeature flagの後ろに置くのが妥当である。
