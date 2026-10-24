"""Gera diagramas.html (SVG) e depois as imagens PNG via Playwright."""
import asyncio
import json

from playwright.async_api import async_playwright

BASE = "/home/claude/ptl-projeto"
END05 = json.load(open(BASE + "/dados/enderecos_rua05.json", encoding="utf-8"))

AZ = "#1F3864"      # azul escuro
AZ2 = "#2F5597"
CL = "#DEE6F2"      # azul claro
AM = "#F2A33A"      # ambar (LED)
VD = "#2E8B57"      # verde
VD2 = "#E3F1E8"
CZ = "#5B6675"
CZ2 = "#F3F5F8"
RX = "#7B4FA0"      # roxo (RFID)
RX2 = "#EFE7F6"
FONT = "font-family='Segoe UI, Arial, sans-serif'"


def caixa(x, y, w, h, titulo, linhas=(), cor=AZ, fundo="#FFFFFF", tsize=15, lsize=12.5, raio=10):
    s = [f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{raio}' fill='{fundo}' stroke='{cor}' stroke-width='2'/>",
         f"<rect x='{x}' y='{y}' width='{w}' height='30' rx='{raio}' fill='{cor}'/>",
         f"<rect x='{x}' y='{y+20}' width='{w}' height='10' fill='{cor}'/>",
         f"<text x='{x+w/2}' y='{y+20}' text-anchor='middle' fill='#fff' font-size='{tsize}' font-weight='700' {FONT}>{titulo}</text>"]
    for i, l in enumerate(linhas):
        s.append(f"<text x='{x+12}' y='{y+52+i*18}' fill='#1c2430' font-size='{lsize}' {FONT}>{l}</text>")
    return "\n".join(s)


def seta(x1, y1, x2, y2, rot="", cor=CZ, tracejada=False, lado=0, dupla=False):
    d = "stroke-dasharray='6 5'" if tracejada else ""
    mi = "marker-start='url(#ini)'" if dupla else ""
    s = f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{cor}' stroke-width='2.2' {d} marker-end='url(#fim)' {mi}/>"
    if rot:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        s += (f"<rect x='{mx-len(rot)*3.6-6+lado}' y='{my-11}' width='{len(rot)*7.2+12}' height='20' rx='5' fill='#fff' "
              f"stroke='#d5dbe3'/><text x='{mx+lado}' y='{my+4}' text-anchor='middle' font-size='11.5' fill='{CZ}' {FONT}>{rot}</text>")
    return s


DEFS = f"""<defs>
<marker id='fim' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>
<path d='M0,0 L10,5 L0,10 z' fill='{CZ}'/></marker>
<marker id='ini' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>
<path d='M0,0 L10,5 L0,10 z' fill='{CZ}'/></marker>
<filter id='sombra' x='-10%' y='-10%' width='120%' height='130%'><feDropShadow dx='0' dy='2' stdDeviation='3' flood-opacity='.18'/></filter>
</defs>"""


def svg(w, h, corpo, titulo=None):
    t = (f"<text x='24' y='34' font-size='20' font-weight='700' fill='{AZ}' {FONT}>{titulo}</text>" if titulo else "")
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>{DEFS}<rect width='{w}' height='{h}' fill='#fff'/>{t}{corpo}</svg>"


# ---------------------------------------------------------------- D1 arquitetura A
def d_arq(rfid=False):
    w, h = 1400, 760
    c = []
    # camada sistemas
    c.append(f"<text x='30' y='78' font-size='13' font-weight='700' fill='{CZ}' {FONT}>SISTEMAS EXISTENTES</text>")
    c.append(caixa(30, 90, 300, 120, "WMS (legado)", ["PowerBuilder 12 + Sybase ASE 16", "Pedidos, itens, wms_endereco", "Ordem da rota (nr_ordem_separacao_flow)"], CZ))
    c.append(caixa(30, 240, 300, 120, "Sistema BHT (terceiro)", ["Controla a esteira", "Lê a etiqueta da caixa", "API com as informações da caixa"], CZ))
    # servico
    c.append(f"<text x='420' y='78' font-size='13' font-weight='700' fill='{AZ}' {FONT}>NOVO — SERVIDOR PTL (VM)</text>")
    c.append(caixa(420, 90, 400, 270, "Serviço PTL", [
        "API REST (abre/fecha caixa, status)",
        "Regras: filtra a estação, divide em",
        "  alto giro / andares 4-5 / zonas de baixo giro",
        "  e ordena pela rota de coleta",
        "Broker MQTT (Mosquitto) — mensagens",
        "  com os concentradores",
        "Tabelas PTL no Sybase (sessões, log)",
        "Painel de monitoramento (gestão e TI)",
        "Watchdog, heartbeat e alertas"], AZ, CL))
    c.append(seta(330, 150, 420, 150, "SQL"))
    c.append(seta(330, 300, 420, 300, "API"))
    # identificacao
    if not rfid:
        c.append(caixa(900, 90, 470, 140, "Coletor MovFast (Android, Wi-Fi)", [
            "A1 — app próprio PTL (Android)", "A2 — tela do WMS no coletor",
            "Gatilho: 1ª leitura ABRE, 2ª leitura FECHA a caixa", "Mostra o progresso da caixa"], AZ2))
        c.append(seta(900, 165, 820, 165, "HTTPS", dupla=True))
    else:
        c.append(caixa(900, 90, 470, 160, "Identificação por RFID (NFC 13,56 MHz)", [
            "Tag NFC fixa em cada caixa retornável",
            "B1 — pulseira NFC do operador (Bluetooth/Wi-Fi)",
            "B2 — leitor fixo na estação, ligado ao concentrador",
            "Painel da estação mostra caixa e progresso",
            "Fechamento: nova leitura da tag"], RX, RX2))
        c.append(seta(900, 175, 820, 175, "Wi-Fi", dupla=True))
    # estacao
    c.append(f"<text x='30' y='418' font-size='13' font-weight='700' fill='{VD}' {FONT}>ESTAÇÃO (× 40) — REDE CABEADA</text>")
    c.append(caixa(420, 430, 400, 150, "Concentrador da estação", [
        "RP2040 + Ethernet W5500 (cabo, VLAN PTL)",
        "2 barramentos RS-485 (alto e baixo giro)",
        "Fonte 12 V Mean Well + gabinete ventilado",
        "Guarda o estado da caixa se a rede cair"] + (["B2: leitor NFC + painel LCD"] if rfid else []), VD, VD2))
    c.append(seta(620, 360, 620, 430, "MQTT (ptl/est/cmd · evt)", dupla=True))
    c.append(caixa(30, 610, 380, 130, "Alto giro (na frente do operador)", [
        "Andares 0-3: Módulo Q por endereço",
        "  (quantidade 3 díg. + botão com LED)",
        "Nó de coluna por prédio (1 a 10)",
        "Andares 4-5: 4 displays E+Q (A4/A5 por lado)"], VD))
    c.append(caixa(470, 610, 360, 130, "Baixo giro (corredor)", [
        "Zonas de 4 prédios (6 a 9 por estação)",
        "1 Módulo E+Q por zona:",
        "  endereço 8 díg. + quantidade + botão",
        "Um item por vez, na ordem da rota"], VD))
    c.append(seta(520, 580, 260, 610, "RS-485 + 12 V (Cat5e)"))
    c.append(seta(660, 580, 660, 610, ""))
    if rfid:
        c.append(caixa(890, 430, 480, 150, "Leitor fixo B2 (opcional)", [
            "PN532 sob a posição da caixa", "LCD 20×4: caixa, itens restantes",
            "Botão FECHAR / nova leitura da tag", "Alternativa sem nada no corpo do operador"], RX, RX2))
        c.append(seta(890, 505, 820, 505, "serial/I2C"))
    else:
        c.append(caixa(890, 430, 480, 150, "Operador (1 por estação)", [
            "Lê a caixa no gatilho → displays acendem",
            "Pega a quantidade e aperta o botão",
            "Zonas avançam para o próximo item",
            "Lê a caixa de novo → fecha e segue"], CZ))
    c.append(caixa(890, 610, 480, 130, "Rede e infraestrutura", [
        "Ponto cabeado por estação → switch 24 portas",
        "VLAN dedicada PTL, IP reservado por estação",
        "Coletores no Wi-Fi existente",
        "NTP, backup e monitoramento centralizados"], CZ))
    tit = "Arquitetura B — RFID + concentrador + displays" if rfid else "Arquitetura A — Coletor + concentrador + displays"
    return svg(w, h, "\n".join(c), tit)


# ---------------------------------------------------------------- D3 sequencia
def d_sequencia():
    w, h = 1400, 820
    atores = [("Operador", CZ), ("Coletor", AZ2), ("Serviço PTL", AZ), ("Sybase / API BHT", CZ), ("Concentrador", VD), ("Displays", AM)]
    xs = [110, 330, 560, 790, 1020, 1250]
    c = []
    for (n, cor), x in zip(atores, xs):
        c.append(f"<rect x='{x-90}' y='56' width='180' height='40' rx='8' fill='{cor}'/>"
                 f"<text x='{x}' y='82' text-anchor='middle' fill='#fff' font-size='15' font-weight='700' {FONT}>{n}</text>"
                 f"<line x1='{x}' y1='96' x2='{x}' y2='800' stroke='#c7cdd6' stroke-width='2' stroke-dasharray='5 6'/>")
    passos = [
        (0, 1, "1. Lê a etiqueta (gatilho)"),
        (1, 2, "2. POST leitura {estação, caixa}"),
        (2, 3, "3. Busca itens da caixa"),
        (3, 2, "4. Itens + endereços"),
        (2, 2, "5. Filtra a estação, divide e ordena"),
        (2, 4, "6. MQTT SEPARAR (alto giro + zonas)"),
        (4, 5, "7. Acende quantidades / 1º item de cada zona"),
        (4, 2, "8. ACK (itens acesos)"),
        (2, 1, "9. Caixa aberta: 0 / N itens"),
        (0, 5, "10. Pega e aperta o botão"),
        (5, 4, "11. Botão confirmado"),
        (4, 2, "12. BTN (endereço, qtd)  → zona avança"),
        (2, 1, "13. Progresso x / N"),
        (4, 2, "14. Último item: ESTAÇÃO CONCLUÍDA"),
        (0, 1, "15. Lê a etiqueta de novo (fecha)"),
        (1, 2, "16. POST leitura → FECHAR"),
        (2, 3, "17. Grava sessão; informa BHT (a validar)"),
        (2, 1, "18. Caixa fechada — liberar"),
    ]
    y = 128
    for a, b, txt in passos:
        if a == b:
            x = xs[a]
            c.append(f"<path d='M{x},{y} h40 v22 h-36' fill='none' stroke='{CZ}' stroke-width='2' marker-end='url(#fim)'/>"
                     f"<text x='{x+48}' y='{y+15}' font-size='12.5' fill='#1c2430' {FONT}>{txt}</text>")
            y += 40
            continue
        x1, x2 = xs[a], xs[b]
        cor = AM if b == 5 else (VD if 4 in (a, b) else CZ)
        c.append(f"<line x1='{x1}' y1='{y}' x2='{x2 - (8 if x2 > x1 else -8)}' y2='{y}' stroke='{cor}' stroke-width='2.2' marker-end='url(#fim)'/>")
        tx = (x1 + x2) / 2
        c.append(f"<rect x='{tx-len(txt)*3.4-6}' y='{y-19}' width='{len(txt)*6.8+12}' height='17' rx='4' fill='#fff'/>"
                 f"<text x='{tx}' y='{y-6}' text-anchor='middle' font-size='12.5' fill='#1c2430' {FONT}>{txt}</text>")
        y += 37
    return svg(w, h, "\n".join(c), "Sequência de operação — Arquitetura A")


# ---------------------------------------------------------------- D4 layout estacao 05 (elevações, prateleiras alinhadas, andar 0 em cima)
ZCOR = ["#E3F1E8", "#DEE6F2", "#FCE8CC", "#EFE7F6", "#FDE2E2", "#E0F2F1", "#F3F5F8"]
ZBOR = [VD, AZ2, "#D68910", RX, "#C0392B", "#138D90", CZ]
DIM = {"A": (0.9, 0.78), "B": (0.8, 0.68), "C": (0.72, 0.6), "F": (0.58, 0.48), "N": (0.86, 0.72)}


def _por_predio(ends):
    d = {}
    for e in ends:
        d.setdefault(e["predio"], {})[e["andar"]] = e
    return d


def _coluna(c, x, y, w, hl, niveis, ends, cor_fn):
    for a in range(niveis):
        yy = y + a * hl
        c.append(f"<line x1='{x}' y1='{yy+hl}' x2='{x+w-3}' y2='{yy+hl}' stroke='#9AA4AE' stroke-width='2'/>")
        e = ends.get(a)
        if not e:
            continue
        f, bo = cor_fn(e)
        fw, fh = DIM.get(e["dim"], (0.75, 0.6))
        bw, bh = (w - 3) * fw, (hl - 3) * fh
        c.append(f"<rect x='{x+(w-3-bw)/2}' y='{yy+hl-bh-1}' width='{bw}' height='{bh}' rx='2' fill='{f}' stroke='{bo}'/>")
    c.append(f"<line x1='{x-1}' y1='{y}' x2='{x-1}' y2='{y+niveis*hl}' stroke='#AAB2BC'/>")


def _rotulos_andar(c, x, y, hl, niveis):
    for a in range(niveis):
        c.append(f"<text x='{x-6}' y='{y+a*hl+hl/2+4}' text-anchor='end' font-size='10.5' fill='{CZ}' {FONT}>A{a}</text>")


def _disp(c, x, y, w, end, qtd, cor):
    c.append(f"<rect x='{x}' y='{y}' width='{w}' height='24' rx='4' fill='#111' stroke='{cor}' stroke-width='2'/>"
             f"<text x='{x+7}' y='{y+16}' font-size='11' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>{end}</text>"
             f"<text x='{x+w-8}' y='{y+16}' text-anchor='end' font-size='11' fill='#39d36a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>{qtd}</text>")


def d_layout():
    w, h = 1500, 540
    c = []
    pp = _por_predio(END05)
    zid = lambda e: int(e["zona"].split("-")[1]) - 1
    # ---- alto giro
    ax, ay, cw, hl = 70, 140, 38, 30
    band = 46
    yb = ay + 4 * hl + band
    c.append(f"<text x='{ax}' y='{ay-62}' font-size='16' font-weight='700' fill='{AZ}' {FONT}>ALTO GIRO — prédios 001–010 (na frente do operador)</text>")

    def cor_a(e):
        if e["andar"] <= 3:
            return VD2, VD
        return ("#D6E4F7", AZ2) if e["predio"] <= 5 else ("#FCE8CC", AM)
    for a_ in range(4):
        c.append(f"<text x='{ax-6}' y='{ay+a_*hl+hl/2+4}' text-anchor='end' font-size='10.5' fill='{CZ}' {FONT}>A{a_}</text>")
    for k_, a_ in enumerate((4, 5)):
        c.append(f"<text x='{ax-6}' y='{yb+k_*hl+hl/2+4}' text-anchor='end' font-size='10.5' fill='{CZ}' {FONT}>A{a_}</text>")
    larg = 10 * cw + 14
    c.append(f"<rect x='{ax}' y='{ay+4*hl+6}' width='{larg-3}' height='{band-12}' rx='3' fill='#D5DAE0' stroke='{CZ}'/>")
    for x_ in range(ax + 6, ax + larg - 6, 9):
        c.append(f"<line x1='{x_}' y1='{ay+4*hl+8}' x2='{x_}' y2='{ay+4*hl+band-8}' stroke='#BCC4CC'/>")
    c.append(f"<text x='{ax+larg/2}' y='{ay+4*hl+band/2+4}' text-anchor='middle' font-size='11' font-weight='700' fill='{AZ}' {FONT}>esteira de separação (frente) + transporte (atrás)</text>")
    for p in range(1, 11):
        x = ax + (p - 1) * cw + (14 if p > 5 else 0)
        ends = pp.get(p, {})
        _coluna(c, x, ay, cw, hl, 4, {a_: e for a_, e in ends.items() if a_ <= 3}, cor_a)
        _coluna(c, x, yb, cw, hl, 2, {a_ - 4: e for a_, e in ends.items() if a_ >= 4}, cor_a)
        c.append(f"<text x='{x+cw/2-1}' y='{yb+2*hl+16}' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>{p:03d}</text>")
    for k, (p0, cor) in enumerate(((1, AZ2), (6, AM))):
        x = ax + (p0 - 1) * cw + (14 if p0 > 5 else 0)
        for j_, an in enumerate((4, 5)):
            yy = yb + (j_ + 1) * hl - 6
            c.append(f"<rect x='{x+18}' y='{yy}' width='{5*cw-50}' height='12' rx='3' fill='#111' stroke='{cor}' stroke-width='1.5'/>"
                     f"<text x='{x+18+(5*cw-50)/2}' y='{yy+9.5}' text-anchor='middle' font-size='8.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>E+Q A{an}</text>")
    ly0 = yb + 2 * hl + 38
    c.append(f"<text x='{ax}' y='{ly0}' font-size='12.5' {FONT}>As esteiras passam por baixo do andar 3 e por cima do andar 4.</text>")
    c.append(f"<rect x='{ax}' y='{ly0+14}' width='16' height='16' rx='3' fill='{VD2}' stroke='{VD}'/><text x='{ax+24}' y='{ly0+27}' font-size='12.5' {FONT}>Andares 0–3: Módulo Q por endereço — 29</text>")
    c.append(f"<rect x='{ax}' y='{ly0+38}' width='16' height='16' rx='3' fill='#D6E4F7' stroke='{AZ2}'/><text x='{ax+24}' y='{ly0+51}' font-size='12.5' {FONT}>Andares 4–5: 20 endereços em 4 displays E+Q</text>")
    # ---- baixo giro
    bpred = sorted({e["predio"] for e in END05 if e["cat"] == "baixo" and e["predio"] != 15})
    esq = [p for p in bpred if p < 32]
    dirt = [15] + sorted([p for p in bpred if p >= 32], reverse=True)
    by, bw, bhl = 150, 29, 30

    def cor_b(e):
        z = zid(e)
        return ZCOR[z % 7], ZBOR[z % 7]

    def lado(x0, preds, titulo):
        c.append(f"<text x='{x0}' y='{by-70}' font-size='16' font-weight='700' fill='{AZ}' {FONT}>{titulo}</text>")
        _rotulos_andar(c, x0, by, bhl, 8)
        zonas = {}
        for i, p in enumerate(preds):
            x = x0 + i * bw
            _coluna(c, x, by, bw, bhl, 8, pp[p], cor_b)
            c.append(f"<text x='{x+bw/2-1}' y='{by+8*bhl+16}' text-anchor='middle' font-size='10' fill='{CZ}' {FONT}>{p:03d}</text>")
            z = zid(next(iter(pp[p].values())))
            zonas.setdefault(z, []).append((x, p))
        for z, xps in zonas.items():
            xs = [q for q, _ in xps]
            x1, x2 = min(xs), max(xs) + bw - 3
            if x2 - x1 > 60:
                _disp(c, x1, by - 46, x2 - x1, f"P{xps[0][1]:03d} A2", "1", ZBOR[z % 7])
            c.append(f"<text x='{(x1+x2)/2}' y='{by-8}' text-anchor='middle' font-size='10.5' font-weight='700' fill='{ZBOR[z%7]}' {FONT}>ZONA {z+1}</text>")
        c.append(f"<text x='{x0}' y='{by+8*bhl+36}' font-size='11.5' fill='{CZ}' {FONT}>← entrada do corredor                         fundo →</text>")
    lado(560, esq, "BAIXO GIRO — lado esquerdo (P020–P031)")
    lado(980, dirt, "Lado direito (P015, P043 → P032)")
    ly = by + 8 * bhl + 62
    c.append(f"<text x='560' y='{ly}' font-size='12.5' {FONT}>• Prateleiras alinhadas, andar 0 em cima. A caixa do endereço muda de tamanho pelo tipo (A, B, C, F, N); andar sem endereço fica vazio.</text>")
    c.append(f"<text x='560' y='{ly+22}' font-size='12.5' {FONT}>• 160 endereços em 6 zonas de 4 prédios; 1 display E+Q por zona. P015 (150–153) abre o lado direito e entra na Zona 1.</text>")
    return svg(w, h, "\n".join(c), "Elevações da estação 05 (Medicamento) — 209 endereços reais de wms_endereco")


# ---------------------------------------------------------------- D4b planta da estação
def d_planta():
    W, H = 1500, 760
    s = 46
    P, hc, pb = 5.9, 0.75, 2.2
    zF, zFace, zBack = 1.35, -0.3, -2.05
    est0, est1 = 3, 6
    xa = (est0 - 5 - 0.5) * P - 0.3
    X = lambda x: 30 + (x - xa) * s
    Y = lambda z: 100 + (z + 2.3) * s
    pp = _por_predio(END05)
    bpred = sorted({e["predio"] for e in END05 if e["cat"] == "baixo" and e["predio"] != 15})
    esq = [p for p in bpred if p < 32]
    dirt = [15] + sorted([p for p in bpred if p >= 32], reverse=True)
    L = max(len(esq), len(dirt)) * 0.6
    xb = (est1 - 5 + 0.5) * P + 0.3
    c = []

    def r(x1, z1, x2, z2, fill, stroke=CZ, sw=1.4, op=1):
        c.append(f"<rect x='{X(min(x1,x2))}' y='{Y(min(z1,z2))}' width='{abs(x2-x1)*s}' height='{abs(z2-z1)*s}' fill='{fill}' fill-opacity='{op}' stroke='{stroke}' stroke-width='{sw}'/>")

    def t(x, z, txt, size=12, cor="#1c2430", peso=400, anchor="middle", rot=None):
        tr = f"transform='rotate({rot} {X(x)} {Y(z)})'" if rot else ""
        c.append(f"<text x='{X(x)}' y='{Y(z)}' text-anchor='{anchor}' font-size='{size}' font-weight='{peso}' fill='{cor}' {tr} {FONT}>{txt}</text>")

    def seta(x1, z1, x2, z2, cor, larg=3):
        c.append(f"<line x1='{X(x1)}' y1='{Y(z1)}' x2='{X(x2)}' y2='{Y(z2)}' stroke='{cor}' stroke-width='{larg}' marker-end='url(#fim)'/>")
    # alto giro (faixa de estantes) por estação
    for st in range(est0, est1 + 1):
        xc = (st - 5) * P
        nosso = st == 5
        r(xc - 2.8, zBack, xc + 2.8, zFace, "#DEE6F2" if nosso else "#EEF0F3", AZ2 if nosso else "#AAB2BC", 1.8 if nosso else 1.2)
    # esteiras por dentro do alto giro
    for z1, z2, nome in ((-1.665, -1.115, "ESTEIRA DE TRANSPORTE  →"), (-0.915, -0.365, "ESTEIRA DE SEPARAÇÃO")):
        r(xa, z1, xb, z2, "#C9D0D8", CZ, 1.2, 0.85)
        x = xa
        while x < xb:
            c.append(f"<line x1='{X(x)}' y1='{Y(z1)}' x2='{X(x)}' y2='{Y(z2)}' stroke='#AEB7C1'/>")
            x += 0.3
        t(xa + 0.6, (z1 + z2) / 2 + 0.1, nome, 11.5, AZ, 700, "start")
    # transferência 03|04
    xt = (3.5 - 5) * P
    r(xt - 0.3, -1.115, xt + 0.3, -0.915, "#E3F1E8", VD)
    seta(xt, -1.5, xt, -0.75, VD)
    c.append(f"<circle cx='{X(xt)}' cy='{Y(-0.64)}' r='7' fill='{AM}' stroke='#9a6413'/>")
    seta(xt - 0.25, -0.64, xt - 1.6, -0.64, "#B9770E", 2.5)
    seta(xt + 0.25, -0.64, xt + 1.6, -0.64, "#B9770E", 2.5)
    for s0, s1, txt in ((3, 3, "esquerda: 03"), (4, 5, "direita: 04 e 05")):
        x1, x2 = (s0 - 5 - 0.5) * P + 0.15, (s1 - 5 + 0.5) * P - 0.15
        c.append(f"<path d='M{X(x1)},{Y(-0.22)} L{X(x1)},{Y(-0.12)} L{X(x2)},{Y(-0.12)} L{X(x2)},{Y(-0.22)}' fill='none' stroke='#B9770E' stroke-width='1.6'/>")
        t((x1 + x2) / 2, 0.18, txt, 10.5, "#B9770E", 700)
    t(xt, -2.42, "transferência 03|04 · rolete direcionador", 11, VD, 700)
    # bacia na estação 05 e empurrão de volta
    r(-0.3, -0.84, 0.3, -0.44, "#2E9E4F", "#1d6b35")
    seta(0.45, -0.6, 0.45, -1.35, "#C0392B", 2.5)
    t(0.75, -2.42, "empurra de volta à esteira de transporte (de qualquer ponto)", 10.5, "#C0392B", 700, "start")
    # operador e corredor
    c.append(f"<line x1='{X(xa)}' y1='{Y(-0.2)}' x2='{X(xb)}' y2='{Y(-0.2)}' stroke='#F4C430' stroke-width='3'/>")
    c.append(f"<circle cx='{X(0.35)}' cy='{Y(0.35)}' r='9' fill='#2E9E4F' stroke='#111'/>")
    t(0.35, 0.85, "operador", 10.5, CZ)
    for st in range(est0, est1 + 1):
        xc = (st - 5) * P
        nosso = st == 5
        fill, bor = ("#DEE6F2", AZ2) if nosso else ("#EEF0F3", "#AAB2BC")
        r(xc - hc - pb, zF, xc - hc, zF + L, fill, bor)
        r(xc + hc, zF, xc + hc + pb, zF + L, fill, bor)
        t(xc - 1.9, 1.1, f"ESTAÇÃO {st:02d}", 12, AZ if nosso else CZ, 700)
    zid = lambda p: int(next(iter(pp[p].values()))["zona"].split("-")[1]) - 1
    for i, p in enumerate(esq):
        z = zid(p)
        r(hc, zF + i * 0.6, hc + 0.35, zF + (i + 1) * 0.6, ZBOR[z % 7], "#fff")
        t(hc + 0.55, zF + i * 0.6 + 0.4, f"{p:03d}", 9.5, CZ, 400, "start")
    for i, p in enumerate(dirt):
        z = zid(p)
        r(-hc - 0.35, zF + i * 0.6, -hc, zF + (i + 1) * 0.6, ZBOR[z % 7], "#fff")
        t(-hc - 0.55, zF + i * 0.6 + 0.4, f"{p:03d}", 9.5, CZ, 400, "end")
    t(hc + 1.6, zF + L / 2, "LADO ESQUERDO · P020–P031", 11.5, AZ, 700, rot=90)
    t(-hc - 1.6, zF + L / 2, "LADO DIREITO · P015, P043 → P032", 11.5, AZ, 700, rot=-90)
    pts = [(0.15, 0.55), (0.25, zF + 0.2), (0.25, zF + L - 0.25), (-0.25, zF + L - 0.25), (-0.25, zF + 0.3)]
    c.append("<polyline points='" + " ".join(f"{X(x)},{Y(z)}" for x, z in pts) + f"' fill='none' stroke='{AM}' stroke-width='3' stroke-dasharray='7 6' marker-end='url(#fim)'/>")
    r(2.4, 0.95, 2.75, 1.18, VD, "#1d5e3a")
    t(2.58, 0.85, "concentrador", 9.5, VD, 700)
    # legenda
    lx, ly = 1180, 110
    itens = [("#DEE6F2", AZ2, "Estação 05 (piloto)"), ("#EEF0F3", "#AAB2BC", "Estações vizinhas"), ("#C9D0D8", CZ, "Esteiras (dentro do alto giro)"),
             ("#E3F1E8", VD, "Transferência"), (AM, "#9a6413", "Rolete direcionador"), ("#2E9E4F", "#1d6b35", "Bacia (verde, tamanho único)")]
    for i, (f, b_, txt) in enumerate(itens):
        c.append(f"<rect x='{lx}' y='{ly+i*28}' width='20' height='20' rx='3' fill='{f}' stroke='{b_}' stroke-width='1.6'/><text x='{lx+30}' y='{ly+i*28+15}' font-size='12.5' {FONT}>{txt}</text>")
    ty = ly + len(itens) * 28 + 26
    linhas = ["Regras da transferência", "Cada transferência atende até 4 estações:", "2 à esquerda e 2 à direita do vão.",
              "Ex.: 11|12 → 10, 11 · 12, 13.", "Ponta: 03|04 → 03 · 04, 05.", "", "A bacia só entra onde o pedido tem", "itens; depois volta à esteira de",
              "transporte (ex.: começa na 03 e só", "continua na 07 → não entra na 04/05).", "", "As esteiras passam por dentro do alto", "giro: por baixo do andar 3 e por cima", "do andar 4.", "", "Medidas aproximadas, sem escala."]
    for i, l in enumerate(linhas):
        c.append(f"<text x='{lx}' y='{ty+i*21}' font-size='{13.5 if i==0 else 12.2}' font-weight='{700 if i==0 else 400}' fill='{AZ if i==0 else "#1c2430"}' {FONT}>{l}</text>")
    return svg(W, H, "\n".join(c), "Planta da estação 05 e vizinhas — alto giro com as esteiras por dentro, operador e corredor do baixo giro")


# ---------------------------------------------------------------- D5 cabeamento
def d_cabeamento():
    w, h = 1400, 600
    c = []
    c.append(caixa(40, 230, 250, 150, "Concentrador", ["RP2040 + W5500", "Porta A: barramento alto giro", "Porta B: barramento baixo giro", "Fonte 12 V no gabinete"], VD, VD2))
    # barramento frente
    c.append(f"<text x='330' y='90' font-size='14' font-weight='700' fill='{AZ}' {FONT}>Barramento ALTO GIRO (RS-485 + 12 V em cabo Cat5e, RJ45)</text>")
    xs = [340, 470, 600, 730, 860]
    for i, x in enumerate(xs):
        c.append(f"<rect x='{x}' y='110' width='100' height='54' rx='8' fill='{VD2}' stroke='{VD}' stroke-width='2'/>"
                 f"<text x='{x+50}' y='134' text-anchor='middle' font-size='13' font-weight='700' {FONT}>Nó {i+1:02d}</text>"
                 f"<text x='{x+50}' y='152' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>prédio {i+1:03d}</text>")
        for k in range(4):
            yy = 190 + k * 34
            c.append(f"<line x1='{x+50}' y1='164' x2='{x+50}' y2='{yy}' stroke='{CZ}' stroke-width='1.5'/>"
                     f"<rect x='{x+20}' y='{yy}' width='60' height='26' rx='4' fill='#111'/>"
                     f"<text x='{x+42}' y='{yy+18}' text-anchor='middle' font-size='12' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>{(k+1)*3:>2}</text>"
                     f"<circle cx='{x+68}' cy='{yy+13}' r='6' fill='{AM}'/>")
        if i < len(xs) - 1:
            c.append(f"<line x1='{x+100}' y1='137' x2='{x+130}' y2='137' stroke='{VD}' stroke-width='4'/>")
    c.append(f"<text x='990' y='142' font-size='22' fill='{CZ}' {FONT}>… até o Nó 10</text>")
    c.append(f"<path d='M290,270 C315,270 315,137 340,137' fill='none' stroke='{VD}' stroke-width='4'/>")
    c.append(f"<rect x='1000' y='190' width='360' height='120' rx='10' fill='#fff' stroke='#d5dbe3'/>"
             f"<text x='1016' y='214' font-size='13' font-weight='700' fill='{AZ}' {FONT}>Cabo Cat5e — uso dos 4 pares</text>"
             f"<text x='1016' y='238' font-size='12.5' {FONT}>Par 1: RS-485 A/B (dados)</text>"
             f"<text x='1016' y='258' font-size='12.5' {FONT}>Par 2: +12 V   ·   Par 3: GND</text>"
             f"<text x='1016' y='278' font-size='12.5' {FONT}>Par 4: reserva (sinal de falha / futuro)</text>"
             f"<text x='1016' y='298' font-size='12.5' fill='{CZ}' {FONT}>Módulo Q → nó: cabo curto RJ45 (troca em 1 min)</text>")
    # fundo
    c.append(f"<text x='330' y='400' font-size='14' font-weight='700' fill='{AZ}' {FONT}>Barramento BAIXO GIRO — 1 Módulo E+Q por zona, em cadeia (eletrocalha sobre o corredor)</text>")
    for i in range(6):
        x = 340 + i * 160
        c.append(f"<rect x='{x}' y='420' width='136' height='70' rx='8' fill='#fff' stroke='{AZ2}' stroke-width='2'/>"
                 f"<rect x='{x+8}' y='430' width='86' height='24' rx='3' fill='#111'/><text x='{x+14}' y='447' font-size='11.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>P0{24+i*4} A3</text>"
                 f"<rect x='{x+98}' y='430' width='30' height='24' rx='3' fill='#111'/><text x='{x+113}' y='447' text-anchor='middle' font-size='11.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>2</text>"
                 f"<circle cx='{x+68}' cy='474' r='8' fill='{AM}'/><text x='{x+68}' y='508' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>Zona {i+1}</text>")
        if i < 5:
            c.append(f"<line x1='{x+136}' y1='455' x2='{x+160}' y2='455' stroke='{AZ2}' stroke-width='4'/>")
    c.append(f"<path d='M290,340 C315,340 315,455 340,455' fill='none' stroke='{AZ2}' stroke-width='4'/>")
    c.append(f"<text x='340' y='560' font-size='12.5' fill='{CZ}' {FONT}>Sem fio quádruplo contínuo atrás das plaquinhas: cada trecho é um cabo com RJ45 nas pontas — um módulo com defeito é trocado sem abrir a canaleta.</text>")
    return svg(w, h, "\n".join(c), "Topologia de cabeamento da estação")


# ---------------------------------------------------------------- D6 telas do coletor
def tela(x, y, titulo, cor, linhas, rodape):
    s = [f"<rect x='{x}' y='{y}' width='300' height='560' rx='34' fill='#1b1f27'/>",
         f"<rect x='{x+14}' y='{y+40}' width='272' height='480' rx='10' fill='#f7f8fa'/>",
         f"<rect x='{x+14}' y='{y+40}' width='272' height='54' rx='10' fill='{cor}'/>",
         f"<rect x='{x+14}' y='{y+80}' width='272' height='14' fill='{cor}'/>",
         f"<text x='{x+150}' y='{y+74}' text-anchor='middle' fill='#fff' font-size='17' font-weight='700' {FONT}>{titulo}</text>"]
    for i, (t, sz, cr, peso) in enumerate(linhas):
        s.append(f"<text x='{x+150}' y='{y+140+i*44}' text-anchor='middle' font-size='{sz}' fill='{cr}' font-weight='{peso}' {FONT}>{t}</text>")
    s.append(f"<rect x='{x+34}' y='{y+452}' width='232' height='50' rx='10' fill='#e9edf3'/>"
             f"<text x='{x+150}' y='{y+483}' text-anchor='middle' font-size='13' fill='{CZ}' {FONT}>{rodape}</text>")
    return "\n".join(s)


def d_telas():
    w, h = 1400, 660
    c = [tela(60, 70, "PTL · Estação 05", AZ, [
        ("Aguardando caixa", 22, "#1c2430", 700), ("", 12, CZ, 400),
        ("Aponte para a etiqueta", 16, CZ, 400), ("e aperte o gatilho", 16, CZ, 400),
        ("", 12, CZ, 400), ("Operador: 215888", 14, CZ, 400)], "Leitura abre a caixa"),
        tela(400, 70, "Caixa C0001234", VD, [
            ("Separando", 16, CZ, 400), ("7 / 12 itens", 34, "#1c2430", 800),
            ("Alto giro: 4/6 · Baixo: 3/6", 14, CZ, 400), ("Zonas ativas: 2, 4, 5", 14, CZ, 400),
            ("Pedido 78901", 14, CZ, 400), ("Tempo: 01:42", 14, CZ, 400)], "Sem toque na tela"),
        tela(740, 70, "Estação concluída", "#1E7B46", [
            ("12 / 12 itens", 30, "#1E7B46", 800), ("Todos os LEDs apagados", 15, CZ, 400),
            ("", 12, CZ, 400), ("Leia a etiqueta", 18, "#1c2430", 700), ("de novo para fechar", 18, "#1c2430", 700),
            ("", 12, CZ, 400)], "2ª leitura fecha a caixa"),
        tela(1080, 70, "Atenção", "#B23B3B", [
            ("Caixa com itens pendentes", 15, "#B23B3B", 700), ("3 itens não confirmados", 15, CZ, 400),
            ("Zona 4: P031 A2 — 2 un", 14, CZ, 400), ("", 12, CZ, 400),
            ("Leia de novo para", 15, "#1c2430", 700), ("fechar mesmo assim", 15, "#1c2430", 700)], "Registrado para a conferência")]
    c.append(f"<text x='60' y='52' font-size='13' fill='{CZ}' {FONT}>Fluxo do operador: leitura → separação guiada pelos displays → leitura de fechamento (sem menu)</text>")
    return svg(w, h, "\n".join(c), "Telas do coletor (A1 — app PTL)")


# ---------------------------------------------------------------- D7 modulos
def d_modulos():
    w, h = 1400, 470
    c = []
    # modulo Q
    c.append(f"<text x='60' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Módulo Q — alto giro (por endereço)</text>")
    c.append(f"<rect x='60' y='100' width='300' height='150' rx='14' fill='#2b2f36' filter='url(#sombra)'/>"
             f"<rect x='80' y='122' width='150' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='155' y='174' text-anchor='middle' font-size='52' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'> 12</text>"
             f"<circle cx='300' cy='157' r='34' fill='{VD}' stroke='#14532d' stroke-width='3'/><circle cx='300' cy='157' r='22' fill='#36c26b'/>"
             f"<text x='155' y='228' text-anchor='middle' font-size='13' fill='#cbd5e1' {FONT}>3 dígitos 0,56\" · LED no botão</text>")
    c.append(f"<text x='60' y='290' font-size='12.5' {FONT}>• Aceso = pegar a quantidade mostrada</text>"
             f"<text x='60' y='312' font-size='12.5' {FONT}>• Botão confirma e apaga</text>"
             f"<text x='60' y='334' font-size='12.5' {FONT}>• Cabo curto RJ45 até o nó da coluna</text>")
    # modulo E+Q
    c.append(f"<text x='460' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Módulo E+Q — andares 4-5 e zonas de baixo giro</text>")
    c.append(f"<rect x='460' y='100' width='560' height='150' rx='14' fill='#2b2f36' filter='url(#sombra)'/>"
             f"<rect x='480' y='122' width='300' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='630' y='172' text-anchor='middle' font-size='44' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'>P031 A2</text>"
             f"<rect x='795' y='122' width='120' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='855' y='172' text-anchor='middle' font-size='44' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'>2</text>"
             f"<circle cx='968' cy='157' r='34' fill='{VD}' stroke='#14532d' stroke-width='3'/><circle cx='968' cy='157' r='22' fill='#36c26b'/>"
             f"<text x='630' y='228' text-anchor='middle' font-size='13' fill='#cbd5e1' {FONT}>endereço 8 dígitos (prédio + andar)</text>"
             f"<text x='855' y='228' text-anchor='middle' font-size='13' fill='#cbd5e1' {FONT}>quantidade</text>")
    c.append(f"<text x='460' y='290' font-size='12.5' {FONT}>• Mostra o PRÓXIMO item da zona, na ordem da rota</text>"
             f"<text x='460' y='312' font-size='12.5' {FONT}>• Botão confirma e passa para o próximo; apaga quando a zona termina</text>"
             f"<text x='460' y='334' font-size='12.5' {FONT}>• Entrada e saída RJ45 (cadeia no barramento do baixo giro)</text>")
    # gabinete
    c.append(f"<text x='1080' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Gabinete do concentrador</text>")
    c.append(f"<rect x='1080' y='100' width='260' height='240' rx='12' fill='#e9edf3' stroke='{CZ}' stroke-width='2'/>"
             f"<rect x='1100' y='120' width='120' height='70' rx='6' fill='{VD2}' stroke='{VD}'/><text x='1160' y='160' text-anchor='middle' font-size='12' {FONT}>Fonte 12 V</text>"
             f"<rect x='1100' y='200' width='120' height='60' rx='6' fill='#fff' stroke='{AZ2}'/><text x='1160' y='235' text-anchor='middle' font-size='12' {FONT}>Placa RP2040</text>"
             f"<circle cx='1290' cy='160' r='30' fill='#cfd6e0' stroke='{CZ}'/><text x='1290' y='165' text-anchor='middle' font-size='11' {FONT}>cooler</text>"
             f"<rect x='1250' y='210' width='70' height='14' rx='3' fill='#b6bec9'/><rect x='1250' y='230' width='70' height='14' rx='3' fill='#b6bec9'/>"
             f"<text x='1285' y='265' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>filtro</text>"
             f"<rect x='1100' y='280' width='220' height='40' rx='6' fill='#fff' stroke='{CZ}'/><text x='1210' y='305' text-anchor='middle' font-size='11.5' {FONT}>RJ45: rede · alto · baixo giro</text>")
    c.append(f"<text x='1080' y='366' font-size='12.5' {FONT}>• IP54 com filtro e cooler 12 V</text>"
             f"<text x='1080' y='388' font-size='12.5' {FONT}>• Trilho DIN, disjuntor 2 A</text>")
    return svg(w, h, "\n".join(c), "Módulos e gabinete")


def main():
    figuras = {
        "arquitetura_a": d_arq(False),
        "arquitetura_b": d_arq(True),
        "sequencia": d_sequencia(),
        "layout_estacao": d_layout(),
        "planta_estacao": d_planta(),
        "cabeamento": d_cabeamento(),
        "telas_coletor": d_telas(),
        "modulos": d_modulos(),
    }
    html = ["<html><body style='margin:0;background:#fff'>"]
    for nome, s in figuras.items():
        html.append(f"<div id='{nome}' style='display:inline-block'>{s}</div><br>")
    html.append("</body></html>")
    open(BASE + "/diagramas/diagramas.html", "w", encoding="utf-8").write("\n".join(html))

    async def fotos():
        async with async_playwright() as p:
            b = await p.chromium.launch()
            pg = await b.new_page(device_scale_factor=2, viewport={"width": 1600, "height": 900})
            await pg.goto("file://" + BASE + "/diagramas/diagramas.html")
            for nome in figuras:
                await pg.locator("#" + nome).screenshot(path=f"{BASE}/diagramas/{nome}.png")
            await b.close()
    asyncio.run(fotos())
    print("ok", list(figuras))


main()
