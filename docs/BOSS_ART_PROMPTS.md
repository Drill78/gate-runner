# Boss portrait generation prompts

Generated for Gate Runner v0.4 with the built-in `image_gen` tool. Each portrait used one independent generation call; no CLI/API fallback or variants were used. The existing `public/art/knight.webp` was visually inspected for material and rendering style; these new generations did not supply a reference image.

All original PNGs are 1024 × 1536 (2:3), with an opaque dark atmospheric background. WebP delivery copies are 768 × 1152, resized without cropping and encoded using the existing local `sharp` dependency at quality 86, effort 6. Original generated files were copied into `public/art` and left unchanged. The generated portraits and compressed outputs were visually inspected for complete crowns, masks, weapons, and character silhouettes, and for absence of text and UI.

## 荆棘守望者 / Thorn Watcher

- Original: `public/art/boss-watcher.png`
- Web delivery: `public/art/boss-watcher.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: premium medieval dark-fantasy boss portrait for a game boss-arrival popup and codex. Create exactly one standalone vertical 2:3 image at 1024x1536. Style/medium: highly polished stylized 3D character render with realistic sculpted metal, leather, bone and woven cloth, intricate modeled details and cinematic lighting, similar to a premium tabletop fantasy miniature brought to life at heroic scale. Original fantasy design. Composition: one imposing centered character in a three-quarter standing pose, full body preferred or framed below the knees, very clear readable silhouette; complete head crown and complete weapon silhouette inside the frame with generous safe margins. Character fills the center while retaining breathing room at all edges. Background: dark atmospheric nearly black softly textured studio-fantasy background, subdued mist and subtle color glow, opaque background, no busy landscape. Clear face or helmet focal point, warm directional key and cool rim light, strong material definition. No text, no lettering, no logos, no UI, no frame, no collage, no additional characters. Subject: the Thorn Watcher, a towering ancient guardian in massive moss-green and weathered blackened steel heavy plate armor. Thick overlapping armor slabs, tarnished bronze edges, patches of real moss and thorny woody growth woven through armor seams. An imposing closed helmet crowned by branching antler-like wooden boughs; narrow pale green eye slits deep within a shadowed visor. Carries one enormous single-bladed battle axe and one tall heavy tower shield. Axe and shield feel ancient and weighty, ornamented with restrained thorn and leaf relief. Tattered deep green cloth, grounded powerful stance, threatening calm. Desaturated forest green, charcoal iron and old bronze palette; very subtle green magical accents. Ensure every branch tip, axe head and tower shield is fully visible, uncropped.
```

## 蚀月巫妖 / Eclipse Lich

- Original: `public/art/boss-lich.png`
- Web delivery: `public/art/boss-lich.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: premium medieval dark-fantasy boss portrait for a game boss-arrival popup and codex. Create exactly one standalone vertical 2:3 image at 1024x1536. Style/medium: highly polished stylized 3D character render with realistic sculpted metal, leather, bone and woven cloth, intricate modeled details and cinematic lighting, similar to a premium tabletop fantasy miniature brought to life at heroic scale. Original fantasy design. Composition: one imposing centered character in a three-quarter standing pose, full body preferred or framed below the knees, very clear readable silhouette; complete head crown and complete weapon silhouette inside the frame with generous safe margins. Character fills the center while retaining breathing room at all edges. Background: dark atmospheric nearly black softly textured studio-fantasy background, subdued mist and subtle color glow, opaque background, no busy landscape. Clear face or helmet focal point, warm directional key and cool rim light, strong material definition. No text, no lettering, no logos, no UI, no frame, no collage, no additional characters. Subject: the Eclipse Lich, a regal skeletal sorcerer with an exposed ivory bone face, hollow eyes glowing pale moonlight, and a complete elaborate crescent-shaped dark metal crown. Layered deep violet and near-black eclipse ceremonial robes with delicate aged silver celestial embroidery and a high sculpted collar, rich woven fabric, bone hands. One hand lifts a contained orb of cool starlight, the other holds a long ceremonial staff with a crescent ring head and a small dark eclipsed moon core. Several elegant thin circular magical rings with decorative nonverbal runic marks arc behind the upper body, like a restrained eclipse halo; a few tiny silver stars glitter nearby. Composed, ancient and ominous, elegant necromantic majesty. Violet-black cloth, bone ivory and cold silver-blue starlight palette. Keep the complete crown, halo and staff within the frame with generous margin. All arcane markings are abstract ornament, never readable text.
```

## 荒野刽子手 / Wilderness Executioner

- Original: `public/art/boss-executioner.png`
- Web delivery: `public/art/boss-executioner.webp`

Final prompt:

```text
Use case: stylized-concept. Asset type: premium medieval dark-fantasy boss portrait for a game boss-arrival popup and codex. Create exactly one standalone vertical 2:3 image at 1024x1536. Style/medium: highly polished stylized 3D character render with realistic sculpted metal, leather, fur and woven cloth, intricate modeled details and cinematic lighting, similar to a premium tabletop fantasy miniature brought to life at heroic scale. Original fantasy design. Subject: the Wilderness Executioner, a huge broad-shouldered muscular medieval raider and brutal headsman wearing a severe forged iron execution mask that fully conceals his face, two narrow dark eye openings, scarred dark iron plates over layered weathered brown leather and coarse grey-brown fur. Thick heavy arms protected by worn bracers, a broad utilitarian leather belt, ragged dark cloth and heavy boots. He carries one enormous heavy execution axe with a wide chipped guillotine-like cutting head, planted diagonally down at his side, blade clearly visible. Menacing grounded calm stance, powerful weight and mass. Muted brown, grey and aged dark iron palette, dry dust, worn edges and battle-scarred armor without gore. No horns, no antlers, no branches, no crown, no shield, no tower shield; his identity is an iron-masked wilderness executioner rather than a forest guardian. Composition: exactly one imposing centered character in a three-quarter standing pose, full body, complete mask and complete oversized axe silhouette inside the frame with generous safe margins. Background: dark atmospheric wilderness mist with extremely subdued rocky ground, nearly black fog, shallow detail behind the character. Clear mask and axe focal points, warm directional key and cool rim light, strong material definition. Opaque dark background. No text, no lettering, no logos, no UI, no frame, no collage, no additional characters.
```

## 灰烬之王 / Ashen King

- Original: `public/art/boss-king.png`
- Web delivery: `public/art/boss-king.webp`

Final prompt:

```text
Use case: stylized-concept.
Asset type: original medieval dark-fantasy game boss portrait for Ashen Gates.
Primary request: Create one premium portrait of the Ashen King, an original imposing crowned warrior boss. Vertical 2:3 composition, 1024 by 1536 if available, full body or nearly full body with knees visible, centered and large. Keep the entire obsidian crown clearly inside the frame with breathing room.
Subject: a solitary regal armored king with a severe shadowed face, an intact sculptural black obsidian crown, massive charred steel plate armor with refined antique brass details, subtle glowing ember fissures between armor plates, and one heavy long sword held tip downward. His silhouette is authoritative and readable, not a monstrous pile of spikes.
Scene/backdrop: a very dark ruined throne hall with restrained charcoal smoke and barely visible throne architecture behind him. One character only, no attendants or background figures.
Style/medium: exquisite realistic stylized 3D game-character render, matching a premium medieval knight portrait with finely worked steel, aged brass, leather and fabric; tangible material detail and cinematic depth. Sophisticated fantasy realism, polished production art, not anime, not cartoon, not a flat painting.
Lighting/mood: menacing royal dignity, deep dark shadows, glowing orange-gold rim light and subtle reflected ember light defining the crown, shoulders and sword. Keep the body and facial silhouette readable against the dark background. Smoke must not obscure the crown, hands, armor or sword.
Color palette: blackened steel, obsidian, muted old brass, amber and ember orange, restrained warm gold highlights.
Constraints: original character design; no blood or gore; no text, labels, letters, numbers, UI, border, frame, watermark or logo; no collage, no multiple views, no extra weapons, no extra people. The complete crown must not be cropped.
```

## 黑甲统领 / Blackplate Commander

- Original: `public/art/boss-commander.png`
- Web delivery: `public/art/boss-commander.webp`

Final prompt:

```text
Use case: stylized-concept.
Asset type: original medieval dark-fantasy elite boss portrait for Ashen Gates.
Primary request: Create one premium portrait of the Blackplate Commander, an original disciplined heavily armored human legion commander. Vertical 2:3 composition, 1024 by 1536 if available, full body centered and large, with the complete helmet, halberd blade and feet inside the frame with small margins.
Subject: a solitary commanding warrior wearing a fully closed black-steel visor helmet, heavy orderly legion plate armor with muted aged brass trim, practical layered armor plates, rivets, leather straps, and a restrained dark charcoal military cloak. He holds one tall sturdy halberd upright and one heavy rectangular tower shield. His posture is rigid, balanced and disciplined, a military elite commander rather than a king. Conceal the face entirely behind the steel visor. Keep the arm and hand anatomy plausible.
Scene/backdrop: a dim stone fortress interior with a distant portcullis and quiet haze, one character only, no soldiers, no crowds.
Style/medium: exquisite realistic stylized 3D game-character render, premium medieval character materials matching finely worked steel, aged brass, leather and fabric; tangible surfaces, cinematic depth, sophisticated fantasy realism, polished production art, not anime, not cartoon, not a flat painting.
Lighting/mood: imposing and controlled, soft warm torch rim light and cool steel reflections, readable helmet and shield silhouette against the dark fortress.
Color palette: black steel, charcoal, desaturated antique brass and muted brown leather.
Constraints: original character design; absolutely no crown, no royal crown motif, no magic, no magical glow, no ember fissures, no supernatural effects, no horns; no blood or gore; no text, lettering, numbers, UI, labels, border, frame, watermark or logo; no collage, no multiple views, no extra characters, no extra limbs or duplicate weapons. Exactly one halberd and one tower shield, both visibly attached to the correct hands.
```
