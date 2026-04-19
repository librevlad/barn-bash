# Phase 58 — Per-game lobby hero art (ТЗ на генерацию)

## Why

Per-game лобби (escape / race / hill / meteor) сейчас собирается из трёх источников:

1. `/assets/lobby-<game>.png` — painted proscenium arch 1024×1024 (commissioned),
   центр-анкор 500×500 на экране.
2. `client-shared/theme.css body > #bg` — CSS-композиция (red-velvet gradients
   + wood-floor + spotlight halo + dark base).
3. Corner filigree (`ornament-corner.png`) + bunting (`ornament-bunting.png`) —
   поверх всего.

Пользовательский референс (Hearthstone-tier AI-generated illustration) задаёт
планку full-scene painted atmosphere: толстая baroque gold frame, painted velvet
curtains с кистями + металлическими крепежами, stone stage steps снизу,
hanging ornate metal lanterns у арки, fire ember particles, glowing orb
placeholders. CSS-подход (Phase 57a) даёт только ~55% от референса: не может
нарисовать painted каменные ступени, painted velvet или массивные hanging
lanterns. Нужна новая коммиссия: 4 полноэкранных painted-сцены, которые
заменяют #bg на весь viewport.

## Success

- Четыре painted-hero ассета: `/assets/lobby-<game>-hero.png` (и
  `.webp` через существующий pipeline).
- Каждый ассет читается как full-frame theatrical stage в своей per-game
  атмосфере.
- UI-элементы (титул, cream banner "Waiting for players…", слот-медальоны,
  хинт, corner ornaments, bunting) ложатся в заранее резервированные
  safe-zones без коллизий с painted-содержимым.
- Замена `#bg` с CSS-гибрида на painted hero + вырезание `lobby-<game>.png`
  (арка теперь внутри hero — отдельный overlay не нужен).
- Каденция: Phase 58a commission, 58b integration, 58c close.

## Non-goals

- Новые gameplay-сцены (canvas-арены остаются прежние).
- Tournament / post-game / gameover backdrops (есть свои художества, не
  в скоупе).
- Переделка controller-клиента.

---

## Style anchor

**Primary reference**: `screenshots-review/reference-lobby-quality.png`
(пользовательский AI-референс 2026-04-19).

**Family references** (уже в репозитории, сохранять визуальное родство):
- `/assets/bg.png` — главное лобби "Barnyard Bedlam" (warm daylight storybook).
  НЕ эта палитра; hero — вечерний dark theatrical.
- `/assets/lobby-escape.png`, `lobby-race.png`, `lobby-hill.png`,
  `lobby-meteor.png` — текущие painted arch-500px. Новый hero должен
  ВКЛЮЧАТЬ арку как часть full-scene painted, не как отдельный overlay.
- `/assets/tournament-champion.png` — painted throne. Похожая register
  (dark theatrical, warm red + gold).

**Core style keywords**:
digital painting · painterly brush strokes · Hearthstone card-art quality ·
dark theatrical stage · warm firelit atmosphere · fire embers floating ·
rich red velvet curtains with gold tassels · painted wooden proscenium ·
carved stone stage steps · hanging ornate metal lanterns · baroque gold
filigree frame · vines climbing posts · canvas cream banner · painterly
depth · subtle dust motes · warm gold rim-light · NOT flat vector, NOT 3D
render, NOT photoreal, NOT anime.

**Palette**: saturated deep red (#7a0f0f...#b02828), warm browns
(#3d2817...#8a5a2a), warm gold (#d5972b...#ffd680), ember orange
(#ff8030...#ffcf70), cream/ivory for canvas (#f5ead4), dark carnival-hall
background (#1a0f08...#2f1c0c).

---

## Common composition (все 4 ассета)

Resolution: **2560×1440** native (16:9). Downscale + WebP at build time.

Single PSD/file layout, bleeding to edges (no outer margin):

```
+------------------------------------------------------------+
|  gold-corner-TL       BUNTING across top       gold-c-TR   | ← 180px corner safe-zones
|  [SZ: corners]        [SZ: bunting 140px]      [SZ:c]      |
+--------+---------------------------------------+-----------+
|        |                                       |           |
| L      |     painted proscenium arch:          |    R      |
| velvet |     thick wooden beam across top,     |   velvet  |
| curtain|     "FRANTICS/<GAME TITLE>" carved    |  curtain  |
| + tassel   into gold-leafed sign (empty-       |  + tassel |
| (SZ:   |     ready, title is HTML overlay),    |   (SZ:    |
|  240px)|     hanging ornate metal lanterns     |   240px)  |
|        |     L+R of the sign, vines climbing   |           |
|        |     posts                             |           |
|        |   +-------------------------------+   |           |
|        |   | cream canvas banner (empty,   |   |           |
|        |   |  title overlay safe)          |   |           |
|        |   +-------------------------------+   |           |
|        |                                       |           |
|        |  4-8 painted brass/gold ORB slots     |           |
|        |  arranged in a row (~60-90 px each)   |           |
|        |  with warm glow + "?" painted in      |           |
|        |  center (engine replaces if player    |           |
|        |  joins)                               |           |
|        |                                       |           |
|        |                    stone stage steps  |           |
|        |                    painted below      |           |
+--------+---------------------------------------+-----------+
|  gold-corner-BL       stage apron + hint       gold-c-BR   | ← 180px corner
|                          text zone                         |
+------------------------------------------------------------+
```

### UI safe-zones (обязательно пустые — сюда ложатся HTML-элементы)

| Zone | Rect (px @ 2560×1440) | Что ляжет поверх |
|---|---|---|
| Corner TL/TR/BL/BR | 4 × 180×180 | `ornament-corner.png` (уже ВКЛЮЧЕН в painted, не оверлеится отдельно — см. "Frame" ниже) |
| Bunting band | 0–160, full width | `ornament-bunting` оверлей (оставить место, но painted bunting в hero делает bunting сам) |
| Title text zone | horizontal center, y≈260–420 | HTML h1/h2 "FRANTICS" + "ESCAPE THE FOX" |
| Banner canvas | horizontal center, y≈440–580 | HTML "Waiting for players…" |
| Slots row | horizontal center, y≈620–920 | HTML `.player-slot` × 4-8 |
| Hint text zone | horizontal center, y≈1060–1140 | HTML `#lobby-hint` |

**Важно**: painted слоты в hero-сцене — это ПЛЕЙСХОЛДЕРЫ под 4-8 orb'ов.
Engine поверх них нарисует HTML-слоты с painted animal avatar'ом (из
`/assets/animal-*.png`). Painted orb в hero читается как "дефолтное
пустое место"; HTML-слот (при залогине) визуально садится поверх него с
тем же центром.

Чтобы слоты ровно совпадали: orb-центры в painted-сцене должны быть
расставлены с шагом ≈ 220 px (5 штук: x=760/980/1200/1420/1640) или 
с шагом ≈ 260 px (4 штуки: x=860/1120/1380/1640).

### Frame (всегда одинаковый, во всех 4 hero)

- Baroque gold filigree rectangular frame по периметру, толщина 120-160 px
  с углами 180×180 (painted, НЕ CSS-overlay). Заменяет текущие
  `ornament-corner.png` (те можно удалить из DOM per-game).
- Pennant bunting крепится к верхнему ребру рамы изнутри, painted (золотые
  огоньки, warm glowing bulbs, пестрые яркие треугольные флаги).

Рама — единственный элемент, общий для всех 4 ассетов (копируется в layer).

### Лоу-level технические требования

- **Формат**: native PNG 2560×1440, sRGB, 8-bit/channel, no transparency
  (hero заполняет весь viewport; прозрачность не нужна, края bleed to
  edge).
- **Размер на диске**: PNG source ≤ 5 MB каждый; WebP production build
  ≤ 400 KB через существующий `image-set()` pipeline.
- **Цветовое пространство**: sRGB, без ICC-профиля.
- **Composition layers** (в PSD/source, если доступно):
  L1 dark carnival-hall background,
  L2 curtains + tassels,
  L3 stone floor + steps,
  L4 painted arch + banner + lanterns + vines,
  L5 orb placeholders,
  L6 ember/dust particles,
  L7 gold filigree frame + bunting.
  Это позволит потом тюнить слои без перегенерации.
- **Перспектива**: straight-on, стоя перед сценой. Арка строго frontal,
  занавесы симметричны L/R. Stage steps уходят слегка в перспективу
  (0.5-point) чтобы добавить глубины.

---

## Per-game variants

Все 4 разделяют Frame + общую театральную атмосферу. Отличаются:

- цветом velvet (красный-доминант, но оттенок сдвигается по теме),
- содержимым над аркой (symbolic hint на геймплей),
- palette ambient particles (embers у escape/meteor, dust у race/hill),
- текстурой stage floor.

### 1. lobby-escape-hero.png — «Escape the Fox»

Over-arch symbolism: silhouette of a sly fox head в декорации arch beam
(carved into wood, gold-leafed), small painted pine branches peeking from
behind the curtains. Warm firelit atmosphere (strong fire embers — герой
убегает от лесного пожара). Curtains deep crimson. Stage floor stone + moss.
Lanterns crackling warm orange.

**Midjourney / SDXL prompt**:

```
Hearthstone card-art style theatrical sideshow stage, dark painterly
digital illustration, thick baroque gold filigree frame around the entire
image, golden pennant bunting with glowing warm bulbs across the top
inside the frame, deep crimson red velvet curtains with gold tassels and
brass fastenings on left and right, flanking a painted wooden proscenium
arch, the arch has a thick wooden beam with a gold-leafed carved signboard
reading "FRANTICS" in small letters and "ESCAPE THE FOX" in large letters,
a stylized sly fox head silhouette carved into the beam above the title,
two ornate hanging brass lanterns with warm amber flame on either side of
the sign, green vines with small leaves climbing the wooden posts of the
arch, a cream canvas banner hanging from the arch by rope chains with
metal clasps below the arch sign (space for "Waiting for players..." text
overlay, the banner is empty), carved stone stage steps at the bottom
center with moss, four to six glowing painted brass orbs arranged in a
horizontal row inside the arch interior between the posts, each orb has a
thick gold rim and a warm glowing "?" symbol painted in its center, warm
fire ember particles and dust motes floating throughout the scene, warm
firelit atmosphere, dark carnival-hall background, rich saturated color
palette of deep red and gold and warm brown, dramatic cinematic lighting
with painterly brush strokes, highly detailed, no text except what is
explicitly mentioned, no humans, no animals other than the fox head motif,
--ar 16:9 --stylize 750 --v 6
```

**Negative prompt** (SDXL):
```
flat vector, 3D render, photorealistic, anime, manga, modern UI, flat
design, mobile app mockup, cartoon, low-detail, low-poly, blurry, text
on canvas banner, text in UI, humans, realistic faces, signature,
watermark, frame within frame, cropped frame.
```

### 2. lobby-race-hero.png — «Grand Prix»

Over-arch symbolism: crossed checkered flags carved into the wooden beam
above the title sign. Stage steps painted with tire track marks and a
painted yellow line. Curtains shift toward maroon + rich brown. Ambient
particles are warm dust (track dust kicking up). Lanterns still brass
but with cooler amber flame.

**Midjourney / SDXL prompt**:

```
Hearthstone card-art style theatrical sideshow stage, dark painterly
digital illustration, thick baroque gold filigree frame around the entire
image, golden pennant bunting with glowing warm bulbs across the top,
deep maroon red velvet curtains with gold tassels on left and right
flanking a painted wooden proscenium arch, the arch has a thick wooden
beam with a gold-leafed carved signboard reading "FRANTICS" small and
"GRAND PRIX" large, two crossed painted checkered flags carved into the
wooden beam above the title, two ornate hanging brass lanterns on either
side of the sign, brass laurel-wreath vines climbing the wooden posts, a
cream canvas banner hanging from the arch below the sign (empty, for
"Waiting for players..." text overlay), painted wooden plank stage
platform at the bottom with a painted yellow track-line and tire-dust
smudges, four to six glowing painted brass orbs arranged in a horizontal
row inside the arch interior, each orb has a thick gold rim and a warm
glowing "?" in its center, warm dust motes and light particles floating,
dark carnival-hall background, rich palette of maroon and gold and brown,
dramatic cinematic lighting, painterly brush strokes, highly detailed,
--ar 16:9 --stylize 750 --v 6
```

### 3. lobby-hill-hero.png — «King of the Hill»

Over-arch symbolism: a painted gold crown + royal banner across the arch
beam. Stage floor is painted cut-stone with a small moss-covered mound
hint at center. Curtains shift toward royal purple-red with gold braids.
Lanterns have cool golden flame. Ambient particles are falling gold
sparkles.

**Midjourney / SDXL prompt**:

```
Hearthstone card-art style theatrical sideshow stage, dark painterly
digital illustration, thick baroque gold filigree frame around the entire
image, golden pennant bunting with warm glowing bulbs across the top,
deep royal red velvet curtains with gold tassels and gold braided trim on
left and right flanking a painted wooden proscenium arch, the arch has a
thick wooden beam with a gold-leafed carved signboard reading "FRANTICS"
small and "KING OF THE HILL" large, a painted gold crown above the
signboard flanked by a small royal banner, two ornate hanging brass
lanterns on either side, laurel vines with gold-leafed highlights
climbing the posts, a cream canvas banner hanging below the sign (empty
for text overlay), a small painted cut-stone hill mound with green moss
visible between the stage floor and the arch, four to six glowing brass
orbs in a horizontal row inside the arch interior, each with thick gold
rim and warm glowing "?" symbol, falling gold sparkles and soft dust
motes, dark carnival-hall background, rich palette of deep red and gold
and royal brown, dramatic lighting, painterly brushwork, highly detailed,
--ar 16:9 --stylize 750 --v 6
```

### 4. lobby-meteor-hero.png — «Meteor Shower»

Over-arch symbolism: painted golden comet or meteor streak carved across
the wooden beam above the title, small painted stars dotting the upper
part. Curtains shift toward deep cosmic purple-red. Stage floor painted
with scorched impact marks. Lanterns with blue-white flame (cosmic). Ambient
particles are cool-white + warm-orange mixed (falling meteors + stage
dust).

**Midjourney / SDXL prompt**:

```
Hearthstone card-art style theatrical sideshow stage, dark painterly
digital illustration, thick baroque gold filigree frame around the entire
image, golden pennant bunting with warm bulbs across the top, deep
cosmic purple-red velvet curtains with gold tassels on left and right
flanking a painted wooden proscenium arch, the arch has a thick wooden
beam with a gold-leafed carved signboard reading "FRANTICS" small and
"METEOR SHOWER" large, a painted streaking comet or meteor with a gold
tail carved across the beam above the title, a scatter of small painted
stars and constellations around, two ornate hanging brass lanterns with
cool blue-white flame on either side, dark vines with starlight highlights
climbing the posts, a cream canvas banner hanging below (empty for text),
painted scorched stone stage floor with faint impact crater marks, four
to six glowing brass orbs in a horizontal row inside the arch interior,
each with thick gold rim and warm glowing "?" symbol, falling meteors
and warm-cold mixed ember particles, dark cosmic carnival-hall background,
palette of deep red and gold and cool purple accents, dramatic cinematic
lighting, painterly brushwork, highly detailed,
--ar 16:9 --stylize 750 --v 6
```

---

## Delivery format

Для каждого из 4 файлов:

1. **PNG 2560×1440**, source, sRGB.
2. **WebP** через существующий build pipeline (см. `assets/bg.webp` как
   образец размера: 2.77 MB → 298 KB без потерь читаемости).
3. **Imprint test**: overlay 4 HTML-слотов + title + banner + hint на
   каждый asset и убедиться, что UI не дерётся с painted элементами.

---

## Integration plan (Phase 58 sub-phases)

- **58a** — коммиссия 4 hero assets (вне сессии). Складываются в
  `/assets/lobby-escape-hero.{png,webp}` и т.п.
- **58b** — `body > #bg` в theme.css переключается с CSS-театральной
  композиции на `image-set()` hero PNG. Per-host body background-image
  раскладывается по `#bg::before`/`::after` если нужен per-game variant,
  или отдельный класс `.bg-escape` / `.bg-race` / `.bg-hill` / `.bg-meteor`
  на `<body>`. `lobby-backdrop` overlay УДАЛЯЕТСЯ (арка теперь внутри
  hero). Corner-ornament + bunting оверлеи УДАЛЯЮТСЯ (painted frame в
  hero).
- **58c** — realization block в DESIGN.md, close-out commit.

---

## Deliverables

- 4 × PNG 2560×1440 + matching WebP.
- Screenshot test on 1280×720 viewport showing painted hero +
  overlaid HTML lobby UI без коллизий.
- `DESIGN.md` realization entry.

## Risks

- **Painted orb-centers vs CSS slot-centers** могут не совпасть: ширина
  слота 94 px + gap 10 на 1280 viewport скалируется нелинейно к
  2560×1440 native. Нужен imprint-test и CSS-position-override если
  смещение заметное.
- **Painted banner text alignment**: "Waiting for players…" рендерится
  HTML по центру — надо чтобы painted canvas banner был достаточно
  широкий, иначе текст выйдет за painted область.
- **Per-game palette drift**: 4 сцены должны читаться как одна серия.
  Используйте Frame + curtain база + bunting как константы во всех 4.

## Open questions

- Коммиссирует пользователь сам (Midjourney / SDXL / DALL-E сервис) или
  нужна интеграция image-gen MCP в Claude Code? Текущая сессия не имеет
  генерации изображений, промпты выше подготовлены для ручного ввода.
- Variant naming: `lobby-escape-hero.png` или `lobby-escape-v2.png` +
  удалить старый? Предпочтение — `-hero` suffix, старый 500×500
  `lobby-<game>.png` останется как fallback на случай revert.
- Bunting: оставлять painted в hero или overlay-PNG тоже? Overlay-PNG
  анимирован (ornament motion Phase 16). Если bunting painted in hero,
  теряем motion. Предложение — painted в hero **с простым warm
  firelit glow** без motion; для желаемого motion использовать
  existing `ornament-bunting.png` overlay ПОВЕРХ painted hero (painted
  bunting darker, overlay bunting brighter, визуально совместимы).

## Phase handoff

После Phase 58a (assets landed) → Phase 58b (theme.css + HTML
integration, ~30 мин CC) → 58c (DESIGN.md close).
