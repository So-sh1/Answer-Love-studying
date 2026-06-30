# StudyForge 一問一答

GitHub Pagesでそのまま公開できる、本格めの一問一答アプリです。  
HTML / CSS / JavaScriptだけで動きます。

## 主な機能

- 自分で答えを入力して判定
- 表記ゆれに少し強い判定
  - 全角半角
  - ひらがな/カタカナ
  - 空白や記号
  - 部分一致
- 忘却曲線風の復習スケジュール
- 4段階評価
  - 忘れた
  - 惜しい
  - 正解
  - 余裕
- スマート復習
- 苦手問題だけ出題
- お気に入り問題だけ出題
- タグ管理
- 検索
- 並び替え
- CSVインポート
- CSVエクスポート
- JSONバックアップ
- 学習ログ
- 苦手ランキング
- XP / レベル
- 連続学習日数
- ダークモード
- スマホ対応
- PWA対応
  - ホーム画面に追加可能
  - 一度読み込めばオフラインでも開ける

## ファイル構成

```txt
ultimate-ichimon-itto/
├─ index.html
├─ style.css
├─ script.js
├─ manifest.webmanifest
├─ sw.js
├─ icon.svg
└─ README.md
```

## ローカルで使う

`index.html` をブラウザで開けば使えます。

ただし、PWAやService Workerは `file://` では完全に動かないことがあります。  
PWAまで確認したい場合は、VS CodeのLive Serverなどで開いてください。

## GitHub Pagesで公開する

1. GitHubで新しいリポジトリを作る
2. このフォルダの中身をアップロード
3. Settings → Pages
4. Branchを `main`
5. Folderを `/root`
6. Save
7. 数分後にURLが発行されます

## CSV形式

```csv
問題,答え,タグ,ヒント,解説
-OH の官能基名は？,ヒドロキシ基,化学|官能基,水酸基ともいう,アルコール類などに含まれる
```

タグは `|` や `,` やスペース区切りに対応しています。

## 注意

データはブラウザの `localStorage` に保存されます。  
スマホのブラウザデータを消すと問題も消えるので、定期的にJSONバックアップしてください。

## 今後さらに強くするなら

- SupabaseやFirebaseでクラウド同期
- OpenAI APIでプリントから問題生成
- カメラOCR連携
- 複数デッキ
- Markdown対応
- 数式表示 MathJax
- 画像問題対応
