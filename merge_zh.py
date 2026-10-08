#!/usr/bin/env python3
"""合并重复单词的首词条中文释义：首条 zh = 全部不同释义（；连接）。
其余词条保持不变。幂等：已合并的不再重复。"""
import re, sys

PAT = re.compile(r'WORDS\.push\(\{w:"([^"]+)",zh:"([^"]*)",c:"([^"]+)"\}\);')

def process(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    # 收集每个词的全部释义（按出现顺序去重）
    order = []
    zhmap = {}
    for ln in lines:
        m = PAT.search(ln)
        if not m: continue
        w, zh, c = m.groups()
        if w not in zhmap:
            zhmap[w] = []
            order.append(w)
        for z in zh.split("；"):
            z = z.strip()
            if z and z not in zhmap[w]:
                zhmap[w].append(z)
    # 手工补全：check 加上"支票"
    if "check" in zhmap and "支票" not in zhmap["check"]:
        zhmap["check"].append("支票")
    # 只改每个词第一次出现的行
    seen = set()
    changed = 0
    for i, ln in enumerate(lines):
        m = PAT.search(ln)
        if not m: continue
        w, zh, c = m.groups()
        if w in seen: continue
        seen.add(w)
        if len(zhmap[w]) > 1:
            merged = "；".join(zhmap[w])
            if merged != zh:
                lines[i] = ln.replace(f'zh:"{zh}"', f'zh:"{merged}"', 1)
                changed += 1
                if changed <= 10:
                    print(f"  {w}: {zh} -> {merged}")
    open(path, "w", encoding="utf-8").write("\n".join(lines))
    print(f"{path}: merged {changed} first-entries")
    return changed

total = 0
for p in ["data.js", "data2.js"]:
    total += process(p)
print("TOTAL:", total)
