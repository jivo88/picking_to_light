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
        "  alto giro / blocos 4-5 / zonas de baixo giro",
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
        "2 barramentos RS-485 (frente e fundo)",
        "Fonte 12 V Mean Well + gabinete ventilado",
        "Guarda o estado da caixa se a rede cair"] + (["B2: leitor NFC + painel LCD"] if rfid else []), VD, VD2))
    c.append(seta(620, 360, 620, 430, "MQTT (ptl/est/cmd · evt)", dupla=True))
    c.append(caixa(30, 610, 380, 130, "Frente — alto giro", [
        "Andares 0-3: Módulo Q por endereço",
        "  (quantidade 3 díg. + botão com LED)",
        "Nó de coluna por prédio (1 a 10)",
        "Andares 4-5: 2 blocos E+Q (esq./dir.)"], VD))
    c.append(caixa(470, 610, 360, 130, "Fundo — baixo giro", [
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


# ---------------------------------------------------------------- D4 layout estacao 05
def d_layout():
    w, h = 1500, 660
    c = []
    cel = 34
    # frente
    fx, fy = 60, 170
    c.append(f"<text x='{fx}' y='{fy-100}' font-size='16' font-weight='700' fill='{AZ}' {FONT}>FRENTE — alto giro (prédios 001-010)</text>")
    frente = [e for e in END05 if e["predio"] <= 10]
    for a in range(0, 6):
        yy = fy + (5 - a) * (cel + 6)
        c.append(f"<text x='{fx-10}' y='{yy+22}' text-anchor='end' font-size='12' fill='{CZ}' {FONT}>A{a}</text>")
    for p in range(1, 11):
        c.append(f"<text x='{fx+(p-1)*(cel+6)+cel/2}' y='{fy+6*(cel+6)+14}' text-anchor='middle' font-size='12' fill='{CZ}' {FONT}>{p:03d}</text>")
    for e in frente:
        x = fx + (e["predio"] - 1) * (cel + 6)
        y = fy + (5 - e["andar"]) * (cel + 6)
        if e["andar"] <= 3:
            c.append(f"<rect x='{x}' y='{y}' width='{cel}' height='{cel}' rx='4' fill='{VD2}' stroke='{VD}'/>"
                     f"<rect x='{x+5}' y='{y+6}' width='{cel-10}' height='12' rx='2' fill='#111'/>"
                     f"<text x='{x+cel/2}' y='{y+16}' text-anchor='middle' font-size='9' fill='#ff4b3a' font-weight='700' {FONT}>12</text>"
                     f"<circle cx='{x+cel/2}' cy='{y+26}' r='4' fill='{AM}'/>")
        else:
            cor = "#D6E4F7" if e["predio"] <= 5 else "#FCE8CC"
            c.append(f"<rect x='{x}' y='{y}' width='{cel}' height='{cel}' rx='4' fill='{cor}' stroke='{AZ2 if e['predio']<=5 else AM}'/>")
    # blocos 4-5 displays
    for lado, (p0, cor, rot) in enumerate(((1, AZ2, "BLOCO E (A4-A5)"), (6, AM, "BLOCO D (A4-A5)"))):
        x = fx + (p0 - 1) * (cel + 6)
        y = fy - 22
        c.append(f"<rect x='{x}' y='{y-36}' width='{5*(cel+6)-6}' height='30' rx='5' fill='#111' stroke='{cor}' stroke-width='2'/>"
                 f"<text x='{x+10}' y='{y-16}' font-size='13' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>P004 A5</text>"
                 f"<text x='{x+5*(cel+6)-16}' y='{y-16}' text-anchor='end' font-size='13' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>3</text>")
        c.append(f"<text x='{x+(5*(cel+6))/2}' y='{y+2}' text-anchor='middle' font-size='10.5' fill='{cor}' font-weight='700' {FONT}>{rot}</text>")
    # legenda frente
    ly = fy + 6 * (cel + 6) + 40
    c.append(f"<rect x='{fx}' y='{ly}' width='18' height='18' rx='3' fill='{VD2}' stroke='{VD}'/><text x='{fx+26}' y='{ly+14}' font-size='12.5' {FONT}>Andares 0-3: Módulo Q (quantidade + botão) — 29 endereços</text>")
    c.append(f"<rect x='{fx}' y='{ly+26}' width='18' height='18' rx='3' fill='#D6E4F7' stroke='{AZ2}'/><text x='{fx+26}' y='{ly+40}' font-size='12.5' {FONT}>Andares 4-5: bloco E/D com 1 display E+Q cada — 20 endereços</text>")
    c.append(f"<text x='{fx}' y='{ly+74}' font-size='12.5' fill='{CZ}' {FONT}>10 nós de coluna (1 por prédio) ligam os Módulos Q ao barramento da frente</text>")

    # fundo
    bx, by = 520, 170
    cw = 34
    c.append(f"<text x='{bx}' y='{by-100}' font-size='16' font-weight='700' fill='{AZ}' {FONT}>FUNDO — baixo giro (prédios 015, 020-043) — zonas de 4 prédios</text>")
    fundo = [e for e in END05 if e["predio"] >= 15]
    predios = sorted({e["predio"] for e in fundo})
    pos = {p: i for i, p in enumerate(predios)}
    cores = ["#E3F1E8", "#DEE6F2", "#FCE8CC", "#EFE7F6", "#E0F2F1", "#FDE2E2", "#F3F5F8"]
    bordas = [VD, AZ2, AM, RX, "#00897B", "#C62828", CZ]
    for a in range(0, 8):
        yy = by + (7 - a) * 30
        c.append(f"<text x='{bx-8}' y='{yy+19}' text-anchor='end' font-size='12' fill='{CZ}' {FONT}>A{a}</text>")
    zonas_x = {}
    for e in fundo:
        i = pos[e["predio"]]
        x = bx + i * cw
        y = by + (7 - e["andar"]) * 30
        z = int(e["zona"].split("-")[1]) - 1
        zonas_x.setdefault(z, []).append(x)
        c.append(f"<rect x='{x}' y='{y}' width='{cw-4}' height='26' rx='3' fill='{cores[z % 7]}' stroke='{bordas[z % 7]}'/>")
    for p, i in pos.items():
        c.append(f"<text x='{bx+i*cw+cw/2-2}' y='{by+8*30+14}' text-anchor='middle' font-size='10.5' fill='{CZ}' {FONT}>{p:03d}</text>")
    for z, xs_ in sorted(zonas_x.items()):
        x0, x1 = min(xs_), max(xs_) + cw - 4
        c.append(f"<rect x='{x0}' y='{by-62}' width='{x1-x0}' height='28' rx='5' fill='#111' stroke='{bordas[z % 7]}' stroke-width='2'/>"
                 f"<text x='{x0+8}' y='{by-43}' font-size='12' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>P0{23+z*4 if z<5 else 41} A2</text>"
                 f"<text x='{x1-8}' y='{by-43}' text-anchor='end' font-size='12' fill='#ff4b3a' font-weight='700' font-family='DejaVu Sans Mono, monospace'>2</text>"
                 f"<text x='{(x0+x1)/2}' y='{by-12}' text-anchor='middle' font-size='10.5' font-weight='700' fill='{bordas[z % 7]}' {FONT}>ZONA {z+1}</text>")
    ly = by + 8 * 30 + 40
    c.append(f"<text x='{bx}' y='{ly}' font-size='12.5' {FONT}>• 160 endereços (andares 0-7) em 6 zonas; 1 display E+Q por zona mostra o endereço e a quantidade do próximo item da rota.</text>")
    c.append(f"<text x='{bx}' y='{ly+22}' font-size='12.5' {FONT}>• Prédio 015 (3-4 posições) entra na Zona 1. Todas as zonas com itens trabalham ao mesmo tempo; o operador confirma no botão da zona.</text>")
    c.append(f"<text x='{bx}' y='{ly+44}' font-size='12.5' {FONT}>• Opcional: LED guia no topo de cada prédio indica a coluna do item da zona.</text>")
    c.append(f"<text x='{bx}' y='{ly+66}' font-size='12.5' fill='{CZ}' {FONT}>Esquinas: + 1 zona (Medicamento, prédios 060-063) ou + 3 zonas (Perfumaria, prédios 060-071).</text>")
    return svg(w, h, "\n".join(c), "Layout da estação 05 (Medicamento, comum) — 209 endereços reais de wms_endereco")


# ---------------------------------------------------------------- D5 cabeamento
def d_cabeamento():
    w, h = 1400, 600
    c = []
    c.append(caixa(40, 230, 250, 150, "Concentrador", ["RP2040 + W5500", "Porta A: barramento frente", "Porta B: barramento fundo", "Fonte 12 V no gabinete"], VD, VD2))
    # barramento frente
    c.append(f"<text x='330' y='90' font-size='14' font-weight='700' fill='{AZ}' {FONT}>Barramento FRENTE (RS-485 + 12 V em cabo Cat5e, RJ45)</text>")
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
    c.append(f"<text x='330' y='400' font-size='14' font-weight='700' fill='{AZ}' {FONT}>Barramento FUNDO — 1 Módulo E+Q por zona, em cadeia (entra/sai RJ45)</text>")
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
    c.append(f"<text x='460' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Módulo E+Q — blocos 4-5 e zonas de baixo giro</text>")
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
             f"<text x='460' y='334' font-size='12.5' {FONT}>• Entrada e saída RJ45 (cadeia no barramento do fundo)</text>")
    # gabinete
    c.append(f"<text x='1080' y='80' font-size='16' font-weight='700' fill='{AZ}' {FONT}>Gabinete do concentrador</text>")
    c.append(f"<rect x='1080' y='100' width='260' height='240' rx='12' fill='#e9edf3' stroke='{CZ}' stroke-width='2'/>"
             f"<rect x='1100' y='120' width='120' height='70' rx='6' fill='{VD2}' stroke='{VD}'/><text x='1160' y='160' text-anchor='middle' font-size='12' {FONT}>Fonte 12 V</text>"
             f"<rect x='1100' y='200' width='120' height='60' rx='6' fill='#fff' stroke='{AZ2}'/><text x='1160' y='235' text-anchor='middle' font-size='12' {FONT}>Placa RP2040</text>"
             f"<circle cx='1290' cy='160' r='30' fill='#cfd6e0' stroke='{CZ}'/><text x='1290' y='165' text-anchor='middle' font-size='11' {FONT}>cooler</text>"
             f"<rect x='1250' y='210' width='70' height='14' rx='3' fill='#b6bec9'/><rect x='1250' y='230' width='70' height='14' rx='3' fill='#b6bec9'/>"
             f"<text x='1285' y='265' text-anchor='middle' font-size='11' fill='{CZ}' {FONT}>filtro</text>"
             f"<rect x='1100' y='280' width='220' height='40' rx='6' fill='#fff' stroke='{CZ}'/><text x='1210' y='305' text-anchor='middle' font-size='11.5' {FONT}>RJ45: rede · frente · fundo</text>")
    c.append(f"<text x='1080' y='366' font-size='12.5' {FONT}>• IP54 com filtro e cooler 12 V</text>"
             f"<text x='1080' y='388' font-size='12.5' {FONT}>• Trilho DIN, disjuntor 2 A</text>")
    return svg(w, h, "\n".join(c), "Módulos e gabinete")


def main():
    figuras = {
        "arquitetura_a": d_arq(False),
        "arquitetura_b": d_arq(True),
        "sequencia": d_sequencia(),
        "layout_estacao": d_layout(),
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
