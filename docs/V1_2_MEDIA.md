# 1.2 登神远征 · 美术与配乐

2026-09-08。本轮通过内置 `image_gen` 生成新位图，没有使用 CLI/API 替代绘图，也没有用程序绘图替代请求的立绘。七张最终 WebP 已保存到 `public/art/`；保留生成图的完整构图，只做 WebP 格式编码（quality 88，method 6），透明素材保留真实 alpha。弃用的两张登神之王 sprite 因背景棋盘格被画进图中而未采用；最终重新独立生成并核验透明通道。

## 素材清单

| 项目文件                                | 使用场景                                       | 尺寸      |   字节 | alpha |
| --------------------------------------- | ---------------------------------------------- | --------- | -----: | ----- |
| `public/art/boss-king-reborn.webp`      | 灰烬之王复生立绘：黑日、熔裂胸甲、断剑         | 1024×1536 | 437442 | 无    |
| `public/art/boss-king-ascendant.webp`   | 第 99 关登神之王立绘：白金甲、破碎日冕、圣焰翼 | 1024×1536 | 468606 | 无    |
| `public/art/boss-deity.webp`            | 主神立绘及横跨战场的巨大神像                   | 1536×1024 | 434504 | 无    |
| `public/art/ascension-stair.webp`       | 登神长阶路线与战场背景                         | 1024×1536 | 403632 | 无    |
| `public/art/angel-minion.webp`          | 长阶天使哨兵战斗图像                           | 1223×1286 | 320276 | 有    |
| `public/art/king-reborn-sprite.webp`    | 复生灰烬之王的独立战斗图像                     | 1024×1536 | 507718 | 有    |
| `public/art/king-ascendant-sprite.webp` | 登神之王的独立战斗图像                         | 1214×1295 | 379796 | 有    |

合计 2,951,974 字节。逐文件哈希、原图路径与透明像素核验见 [资产清单](data/art-v12-manifest.json)。图像是二维素材；粒子、羽翼消散、圣光、破碎与日冕等实时动画由游戏渲染器完成。本轮没有宣称提供可编辑 3D 网格或骨骼模型。

## 配乐「破雾登神 · 长阶终誓」

新文件 `public/audio/ascension.mp3`，完整时长 135 秒，128 BPM，72 小节。使用原创程序合成乐器，无第三方录音、外部音乐片段或真人演唱。复用乐器模型，不复用旧曲编排；新写主题、和声路线、弦乐对位和鼓组。第 91—100 关地图与战斗使用同一首曲子，通关与第 101 关祝福尾声继续保留该曲。普通/困难既有场景不受影响。

| 时间      | 段落         | 编排                                                        |
| --------- | ------------ | ----------------------------------------------------------- |
| 0:00—0:15 | 无词圣咏前奏 | 木管、无词合唱、管风琴、钟声，后半渐入定音鼓                |
| 0:15—0:45 | 长阶主题     | 大跨度上扬的新旋律，疾行吉他与低音鼓，弦乐接入铜管          |
| 0:45—1:00 | 逆风疾行     | 低音区回答旋律、错位重拍、反向弦乐分解                      |
| 1:00—1:15 | 故旅回忆     | 缩减配器，以木管短暂引用普通行军主题，拨弦与轻鼓保留脉搏    |
| 1:15—1:45 | 白金重奏     | 新主题交响金属重奏，合唱与铜管增厚，吉他与鼓组恢复推进      |
| 1:45—2:00 | 转调登神     | 转入平行 D 大调，旋律音程相呼应，展开明亮合唱、管风琴与铜管 |
| 2:00—2:15 | 誓言再起     | 拉长吉他和弦，主题回归，鼓组转接回循环主体                  |

前奏只在开始该曲时播放一次；主体从 15 秒循环至 135 秒。已有 `MusicPlayer` 保留播放位置和淡入淡出；暂停、设置、后台与升级选择均沿用现有暂停行为。地图传入 `sceneMusic(phase, run)`，战斗使用 `battleMusic(battle)`，同曲切换不重新播放前奏。

LAME 192 kbps CBR MP3，44.1 kHz 双声道，保留无间隙元数据，3,241,498 字节。回读核验：−17.99 LUFS、真峰值 −6.15 dBTP、零削波；主体循环边界样本跳变 / 邻近样本变化 P99 为 0.079。响度范围 6.2 LU，前奏约 −25.25 dBFS RMS，高潮约 −17.65 dBFS RMS。完整数据见 [配乐报告](data/music-v12-report.json)。这些是导出与循环的客观核验，不能代替真人对音色和情绪的试听。

旧八首 MP3 在制作前后逐一 SHA-256 对照保持不变，包含用户满意的 `forbidden.mp3`。母带在 `artifacts/music-v12/ascension-master.wav`，MP3 回读在 `artifacts/music-v12/ascension-decoded.wav`；这些检查文件不部署。`master` 是压缩前混音，`decoded` 是最终 MP3 实際解码结果。

```powershell
python scripts/generate-ascension-score.py --ffmpeg "C:/path/to/ffmpeg.exe"
python scripts/generate-ascension-score.py --ffmpeg "C:/path/to/ffmpeg.exe" --validate-only
node --test --test-isolation=none tests/music.test.mjs
```

脚本依赖 NumPy、SciPy 和现有原创乐器脚本。五项音乐测试覆盖曲目选择、手势解锁、暂停续播、异步下载竞态、长阶边界、15 秒前奏循环以及地图/战斗不重放前奏。

## 最终图片提示词

以下为最终采用图片的实际提示词。两张立绘参考既有 `boss-king.webp` 的身份与王冠，复生 sprite 参考新复生立绘；其余新人物图独立生成。长阶背景沿用本任务先前已生成的图像，原图路径见清单。

### 登神长阶

```text
Create a premium dark fantasy hand-painted game environment background, portrait 1024x1536. Asset for Ashen Gates: final Ascension Stair, single monumental narrow flight of broken ivory and black basalt stairs bottom center toward impossibly tall luminous threshold at upper center, ascending beyond storm clouds into sacred warm white-gold light. Distant ruined medieval cathedral buttresses and tiny floating stone fragments, deeply inked expressive comic brushwork and chiaroscuro, painterly impasto, severe medieval cosmic horror transformed into sublime hope, emotionally earned triumph, solemn not kitsch. Stark charcoal blue-grey shadows, old gold details, radiant volumetric beams at outer margins, subtle gilded ashes. Central45%width legible darkened steps relatively uncluttered forrouteoverlay. Strong upwardperspective, craftedstone, nocharacters/UI/text/numbers/watermark/notvector/grid. Light holy majestic slightlyterrifying.
```

### 灰烬之王复生立绘

```text
Use case: stylized-concept. Asset: premium dark fantasy action game boss second-life portrait, portrait 2:3 image. Create the reborn Ashen King, the same ancient bearded king in a tall broken black iron crown and jagged scorched plate armor as the reference. This is a new second-phase transformation, not the original standing pose. His chest armor has shattered open into a black eclipse with a brilliant molten amber circumference; ash and charred crown fragments orbit the void. His ancient face is half-burned into incandescent embers, his right hand lifts a broken greatsword overhead, his left arm extends forward commanding black flames. Black sun behind his head. King fills frame from crown to lower legs, heroic low camera, powerful readable silhouette, shoulders wide. Cathedral collapsing into floating ash behind him. Detailed painterly hand-inked medieval dark fantasy, etched textures and chiaroscuro, restrained burnt gold, charcoal, ivory ash, intense warm rim light, prestigious graphic novel concept art. Truly menacing tragic regal revival, violent but no gore. Keep crown and facial identity related to reference. No words, no logo, no UI, no borders.
```

### 登神之王立绘

```text
Use case: stylized-concept. Asset: entirely new ascendant Ashen King boss portrait for premium medieval dark fantasy action game, portrait 2:3. Reference is only the ancient bearded king's identity and crown design, not color or pose. The Ashen King now a fallen holy god-king, towering white and gold cathedral armor, cracked alabaster chest revealing a dark ember heart, immense crown suspended as separated golden shards, ash-gray face with luminous white eyes and austere expression. He stands levitating with feet visible, sword held point down centrally; wings of blade-like white holy fire radiate from shoulders, an enormous broken sun halo behind crown. Sweeping ivory cape becomes smoke and gold sparks. Majestic terrifying ascension, holy yet dark and alien, not a friendly angel. Ruined impossibly tall celestial cathedral and pale eclipse sky behind. Hand-inked and richly painted graphic-novel dark fantasy concept art, charcoal hatching, carefully designed angular silhouette, ornate engraved medieval gold, deep shadow and bright sacred rim light, premium polished readable focal point. No words, no UI, no logo, no border. Keep complete figure comfortably inside composition.
```

### 主神

```text
Use case: stylized-concept. Asset: landscape boss illustration and wide in-game backdrop for the final god of a prestigious medieval dark fantasy game. Create a completely original immense primordial deity filling the entire width of the image, wide 3:2 composition. A serene ageless carved-ivory mask where the face would be, slit of warm gold light for eyes, towering crown of concentric celestial rings like a medieval astrolabe, immense four arms held open in a solemn welcoming judgment. Hundreds of densely layered white feather blades form broad angelic wing fans spanning edge to edge, the torso is an ornate pale stone cathedral reliquary with a radiant sun core. This is a cosmic sacred being, impressive and incomprehensible rather than a human king. Floating over the summit of a golden stairway in a sea of clouds, a grand circular halo and distant stars above. Figure upper body clearly readable in the upper two thirds, lower third fades into white gold mist leaving room for gameplay. Ethereal ivory, antique gold, deep night blue and black, strong layered silhouette with dark contrasts, delicate celestial dust, cathedral god-rays. Elaborate hand-inked and painted graphic novel concept art, painterly textures, masterful chiaroscuro, premium finish. Awe, grandeur, emotional conclusion, mercy despite immense power. No text, no UI, no logos, no border, no modern objects.
```

### 天使哨兵

```text
Use case: stylized-concept. Asset: single transparent-background enemy sprite for top-down-ish medieval dark fantasy action game. A small sinister angel sentinel, complete figure centered, viewed from slightly above front at a 3/4 overhead game angle, face looking toward viewer. Smooth ivory mask with a narrow gold eye slit, miniature golden halo floating over head, simple white hood and ragged ivory tabard over black small armor, two small feathered angel wings spread left and right, holds a short radiant spear pointing downward at its side. Silhouette must be clear and readable when scaled to 48-72 pixels tall, so use chunky clean wing shapes, few large shapes, strong dark outlines, minimal tiny details. High quality hand-inked painterly graphic-novel dark fantasy style, white gold charcoal palette, soft gold rim light, eerie sacred atmosphere rather than cute. Entire body and wings visible with generous transparent margins. Exactly one isolated character, no ground, no scenery, no shadow plate, no text, no frame. Genuine transparent alpha background.
```

### 复生之王战斗 sprite

```text
Use case: stylized-concept. Asset: single isolated transparent-background battle sprite. Use the reference reborn Ashen King identity: black broken crown, bearded face, shattered jagged black armor with a molten ring/black eclipse in his chest, one broken fire sword. Recompose as a full-body game enemy, viewed slightly above front, clear big shoulders and compact angular silhouette, both feet and crown and sword fully inside image with generous transparent margin. Sword raised diagonally on one side, other hand open with a small black-orange flame, a few large ash blade fragments at shoulders. No environment, no large background eclipse, no ground, no smoke obscuring body. Premium hand-inked painted dark fantasy style, strong visible outlines and large simple forms readable at 100 pixels tall, dark charcoal and warm gold-orange highlights. Preserve genuine alpha transparency. Exactly one figure. No text, no logo, no border.
```

### 登神之王战斗 sprite

```text
Create one isolated game character cutout on a genuinely transparent background. The character is a medieval dark fantasy holy king seen slightly from above front, full body, crown to feet. He is an ancient severe bearded man with a tall gold crown, chunky white-gold plate armor, dark burnt ember heart in his breastplate, small stylized white blade-like angel wings, a torn ivory cape and a long gold sword held sideways. Strong dark ink outlines, simplified large painted shapes, premium hand-painted graphic-novel sprite, immediately readable at small size, ivory and antique gold with charcoal contrast. Entire figure including sword and wings comfortably within the image with clear margin. Only one character, no ground, no scenery, no text, no UI. Background transparent with alpha, not a visible pattern.
```
