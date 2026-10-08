// ============================================================
// 名著名篇跟读包（草稿 · 待用户确认后并入 passages.js 再部署）
// 2026-10-06 准备
//
// 背景：用户明确要求短文栏"最好是些著名短文或者是英语教材必学短文"，
// 但已上线的 21 篇全部是原创故事。本包补 7 篇真正的公版名著名篇。
//
// 格式与 passages.js 的 PASSAGES 条目完全一致：
// {id, t, zh, lv, d, text[], trans[]}，text/trans 段落一一对应。
// id 用 c01-c07，与现有 r01-r21 不冲突；lv 照旧 1/2/3。
// app.js 的列表/筛选/已读/词汇点读都是按 PASSAGES 动态渲染，无需改代码。
//
// 上线步骤（交付时执行）：
//  1. 把下面 CLASSICS 数组的条目追加进 passages.js 的 PASSAGES 数组（在 "];" 之前）
//  2. 用云技能部署脚本重新部署：~/workspace/skills/cloudflare/bin/pages_deploy.py <dir> lexi-english
//  3. 真机验证短文列表出现 28 篇、朗读/跟读/已读正常
//
// 版权核查（全部为公有领域，可全文使用）：
//  c01 诗篇23篇（钦定本 KJV, 1611）——公版
//  c02 狄金森《希望是长着羽毛的东西》(1890, 诗人逝世1886)——公版
//  c03 伊索《牧童与狼》汤森英译本(1867, 译者逝世1900)——公版
//  c04 马克·吐温《汤姆·索亚历险记》第二章开头(1876)——公版（节选，断点在已核实的原文处）
//  c05 弗罗斯特《未选择的路》(1916，美国公版)
//  c06 林肯《葛底斯堡演说》(1863，Bliss 底本 272 词)——公版
//  c07 吉卜林《如果》(1910，美国公版)
// ============================================================
const CLASSICS = [
{id:"c01", t:"Psalm 23", zh:"诗篇23篇", lv:1, d:"圣经·流传最广的安慰之诗",
 text:["The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
 "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
 "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."],
 trans:["耶和华是我的牧者，我必不至缺乏。他使我躺卧在青草地上，领我在可安歇的水边。",
 "他使我的灵魂苏醒，为自己的名引导我走义路。我虽然行过死荫的幽谷，也不怕遭害，因为你与我同在；你的杖、你的竿都安慰我。",
 "在我敌人面前，你为我摆设筵席；你用油膏了我的头，使我的福杯满溢。我一生一世必有恩惠慈爱随着我，我且要住在耶和华的殿中，直到永远。"]},
{id:"c02", t:"Hope Is the Thing with Feathers", zh:"希望是长着羽毛的东西", lv:1, d:"狄金森·最著名的希望之诗",
 text:["Hope is the thing with feathers — That perches in the soul — And sings the tune without the words — And never stops — at all —",
 "And sweetest — in the Gale — is heard — And sore must be the storm — That could abash the little bird / That kept so many warm —",
 "I've heard it in the chillest land — And on the strangest sea — Yet — never — in Extremity, / It asked a crumb — of me."],
 trans:["希望是长着羽毛的东西——栖息在灵魂里——唱着没有歌词的曲调——永不停歇——",
 "在狂风中，它的歌声最为甜美；而能让这只温暖了无数人的小鸟屈服的——必定是可怕的风暴——",
 "我在最寒冷的大地上听过它，在最陌生的海面上听过它；然而——即使在最艰难的时刻——它也从未向我索取过一粒面包屑。"]},
{id:"c03", t:"The Shepherd Boy and the Wolf", zh:"牧童与狼", lv:2, d:"伊索寓言·1867年汤森英译原版",
 text:["A Shepherd-boy, who watched a flock of sheep near a village, brought out the villagers three or four times by crying out, \"Wolf! Wolf!\" and when his neighbors came to help him, laughed at them for their pains.",
 "The Wolf, however, did truly come at last. The Shepherd-boy, now really alarmed, shouted in an agony of terror: \"Pray, do come and help me; the Wolf is killing the sheep\"; but no one paid any heed to his cries, nor rendered any assistance. The Wolf, having no cause of fear, at his leisure lacerated or destroyed the whole flock.",
 "There is no believing a liar, even when he speaks the truth."],
 trans:["一个在村边放羊的牧童，三番四次地大喊\"狼来了！狼来了！\"把村民们骗出来，等邻居们赶来帮忙，他却嘲笑他们白跑一趟。",
 "然而狼最后真的来了。牧童这下真的慌了，惊恐万分地大喊：\"求求你们，快来帮帮我，狼在咬我的羊！\"可没有人理会他的呼喊，也没有人来帮忙。狼毫无惧色，慢条斯理地把整群羊咬死咬伤。",
 "说谎的人，即使说了真话，也没人相信。"]},
{id:"c04", t:"Whitewashing the Fence", zh:"粉刷栅栏", lv:2, d:"马克·吐温《汤姆·索亚历险记》·第二章开头节选",
 text:["SATURDAY morning was come, and all the summer world was bright and fresh, and brimming with life. There was a song in every heart; and if the heart was young the music issued at the lips. There was cheer in every face and a spring in every step. The locust-trees were in bloom and the fragrance of the blossoms filled the air.",
 "Tom appeared on the sidewalk with a bucket of whitewash and a long-handled brush. He surveyed the fence, and all gladness left him and a deep melancholy settled down upon his spirit. Thirty yards of board fence nine feet high. Life to him seemed hollow, and existence but a burden. Sighing, he dipped his brush and passed it along the topmost plank; repeated the operation; did it again; compared the insignificant whitewashed streak with the far-reaching continent of unwhitewashed fence, and sat down on a tree-box discouraged.",
 "He began to think of the fun he had planned for this day, and his sorrows multiplied. Soon the free boys would come tripping along on all sorts of delicious expeditions, and they would make a world of fun of him for having to work — the very thought of it burnt him like fire. At this dark and hopeless moment an inspiration burst upon him!",
 "He took up his brush and went tranquilly to work. Ben Rogers hove in sight presently — the very boy, of all boys, whose ridicule he had been dreading. Ben's gait was the hop-skip-and-jump — proof enough that his heart was light and his anticipations high. He was eating an apple, and giving a long, melodious whoop, at intervals, followed by a deep-toned ding-dong-dong, ding-dong-dong, for he was personating a steamboat.",
 "Tom went on whitewashing — paid no attention to the steamboat. Ben stared a moment and then said: \"Hi-Yi! You're up a stump, ain't you!\" No answer. Tom surveyed his last touch with the eye of an artist, then he gave his brush another gentle sweep and surveyed the result, as before. Ben ranged up alongside of him. Tom's mouth watered for the apple, but he stuck to his work. Tom wheeled suddenly and said: \"Why, it's you, Ben! I warn't noticing.\""],
 trans:["星期六的早晨到了，整个夏日的世界明亮、清新，充满生机。人人心里都唱着歌；年轻的心，歌声便从唇边流淌出来。人人脸上都带着喜悦，脚步都轻快有力。洋槐树开花了，花香弥漫在空气中。",
 "汤姆拎着一桶白石灰、扛着一把长柄刷子出现在人行道上。他打量了一下栅栏，所有的喜悦都消失了，深深的忧郁笼罩了他的心。三十码长的木板栅栏，九英尺高。在他看来，人生空虚，活着只是负担。他叹了口气，蘸了蘸刷子，在最上面一块木板上刷了一下；又刷一下；再刷一下；把那道微不足道的白色条纹和一望无际的未刷栅栏对比了一下，泄气地坐在了树箱上。",
 "他开始想起今天原本计划好的种种乐趣，烦恼顿时加倍。不一会儿，那些自由自在的男孩们就会蹦蹦跳跳地经过，去参加各种美妙的探险，而他们一定会拿他被迫干活这件事好好取笑他——光是想到这儿，他就像被火烧一样难受。就在这个黑暗绝望的时刻，一个灵感突然闪现！",
 "他拿起刷子，平静地干起活来。不一会儿，本·罗杰斯出现了——所有男孩中，他最怕的就是这个男孩的嘲笑。本走路一蹦一跳，足以证明他心情轻快、满怀期待。他一边吃着苹果，一边每隔一会儿就发出一声悠长悦耳的呼啸，接着是低沉的\"丁—当—当，丁—当—当\"，因为他正在扮演一艘汽船。",
 "汤姆继续刷墙——对那艘\"汽船\"理都不理。本盯着他看了一会儿，然后说：\"嘿哟！你栽在这儿了吧，是不是！\"没有回答。汤姆像艺术家一样审视着自己刚刷的那一下，又轻轻挥了一下刷子，像刚才那样端详着成果。本凑到他身边。汤姆看着苹果直流口水，但他坚持干活。汤姆突然转过身说：\"哎呀，是你啊，本！我都没注意。\""]},
{id:"c05", t:"The Road Not Taken", zh:"未选择的路", lv:2, d:"弗罗斯特·英语世界最著名的人生之诗",
 text:["Two roads diverged in a yellow wood, / And sorry I could not travel both / And be one traveler, long I stood / And looked down one as far as I could / To where it bent in the undergrowth;",
 "Then took the other, as just as fair, / And having perhaps the better claim, / Because it was grassy and wanted wear; / Though as for that the passing there / Had worn them really about the same,",
 "And both that morning equally lay / In leaves no step had trodden black. / Oh, I kept the first for another day! / Yet knowing how way leads on to way, / I doubted if I should ever come back.",
 "I shall be telling this with a sigh / Somewhere ages and ages hence: / Two roads diverged in a wood, and I — / I took the one less traveled by, / And that has made all the difference."],
 trans:["黄色的树林里分出两条路，/ 可惜我不能同时去涉足，/ 我在那路口久久伫立，/ 我向着一条路极目望去，/ 直到它消失在丛林深处。",
 "然后我选择了另一条路，同样平坦，/ 也许更值得选择，/ 因为它青草萋萋，人迹罕至；/ 不过说到这条路上的脚印，/ 两条路其实被踩得差不多，",
 "那天清晨，两条路都铺满落叶，/ 落叶上没有被踩踏的痕迹。/ 哦，我把第一条路留给未来！/ 但我知道路径绵延无尽头，/ 恐怕我再也回不来了。",
 "许多年后，我将在某个地方，/ 叹息着讲述这段往事：/ 树林里分出两条路，而我——/ 我选择了人迹更少的那一条，/ 从此决定了我一生的道路。"]},
{id:"c06", t:"The Gettysburg Address", zh:"葛底斯堡演说", lv:3, d:"林肯·272词的美国精神奠基演说",
 text:["Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.",
 "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.",
 "But, in a larger sense, we can not dedicate — we can not consecrate — we can not hallow — this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us — that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion — that we here highly resolve that these dead shall not have died in vain — that this nation, under God, shall have a new birth of freedom — and that government of the people, by the people, for the people, shall not perish from the earth."],
 trans:["八十七年前，我们的先辈在这块大陆上创立了一个新国家，它孕育于自由，并致力于这样一个信念：人人生而平等。",
 "如今我们正投身于一场伟大的内战，考验着这个国家，或任何一个孕育于自由、致力于这一信念的国家，能否长久存在。我们相聚在这场战争的一个大战场上。我们来到这里，是要把这片土地的一部分奉献为最后安息之所，安葬那些为使国家存续而在此献出生命的人。这样做完全合适、正当。",
 "但从更深的意义上说，我们无法奉献这片土地——无法使之神圣——无法使之崇高。在这里战斗过的勇士们，活着的和死去的，已经使它神圣，远非我们微薄的力量所能增减。世界不会记得我们在这里说了什么，也不会长久记得，但它永远不会忘记他们在这里做过什么。倒是我们这些活着的人，应该在此投身于他们已经如此崇高地推进、而尚未完成的事业——投身于摆在我们面前的伟大任务：从这些光荣的死者身上汲取更多的献身精神，献身于他们为之付出最后全部牺牲的事业；我们在此下定决心，不让这些死者白白牺牲；在上帝保佑下，这个国家将获得自由的新生；民有、民治、民享的政府，将永不从地球上消失。"]},
{id:"c07", t:"If—", zh:"如果", lv:3, d:"吉卜林·写给儿子的人生箴言诗",
 text:["If you can keep your head when all about you / Are losing theirs and blaming it on you, / If you can trust yourself when all men doubt you, / But make allowance for their doubting too; / If you can wait and not be tired by waiting, / Or being lied about, don't deal in lies, / Or being hated, don't give way to hating, / And yet don't look too good, nor talk too wise:",
 "If you can dream — and not make dreams your master; / If you can think — and not make thoughts your aim; / If you can meet with Triumph and Disaster / And treat those two impostors just the same; / If you can bear to hear the truth you've spoken / Twisted by knaves to make a trap for fools, / Or watch the things you gave your life to, broken, / And stoop and build 'em up with worn-out tools:",
 "If you can make one heap of all your winnings / And risk it on one turn of pitch-and-toss, / And lose, and start again at your beginnings / And never breathe a word about your loss; / If you can force your heart and nerve and sinew / To serve your turn long after they are gone, / And so hold on when there is nothing in you / Except the Will which says to them: 'Hold on!'",
 "If you can talk with crowds and keep your virtue, / Or walk with Kings — nor lose the common touch, / If neither foes nor loving friends can hurt you, / If all men count with you, but none too much; / If you can fill the unforgiving minute / With sixty seconds' worth of distance run, / Yours is the Earth and everything that's in it, / And — which is more — you'll be a Man, my son!"],
 trans:["如果你能在众人失去理智、把过错推给你时保持冷静；如果你能在众人怀疑你时相信自己，也体谅他们的怀疑；如果你能等待而不因等待而疲倦，被人谎言中伤而不以谎言回击，被人憎恨而不怀恨在心，却又不摆出一副善人面孔，也不高谈阔论——",
 "如果你能做梦而不被梦主宰；如果你能思考而不以思考为目的；如果你能坦然面对胜利和灾难，把这两个骗子一视同仁；如果你能忍受你说过的真话被无赖歪曲，用来愚弄蠢人，或看着你为之付出生命的东西被毁掉，弯下腰，用破旧的工具把它重建——",
 "如果你能把赢来的一切堆在一起，孤注一掷，输光后从头再来，对损失只字不提；如果你能在心、神经和筋骨都耗尽之后，逼它们继续为你效力，在你体内一无所有时仍坚持下去，只靠意志对它们说：\"坚持住！\"——",
 "如果你能和群众交谈而不失美德，与国王同行而不失平常心，敌人和挚友都伤不了你，所有人都看重你，但没有人过分重要；如果你能把无情的一分钟填满，跑完六十秒的路程，大地和它里面的一切都属于你——更重要的是——我的儿子，你将成为真正的男子汉！"]}
];
