#!/usr/bin/env python3
"""新增常用词组 200 个到 data.js（c:'phrases'），并写入 tiers。幂等：已存在则跳过。"""
import re, os

HOME = os.path.expanduser("~")
PROJ = os.path.join(HOME, "workspace/english-game-v2")

# (英文词组, 中文, 级别)  1=初级高频 2=中级常用
PHRASES = [
# 日常起居
("get up","起床",1),("wake up","醒来；叫醒",1),("brush your teeth","刷牙",1),
("wash your face","洗脸",1),("take a shower","洗澡",1),("get dressed","穿好衣服",1),
("have breakfast","吃早餐",1),("go to work","去上班",1),("take a break","休息一下",1),
("have lunch","吃午饭",1),("get off work","下班",2),("go home","回家",1),
("do the dishes","洗碗",2),("do the laundry","洗衣服",2),("take out the trash","倒垃圾",2),
("go to bed","上床睡觉",1),("fall asleep","入睡",2),("stay up late","熬夜",2),
("get some sleep","睡一会儿",2),("have dinner","吃晚饭",1),
# 外出交通
("go out","出去",1),("come back","回来",1),("take off","起飞；脱下",1),
("get on","上车；登上",1),("get off","下车",1),("take a taxi","打车",2),
("catch a bus","赶公交",2),("miss the bus","误了公交",2),("transfer to","换乘",2),
("arrive at","到达",2),("pick up","捡起；接人",1),("drop off","送下；放下",2),
("pull over","靠边停车",2),("run out of","用完；耗尽",2),("fill up","加满（油）",2),
("take a walk","散步",2),("go for a walk","去散步",2),("show up","出现；到场",2),
("turn up","出现；调高",2),("hurry up","赶紧",1),
# 社交交流
("hang out","聚会；闲逛",2),("catch up","叙旧；赶上",2),("keep in touch","保持联系",2),
("get in touch","取得联系",2),("meet up","碰面",2),("have fun","玩得开心",1),
("by the way","顺便说一下",1),("come on","加油；拜托",1),("take care","保重",1),
("see you later","回头见",1),("long time no see","好久不见",1),("make friends","交朋友",2),
("get along","相处融洽",2),("break up","分手",2),("make up","和好",2),
("fall in love","坠入爱河",2),("ask out","约出去",2),("turn down","拒绝；调低",2),
("cheer up","振作起来",2),("calm down","冷静下来",2),
# 学习工作
("work hard","努力工作",1),("work overtime","加班",2),("take notes","记笔记",1),
("do homework","做作业",1),("hand in","上交",2),("figure out","弄明白",2),
("work out","解决；锻炼",2),("find out","查明",2),("look up","查阅",2),
("write down","写下来",2),("read aloud","大声朗读",2),("pay attention","注意",1),
("focus on","专注于",2),("get started","开始",2),("keep going","继续坚持",2),
("give up","放弃",2),("go on","继续",2),("meet the deadline","赶上截止日期",2),
("call in sick","请病假",2),("take turns","轮流",2),
# 情感表达
("look forward to","期待",2),("get excited","感到兴奋",2),("feel blue","感到忧郁",2),
("get over","克服；恢复",2),("let go","放手",2),("hold on","坚持住；等一下",2),
("hang in there","坚持下去",2),("burn out","精疲力竭",2),("chill out","放松",2),
("tear up","眼含泪水",2),("warm up","热身；暖场",2),("light up","点亮；容光焕发",2),
("freak out","吓坏了；抓狂",2),("bottle up","压抑（情绪）",2),("open up","敞开心扉",2),
# 常用搭配
("make a decision","做决定",2),("make progress","取得进步",2),("make sense","有道理",2),
("make sure","确保",2),("make an effort","努力",2),("take a look","看一看",1),
("take part","参加",2),("take place","发生；举行",2),("take care of","照顾",2),
("take advantage of","利用",2),("have an idea","有个主意",1),("have a good time","玩得愉快",1),
("do your best","尽力",1),("do exercise","锻炼",2),("keep fit","保持健康",2),
("get better","好转",2),("get well","康复",2),("keep quiet","保持安静",2),
("stay calm","保持冷静",2),("pay for","付款",1),("wait for","等待",1),
("look for","寻找",1),("ask for","请求",2),("apply for","申请",2),
("care about","关心",2),("worry about","担心",2),("think about","思考；考虑",2),
("talk about","谈论",2),("hear about","听说",2),("learn about","了解",2),
("apologize for","为…道歉",2),("prepare for","为…做准备",2),("belong to","属于",2),
("lead to","导致",2),("get used to","习惯于",2),("be used to","习惯于",2),
("be good at","擅长",2),("be afraid of","害怕",2),("be proud of","为…自豪",2),
("be familiar with","熟悉",2),
# 固定表达
("of course","当然",1),("no problem","没问题",1),("excuse me","劳驾；对不起",1),
("thank you","谢谢",1),("you are welcome","不客气",1),("good luck","祝好运",1),
("have a nice day","祝你有美好的一天",1),("as soon as possible","尽快",2),("by accident","偶然；意外地",2),
("on purpose","故意地",2),("in fact","事实上",2),("in general","总的来说",2),
("at first","起初",2),("at last","终于",2),("at least","至少",2),
("at most","至多",2),("in time","及时",2),("on time","准时",2),
("sooner or later","迟早",2),("now and then","偶尔",2),("here and there","到处",2),
("more or less","或多或少",2),("up to date","最新的",2),("out of date","过时的",2),
("once upon a time","从前",2),
# 短语动词
("turn on","打开",1),("turn off","关闭",1),("put on","穿上；戴上",1),
("put down","放下",2),("put away","收起来",2),("put off","推迟",2),
("bring back","带回",2),("bring up","提出；养育",2),("give back","归还",2),
("give away","赠送；泄露",2),("throw away","扔掉",2),("break down","故障；崩溃",2),
("break into","闯入",2),("cut off","切断",2),("cut down","削减",2),
("slow down","慢下来",2),("speed up","加速",2),("grow up","长大",2),
("set up","建立",2),("clean up","清理",2),("clear up","澄清；放晴",2),
("use up","用完",2),("eat up","吃光",2),("drink up","喝光",2),
("finish up","完成",2),("wrap up","结束；包裹",2),("sum up","总结",2),
("keep up","保持；跟上",2),("catch up with","赶上",2),("come up with","想出",2),
("end up","以…告终",2),("blow up","爆炸；放大",2),("hold up","举起；耽搁",2),
("mix up","混淆",2),("mess up","搞砸",2),("fix up","修理；安排",2),
("look after","照顾",2),("run into","偶遇",2),("get through","度过；接通",2),
("go through","经历",2),
]

def main():
    assert len(PHRASES) == 200, f"count={len(PHRASES)}"
    # 内部去重
    seen = set(); dups = []
    for en, _, _ in PHRASES:
        if en in seen: dups.append(en)
        seen.add(en)
    assert not dups, f"internal dups: {dups}"

    dp = os.path.join(PROJ, "data.js")
    txt = open(dp, encoding="utf-8").read()
    existing = set(m.group(1) for m in re.finditer(r'\{w:"([^"]+)"', txt))
    clash = [en for en, _, _ in PHRASES if en in existing]
    if clash:
        print("CLASH with existing WORDS:", clash)
        return

    # 插入到 numbers 词条之后、SENTENCES 之前
    anchor = 'WORDS.push({w:"every",zh:"每个的",c:"numbers"});\n'
    assert anchor in txt
    block = '/* 常用词组 */\n' + '\n'.join(
        f'WORDS.push({{w:"{en}",zh:"{zh}",c:"phrases"}});' for en, zh, _ in PHRASES
    ) + '\n'
    txt = txt.replace(anchor, anchor + block)
    open(dp, "w", encoding="utf-8").write(txt)

    # tiers
    tp = os.path.join(PROJ, "tiers.js")
    tsrc = open(tp, encoding="utf-8").read().rstrip()
    assert tsrc.endswith("};")
    add = "," + ",".join(f'"{en}":{t}' for en, _, t in PHRASES)
    tsrc = tsrc[:-2] + add + "};"
    open(tp, "w", encoding="utf-8").write(tsrc)
    print(f"added {len(PHRASES)} phrases; tier1={sum(1 for _,_,t in PHRASES if t==1)}")

if __name__ == "__main__":
    main()
