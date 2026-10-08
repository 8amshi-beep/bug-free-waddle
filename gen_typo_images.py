#!/usr/bin/env python3
"""为日期/时间/数字类单词生成排印风配图：浅色渐变 + 英文大字 + 中文小字。
768px, JPEG q80，与现有 images/<sanitized>.jpg 规范一致。幂等：已存在则跳过。"""
import os, re, random
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser("~")
IMGDIR = os.path.join(HOME, "workspace/english-game-v2/images")
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SIZE = 768

# 按分类给柔和渐变（浅色 Apple 风）
PALETTES = {
    "time": [((235, 243, 255), (214, 230, 250)), ((240, 245, 255), (222, 232, 248))],
    "numbers": [((255, 244, 230), (250, 228, 205)), ((255, 248, 238), (248, 232, 210))],
    "function": [((243, 235, 255), (228, 214, 250)), ((248, 240, 255), (232, 222, 248))],
    "phrases": [((232, 245, 235), (210, 232, 214)), ((238, 248, 240), (218, 236, 222))],
}
random.seed(7)

def text_w(draw, s, font):
    b = draw.textbbox((0, 0), s, font=font)
    return b[2] - b[0], b[3] - b[1]

def fit_font(draw, s, path, start, max_w):
    size = start
    while size > 20:
        f = ImageFont.truetype(path, size)
        w, _ = text_w(draw, s, f)
        if w <= max_w:
            return f
        size -= 6
    return ImageFont.truetype(path, 20)

def make(word, zh, cat, accent):
    c1, c2 = random.choice(PALETTES.get(cat, PALETTES["time"]))
    img = Image.new("RGB", (SIZE, SIZE), c1)
    d = ImageDraw.Draw(img)
    # 对角渐变
    for y in range(SIZE):
        t = y / SIZE
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        d.line([(0, y), (SIZE, y)], fill=(r, g, b))
    # 装饰圆环（极淡）
    d.ellipse([SIZE - 260, -120, SIZE + 120, 260], outline=(255, 255, 255, 90), width=3)
    d.ellipse([-160, SIZE - 300, 220, SIZE + 80], outline=(255, 255, 255, 70), width=3)
    # 英文大字（首个释义前的英文单词）
    fen = fit_font(d, word, FONT_B, 150, SIZE - 120)
    w, h = text_w(d, word, fen)
    d.text(((SIZE - w) / 2, SIZE / 2 - h / 2 - 40), word, font=fen, fill=(29, 29, 31))
    # 中文小字（取首个释义，太长则缩小）
    zh1 = zh.split("；")[0]
    fzh = fit_font(d, zh1, FONT_R, 64, SIZE - 160)
    w2, h2 = text_w(d, zh1, fzh)
    d.text(((SIZE - w2) / 2, SIZE / 2 + 70), zh1, font=fzh, fill=(110, 110, 115))
    return img

def main():
    import re as _re
    words = []
    txt = open(os.path.join(HOME, "workspace/english-game-v2/data.js"), encoding="utf-8").read()
    for m in _re.finditer(r'\{w:"([^"]+)",zh:"([^"]*)",c:"(time|numbers|function|phrases)"\}', txt):
        w, zh, c = m.groups()
        key = _re.sub(r"[^a-z0-9]+", "_", w.lower().strip())
        words.append((key, w, zh.split("；")[0], c))
    # 去重（second 出现两次）
    seen, uniq = set(), []
    for k, w, zh, c in words:
        if k not in seen:
            seen.add(k)
            uniq.append((k, w, zh, c))
    done = skipped = 0
    for k, w, zh, c in uniq:
        dst = os.path.join(IMGDIR, k + ".jpg")
        if os.path.exists(dst):
            skipped += 1
            continue
        make(w, zh, c, None).save(dst, "JPEG", quality=80)
        done += 1
    print(f"generated: {done}, skipped(existing): {skipped}, total: {len(uniq)}")

if __name__ == "__main__":
    main()
