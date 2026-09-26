# 曼荼羅palette

色と言葉を選び、自由に配置した曼荼羅から、自分のストーリーを見つけるWebアプリです。

## 使い方

1. 色とキーワードカードを選ぶ
2. 好きなフィールドを画像から選ぶ
3. カードを自由に動かす（サイズ変更・削除も可能）
4. 完成した作品を眺め、ストーリーを書く
5. 作品と文章を1枚のPNG画像で保存する

キーワードの表示・非表示を切り替えられます。入力内容は外部AIやデータベースへ送信しません。再読み込みすると入力・配置は消えるため、書き終えたら画像保存してください。

## 開発

Node.js 24 / pnpm 11.25.0

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

## 公開設定

GitHubのSettings → Pages → SourceでGitHub Actionsを選択します。mainへの更新でビルドし、dist内のサイト用ファイルだけを配信します。

公開予定URL: https://ak8841ra-glitch.github.io/mandala-palette-public/
