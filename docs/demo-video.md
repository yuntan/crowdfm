# CrowdFM デモ動画構成

最終更新: 2026-07-16
目標尺: **2分50秒以内**
提出先: OpenAI Build Week

## 動画の仕事

3分未満で、次の一文を証明する。

> リスナーが送ったお便りからAIが短いラジオ番組を制作し、決まった時刻にAIトークと音楽をライブ放送する。

動画を見終わった審査員が理解すべきことは4つ。

1. CrowdFMは個人用プレイリストではなく、AIパーソナリティーがいるラジオ局である。
2. お便りが番組内容と選曲に直接反映される。
3. GPT-5.6と音声生成がプロダクトの中核にある。
4. Codexを使って、アイデアだけでなく動く一貫した体験を作った。

## 提出要件との対応

- 動画は3分未満。安全のため2分50秒を目標にする。
- 公開YouTube動画としてアップロードする。
- 音声でCodexとGPT-5.6の使用方法を説明する。
- アプリUI、AIパーソナリティー音声、ナレーション、画面内字幕を英語に統一する。
- 許可のない著作権音楽を使わない。
- YouTube再生に使う曲は、自作、CC0、適切なCreative Commons、または明示的な許諾があるものに限定する。
- 曲のクレジットとライセンスURLを動画説明欄に記載する。

公式要件: https://openai.devpost.com/rules

## デモ用入力

```text
Radio name
Sleepless Engineer

Message
I just finished a difficult release after a tense week.
I want to enjoy the achievement quietly, so please choose a calm instrumental track.
```

独立したテーマ欄は作らない。お便り本文に状況と選曲希望を含め、AIに意図を解釈させてカタログから曲を選ばせることで、LLMを使う意味を見せる。

## タイムライン

### 0:00–0:12 — コールドオープン

完成後の最も強い瞬間から始める。タイトル画面や自己紹介から始めない。

画面:

- AIパーソナリティーがラジオネームとお便りを読んでいる。
- AIの返答から曲紹介へつながる。
- YouTube動画が再生を開始する。

AIパーソナリティーの例（英語音声・英語字幕）:

> Sleepless Engineer, congratulations on shipping. Here is a track for letting that long week finally unwind.

狙い:

- 最初の12秒で「お便り」「AI DJ」「選曲」「音楽再生」を全部見せる。
- 審査員が説明を聞く前にプロダクトを理解できるようにする。

### 0:12–0:27 — CrowdFMとは何か

画面:

- CrowdFMロゴ。
- お便り画面、AIパーソナリティー、放送画面を一つの流れとして短く表示。
- `One AI personality. One live station.` を表示。

英語ナレーション:

> This is CrowdFM: one live radio station hosted by an AI personality and shaped by listener messages.

> Unlike a personal playlist, everyone tunes into a show with a fixed airtime and no pause or skip button.

### 0:27–0:52 — お便りを送る

画面:

- ローカルのデモURLを開く。
- ログインなしでフォームを入力する。
- `Radio name`と`Message`だけが見えるようにする。選曲テーマはMessage本文に含める。
- `Create my show` を押す。

英語ナレーション:

> Listeners write to the station just like they would email a real radio show. They can name a song, an artist, or simply describe the moment they are in.

> For this demo, I am asking for a calm instrumental track after finishing a difficult release.

画面上で、入力内容がプロンプト命令ではなく「お便り」として扱われていることが伝わるようにする。

### 0:52–1:08 — 番組制作

画面:

- `Checking your message`
- `Selecting music and planning the show`
- `Recording the AI host`
- 完成までの実時間を表示する。

待ち時間は編集で短縮する。ただし、フェイクに見えないよう、次の表示を入れる。

```text
Production completed in 38 seconds
Waiting shortened for this video
```

実際の秒数に置き換える。

英語ナレーション:

> CrowdFM moderates the message, asks GPT-5.6 to select from a curated music catalog, and generates a structured show script grounded only in verified track information.

> It then records the host segments before airtime.

### 1:08–1:23 — 完成通知とカウントダウン

画面:

- `Your show is ready`
- 短い通知音。
- `Tune in` を押す。
- `READY`から放送開始までの15秒カウントダウン。
- `AI-generated host and voice` の表示。

英語ナレーション:

> Once production is complete, the show receives a fixed airtime. One tap prepares audio playback, and the countdown begins.

このタップは演出だけでなく、ブラウザの音声付き自動再生制限を回避するための実際のユーザー操作である。

### 1:23–1:55 — AIパーソナリティー

画面:

- 落ち着いた女性AIパーソナリティーの音声。
- ラジオネームとお便りを画面に表示。
- 返答と選曲理由を字幕表示。
- 音声波形または控えめな放送中アニメーション。

AIパーソナリティーの台本例（英語音声）:

> Welcome to CrowdFM. Our first message is from Sleepless Engineer.

> You just made it through a difficult release. Congratulations. Instead of celebrating at full volume, tonight feels like a moment to let that long week slowly unwind.

> I chose [track title]. Settle into its gentle pace and enjoy the space between the notes.

実際の生成結果を使う。収録用に手で書き換えない。

### 1:55–2:13 — YouTube再生

画面:

- AIトークからYouTube動画へ自動で切り替わる。
- 曲名、アーティスト、選曲理由を表示。
- 通常の一時停止・スキップ・シークUIがないことを見せる。
- ライセンス表示へのリンクを見せる。

英語ナレーション:

> The browser now follows a server-authored timeline, switching from generated speech to the approved YouTube track. The listener cannot pause, skip, or restart the show.

アプリでは曲の冒頭から、曲ごとに設定した最初のサビ付近までを再生してエンディングトークへ切り替える。動画内で音楽を聴かせるのは5〜8秒程度とし、残りは編集で短縮する。ナレーションと重なる場合は音量を下げる。

### 2:13–2:34 — 技術の中核

画面:

```text
Listener message
    ↓
OpenAI Moderation
    ↓
GPT-5.6 + Structured Outputs
    ↓
gpt-4o-mini-tts
    ↓
Speech → YouTube → Speech timeline
```

実際の構造化JSONを短く表示する。

```json
{
  "selectedTrackId": "track_...",
  "selectionReason": "...",
  "preTrackScript": "...",
  "postTrackScript": "..."
}
```

英語ナレーション:

> GPT-5.6 turns the message, host persona, verified facts, and eligible tracks into a schema-validated rundown. OpenAI text-to-speech records the calm English-speaking host, while the web client performs the finished show on a live clock.

### 2:34–2:49 — Codexをどう使ったか

画面:

- CrowdFMを構築したCodexセッション。
- 仕様、状態遷移、テスト、実装差分を素早く切り替えて見せる。
- `/feedback` に使う主要セッションであることが分かるようにする。

英語ナレーション:

> We built CrowdFM with Codex. It helped us challenge the product concept, design the production state machine and timeline contract, implement the end-to-end flow, and test failures before recording this demo.

「Codexが全部作った」ではなく、人間が下した重要な判断もREADMEで説明する。

### 2:49–2:57 — クロージング

画面:

- CrowdFMロゴ。
- `One AI personality. One live station.`
- `Real radio, reimagined with AI.`

英語ナレーション:

> CrowdFM. One AI personality, one live station, shaped by everyone listening.

2分57秒まで使わず、できれば2分50秒前後で終了する。

## 収録する画面

- リクエストフォーム。
- 送信後の制作進捗。
- 完成通知。
- 放送開始カウントダウン。
- AI音声の再生。
- お便りと返答の字幕。
- YouTube動画への切り替え。
- Now Playingと選曲理由。
- AI音声の開示。
- 曲のライセンス情報。
- GPT-5.6のStructured Outputs。
- Codexセッションと実装差分。

## 収録前チェックリスト

### アプリ

- [ ] ローカルのデモURLを新しいブラウザプロファイルから開ける。
- [ ] ログインなしで送信できる。
- [ ] モデレーション、台本、TTSが本番APIで成功する。
- [ ] 選ばれた曲が必ず登録済みカタログにある。
- [ ] YouTube動画をデモ環境で埋め込み再生できる。
- [ ] `READY`から15秒後に放送が始まる。
- [ ] 曲の冒頭から設定済みのサビ付近まで再生し、エンディングトークへ切り替わる。
- [ ] 生成音声とYouTubeの切り替えに不自然な無音がない。
- [ ] `Tune in` の一回の操作で音声再生を開始できる。
- [ ] AI音声であることを表示している。
- [ ] 失敗時にAPIキーや内部エラーを表示しない。

### 権利

- [ ] デモ曲の利用許諾を確認した。
- [ ] ライセンスURLを保存した。
- [ ] 必要なクレジットをアプリと動画説明欄へ記載した。
- [ ] 許可のないBGMを動画編集で追加していない。
- [ ] 標準YouTubeプレイヤーの表示を不正に隠していない。

### 動画

- [ ] 3分未満。
- [ ] 公開YouTube動画。
- [ ] 音声でGPT-5.6の役割を説明した。
- [ ] 音声でCodexの役割を説明した。
- [ ] UI、AIホスト音声、ナレーション、字幕がすべて英語である。
- [ ] 小さなノートPC画面でも字幕を読める。
- [ ] 待ち時間の編集を明示した。
- [ ] 冒頭12秒で実際の動作を見せた。
- [ ] 最後が技術画面のまま終わっていない。

## 録画上の注意

- ローディングの失敗に備えて、同じ実演を最低3回収録する。
- 画面録画とマイク音声を別トラックにする。
- AIパーソナリティー音声とナレーションを重ねない。
- 音楽はナレーション中に15〜20%まで下げる。
- マウスを無目的に動かさない。
- UIは125〜150%程度に拡大し、フォームと字幕を読める大きさにする。
- APIキー、メールアドレス、ローカルパス、不要なブラウザタブを映さない。
- 編集で機能を捏造しない。待ち時間だけを短縮し、実際の成功した一連の操作を使う。

## 動画説明欄に含めるもの

- 一文のプロジェクト説明。
- GitHubリポジトリ。
- 使用したOpenAIモデル。
- Codexを使った工程。
- デモ曲の曲名、アーティスト、ライセンス、出典URL。
- AI音声であることの開示。

## 動画で見せないもの

- Apple Music／Spotifyの将来構想。
- メール受付の将来構想。
- 複数クライアント同期。
- 30分番組の全体像。
- 詳細なデータベース設計。
- すべてのエラー処理。
- 長いコードスクロール。
- 長いタイトルアニメーション。

これらはREADMEまたはDevpost本文で説明し、3分動画は一通のお便りが番組になる体験に集中する。
