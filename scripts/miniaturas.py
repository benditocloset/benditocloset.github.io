# Miniaturas leves para os cartões da loja (img/t/<nome>.jpg, 540 px de largura).
# Uso: python3 scripts/miniaturas.py   (corre depois de juntar fotos novas; as que já existem não são refeitas)
import re, os
from PIL import Image, ImageOps
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
s = open('index.html', encoding='utf-8').read()
fs = sorted(set(re.findall(r'"(img/[^"/]+\.(?:jpg|jpeg|png|webp))"', s)))
n = 0
for f in fs:
    out = 'img/t/' + os.path.splitext(os.path.basename(f))[0] + '.jpg'
    if not os.path.exists(f) or (os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f)): continue
    im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
    if im.width > 540: im = im.resize((540, round(im.height * 540 / im.width)), Image.LANCZOS)
    im.save(out, quality=80, optimize=True, progressive=True); n += 1
print(n, 'miniaturas novas')
