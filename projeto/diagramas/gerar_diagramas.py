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
    c.append(f"<text x='420' y='78' font-size='13' font-weight='700' fill='{AZ}' {FONT}>NOVO: SERVIDOR PTL (VM)</text>")
    c.append(caixa(420, 90, 400, 270, "Serviço PTL", [
        "API REST (abre/fecha caixa, status)",
        "Regras: filtra a estação, divide em",
        "  alto giro / andares 4-5 / zonas de baixo giro",
        "  e ordena pela rota de coleta",
        "Broker MQTT (Mosquitto)",
        "  com os concentradores",
        "Tabelas PTL no Sybase (sessões, log)",
        "Painel de monitoramento (gestão e TI)",
        "Watchdog, heartbeat e alertas"], AZ, CL))
    c.append(seta(330, 150, 420, 150, "SQL"))
    c.append(seta(330, 300, 420, 300, "API"))
    # identificacao
    if not rfid:
        c.append(caixa(900, 90, 470, 140, "Coletor MovFast (Android, Wi-Fi)", [
            "A1: app próprio (Android)", "A2: tela do WMS no coletor",
            "Gatilho: 1ª leitura ABRE, 2ª leitura FECHA a caixa", "Mostra o progresso da caixa"], AZ2))
        c.append(seta(900, 165, 820, 165, "HTTPS", dupla=True))
    else:
        c.append(caixa(900, 90, 470, 160, "Identificação por RFID (NFC 13,56 MHz)", [
            "Tag NFC fixa em cada caixa retornável",
            "B1: pulseira NFC do operador (Wi-Fi)",
            "B2: leitor fixo no barramento da estação",
            "Painel da estação mostra caixa e progresso",
            "Fechamento: nova leitura da tag"], RX, RX2))
        c.append(seta(900, 175, 820, 175, "Wi-Fi", dupla=True))
    # estacao
    c.append(f"<text x='30' y='418' font-size='13' font-weight='700' fill='{VD}' {FONT}>ESTAÇÃO (× 40), REDE CABEADA</text>")
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
    tit = "Arquitetura B: RFID, concentrador e displays" if rfid else "Arquitetura A: coletor, concentrador e displays"
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
        (2, 1, "18. Caixa fechada, liberar"),
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
    return svg(w, h, "\n".join(c), "Sequência de operação na Arquitetura A")


# ---------------------------------------------------------------- D4 layout estacao 05 (elevações, prateleiras alinhadas, andar 0 em cima)
ZCOR = ["#E3F1E8", "#DEE6F2", "#FCE8CC", "#EFE7F6", "#FDE2E2", "#E0F2F1", "#F1E6D8", "#FBE3D2"]
ZBOR = [VD, AZ2, "#D68910", RX, "#C0392B", "#138D90", "#8E6C3A", "#D35400"]
DIM = {"A": (0.9, 0.78), "B": (0.8, 0.68), "C": (0.72, 0.6), "F": (0.58, 0.48), "N": (0.86, 0.72)}


ZORD = ["E1", "E2", "E3", "E4", "D1", "D2", "D3", "D4"]


def _zidx(zona):
    z = zona.split("-")[1]
    return ZORD.index(z) if z in ZORD else len(ZORD)


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
    zid = lambda e: _zidx(e["zona"])
    # ---- alto giro
    ax, ay, cw, hl = 70, 140, 38, 30
    band = 46
    yb = ay + 4 * hl + band
    c.append(f"<text x='{ax}' y='{ay-62}' font-size='16' font-weight='700' fill='{AZ}' {FONT}>ALTO GIRO: prédios 001 a 010 (na frente do operador)</text>")

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
    c.append(f"<text x='{ax+larg/2}' y='{ay+4*hl+band/2+8}' text-anchor='middle' font-size='11' font-weight='700' fill='{AZ}' {FONT}>esteira de transporte (por dentro) · separação na frente</text>")
    for p in range(1, 11):
        x = ax + (p - 1) * cw + (14 if p > 5 else 0)
        ends = pp.get(p, {})
        _coluna(c, x, ay, cw, hl, 4, {a_: e for a_, e in ends.items() if a_ <= 3}, cor_a)
        _coluna(c, x, yb, cw, hl, 2, {a_ - 4: e for a_, e in ends.items() if a_ >= 4}, cor_a)
        c.append(f"<text x='{x+cw/2-1}' y='{yb+2*hl+16}' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>{p:03d}</text>")
    for k, (p0, cor) in enumerate(((1, AZ2), (6, AM))):
        x = ax + (p0 - 1) * cw + (14 if p0 > 5 else 0)
        yy = yb + hl - 6
        c.append(f"<rect x='{x+18}' y='{yy}' width='{5*cw-50}' height='12' rx='3' fill='#111' stroke='{cor}' stroke-width='1.5'/>"
                 f"<text x='{x+18+(5*cw-50)/2}' y='{yy+9.5}' text-anchor='middle' font-size='8.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>E+Q A4–A5</text>")
    # sinal luminoso de baixo giro: barra âmbar entre a esteira de transporte e o andar 3
    c.append(f"<rect x='{ax+larg/2-95}' y='{ay+4*hl+1}' width='190' height='10' rx='3' fill='#F2A33A' stroke='#9a6413'/>"
             f"<text x='{ax+larg/2}' y='{ay+4*hl+9.5}' text-anchor='middle' font-size='8.5' font-weight='700' fill='#1B2638' {FONT}>↶ SINAL DE BAIXO GIRO</text>")
    ly0 = yb + 2 * hl + 38
    c.append(f"<text x='{ax}' y='{ly0}' font-size='12.5' {FONT}>Transporte por baixo do andar 3; andares 4–5 por baixo da separação.</text>")
    c.append(f"<rect x='{ax}' y='{ly0+14}' width='16' height='16' rx='3' fill='{VD2}' stroke='{VD}'/><text x='{ax+24}' y='{ly0+27}' font-size='12.5' {FONT}>Andares 0 a 3: módulo Q por endereço (29)</text>")
    c.append(f"<rect x='{ax}' y='{ly0+38}' width='16' height='16' rx='3' fill='#D6E4F7' stroke='{AZ2}'/><text x='{ax+24}' y='{ly0+51}' font-size='12.5' {FONT}>Andares 4–5: 20 endereços em 2 zonas (2 displays E+Q)</text>")
    # ---- baixo giro
    bpred = sorted({e["predio"] for e in END05 if e["cat"] == "baixo" and e["predio"] != 15})
    esq = [p for p in bpred if p < 32]
    dirt = [15] + sorted([p for p in bpred if p >= 32], reverse=True)
    by, bw, bhl = 150, 29, 30

    def cor_b(e):
        z = zid(e)
        return ZCOR[z % 8], ZBOR[z % 8]

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
            yv = by + 2 * bhl - 7
            c.append(f"<rect x='{x1+3}' y='{yv}' width='{x2-x1-6}' height='14' rx='3' fill='#111' stroke='{ZBOR[z % 8]}' stroke-width='1.5'/>"
                     f"<text x='{(x1+x2)/2}' y='{yv+10.5}' text-anchor='middle' font-size='8' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>0.05.{xps[-1][1]:03d}2.A 1</text>")
            c.append(f"<text x='{(x1+x2)/2}' y='{by-8}' text-anchor='middle' font-size='10.5' font-weight='700' fill='{ZBOR[z%8]}' {FONT}>ZONA {ZORD[z] if z < 8 else ''}</text>")
        c.append(f"<text x='{x0}' y='{by+8*bhl+36}' font-size='11.5' fill='{CZ}' {FONT}>← entrada do corredor                         fundo →</text>")
    lado(560, esq, "BAIXO GIRO: lado esquerdo (P020 a P031)")
    lado(980, dirt, "Lado direito (P015 na frente; P043 → P032)")
    ly = by + 8 * bhl + 62
    c.append(f"<text x='560' y='{ly}' font-size='12.5' {FONT}>• Prateleiras alinhadas de 50 cm × 2 m, andar 0 em cima. Caixas de endereço em geral pequenas (tipo A, B, C, F, N).</text>")
    c.append(f"<text x='560' y='{ly+22}' font-size='12.5' {FONT}>• 160 endereços em 4 zonas (2 por lado); display E+Q na altura dos olhos (≈ 1,5 m). P015 ocupa a frente do bloco (1 m) e entra na zona D1.</text>")
    c.append(f"<text x='70' y='{ly+22}' font-size='12.5' fill='{CZ}' {FONT}>Endereço no formato da etiqueta: 0.05.0421.A = bairro.rua.prédio+andar.apto</text>")
    return svg(w, h, "\n".join(c), "Vista frontal da estação 05 (Medicamento), com os 209 endereços da tabela wms_endereco")


# ---------------------------------------------------------------- D4b planta da estação
# medidas do desenho de 26/10/2026: estação 2,5 m; blocos de 1 m (2 prateleiras de 0,5 m × 2 m); corredor ~1,5 m; 015 na frente do bloco
def d_planta():
    W, H = 1500, 860
    s = 92
    P, hc, pb, comp, f15 = 2.5, 0.75, 0.5, 2.0, 0.3
    zFace, zBack = -0.95, -2.15
    zT, zS, lT, lS = -1.29, -0.535, 0.55, 0.55
    zF = 1.35
    zC = zF + f15
    est0, est1 = 3, 6
    xa = (est0 - 5) * P - P / 2 - 0.35
    xb = (est1 - 5) * P + P / 2 + 0.25
    X = lambda x: 40 + (x - xa) * s
    Y = lambda z: 110 + (z + 2.75) * s
    pp = _por_predio(END05)
    bpred = sorted({e["predio"] for e in END05 if e["cat"] == "baixo" and e["predio"] != 15})
    esq = [p for p in bpred if p < 32]
    dirt = sorted([p for p in bpred if p >= 32], reverse=True)
    c = []

    def r(x1, z1, x2, z2, fill, stroke=CZ, sw=1.4, op=1, rx=0):
        c.append(f"<rect x='{X(min(x1,x2))}' y='{Y(min(z1,z2))}' width='{abs(x2-x1)*s}' height='{abs(z2-z1)*s}' rx='{rx}' fill='{fill}' fill-opacity='{op}' stroke='{stroke}' stroke-width='{sw}'/>")

    def t(x, z, txt, size=12, cor="#1c2430", peso=400, anchor="middle", rot=None):
        tr = f"transform='rotate({rot} {X(x)} {Y(z)})'" if rot else ""
        c.append(f"<text x='{X(x)}' y='{Y(z)}' text-anchor='{anchor}' font-size='{size}' font-weight='{peso}' fill='{cor}' {tr} {FONT}>{txt}</text>")

    def seta(x1, z1, x2, z2, cor, larg=3):
        c.append(f"<line x1='{X(x1)}' y1='{Y(z1)}' x2='{X(x2)}' y2='{Y(z2)}' stroke='{cor}' stroke-width='{larg}' marker-end='url(#fim)'/>")

    def cota(x1, z1, x2, z2, txt, lado=-14):
        horiz = abs(z1 - z2) < 1e-6
        c.append(f"<line x1='{X(x1)}' y1='{Y(z1)}' x2='{X(x2)}' y2='{Y(z2)}' stroke='#7B4FA0' stroke-width='1.4' marker-end='url(#fim)' marker-start='url(#ini)'/>")
        if horiz:
            c.append(f"<text x='{(X(x1)+X(x2))/2}' y='{Y(z1)+lado}' text-anchor='middle' font-size='11.5' font-weight='700' fill='#7B4FA0' {FONT}>{txt}</text>")
        else:
            c.append(f"<text x='{X(x1)+lado}' y='{(Y(z1)+Y(z2))/2}' text-anchor='middle' font-size='11.5' font-weight='700' fill='#7B4FA0' transform='rotate(-90 {X(x1)+lado} {(Y(z1)+Y(z2))/2})' {FONT}>{txt}</text>")

    zid = lambda p: _zidx(next(iter(pp[p].values()))["zona"])
    for st in range(est0, est1 + 1):
        xc = (st - 5) * P
        nosso = st == 5
        fill, bor = ("#DEE6F2", AZ2) if nosso else ("#EEF0F3", "#AAB2BC")
        # alto giro
        r(xc - P / 2, zBack, xc + P / 2, zFace, fill, bor, 1.8 if nosso else 1.1)
        # concentrador atrás da estação
        r(xc + 0.5, zBack - 0.26, xc + 0.9, zBack - 0.06, VD if nosso else "#B5BCC5", "#1d5e3a" if nosso else "#8A939E", 1.2)
        # prateleiras do corredor e faixa do 015
        r(xc - hc - pb, zC, xc - hc, zC + comp, fill, bor)
        r(xc + hc, zC, xc + hc + pb, zC + comp, fill, bor)
        r(xc - hc - 2 * pb, zF, xc - hc, zC, "#FCE8CC" if nosso else "#F3F4F6", AM if nosso else "#AAB2BC", 1.4)
        t(xc - hc - pb, zF + 0.2, "015 (150–153)" if nosso else "015", 10, AM if nosso else CZ, 700)
        if nosso:
            # andares 4-5 do alto giro, por baixo da esteira de separação
            c.append(f"<rect x='{X(xc-P/2+0.05)}' y='{Y(zS+lS/2+0.03-1.0)}' width='{(P-0.1)*s}' height='{1.0*s}' fill='none' stroke='{AZ2}' stroke-width='1.6' stroke-dasharray='6 4'/>")
            # sinal de baixo giro na frente do alto giro
            r(xc - 0.65, zFace + 0.02, xc + 0.65, zFace + 0.1, "#F2A33A", "#9a6413", 1.2)
        t(xc, zF - 0.25, f"ESTAÇÃO {st:02d}", 12.5, AZ if nosso else CZ, 700)
        t(xc, zBack + 0.35, f"alto giro {st:02d} · P001–P010", 10.5, AZ if nosso else CZ, 700)
    # prédios da estação 05 coloridos pela zona
    wbE, wbD = comp / len(esq), comp / len(dirt)
    for i, p in enumerate(esq):
        z = zid(p)
        r(hc, zC + i * wbE, hc + 0.22, zC + (i + 1) * wbE, ZBOR[z % 8], "#fff", 0.8)
        t(hc + 0.27, zC + i * wbE + wbE * 0.75, f"{p:03d}", 8.5, CZ, 400, "start")
    for i, p in enumerate(dirt):
        z = zid(p)
        r(-hc - 0.22, zC + i * wbD, -hc, zC + (i + 1) * wbD, ZBOR[z % 8], "#fff", 0.8)
        t(-hc - 0.27, zC + i * wbD + wbD * 0.75, f"{p:03d}", 8.5, CZ, 400, "end")
    # esteiras
    for zc_, lg, nome in ((zT, lT, "ESTEIRA DE TRANSPORTE (por dentro do alto giro)  →"), (zS, lS, "ESTEIRA DE SEPARAÇÃO (aberta, na frente)")):
        r(xa, zc_ - lg / 2, xb, zc_ + lg / 2, "#C9D0D8", CZ, 1.2, 0.85)
        x = xa
        while x < xb:
            c.append(f"<line x1='{X(x)}' y1='{Y(zc_-lg/2)}' x2='{X(x)}' y2='{Y(zc_+lg/2)}' stroke='#AEB7C1'/>")
            x += 0.25
        if zc_ == zT:
            t(xa + 0.15, zc_ + 0.07, nome, 11, AZ, 700, "start")
        else:
            t(xb - 0.15, zc_ + 0.07, nome, 11, AZ, 700, "end")
    # transferência 03|04
    xt = (3.5 - 5) * P
    r(xt - 0.3, zT + lT / 2, xt + 0.3, zS - lS / 2, "#E3F1E8", VD)
    seta(xt, zT, xt, zS - 0.05, VD)
    c.append(f"<circle cx='{X(xt)}' cy='{Y(zS)}' r='7' fill='{AM}' stroke='#9a6413'/>")
    seta(xt - 0.2, zS, xt - 1.3, zS, "#B9770E", 2.5)
    seta(xt + 0.2, zS, xt + 1.3, zS, "#B9770E", 2.5)
    t(xt, zBack - 0.42, "transferência 03|04 · rolete direcionador (esq.: 03 · dir.: 04 e 05)", 11, VD, 700)
    # bacia, operador e rota
    r(-0.28, zS - 0.2, 0.28, zS + 0.2, "#2E9E4F", "#1d6b35", 1.4)
    c.append(f"<circle cx='{X(0.3)}' cy='{Y(0.15)}' r='9' fill='#2E9E4F' stroke='#111'/>")
    t(0.3, 0.5, "operador", 10.5, CZ)
    pts = [(0.15, 0.3), (0.0, zF + 0.1), (0.25, zC + 0.2), (0.25, zC + comp - 0.2), (-0.25, zC + comp - 0.2), (-0.25, zC + 0.2), (-0.85, zF - 0.15)]
    c.append("<polyline points='" + " ".join(f"{X(x)},{Y(z)}" for x, z in pts) + f"' fill='none' stroke='{AM}' stroke-width='3' stroke-dasharray='7 6' marker-end='url(#fim)'/>")
    # barramento 2 por cima até o corredor
    c.append(f"<polyline points='{X(0.8)},{Y(zBack-0.16)} {X(0.45)},{Y(zBack-0.16)} {X(0.45)},{Y(zC+comp)}' fill='none' stroke='#E67E22' stroke-width='2.4' stroke-dasharray='3 4'/>")
    t(1.62, zBack - 0.66, "barramento 2 (baixo giro) sobe e passa", 10, "#B9590E", 700, "start")
    t(1.62, zBack - 0.48, "por cima das esteiras até o corredor", 10, "#B9590E", 700, "start")
    t(0.7, zBack - 0.32, "concentrador", 10, VD, 700)
    # cotas
    cota(-P / 2, zBack - 0.62, P / 2, zBack - 0.62, "2,5 m (10 prédios de 25 cm)")
    cota(-hc, zC + comp + 0.25, hc, zC + comp + 0.25, "corredor ≈ 1,5 m", 18)
    cota(hc, zC + comp + 0.25, hc + 2 * pb, zC + comp + 0.25, "bloco 1 m (2 × 0,5 m)", 18)
    cota(P / 2 + 0.95, zC, P / 2 + 0.95, zC + comp, "2 m (12 prédios × 8 andares)", -14)
    # legenda
    lx, ly = 1110, 120
    itens = [("#DEE6F2", AZ2, "Estação 05 (piloto)"), ("#EEF0F3", "#AAB2BC", "Estações vizinhas"), ("#FCE8CC", AM, "P015: frente do bloco, 1 m (zona D1)"),
             ("#F2A33A", "#9a6413", "Sinal de baixo giro"), ("#ffffff", AZ2, "Andares 4–5 (sob a separação)"),
             (VD, "#1d5e3a", "Concentrador atrás da estação"), ("#C9D0D8", CZ, "Esteiras"), ("#E3F1E8", VD, "Transferência"), ("#2E9E4F", "#1d6b35", "Bacia (verde)")]
    for i, (f, b_, txt) in enumerate(itens):
        c.append(f"<rect x='{lx}' y='{ly+i*27}' width='20' height='20' rx='3' fill='{f}' stroke='{b_}' stroke-width='1.6'/><text x='{lx+30}' y='{ly+i*27+15}' font-size='12.5' {FONT}>{txt}</text>")
    ty = ly + len(itens) * 27 + 24
    linhas = ["Medidas (desenho de 26/10/2026)", "Alto giro: 2,5 m por estação.", "Bloco: 2 prateleiras de 50 cm", "de costas, 2 m de comprimento.",
              "Corredor: cerca de 1,5 m.", "", "Lado esquerdo: P020–P031.", "Lado direito: P043 → P032.",
              "P015: frente do bloco (1 m),", "virado para a esteira.", "", "Concentrador atrás do alto giro;", "o barramento do baixo giro passa",
              "por cima das esteiras.", "", "Medidas aproximadas."]
    for i, l in enumerate(linhas):
        c.append(f"<text x='{lx}' y='{ty+i*20}' font-size='{13.5 if i==0 else 12.2}' font-weight='{700 if i==0 else 400}' fill='{AZ if i==0 else "#1c2430"}' {FONT}>{l}</text>")
    return svg(W, H, "\n".join(c), "Planta da estação 05 e das vizinhas")


# ---------------------------------------------------------------- D8 manutenção: falha e cadastro de LED
def d_manutencao():
    W, H = 1500, 640
    c = []
    passos = [
        ("1. Detecta", ["nó ou concentrador vê a falha", "sem resposta (3 tentativas)", "display sem ACK na porta", "botão travado > 10 s"], RX),
        ("2. Avisa", ["MQTT FALHA_MODULO", "endereço + nó/porta", "ou endereço RS-485", "grava ptl_evento_falha"], RX),
        ("3. Mostra", ["interface de controle:", "0.05.0042.A", "nó 0x04 · porta 3", "local e tipo de falha"], AZ2),
        ("4. Troca", ["técnico solta o RJ45", "e encaixa o reserva", "(sem ferramenta)", ""], CZ),
        ("5. Cadastra", ["escolhe o endereço na tela", "(ou lê a etiqueta)", "módulo novo pisca CAd", "aperta o botão dele"], AM),
        ("6. Grava", ["DEF_ENDERECO (E+Q)", "UPDATE ptl_mapa_led", "display volta ao item", "histórico registrado"], VD),
    ]
    x0, wq, gap = 40, 220, 26
    for i, (tit, ls, cor) in enumerate(passos):
        x = x0 + i * (wq + gap)
        c.append(caixa(x, 90, wq, 150, tit, ls, cor))
        if i < len(passos) - 1:
            c.append(f"<line x1='{x+wq+2}' y1='165' x2='{x+wq+gap-4}' y2='165' stroke='{CZ}' stroke-width='2.4' marker-end='url(#fim)'/>")
    # o que é detectado
    c.append(f"<text x='40' y='300' font-size='15' font-weight='700' fill='{AZ}' {FONT}>O que dá para detectar sem hardware extra</text>")
    linhas = [("Módulo E+Q ou nó sem resposta", "o concentrador pergunta e não recebe resposta em 3 tentativas", "sim"),
              ("Display do módulo Q desconectado", "o nó não recebe o ACK do TM1637 naquela porta", "sim"),
              ("Botão travado", "o botão fica apertado por mais de 10 s", "sim"),
              ("Cabo do barramento rompido", "todos os módulos depois do ponto param de responder", "sim (aponta o trecho)"),
              ("Segmento ou LED queimado", "o display responde normalmente; só aparece no teste 8888 do início do turno", "visual")]
    y = 318
    c.append(f"<rect x='40' y='{y}' width='1420' height='30' fill='#EEF2F7'/>")
    for x, txt in ((52, "Falha"), (420, "Como aparece"), (1240, "Detecção automática")):
        c.append(f"<text x='{x}' y='{y+20}' font-size='12.5' font-weight='700' fill='{CZ}' {FONT}>{txt}</text>")
    for i, (a_, b_, d_) in enumerate(linhas):
        yy = y + 30 + i * 34
        c.append(f"<line x1='40' y1='{yy+34}' x2='1460' y2='{yy+34}' stroke='#d5dbe3'/>"
                 f"<text x='52' y='{yy+22}' font-size='13' font-weight='600' {FONT}>{a_}</text>"
                 f"<text x='420' y='{yy+22}' font-size='12.5' fill='{CZ}' {FONT}>{b_}</text>"
                 f"<text x='1240' y='{yy+22}' font-size='12.5' font-weight='700' fill='{VD if d_.startswith('sim') else AM}' {FONT}>{d_}</text>")
    c.append(f"<text x='40' y='{y+30+5*34+34}' font-size='12.5' fill='{CZ}' {FONT}>Módulo Q não tem microcontrolador: ele é identificado pelo nó e pela porta. Módulo E+Q tem serial próprio; o novo chega com o endereço de fábrica 0xF0 e recebe o endereço do antigo no cadastro.</text>")
    return svg(W, H, "\n".join(c), "Manutenção: aviso de falha e cadastro de LED por endereço")


# ---------------------------------------------------------------- D5 cabeamento
def d_cabeamento():
    w, h = 1400, 600
    c = []
    c.append(caixa(40, 230, 250, 150, "Concentrador", ["atrás da estação", "Porta A: barramento alto giro", "Porta B: baixo giro (por cima)", "Fonte 12 V no gabinete"], VD, VD2))
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
             f"<text x='1016' y='214' font-size='13' font-weight='700' fill='{AZ}' {FONT}>Cabo Cat5e: uso dos 4 pares</text>"
             f"<text x='1016' y='238' font-size='12.5' {FONT}>Par 1: RS-485 A/B (dados)</text>"
             f"<text x='1016' y='258' font-size='12.5' {FONT}>Par 2: +12 V   ·   Par 3: GND</text>"
             f"<text x='1016' y='278' font-size='12.5' {FONT}>Par 4: reserva (sinal de falha / futuro)</text>"
             f"<text x='1016' y='298' font-size='12.5' fill='{CZ}' {FONT}>Módulo Q → nó: cabo curto RJ45 (troca em 1 min)</text>")
    # fundo
    c.append(f"<text x='330' y='400' font-size='14' font-weight='700' fill='{AZ}' {FONT}>Barramento BAIXO GIRO: 1 módulo E+Q por zona, em cadeia (eletrocalha sobre o corredor)</text>")
    for i in range(4):
        x = 340 + i * 160
        c.append(f"<rect x='{x}' y='420' width='136' height='70' rx='8' fill='#fff' stroke='{AZ2}' stroke-width='2'/>"
                 f"<rect x='{x+8}' y='430' width='86' height='24' rx='3' fill='#111'/><text x='{x+12}' y='447' font-size='10.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>0.05.0{24+i*4}3.A</text>"
                 f"<rect x='{x+98}' y='430' width='30' height='24' rx='3' fill='#111'/><text x='{x+113}' y='447' text-anchor='middle' font-size='11.5' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>2</text>"
                 f"<circle cx='{x+68}' cy='474' r='8' fill='{AM}'/><text x='{x+68}' y='508' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>Zona {['E1', 'E2', 'D1', 'D2'][i]}</text>")
        if i < 3:
            c.append(f"<line x1='{x+136}' y1='455' x2='{x+160}' y2='455' stroke='{AZ2}' stroke-width='4'/>")
    c.append(f"<path d='M290,340 C315,340 315,455 340,455' fill='none' stroke='{AZ2}' stroke-width='4'/>")
    c.append(f"<text x='340' y='560' font-size='12.5' fill='{CZ}' {FONT}>Sem fio quádruplo contínuo atrás das plaquinhas: cada trecho é um cabo com RJ45 nas pontas, e o módulo com defeito é trocado sem abrir a canaleta.</text>")
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
            ("Alto giro: 4/6 · Baixo: 3/6", 14, CZ, 400), ("Zonas ativas: E2, D1", 14, CZ, 400),
            ("Pedido 78901", 14, CZ, 400), ("Tempo: 01:42", 14, CZ, 400)], "Sem toque na tela"),
        tela(740, 70, "Estação concluída", "#1E7B46", [
            ("12 / 12 itens", 30, "#1E7B46", 800), ("Todos os LEDs apagados", 15, CZ, 400),
            ("", 12, CZ, 400), ("Leia a etiqueta", 18, "#1c2430", 700), ("de novo para fechar", 18, "#1c2430", 700),
            ("", 12, CZ, 400)], "2ª leitura fecha a caixa"),
        tela(1080, 70, "Atenção", "#B23B3B", [
            ("Caixa com itens pendentes", 15, "#B23B3B", 700), ("3 itens não confirmados", 15, CZ, 400),
            ("0.05.0312.A, 2 un", 14, CZ, 400), ("", 12, CZ, 400),
            ("Leia de novo para", 15, "#1c2430", 700), ("fechar mesmo assim", 15, "#1c2430", 700)], "Registrado para a conferência")]
    c.append(f"<text x='60' y='52' font-size='13' fill='{CZ}' {FONT}>Fluxo do operador: leitura → separação guiada pelos displays → leitura de fechamento (sem menu)</text>")
    return svg(w, h, "\n".join(c), "Telas do coletor (app A1)")


# ---------------------------------------------------------------- D7 modulos
def d_modulos():
    w, h = 1400, 470
    c = []
    # modulo Q
    c.append(f"<text x='60' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Módulo Q: alto giro (por endereço)</text>")
    c.append(f"<rect x='60' y='100' width='300' height='150' rx='14' fill='#2b2f36' filter='url(#sombra)'/>"
             f"<rect x='80' y='122' width='150' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='155' y='174' text-anchor='middle' font-size='52' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'> 12</text>"
             f"<circle cx='300' cy='157' r='34' fill='{VD}' stroke='#14532d' stroke-width='3'/><circle cx='300' cy='157' r='22' fill='#36c26b'/>"
             f"<text x='155' y='228' text-anchor='middle' font-size='13' fill='#cbd5e1' {FONT}>3 dígitos 0,56\" · LED no botão</text>")
    c.append(f"<text x='60' y='290' font-size='12.5' {FONT}>• Aceso = pegar a quantidade mostrada</text>"
             f"<text x='60' y='312' font-size='12.5' {FONT}>• Botão confirma e apaga</text>"
             f"<text x='60' y='334' font-size='12.5' {FONT}>• Cabo curto RJ45 até o nó da coluna</text>")
    # modulo E+Q
    c.append(f"<text x='460' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Módulo E+Q: andares 4-5 e zonas do baixo giro</text>")
    c.append(f"<rect x='460' y='100' width='560' height='150' rx='14' fill='#2b2f36' filter='url(#sombra)'/>"
             f"<rect x='480' y='122' width='300' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='630' y='170' text-anchor='middle' font-size='34' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'>0.05.0312.A</text>"
             f"<rect x='795' y='122' width='120' height='70' rx='6' fill='#0b0b0b'/>"
             f"<text x='855' y='172' text-anchor='middle' font-size='44' fill='#ff3b2f' font-weight='700' font-family='DejaVu Sans Mono, monospace'>2</text>"
             f"<circle cx='968' cy='157' r='34' fill='{VD}' stroke='#14532d' stroke-width='3'/><circle cx='968' cy='157' r='22' fill='#36c26b'/>"
             f"<text x='630' y='228' text-anchor='middle' font-size='13' fill='#cbd5e1' {FONT}>endereço da etiqueta: 8 dígitos com ponto</text>"
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



# ---------------------------------------------------------------- D9 arquitetura de componentes
def _linha(pts, cor=CZ, rot="", rx=None, ry=None, tracejada=False, dupla=False, larg=2):
    d = "stroke-dasharray='6 5'" if tracejada else ""
    mi = "marker-start='url(#ini)'" if dupla else ""
    pp = " ".join(f"{x},{y}" for x, y in pts)
    s = f"<polyline points='{pp}' fill='none' stroke='{cor}' stroke-width='{larg}' {d} marker-end='url(#fim)' {mi}/>"
    if rot:
        if rx is None:
            (x1, y1), (x2, y2) = pts[len(pts) // 2 - 1], pts[len(pts) // 2]
            rx, ry = (x1 + x2) / 2, (y1 + y2) / 2
        w = len(rot) * 6.6 + 12
        s += (f"<rect x='{rx-w/2}' y='{ry-10}' width='{w}' height='19' rx='4' fill='#fff' stroke='#d5dbe3'/>"
              f"<text x='{rx}' y='{ry+4}' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>{rot}</text>")
    return s


def _grupo(x, y, w, h, titulo, cor):
    return (f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='12' fill='{cor}' fill-opacity='0.06' stroke='{cor}' stroke-width='1.6' stroke-dasharray='8 5'/>"
            f"<text x='{x+14}' y='{y+22}' font-size='13.5' font-weight='700' fill='{cor}' {FONT}>{titulo}</text>")


def _comp(x, y, w, h, titulo, linhas, cor=AZ2, fundo="#fff", tracejado=False):
    d = "stroke-dasharray='6 4'" if tracejado else ""
    s = [f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='8' fill='{fundo}' stroke='{cor}' stroke-width='1.8' {d}/>",
         f"<rect x='{x}' y='{y}' width='5' height='{h}' rx='2' fill='{cor}'/>",
         f"<text x='{x+14}' y='{y+21}' font-size='13' font-weight='700' fill='#1c2430' {FONT}>{titulo}</text>"]
    for i, l in enumerate(linhas):
        s.append(f"<text x='{x+14}' y='{y+39+i*15.5}' font-size='11.2' fill='{CZ}' {FONT}>{l}</text>")
    return "\n".join(s)


def d_componentes():
    W, H = 1600, 1010
    c = []
    # grupos
    c.append(_grupo(20, 70, 330, 520, "Usuários e leitores", CZ))
    c.append(_grupo(390, 70, 790, 500, "Servidor PTL · VM Linux na VLAN PTL", AZ2))
    c.append(_grupo(1220, 70, 360, 520, "Sistemas existentes", "#8E6C3A"))
    c.append(_grupo(20, 620, 1560, 370, "Estação de separação (× 40)", VD))
    # usuários
    c.append(_comp(40, 105, 290, 92, "Coletor MovFast (A1)", ["App Android próprio", "gatilho abre e fecha a caixa", "mostra o progresso"], AZ2))
    c.append(_comp(40, 225, 290, 78, "Tela do WMS no coletor (A2)", ["alternativa ao app", "grava a leitura no Sybase"], CZ, tracejado=True))
    c.append(_comp(40, 330, 290, 78, "Pulseira NFC (B1)", ["ESP32-C3 + PN532, bateria", "envia a tag lida por Wi-Fi"], RX, tracejado=True))
    c.append(_comp(40, 440, 290, 92, "Navegador (manutenção e TI)", ["painel das 40 estações", "qual LED falhou e onde", "cadastro de LED por endereço"], CZ))
    # servidor PTL
    cx = [415, 670, 925]
    cw, ch = 235, 92
    ry = [105, 225, 345]
    comps = [
        (0, 0, "API REST /v1", ["leituras, estado, cancelamento", "mapa e indicadores", "HTTPS + JSON"]),
        (1, 0, "Orquestrador de caixas", ["estado da caixa na estação", "divide itens por display", "ordena pela rota"]),
        (2, 0, "Adaptador Sybase", ["lê views do pedido", "grava sessões e eventos", "jConnect / ODBC"]),
        (0, 1, "Interface de controle", ["monitoramento e falhas de LED", "servida pela própria API"]),
        (1, 1, "Cadastro de LED", ["endereço → nó/porta ou E+Q", "troca por tela + botão"]),
        (2, 1, "Adaptador BHT", ["consulta dados da caixa", "aviso de conclusão (a validar)"]),
        (0, 2, "Monitor e indicadores", ["caixas/h, tempo por caixa", "heartbeat e falhas"]),
        (1, 2, "Registro de eventos", ["log de leituras e botões", "retenção definida pela TI"]),
        (2, 2, "Gateway MQTT", ["publica comandos", "assina eventos e status"]),
    ]
    for col, lin, tit, ls in comps:
        c.append(_comp(cx[col], ry[lin], cw, ch, tit, ls, AZ2))
    c.append(_comp(925, 465, 235, 80, "Broker MQTT (Mosquitto)", ["usuário e ACL por estação", "porta 1883, mesma VM"], "#D68910"))
    # sistemas existentes
    c.append(_comp(1240, 105, 320, 108, "Sybase ASE 16", ["tabelas do WMS (pedidos)", "views de leitura para o PTL", "tabelas ptl_* (sessão, mapa, log)"], "#8E6C3A"))
    c.append(_comp(1240, 245, 320, 92, "Sistema BHT (terceiro)", ["controla a esteira e a transferência", "API com os dados da caixa"], "#8E6C3A"))
    c.append(_comp(1240, 370, 320, 92, "WMS PowerBuilder 12", ["sistema legado da operação", "tela A2 no coletor (opcional)"], "#8E6C3A"))
    # estação
    c.append(_comp(40, 660, 330, 200, "Concentrador (atrás da estação)", ["RP2040 + Ethernet W5500", "cliente MQTT", "estado da caixa e fila de confirmações", "mestre RS-485 com 2 portas", "watchdog, auto-teste e OTA", "fonte 12 V, gabinete com filtro e cooler", "", ""], VD))
    c.append(_comp(40, 885, 330, 88, "Leitor NFC fixo + painel (B2)", ["leitor sob a posição de pega", "LCD 20×4 e botão FECHAR"], RX, tracejado=True))
    c.append(_comp(500, 660, 300, 92, "Nós de coluna (10)", ["um por prédio do alto giro", "liga os módulos Q do prédio"], VD))
    c.append(_comp(500, 775, 300, 64, "Módulos Q (29 a 35)", ["quantidade + botão, andares 0 a 3"], VD))
    c.append(_comp(500, 880, 300, 78, "Módulos E+Q andares 4-5 (2)", ["1 por lado (P001–P005, P006–P010)", "sob a esteira de separação"], VD))
    c.append(_comp(1000, 660, 300, 92, "Módulos E+Q das zonas (4)", ["2 por lado do corredor", "na altura dos olhos"], VD))
    c.append(_comp(1000, 775, 300, 78, "LED guia de coluna", ["opcional, 1 por prédio"], CZ, tracejado=True))
    c.append(_comp(1000, 875, 300, 78, "Sinal de baixo giro", ["luz âmbar na frente do operador", "saída extra do nó do prédio 005"], VD))
    c.append(_comp(1330, 660, 230, 128, "Cabeamento", ["Cat5e com RJ45 em todo trecho", "par 1: RS-485", "pares 2 e 3: 12 V e GND", "par 4: reserva"], CZ))
    # ligações
    c.append(_linha([(330, 150), (415, 150)], AZ2, "HTTPS", 372, 135))
    c.append(_linha([(330, 375), (372, 375), (372, 168), (415, 168)], RX, "Wi-Fi", 372, 300, tracejada=True))
    c.append(_linha([(330, 486), (395, 486), (395, 271), (415, 271)], CZ, "HTTPS", 395, 420))
    c.append(_linha([(650, 151), (670, 151)], AZ2))
    c.append(_linha([(905, 151), (925, 151)], AZ2))
    c.append(_linha([(787, 197), (787, 225)], AZ2))
    c.append(_linha([(905, 182), (915, 182), (915, 391), (925, 391)], AZ2))
    c.append(_linha([(1160, 151), (1240, 151)], "#8E6C3A", "SQL", 1200, 136, dupla=True))
    c.append(_linha([(1160, 271), (1240, 291)], "#8E6C3A", "HTTP/REST", 1195, 238))
    c.append(_linha([(1400, 370), (1400, 213)], "#8E6C3A", "", tracejada=True))
    c.append(_linha([(1042, 437), (1042, 465)], "#D68910", dupla=True))
    c.append(_linha([(1042, 545), (1042, 600), (300, 600), (300, 660)], "#D68910", "MQTT · Ethernet cabeada (switch da VLAN)", 620, 600, dupla=True))
    c.append(_linha([(370, 706), (500, 706)], VD, "RS-485 porta A", 435, 692))
    c.append(_linha([(650, 752), (650, 775)], VD))
    c.append(_linha([(440, 706), (440, 919), (500, 919)], VD))
    c.append(_linha([(370, 852), (930, 852), (930, 706), (1000, 706)], VD, "RS-485 porta B", 930, 780))
    c.append(_linha([(1150, 752), (1150, 775)], CZ, tracejada=True))
    c.append(_linha([(205, 885), (205, 860)], RX, "SPI", 232, 873, tracejada=True))
    # legenda
    ly = 845
    for i, (cor, txt, tr) in enumerate(((AZ2, "componente novo (software)", False), (VD, "componente novo (hardware)", False),
                                        ("#8E6C3A", "sistema existente", False), (RX, "opcional / Arquitetura B", True))):
        d = "stroke-dasharray='6 4'" if tr else ""
        c.append(f"<rect x='{1330}' y='{ly+i*28}' width='20' height='16' rx='3' fill='#fff' stroke='{cor}' stroke-width='1.8' {d}/>"
                 f"<text x='{1360}' y='{ly+i*28+13}' font-size='12' {FONT}>{txt}</text>")
    return svg(W, H, "\n".join(c), "Arquitetura de componentes do sistema pick-to-light")


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
        "manutencao": d_manutencao(),
        "componentes": d_componentes(),
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
