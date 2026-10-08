#!/usr/bin/env python3
"""护理术语卡片 3 版样式样张（homeostasis 为例），供用户选择。"""
import os
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser("~")
OUT = os.path.join(HOME, "workspace/english-game-v2/nursing/samples")
os.makedirs(OUT, exist_ok=True)
FB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SIZE = 768

def tw(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0], b[3] - b[1]

def fit(d, s, path, start, maxw):
    sz = start
    while sz > 18:
        f = ImageFont.truetype(path, sz)
        w, _ = tw(d, s, f)
        if w <= maxw:
            return f
        sz -= 4
    return ImageFont.truetype(path, 18)

def grad_bg(c1, c2):
    img = Image.new("RGB", (SIZE, SIZE), c1)
    d = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / SIZE
        d.line([(0, y), (SIZE, y)],
               fill=(int(c1[0]+(c2[0]-c1[0])*t), int(c1[1]+(c2[1]-c1[1])*t), int(c1[2]+(c2[2]-c1[2])*t)))
    return img, ImageDraw.Draw(img)

word, zh = "homeostasis", "稳态（内环境相对稳定）"

# A: 极简排印风
img, d = grad_bg((235, 243, 250), (218, 232, 244))
d.ellipse([SIZE-260, -120, SIZE+120, 260], outline=(255,255,255), width=3)
f = fit(d, word, FB, 130, SIZE-120)
w, h = tw(d, word, f)
d.text(((SIZE-w)/2, SIZE/2-h/2-40), word, font=f, fill=(29,29,31))
fz = fit(d, zh, FR, 56, SIZE-140)
w2, h2 = tw(d, zh, fz)
d.text(((SIZE-w2)/2, SIZE/2+80), zh, font=fz, fill=(110,110,115))
img.save(f"{OUT}/vA_typo.jpg", "JPEG", quality=82)

# B: 学术卡片风（白卡 + 章节标签）
img, d = grad_bg((238, 242, 246), (226, 232, 240))
card = [90, 190, SIZE-90, SIZE-190]
d.rounded_rectangle(card, radius=36, fill=(255,255,255))
d.rounded_rectangle(card, radius=36, outline=(210,218,228), width=2)
tag = "BIOL 235 · Ch.1"
ft = ImageFont.truetype(FB, 34)
wt, ht = tw(d, tag, ft)
d.text(((SIZE-wt)/2, 250), tag, font=ft, fill=(66,133,244))
f = fit(d, word, FB, 110, SIZE-260)
w, h = tw(d, word, f)
d.text(((SIZE-w)/2, 330), word, font=f, fill=(29,29,31))
d.line([(SIZE/2-60, 330+h+24), (SIZE/2+60, 330+h+24)], fill=(66,133,244), width=4)
fz = fit(d, zh, FR, 52, SIZE-260)
w2, h2 = tw(d, zh, fz)
d.text(((SIZE-w2)/2, 330+h+60), zh, font=fz, fill=(80,80,86))
img.save(f"{OUT}/vB_card.jpg", "JPEG", quality=82)

# C: 中文主导风（中文大、英文小）
img, d = grad_bg((242, 240, 248), (230, 226, 242))
d.ellipse([-160, SIZE-300, 220, SIZE+80], outline=(255,255,255), width=3)
fz = fit(d, "稳态", FB, 170, SIZE-160)
w2, h2 = tw(d, "稳态", fz)
d.text(((SIZE-w2)/2, SIZE/2-h2/2-50), "稳态", font=fz, fill=(29,29,31))
f = fit(d, word, FR, 72, SIZE-160)
w, h = tw(d, word, f)
d.text(((SIZE-w)/2, SIZE/2+90), word, font=f, fill=(110,110,115))
fe = ImageFont.truetype(FR, 40)
e2 = "内环境相对稳定的状态"
w3, h3 = tw(d, e2, fe)
d.text(((SIZE-w3)/2, SIZE/2+170), e2, font=fe, fill=(140,140,146))
img.save(f"{OUT}/vC_zhfirst.jpg", "JPEG", quality=82)

print("samples done:", os.listdir(OUT))
