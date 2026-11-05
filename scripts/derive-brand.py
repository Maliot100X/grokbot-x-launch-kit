"""Rebuild derived brand sizes from docs/brand/originals (requires Pillow). Originals are never modified."""
from PIL import Image
o, d = 'docs/brand/originals/', 'docs/brand/derived/'
p = Image.open(o + 'profile-mark.jpg').convert('RGB').crop((112, 112, 912, 912))
p.resize((400, 400), Image.LANCZOS).save(d + 'profile-400.png', optimize=True)
p.resize((800, 800), Image.LANCZOS).save(d + 'profile-800.jpg', quality=88)
b = Image.open(o + 'banner.jpg').convert('RGB')
b.crop((0, 100, 1280, 527)).resize((1500, 500), Image.LANCZOS).save(d + 'x-header-1500x500.jpg', quality=88)
b.crop((0, 40, 1280, 680)).save(d + 'github-social-1280x640.jpg', quality=88)
Image.open(o + 'hero.jpg').convert('RGB').save(d + 'readme-hero-1280x720.jpg', quality=85)
print('derived assets rebuilt')
