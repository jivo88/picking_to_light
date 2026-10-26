"""Gera simulador-3d/dados.js (estações 05 e 27) a partir de estacoes.json e enderecos_ruaXX.json."""
import json, sys
BASE = "/home/claude/ptl-projeto/dados/"
SAIDA = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/picking_to_light/simulador-3d/dados.js"
est = json.load(open(BASE + "estacoes.json", encoding="utf-8"))
out = {}
for rua in ("05", "27"):
    ends = json.load(open(BASE + "enderecos_rua%s.json" % rua, encoding="utf-8"))
    out[rua] = {"info": est[rua], "enderecos": [[e["end"], e["predio"], e["andar"], e["cat"], e["zona"], e["dim"], e["ordem"]] for e in ends]}
with open(SAIDA, "w", encoding="utf-8") as f:
    f.write("// Gerado de dados/enderecos_ruaXX.json (tabela wms_endereco). Campos: end, predio, andar, cat, zona, dim, ordem\n")
    f.write("window.PTL_DADOS = " + json.dumps(dict(sorted(out.items(), reverse=True)), ensure_ascii=False, separators=(",", ":")) + ";\n")
print("ok", SAIDA)
