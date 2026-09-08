"""Subset the OFL Noto Serif SC variable font to current interface characters.

Download the official upstream TTF to artifacts/fonts/NotoSerifSC.ttf first.
Requires fontTools. WOFF uses built-in zlib and preserves the weight axis.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parent.parent
characters = ''.join(chr(c) for c in range(32, 127))
for folder in ['app', 'components', 'lib']:
    for path in (root / folder).rglob('*'):
        if path.suffix in ['.ts', '.tsx', '.css']:
            characters += path.read_text(encoding='utf-8')
font = TTFont(root / 'artifacts/fonts/NotoSerifSC.ttf')
options = subset.Options()
options.layout_features = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
font.flavor = 'woff'
output = root / 'public/fonts/ashen-serif-sc.woff'
font.save(output)
print(f'{len(set(characters))} characters; {output.stat().st_size} bytes')
