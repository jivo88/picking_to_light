"""Gera a planta 2D das esteiras (Layout_esteiras_2D.html) a partir de ../dados/estacoes.json.

Uso:  python gerar_layout_2d.py            gera o .html
      python gerar_layout_2d.py --imagens  também gera o .png e o .svg (precisa do Playwright: pip install playwright)
"""
import json, re, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
dados = json.load(open(AQUI.parent / 'dados' / 'estacoes.json', encoding='utf-8'))
compacto = {k: [v['segmento'], v['tipo'], v['total'], v['alto_0a3'], v['alto_45'], v['baixo'], v['zonas_baixo'], v['predios_fundo']]
            for k, v in sorted(dados.items())}
modelo = (AQUI / 'layout_2d.modelo.html').read_text(encoding='utf-8')
html = modelo.replace('__DADOS__', json.dumps(compacto, ensure_ascii=False, separators=(',', ':')))
saida = AQUI / 'Layout_esteiras_2D.html'
saida.write_text(html, encoding='utf-8')
print('ok', saida.name)

if '--imagens' in sys.argv:
    from playwright.sync_api import sync_playwright
    claro = {m.group(1): m.group(2) for m in re.finditer(r'--([\w-]+):light-dark\((#[0-9a-fA-F]+),', modelo)}
    claro.update({m.group(1): m.group(2) for m in re.finditer(r'--([\w-]+):(#[0-9a-fA-F]{3,6})[;}]', modelo)})
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1800, 'height': 900}, device_scale_factor=2, color_scheme='light')
        pg.goto(saida.as_uri())
        pg.wait_for_timeout(600)
        pg.locator('.planta').screenshot(path=str(AQUI / 'Layout_esteiras_2D.png'))
        svg = pg.evaluate("() => { const s = document.getElementById('svg').cloneNode(true); s.querySelectorAll('.sel').forEach((g) => g.classList.remove('sel')); s.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); return s.outerHTML; }")
        b.close()
    svg = re.sub(r'var\(--([\w-]+)\)', lambda m: claro.get(m.group(1), '#000'), svg)
    svg = svg.replace('<svg ', '<svg style="background:#fff;font-family:Barlow,Arial,sans-serif" ', 1)
    (AQUI / 'Layout_esteiras_2D.svg').write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + svg, encoding='utf-8')
    print('ok Layout_esteiras_2D.png e Layout_esteiras_2D.svg')
