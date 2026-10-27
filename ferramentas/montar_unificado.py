"""Gera uma página única (iframes srcdoc) do simulador unificado para publicação."""
import html, re, sys
from pathlib import Path
R = str(Path(__file__).resolve().parent.parent) + '/'
s3 = open(R + 'simulador-3d/index.html').read()
s3 = s3.replace('<link rel="stylesheet" href="estilo.css">', '<style>\n' + open(R + 'simulador-3d/estilo.css').read() + '\n</style>')
s3 = s3.replace('<script src="vendor/three.min.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>')
s3 = s3.replace('<script src="vendor/OrbitControls.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>')
s3 = s3.replace('<script src="dados.js"></script>', '<script>\n' + open(R + 'simulador-3d/dados.js').read() + '\n</script>')
s3 = s3.replace('<script src="sim.js"></script>', '<script>\n' + open(R + 'simulador-3d/sim.js').read() + '\n</script>')
assert 'src="sim.js"' not in s3 and 'estilo.css' not in s3
sc = open(R + 'simulador-unificado/comunicacao.html').read()
sh = open(R + 'simulador-unificado/index.html').read()
sh = sh.replace('src="../simulador-3d/index.html?semajuda"', 'srcdoc="' + html.escape(s3, quote=True) + '"')
sh = sh.replace('src="comunicacao.html"', 'srcdoc="' + html.escape(sc, quote=True) + '"')
sct = open(R + 'simulador-unificado/controle.html').read()
sh = sh.replace('src="controle.html"', 'srcdoc="' + html.escape(sct, quote=True) + '"')
assert 'src="controle.html"' not in sh
sop = open(R + 'simulador-unificado/operacao.html').read()
sh = sh.replace('data-src="operacao.html"', 'srcdoc="' + html.escape(sop, quote=True) + '"')
assert 'data-src="operacao.html"' not in sh
head = re.search(r'<head>(.*?)</head>', sh, re.S).group(1)
body = re.search(r'<body class="modo-lado">(.*)</body>', sh, re.S).group(1)
head = re.sub(r'<meta charset="utf-8">\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
# a casca precisa da classe inicial no body
body = '<script>document.body.className = "modo-lado";</script>\n' + body
open(sys.argv[1], 'w').write(head.strip() + '\n' + body)
print(len(head) + len(body))
