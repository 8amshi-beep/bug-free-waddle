#!/usr/bin/env python3
"""护理术语图批量生成 - vA 极简排印风（用户已选定）。
768px JPEG q82，输出 images/nurs/ch1/<fn>.jpg。幂等。"""
import os, re
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser("~")
PROJ = os.path.join(HOME, "workspace/english-game-v2")
OUTDIR = os.path.join(PROJ, "images/nurs/ch1")
os.makedirs(OUTDIR, exist_ok=True)
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

def make(word, zh):
    c1, c2 = (235, 243, 250), (218, 232, 244)
    img = Image.new("RGB", (SIZE, SIZE), c1)
    d = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / SIZE
        d.line([(0, y), (SIZE, y)],
               fill=(int(c1[0]+(c2[0]-c1[0])*t), int(c1[1]+(c2[1]-c1[1])*t), int(c1[2]+(c2[2]-c1[2])*t)))
    d.ellipse([SIZE-260, -120, SIZE+120, 260], outline=(255,255,255), width=3)
    d.ellipse([-160, SIZE-300, 220, SIZE+80], outline=(255,255,255), width=3)
    f = fit(d, word, FB, 120, SIZE-110)
    w, h = tw(d, word, f)
    d.text(((SIZE-w)/2, SIZE/2-h/2-46), word, font=f, fill=(29,29,31))
    zh1 = zh.split("（")[0]
    fz = fit(d, zh1, FR, 58, SIZE-130)
    w2, h2 = tw(d, zh1, fz)
    d.text(((SIZE-w2)/2, SIZE/2+78), zh1, font=fz, fill=(110,110,115))
    return img

def main():
    txt = open(os.path.join(PROJ, "nursing/nurs_ch1.js"), encoding="utf-8").read()
    terms = re.findall(r'\{w:"([^"]+)",zh:"([^"]*)"', txt)
    done = skip = 0
    for w, zh in terms:
        fn = re.sub(r"[^a-z0-9]+", "_", w.lower().strip()) + ".jpg"
        dst = os.path.join(OUTDIR, fn)
        if os.path.exists(dst):
            skip += 1
            continue
        make(w, zh).save(dst, "JPEG", quality=82)
        done += 1
    print(f"generated: {done}, skipped: {skip}, total: {len(terms)}")

if __name__ == "__main__":
    main()
