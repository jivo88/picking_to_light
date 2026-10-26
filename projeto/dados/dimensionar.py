"""Dimensiona estacoes, zonas e displays a partir de wms_endereco (esteiras 1 e 2)."""
import json, sys, collections as C

ARQ = sys.argv[1]

rows = list(json.load(open(ARQ, encoding="utf-8")).values())[0]
rows = [r for r in rows if r["cd_rua"] != "90"]          # desconsiderar Marketing/Almoxarifado

def categoria(r):
    p, a = int(r["cd_predio"]), int(r["cd_andar"])
    if p <= 10:
        return "alto_45" if a in (4, 5) else "alto_0a3"
    return "baixo"                                         # predio 015, fundo e esquinas

ZONAS_POR_LADO = 4            # baixo giro: 4 zonas por lado do corredor (1 display de endereco + 1 de quantidade cada)
PREDIO_VIRADA = 32            # predios < 32 no lado esquerdo do corredor; 015 e >= 32 no lado direito


def dividir(predios, n):
    """Divide a lista de predios (na ordem a partir da entrada do corredor) em ate n zonas contiguas."""
    n = min(n, len(predios))
    out, i = [], 0
    for k in range(n):
        tam = len(predios) // n + (1 if k < len(predios) % n else 0)
        out.append(predios[i:i + tam])
        i += tam
    return out


ZONA_PREDIO = {}              # (rua, predio) -> zona do baixo giro


def montar_zonas(rua, rs):
    pb = sorted({int(r["cd_predio"]) for r in rs if 10 < int(r["cd_predio"]) < 60 and int(r["cd_predio"]) != 15})
    esq = [p for p in pb if p < PREDIO_VIRADA]
    dir_ = sorted([p for p in pb if p >= PREDIO_VIRADA], reverse=True)       # a partir da entrada
    for k, grupo in enumerate(dividir(esq, ZONAS_POR_LADO)):
        for p in grupo:
            ZONA_PREDIO[(rua, p)] = "BG-E%d" % (k + 1)
    for k, grupo in enumerate(dividir(dir_, ZONAS_POR_LADO)):
        for p in grupo:
            ZONA_PREDIO[(rua, p)] = "BG-D%d" % (k + 1)
    # predio 015 fica no inicio do lado direito: entra na 1a zona do lado direito (ou do esquerdo, se nao houver)
    ZONA_PREDIO[(rua, 15)] = "BG-D1" if dir_ else "BG-E1"


def zona(r):
    p = int(r["cd_predio"])
    if p <= 10:
        a = int(r["cd_andar"])
        if a in (4, 5):
            return ("AG-E" if p <= 5 else "AG-D") + str(a)  # alto giro 4-5: 1 display E+Q por andar e por lado
        return None                                         # alto giro 0-3: display proprio
    if p >= 60:
        return "BG-X%02d" % ((p - 60) // 4 + 1)            # esquina: zonas de 4 predios
    return ZONA_PREDIO[(r["cd_rua"], p)]


estacoes = {}
por_rua = C.defaultdict(list)
for r in rows:
    por_rua[r["cd_rua"]].append(r)

for rua, rs in sorted(por_rua.items()):
    montar_zonas(rua, rs)
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
        "blocos_alto_45": 4 if cat["alto_45"] else 0,   # A4 e A5 em cada lado (display fixo no lado)
        "zonas_baixo": len(zonas_bg),
        "zonas": dict(sorted(zonas.items())),
        # 1 nó por prédio do alto giro com endereços nos andares 0-3 (máx. 4 módulos Q por prédio nos dados)
        "nos_coluna": len({r["cd_predio"] for r in rs if categoria(r) == "alto_0a3"}),
        # prédios do baixo giro (corredor, 015 e esquinas): base do LED guia opcional e da canaleta do corredor
        "predios_fundo": len({r["cd_predio"] for r in rs if categoria(r) == "baixo"}),
        "max_q_por_predio": max(C.Counter(r["cd_predio"] for r in rs if categoria(r) == "alto_0a3").values()),
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
