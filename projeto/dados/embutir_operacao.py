"""Embute os dados das estações (estacoes.json) em simulador-unificado/operacao.html."""
import json, re, sys
from pathlib import Path
base = Path(__file__).resolve().parent
d = json.load(open(base / 'estacoes.json'))
dados = {r: [e['segmento'], e['alto_0a3'], e['alto_45'], e['baixo']] for r, e in sorted(d.items())}
alvo = Path(sys.argv[1]) if len(sys.argv) > 1 else base.parent.parent / 'simulador-unificado' / 'operacao.html'
html = alvo.read_text()
novo = re.sub(r'const ESTACOES = .*?;\n', lambda m: 'const ESTACOES = ' + json.dumps(dados, ensure_ascii=False, separators=(',', ':')) + ';\n', html, count=1)
alvo.write_text(novo)
print('ok', len(dados), 'estações')
