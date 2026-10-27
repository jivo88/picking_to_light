"""Simulador unificado em um único arquivo HTML que funciona sem internet (three.js embutido)."""
import subprocess, sys, re
from pathlib import Path
AQUI = Path(__file__).resolve().parent
R = str(AQUI.parent) + '/'
import tempfile, os
tmp = os.path.join(tempfile.mkdtemp(), 'unificado.html')
subprocess.run([sys.executable, str(AQUI / 'montar_unificado.py'), tmp], check=True, capture_output=True)
s = open(tmp).read()
import html
three = open(R + 'simulador-3d/vendor/three.min.js').read()
orbit = open(R + 'simulador-3d/vendor/OrbitControls.js').read()
for url, code in [('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js', three),
                  ('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js', orbit)]:
    tag = html.escape(f'<script src="{url}"></script>', quote=True)
    assert s.count(tag) == 1, url
    code = code.replace('</script', '<\\/script')
    s = s.replace(tag, html.escape('<script>\n' + code + '\n</script>', quote=True))
assert 'cdn.jsdelivr' not in s
i = s.index('<script>document.body.className')
doc = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
       + s[:i] + '\n</head>\n<body class="modo-lado">\n' + s[i:] + '\n</body>\n</html>\n')
saida = sys.argv[1] if len(sys.argv) > 1 else R + 'projeto/entregaveis/Simulador_PTL.html'
open(saida, 'w').write(doc)
print(len(doc))
