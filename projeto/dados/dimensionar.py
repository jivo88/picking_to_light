"""Dimensiona estacoes, zonas e displays a partir de wms_endereco (esteiras 1 e 2)."""
import json, sys, collections as C

ARQ = sys.argv[1]
PREDIOS_POR_ZONA = 4          # baixo giro: 1 display (endereco+qtd) a cada 4 predios

rows = list(json.load(open(ARQ, encoding="utf-8")).values())[0]
rows = [r for r in rows if r["cd_rua"] != "90"]          # desconsiderar Marketing/Almoxarifado

def categoria(r):
    p, a = int(r["cd_predio"]), int(r["cd_andar"])
    if p <= 10:
        return "alto_45" if a in (4, 5) else "alto_0a3"
    return "baixo"                                         # predio 015, fundo e esquinas

def zona(r):
    p = int(r["cd_predio"])
    if p <= 10:
        a = int(r["cd_andar"])
        if a in (4, 5):
            return "AG-E" if p <= 5 else "AG-D"            # alto giro 4-5: blocos esquerdo/direito
        return None                                         # alto giro 0-3: display proprio
    if p < 20:
        return "BG-01"                                      # predio 015 entra na 1a zona do fundo
    if p >= 60:
        return "BG-X%02d" % ((p - 60) // PREDIOS_POR_ZONA + 1)  # esquina
    base = 20 if r["cd_esteira"] == 2 else 22
    return "BG-%02d" % ((p - base) // PREDIOS_POR_ZONA + 1)

estacoes = {}
por_rua = C.defaultdict(list)
for r in rows:
    por_rua[r["cd_rua"]].append(r)

for rua, rs in sorted(por_rua.items()):
    seg = "Medicamento" if rs[0]["cd_esteira"] == 2 else "Perfumaria"
    cat = C.Counter(categoria(r) for r in rs)
    zonas = C.Counter(zona(r) for r in rs if zona(r))
    zonas_bg = sorted(z for z in zonas if z.startswith("BG"))
    tipo = "Comum"
    if rua in ("09", "10", "15", "16", "32", "33", "38", "39"):
        tipo = "Esquina"
    elif rua in ("03", "22", "26", "45"):
        tipo = "Ponta"
    estacoes[rua] = {
        "rua": rua, "segmento": seg, "tipo": tipo, "total": len(rs),
        "alto_0a3": cat["alto_0a3"], "alto_45": cat["alto_45"], "baixo": cat["baixo"],
        "blocos_alto_45": len([z for z in zonas if z.startswith("AG")]),
        "zonas_baixo": len(zonas_bg),
        "zonas": dict(sorted(zonas.items())),
    }

json.dump(estacoes, open("dados/estacoes.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# enderecos completos das estacoes piloto (para o simulador)
for rua in ("05", "27"):
    lista = [{"end": r["cd_endereco"], "predio": int(r["cd_predio"]), "andar": int(r["cd_andar"]),
              "cat": categoria(r), "zona": zona(r), "dim": r["id_tipo_caixa_dimensao"],
              "ordem": r["nr_ordem_separacao_flow"]} for r in por_rua[rua]]
    json.dump(lista, open("dados/enderecos_rua%s.json" % rua, "w", encoding="utf-8"), ensure_ascii=False)

print("rua seg  tipo     total alto0-3 alto4-5 baixo blocosAG zonasBG")
T = C.Counter()
for e in estacoes.values():
    print("%s  %-4s %-8s %5d %7d %7d %5d %8d %7d" % (e["rua"], e["segmento"][:4], e["tipo"], e["total"], e["alto_0a3"],
          e["alto_45"], e["baixo"], e["blocos_alto_45"], e["zonas_baixo"]))
    for k in ("total", "alto_0a3", "alto_45", "baixo", "blocos_alto_45", "zonas_baixo"):
        T[k] += e[k]
print("TOTAL", dict(T), "estacoes", len(estacoes))
for seg in ("Medicamento", "Perfumaria"):
    print(seg, len([e for e in estacoes.values() if e["segmento"] == seg]))
print("zonas rua05:", estacoes["05"]["zonas"])
print("zonas rua33:", estacoes["33"]["zonas"])
