import { useState } from 'react'

type MoodKey = 'pink' | 'blue' | 'green'
type GalleryKey = 'blue' | 'purple' | 'pink' | 'green'
const base = `${import.meta.env.BASE_URL}assets/`
const moodArt: Record<MoodKey, { name: string; src: string }> = {
  pink: { name: 'ピンク', src: `${base}creator/mood-pink.jpg` },
  blue: { name: '青', src: `${base}creator/mood-blue.jpg` },
  green: { name: '緑', src: `${base}creator/mood-green.jpg` },
}
const galleryArt: Record<GalleryKey, { name: string; src: string; alt: string; caption: string }> = {
  blue: { name: '青', src: `${base}creator/art-blue.jpg`, alt: '青と緑の点や線を重ねた手描きの曼荼羅', caption: '点と色を重ねて描いた作品' },
  purple: { name: '紫', src: `${base}creator/art-purple.jpg`, alt: '紫と桃色で花を描いた手描きの曼荼羅', caption: '花びらの中に光を散らした作品' },
  pink: { name: '桃', src: `${base}creator/art-pink.jpg`, alt: '布バッグに桃色で描いた手描きの曼荼羅', caption: '日常に持ち歩けるよう描いた作品' },
  green: { name: '緑', src: `${base}creator/art-green.jpg`, alt: '緑の紙に白と黒で描いた手描きの曼荼羅', caption: '緑の濃淡と細い線を重ねた作品' },
}

export default function CreatorRoom({ onHome }: { onHome: () => void }) {
  const [color, setColor] = useState<MoodKey>('pink')
  const selected = moodArt[color]
  return <section className={`creator-room creator-room--${color}`} aria-labelledby="creator-title">
    <nav className="creator-nav" aria-label="作者の展示室">
      <button type="button" className="back-button" onClick={onHome}>← 館内マップへ戻る</button>
      <span>作者の展示室</span>
    </nav>
    <header className="creator-hero" style={{ backgroundImage: `url(${selected.src})` }}>
      <div className="creator-profile">
        <p className="exhibit-number">CREATOR'S ROOM</p>
        <div className="creator-name-row"><img src={`${base}creator/asuka-icon.png`} alt="ラベンダー色の曼荼羅模様を背景にしたアスカのアイコン" /><div><h1 id="creator-title">アスカ</h1><p>「こんなのがあったらいいな」と思ったものを、AIと一緒に作っています。</p></div></div>
        <fieldset className="art-colors"><legend>今、気になる色は？</legend><div>{(Object.keys(moodArt) as MoodKey[]).map(key => <button key={key} type="button" aria-pressed={color === key} onClick={() => setColor(key)}><i className={`color-dot color-dot--${key}`} aria-hidden="true" />{moodArt[key].name}</button>)}</div></fieldset>
        <p className="creator-background-note">選んだ色に合わせて、背景の曼荼羅が変わります。</p>
      </div>
    </header>
    <section className="creator-section" aria-labelledby="main-work-title">
      <div className="exhibit-heading"><p>MAIN WORK</p><h2 id="main-work-title">曼荼羅palette</h2></div>
      <div className="main-work-grid"><img src={`${base}creator/mandala-palette-intro.png`} alt="スマートフォンで曼荼羅paletteを使う様子とアプリ画面" /><div><h3>答えを決めつけない、自己整理の時間</h3><p>色と言葉を入り口に、自分の気持ちを見つめ、原画のパーツを組み合わせて自分だけの曼荼羅をつくるWebアプリです。</p><dl><div><dt>つくったもの</dt><dd>色と言葉を選んで眺める部屋と、自由に曼荼羅をつくるアトリエ</dd></div><div><dt>工夫したこと</dt><dd>気持ちを断定せず、迷わず進められる言葉と画面の流れ</dd></div></dl><button type="button" className="button-primary" onClick={onHome}>曼荼羅paletteをひらく</button></div></div>
    </section>
    <section className="creator-section" aria-labelledby="art-gallery-title">
      <div className="exhibit-heading"><p>HAND-DRAWN MANDALA ART</p><h2 id="art-gallery-title">手描き曼荼羅アート作品</h2><span>一枚ずつ手で描いた作品を、全体が見える形で展示しています。</span></div>
      <div className="creator-gallery">{(Object.keys(galleryArt) as GalleryKey[]).map(key => <figure key={key}><img src={galleryArt[key].src} alt={galleryArt[key].alt} /><figcaption>{galleryArt[key].name} — {galleryArt[key].caption}</figcaption></figure>)}</div>
    </section>
    <section className="creator-section" aria-labelledby="other-works-title">
      <div className="exhibit-heading"><p>OTHER WORKS</p><h2 id="other-works-title">ほかにつくったもの</h2></div>
      <div className="creator-other-works">
        <article><img className="work-media work-media--memo" src={`${base}creator/work-memo.jpg`} alt="業務メモアプリの入力画面" loading="lazy" /><h3>業務メモアプリ</h3><p><strong>つくったもの</strong>仕事で覚えたことをスマホですぐ残せる、自分専用のメモアプリ。</p><p><strong>工夫したこと</strong>書く・探す・書き出す・バックアップをシンプルにし、オフラインでも使えるようにしました。</p></article>
        <article><video className="work-media" controls playsInline preload="metadata" aria-label="3D住宅設備のデモ動画"><source src={`${base}creator/3d-equipment-demo.mp4`} type="video/mp4" />動画を再生できないブラウザです。</video><h3>3D住宅設備</h3><p><strong>つくったもの</strong>住宅設備を立体で確認できる短いデモ。</p><p><strong>工夫したこと</strong>形や配置がひと目で伝わる視点と動きを考えました。</p></article>
        <article><img className="work-media" src={`${base}creator/imaginary-pet.jpg`} alt="白い毛並みと翼を持つイマジナリーペット" loading="lazy" /><h3>イマジナリーペットGPT</h3><p><strong>つくったもの</strong>会話から、自分だけの空想のペットと出会えるGPT。</p><p><strong>工夫したこと</strong>答える時間も楽しく、できあがった存在に愛着を持てる体験を目指しました。</p><a href="https://note.com/mandalasuka/n/n38fd1fc6e915" target="_blank" rel="noreferrer">紹介記事を読む</a></article>
      </div>
    </section>
    <div className="creator-bottom"><button type="button" className="back-button" onClick={onHome}>館内マップへ戻る</button></div>
  </section>
}
