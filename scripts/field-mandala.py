# Generates public/assets/field-mandala.svg: python3 scripts/field-mandala.py public/assets/field-mandala.svg
import math, sys

# Stroke colors borrowed from the earlier field SVGs: lavender, blue-grey, sand.
L, B, S = '#B6A4C5', '#A9BCCB', '#C9B09E'
DASH_RAY = ' stroke-dasharray="2 6"'
o = []
a = o.append

a('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="none" stroke-linecap="round" stroke-linejoin="round">')
a('<title>Mandala palette — shared mandala field</title>')
a('<desc>線だけで描いた共通の配置フィールド。中心からの放射線、過去から未来へ続く横線、3つの点を結ぶ三角が、花の模様の中に控えめに溶け込んでいる。</desc>')
a('<defs>')
a('  <path id="outer-petal" d="M0 0 C-20-18-22-46 0-62 C22-46 20-18 0 0Z"/>')
a('  <path id="mid-petal" d="M0 0 C-58-62-52-150 0-200 C52-150 58-62 0 0Z"/>')
a('  <path id="inner-petal" d="M0 0 C-14-14-15-36 0-48 C15-36 14-14 0 0Z"/>')
a('</defs>')

a('<g transform="translate(500 500)">')
a(f'  <circle r="455" stroke="{L}" stroke-opacity=".5" stroke-width="1.2"/>')
a(f'  <circle r="442" stroke="{B}" stroke-opacity=".45"/>')
a(f'  <g stroke="{L}" stroke-opacity=".55">')
for i in range(32):
    a(f'    <use href="#outer-petal" transform="rotate({i * 360 / 32:.2f}) translate(0 -372)"/>')
a('  </g>')
a(f'  <circle r="330" stroke="{S}" stroke-opacity=".5" stroke-dasharray="1.5 8"/>')

# Rays from the center: long solid ones alternate with short dashed ones.
a(f'  <g stroke="{B}" stroke-width=".9">')
for i in range(24):
    t = math.radians(i * 15)
    long = i % 2 == 0
    r0, r1 = (104, 318) if long else (150, 300)
    opacity = '.45' if long else '.28'
    dash = '' if long else DASH_RAY
    a(f'    <path d="M{r0 * math.sin(t):.1f} {-r0 * math.cos(t):.1f} L{r1 * math.sin(t):.1f} {-r1 * math.cos(t):.1f}" stroke-opacity="{opacity}"{dash}/>')
a('  </g>')

a(f'  <g stroke="{L}" stroke-opacity=".5">')
for i in range(12):
    a(f'    <use href="#mid-petal" transform="rotate({i * 30 + 15}) translate(0 -96)"/>')
a('  </g>')
a('</g>')

# Past → present → future: one horizontal line with marks at 20% and 80%; the center flower sits at 50%.
a(f'<g stroke="{S}" stroke-opacity=".75">')
a('  <path d="M70 500 H404 M596 500 H930"/>')
for x in (200, 800):
    a(f'  <path d="M{x} 490 L{x + 10} 500 L{x} 510 L{x - 10} 500Z"/>')
a('</g>')

# The three spots of the ①②③ guide, joined by a light dashed triangle.
pts = [(220, 760), (780, 760), (500, 220)]
a(f'<g stroke="{B}">')
a(f'  <path d="M{pts[0][0]} {pts[0][1]} L{pts[1][0]} {pts[1][1]} L{pts[2][0]} {pts[2][1]}Z" stroke-opacity=".5" stroke-dasharray="6 7"/>')
for x, y in pts:
    a(f'  <circle cx="{x}" cy="{y}" r="16" stroke-opacity=".6"/>')
    a(f'  <circle cx="{x}" cy="{y}" r="5" stroke="{L}" stroke-opacity=".8"/>')
a('</g>')

a('<g transform="translate(500 500)">')
a(f'  <circle r="96" stroke="{S}" stroke-opacity=".6" stroke-width="1.1"/>')
a(f'  <g stroke="{L}" stroke-opacity=".7">')
for i in range(16):
    alt = '' if i % 2 == 0 else f' stroke="{S}"'
    a(f'    <use href="#inner-petal" transform="rotate({i * 22.5}) translate(0 -30)"{alt}/>')
a('  </g>')
a(f'  <circle r="16" stroke="{S}" stroke-opacity=".8"/>')
a(f'  <circle r="5" stroke="{L}"/>')
a('</g>')
a('</svg>')

open(sys.argv[1], 'w').write('\n'.join(o) + '\n')
