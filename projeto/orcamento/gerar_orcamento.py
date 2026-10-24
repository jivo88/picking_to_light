"""Gera Orcamento_PTL.xlsx com formulas (precos, composicao, cenarios)."""
import json
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

EST = json.load(open("/home/claude/ptl-projeto/dados/estacoes.json", encoding="utf-8"))
SAIDA = "/home/claude/ptl-projeto/entregaveis/Orcamento_PTL.xlsx"

AZUL = Font(name="Arial", size=10, color="0000FF")
PRETO = Font(name="Arial", size=10)
NEG = Font(name="Arial", size=10, bold=True)
VERDE = Font(name="Arial", size=10, color="008000")
TIT = Font(name="Arial", size=14, bold=True, color="1F3864")
SUB = Font(name="Arial", size=11, bold=True, color="1F3864")
CAB = Font(name="Arial", size=10, bold=True, color="FFFFFF")
FUNDO_CAB = PatternFill("solid", fgColor="1F3864")
AMARELO = PatternFill("solid", fgColor="FFF2CC")
CINZA = PatternFill("solid", fgColor="F2F2F2")
TOTAL = PatternFill("solid", fgColor="DDEBF7")
FINA = Side(style="thin", color="BFBFBF")
BORDA = Border(left=FINA, right=FINA, top=FINA, bottom=FINA)
BRL = 'R$ #,##0.00;(R$ #,##0.00);"-"'
BRL0 = 'R$ #,##0;(R$ #,##0);"-"'
NUM = '#,##0;(#,##0);"-"'
NUM2 = '#,##0.00;(#,##0.00);"-"'
PCT = '0.0%'

wb = Workbook()


def cabecalho(ws, linha, titulos, larguras=None):
    for i, t in enumerate(titulos, 1):
        c = ws.cell(row=linha, column=i, value=t)
        c.font = CAB
        c.fill = FUNDO_CAB
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDA
    ws.row_dimensions[linha].height = 32
    if larguras:
        for i, w in enumerate(larguras, 1):
            ws.column_dimensions[get_column_letter(i)].width = w


def cel(ws, ref, valor, fonte=PRETO, fmt=None, fill=None, borda=True, wrap=False):
    c = ws[ref]
    c.value = valor
    c.font = fonte
    if fmt:
        c.number_format = fmt
    if fill:
        c.fill = fill
    if borda:
        c.border = BORDA
    if wrap:
        c.alignment = Alignment(wrap_text=True, vertical="top")
    return c


# =====================================================================
# 1. LEIA-ME
# =====================================================================
ws = wb.active
ws.title = "Leia-me"
ws.column_dimensions["A"].width = 3
ws.column_dimensions["B"].width = 110
linhas = [
    ("Orçamento — Projeto Pick-to-Light (Flow Rack)", TIT),
    ("Arquitetura A (coletor + concentrador + displays) e Arquitetura B (identificação por RFID)", SUB),
    ("", None),
    ("COMO USAR", SUB),
    ("• Células em AZUL são entradas editáveis (quantidades, preços, premissas). Células em PRETO são fórmulas — não editar.", PRETO),
    ("• Células com fundo AMARELO são premissas/estimativas que precisam de cotação ou confirmação.", PRETO),
    ("• Aba 'Estações': números de endereços por estação, extraídos de wms_endereco (esteiras 1 e 2) em 23/10/2026. "
     "Corrija qualquer número direto ali — todo o orçamento recalcula.", PRETO),
    ("• Coluna 'Piloto' (S/N) na aba 'Estações' define quais estações entram no cenário piloto (padrão: 05 e 27).", PRETO),
    ("• Aba 'Preços': catálogo de peças com fonte e data. Itens marcados 'Estimativa' devem ser cotados antes da compra.", PRETO),
    ("", None),
    ("ABAS", SUB),
    ("Premissas — câmbio, fator de importação, custo-hora, horas de montagem/instalação, reserva técnica, frota de caixas.", PRETO),
    ("Estações — dimensionamento por estação (40 estações: 20 Medicamento + 20 Perfumaria).", PRETO),
    ("Preços — catálogo de peças com fonte.", PRETO),
    ("Composição — lista de materiais (BOM) de cada tipo de módulo e custo unitário.", PRETO),
    ("A-Interno — Arquitetura A com produção interna: peças, peças + mão de obra, variante 5 V.", PRETO),
    ("A-Terceiros — Arquitetura A com produção de terceiros: (T1) placa própria montada por EMS e (T2) PTL comercial importado.", PRETO),
    ("B-RFID — Arquitetura B: mesma infraestrutura de displays + identificação RFID (B1 pulseira, B2 leitor fixo).", PRETO),
    ("Software — esforço estimado de desenvolvimento (horas) para as duas arquiteturas.", PRETO),
    ("Resumo — comparativo de todos os cenários: Piloto x Operação completa.", PRETO),
    ("", None),
    ("TERMOS", SUB),
    ("Módulo Q — display de QUANTIDADE (3 dígitos) + botão com LED, um por endereço de alto giro (andares 0 a 3).", PRETO),
    ("Módulo E+Q — display de ENDEREÇO (8 dígitos) + QUANTIDADE (3 dígitos) + botão; usado nos andares 4 e 5 do alto giro "
     "(1 por andar em cada lado: 4 por estação) e em cada zona de baixo giro (4 zonas por lado do corredor, na altura dos olhos).", PRETO),
    ("Nó de coluna — microcontrolador por coluna (prédio) do alto giro que liga os Módulos Q daquela coluna ao barramento RS-485.", PRETO),
    ("Concentrador — controlador da estação (Ethernet cabeada), recebe a caixa do serviço PTL e comanda os barramentos.", PRETO),
    ("Zona de baixo giro — 1 display E+Q a cada 4 prédios do fundo (inclui prédio 015 na 1ª zona e prédios de esquina).", PRETO),
]
for i, (t, f) in enumerate(linhas, 1):
    c = ws.cell(row=i + 1, column=2, value=t)
    if f:
        c.font = f
    c.alignment = Alignment(wrap_text=True, vertical="top")

# =====================================================================
# 2. PREMISSAS
# =====================================================================
wp = wb.create_sheet("Premissas")
cabecalho(wp, 1, ["Premissa", "Valor", "Unidade", "Fonte / observação"], [44, 14, 12, 90])
premissas = [
    # chave, descricao, valor, unidade, fonte, amarelo?
    ("cambio", "Câmbio USD/BRL (comercial)", 5.0413, "R$/US$", "renovainvest.com.br/dolar-hoje — 23/10/2026 12h11", False),
    ("fator_imp", "Fator de importação (frete + impostos + despacho) sobre o valor FOB", 1.9, "x",
     "Estimativa para importação formal de eletrônicos (II + IPI + PIS/COFINS + ICMS + frete). Confirmar com Comércio Exterior.", True),
    ("salario_tec", "Salário médio técnico eletrônico (CLT)", 2846.84, "R$/mês",
     "salario.com.br, CBO 313215, atualizado em 08/10/2026 (CAGED)", False),
    ("encargos", "Fator de encargos e benefícios sobre salário", 2.0, "x", "Estimativa usual (encargos + benefícios + provisões). Ajustar com RH.", True),
    ("horas_mes", "Horas produtivas por mês", 163, "h", "44 h/semana com ausências", True),
    ("custo_hora", "Custo-hora técnico (calculado)", "=B4*B5/B6", "R$/h", "Fórmula: salário × encargos ÷ horas", False),
    ("h_mod_q", "Montagem — Módulo Q", 0.25, "h/un", "Estimativa: display + botão + carcaça + teste", True),
    ("h_no", "Montagem — Nó de coluna", 0.75, "h/un", "Estimativa: placa base, soldas, gravação de firmware, teste", True),
    ("h_mod_eq", "Montagem — Módulo E+Q", 1.0, "h/un", "Estimativa", True),
    ("h_conc", "Montagem — Concentrador (gabinete completo)", 2.0, "h/un", "Estimativa", True),
    ("h_inst", "Instalação por estação (canaletas, módulos, cabos)", 16, "h/estação", "Estimativa: 2 técnicos × 1 turno", True),
    ("h_comiss", "Testes e comissionamento por estação", 4, "h/estação", "Estimativa", True),
    ("reserva", "Reserva técnica (peças sobressalentes)", 0.10, "%", "Sobre módulos, nós e concentradores", True),
    ("m_barr", "Cabo de barramento por segmento (entre nós/módulos)", 3, "m", "Estimativa de layout; ajustar com as medidas das fotos", True),
    ("m_canaleta", "Canaleta/perfil de fixação por estação", 24, "m", "12 m frente + 12 m fundo (estimativa)", True),
    ("m_rede", "Cabo de rede do rack até a estação", 50, "m", "Estimativa; depende da posição do rack", True),
    ("portas_switch", "Estações atendidas por switch de 24 portas", 22, "estações", "Deixa portas livres para uplink/reserva", True),
    ("frota", "Frota de caixas retornáveis (Arq. B)", 5000, "caixas", "Estimativa: ~1,7 × 3.000 volumes/dia. CONFIRMAR com a operação.", True),
    ("pulseiras_por_est", "Pulseiras por estação (Arq. B1)", 1.2, "un", "1 por operador + 20% reserva/carga", True),
    ("custo_hora_dev", "Custo-hora desenvolvimento interno", 60, "R$/h", "Estimativa para referência; ajustar com RH/TI", True),
    ("m_5v_extra", "Cabo de força extra por estação na variante 5 V", 30, "m", "Distribuição de 5 V exige mais pontos de injeção", True),
    ("p_cabo_forca", "Cabo de força 2×1,5 mm² (variante 5 V)", 4.5, "R$/m", "Estimativa — cotar", True),
]
REF = {}
for i, (k, d, v, u, f, am) in enumerate(premissas, 2):
    REF[k] = "Premissas!$B$%d" % i
    cel(wp, "A%d" % i, d)
    c = cel(wp, "B%d" % i, v, AZUL if not str(v).startswith("=") else PRETO,
            fill=AMARELO if am else None)
    c.number_format = PCT if u == "%" else (NUM2 if isinstance(v, float) or str(v).startswith("=") else NUM)
    cel(wp, "C%d" % i, u)
    cel(wp, "D%d" % i, f, wrap=True)
# custo_hora formula referencia B4,B5,B6 -> conferir indices
assert premissas[2][0] == "salario_tec" and premissas[3][0] == "encargos" and premissas[4][0] == "horas_mes"

# =====================================================================
# 3. ESTACOES
# =====================================================================
we = wb.create_sheet("Estações")
tit = ["Rua (estação)", "Segmento", "Tipo", "Piloto (S/N)", "Total de endereços",
       "Alto giro 0-3\n(Módulos Q)", "Alto giro 4-5\n(endereços)", "Blocos AG 4-5\n(E/D)",
       "Baixo giro\n(endereços)", "Zonas baixo giro", "Nós de coluna", "Prédios do fundo",
       "Módulos E+Q", "Segmentos de\nbarramento", "Concentrador"]
cabecalho(we, 1, tit, [11, 14, 10, 10, 12, 13, 13, 12, 12, 11, 11, 11, 11, 13, 12])
ordem = sorted(EST)
for i, rua in enumerate(ordem, 2):
    e = EST[rua]
    piloto = "S" if rua in ("05", "27") else "N"
    vals = [rua, e["segmento"], e["tipo"], piloto, e["total"], e["alto_0a3"], e["alto_45"],
            e["blocos_alto_45"], e["baixo"], e["zonas_baixo"], e["nos_coluna"], e["predios_fundo"]]
    for j, v in enumerate(vals, 1):
        c = we.cell(row=i, column=j, value=v)
        c.font = AZUL if j >= 4 else PRETO
        c.border = BORDA
        c.alignment = Alignment(horizontal="center")
        if j >= 5:
            c.number_format = NUM
    we.cell(row=i, column=13, value="=H%d+J%d" % (i, i))
    we.cell(row=i, column=14, value="=K%d+M%d+2" % (i, i))
    we.cell(row=i, column=15, value=1)
    for j in (13, 14, 15):
        c = we.cell(row=i, column=j)
        c.font = PRETO if j != 15 else AZUL
        c.border = BORDA
        c.alignment = Alignment(horizontal="center")
        c.number_format = NUM
ULT = len(ordem) + 1
LC, LP = ULT + 2, ULT + 3       # linhas de total completo / piloto
we.cell(row=LC, column=1, value="TOTAL — operação completa").font = NEG
we.cell(row=LP, column=1, value="TOTAL — piloto (Piloto = S)").font = NEG
dv = DataValidation(type="list", formula1='"S,N"', allow_blank=False)
we.add_data_validation(dv)
dv.add("D2:D%d" % ULT)
for j in range(5, 16):
    L = get_column_letter(j)
    c1 = we.cell(row=LC, column=j, value="=SUM(%s2:%s%d)" % (L, L, ULT))
    c2 = we.cell(row=LP, column=j, value='=SUMIF($D$2:$D$%d,"S",%s2:%s%d)' % (ULT, L, L, ULT))
    for c in (c1, c2):
        c.font = NEG
        c.fill = TOTAL
        c.number_format = NUM
        c.border = BORDA
        c.alignment = Alignment(horizontal="center")
we.cell(row=LC, column=4, value='=COUNTA(A2:A%d)' % ULT).number_format = NUM
we.cell(row=LP, column=4, value='=COUNTIF(D2:D%d,"S")' % ULT).number_format = NUM
for r in (LC, LP):
    we.cell(row=r, column=4).font = NEG
    we.cell(row=r, column=4).fill = TOTAL
we.cell(row=LP + 2, column=1,
        value="Coluna D (Piloto) = quantidade de estações nas linhas de total. "
              "Fonte: wms_endereco (cd_esteira 1 e 2), exportado em 23/10/2026; rua 90 (Marketing/Almoxarifado) desconsiderada.").font = Font(name="Arial", size=9, italic=True)
we.cell(row=LP + 3, column=1,
        value="Regras: Alto giro = prédios 001-010; andares 4-5 com 4 displays E+Q por estação (A4 e A5 nos lados 001-005 e 006-010). "
              "Baixo giro = demais prédios (corredor, 015 e esquinas): 4 zonas E+Q por lado do corredor; esquinas com zonas de 4 prédios.").font = Font(name="Arial", size=9, italic=True)
we.freeze_panes = "B2"


def tot(col, cenario):
    """Referencia ao total da aba Estações: cenario 'C' completo, 'P' piloto."""
    linha = LC if cenario == "C" else LP
    return "'Estações'!$%s$%d" % (col, linha)


# =====================================================================
# 4. PRECOS
# =====================================================================
wpr = wb.create_sheet("Preços")
cabecalho(wpr, 1, ["Código", "Item", "Unidade", "Preço (R$)", "Preço (US$)", "Fonte / data", "Status"],
          [9, 52, 10, 13, 12, 70, 12])
C = "=E{r}*" + REF["cambio"] + "*" + REF["fator_imp"]
precos = [
    # cod, item, unidade, brl, usd, fonte, status
    ("P01", "Display 7 segmentos 4 dígitos TM1637 (usa 3 dígitos — quantidade)", "un", 9.98, None,
     "Usinainfo — Módulo Display TM1637 4 dígitos vermelho — 23/10/2026 (Pix)", "Cotado"),
    ("P02", "Display 7 segmentos 8 dígitos MAX7219 (endereço)", "un", 20.17, None,
     "Usinainfo — Display MAX7219 8 dígitos SPI — 23/10/2026 (Pix)", "Cotado"),
    ("P03", "Microcontrolador Raspberry Pi Pico (RP2040)", "un", 39.90, None,
     "MakerHero — Raspberry Pi Pico — 23/10/2026", "Cotado"),
    ("P04", "Módulo transceptor RS-485 (MAX485)", "un", 8.90, None,
     "Saravati — Módulo conversor TTL/RS485 MAX485 — 23/10/2026", "Cotado"),
    ("P05", "Placa do concentrador RP2040 + Ethernet W5500 (W5500-EVB-Pico)", "un", None, 12.50,
     "SparkFun DEV-19958 US$ 12,50 — 23/10/2026; convertido com câmbio × fator de importação", "Cotado (US$)"),
    ("P06", "Fonte Mean Well LRS-150-12 (12 V / 12,5 A / 150 W)", "un", 189.98, None,
     "MCEIG (fontesmeanwell.com.br) — 23/10/2026", "Cotado"),
    ("P07", "Fonte Mean Well LRS-150-5 (5 V / 26 A) — variante 5 V", "un", 185.00, None,
     "Estimativa (mesma família da LRS-150-12) — cotar", "Estimativa"),
    ("P08", "Regulador step-down 12 V → 5 V (mini, 3 A)", "un", 8.00, None, "Estimativa de mercado — cotar", "Estimativa"),
    ("P09", "Botão de confirmação com LED (16 mm, momentâneo)", "un", 7.00, None, "Estimativa de mercado — cotar", "Estimativa"),
    ("P10", "Conector RJ45 fêmea para placa (jack)", "un", 2.50, None, "Estimativa — cotar", "Estimativa"),
    ("P11", "Plug RJ45 Cat5e (macho)", "un", 0.80, None, "Estimativa (pote com 100) — cotar", "Estimativa"),
    ("P12", "Cabo Cat5e (por metro)", "m", "=1229.41/305", None,
     "KaBuM — Cabo Cat5e Fortrek FK500C 305 m R$ 1.229,41 (Pix) — 23/10/2026", "Cotado"),
    ("P13", "Carcaça do Módulo Q (impressão 3D PETG ou caixa plástica pequena)", "un", 5.00, None, "Estimativa", "Estimativa"),
    ("P14", "Carcaça do Módulo E+Q / Nó de coluna", "un", 15.00, None, "Estimativa", "Estimativa"),
    ("P15", "Placa base universal + bornes (nó / módulo E+Q)", "un", 10.00, None, "Estimativa", "Estimativa"),
    ("P16", "Gabinete do concentrador ventilado (caixa IP54 + cooler 40 mm 12 V + filtro)", "un", 90.00, None,
     "Estimativa — cotar (ambiente com poeira e calor)", "Estimativa"),
    ("P17", "Trilho DIN + bornes + disjuntor 2 A", "kit", 45.00, None, "Estimativa — cotar", "Estimativa"),
    ("P18", "Canaleta / perfil de fixação dos módulos (por metro)", "m", 9.00, None,
     "Estimativa (canaleta PVC 20×10 mm em barra de 2 m) — cotar", "Estimativa"),
    ("P19", "Fixações diversas (abraçadeiras, parafusos, etiquetas) por estação", "kit", 40.00, None, "Estimativa", "Estimativa"),
    ("P20", "Switch 24 portas Gigabit TP-Link TL-SG1024DE", "un", 769.32, None, "KaBuM — 23/10/2026 (Pix)", "Cotado"),
    ("P21", "Fita LED endereçável WS2812 — guia de coluna (por LED) [opcional]", "LED", 0.90, None, "Estimativa — cotar", "Estimativa"),
    ("P22", "Tag NFC NTAG213 adesiva 13,56 MHz", "un", 2.37, None,
     "Loja RFID — lote 100 un R$ 237,41 à vista — 23/10/2026", "Cotado"),
    ("P23", "Suporte/proteção da tag na caixa retornável", "un", 0.50, None, "Estimativa", "Estimativa"),
    ("P24", "ESP32-C3 Super Mini (pulseira)", "un", 29.89, None, "Usinainfo — 23/10/2026 (Pix)", "Cotado"),
    ("P25", "Módulo leitor NFC PN532 (43×40 mm, com cartão e chaveiro)", "un", 42.65, None,
     "MakerHero — Kit Módulo Leitor RFID NFC PN532 — 23/10/2026 (Pix)", "Cotado"),
    ("P26", "Kit energia pulseira (LiPo 500 mAh + TP4056 + motor vibração + botão)", "kit", 35.00, None, "Estimativa — cotar", "Estimativa"),
    ("P27", "Carcaça 3D + pulseira velcro", "un", 20.00, None, "Estimativa", "Estimativa"),
    ("P28", "Display LCD 20×4 I2C (painel da estação — Arq. B2)", "un", 35.00, None, "Estimativa — cotar", "Estimativa"),
    ("P29", "Módulo PTL comercial 3 dígitos + botão (RS-485)", "un", None, 30.00,
     "Alibaba — Sophia T-P3: US$ 32 (1-299 un) / US$ 28 (300+) — 23/10/2026; média US$ 30", "Cotado (US$)"),
    ("P30", "Módulo PTL comercial endereço + quantidade (display alfanumérico)", "un", None, 65.00,
     "Estimativa (não há preço público) — solicitar cotação a fornecedores", "Estimativa"),
    ("P31", "Controlador/gateway PTL comercial por estação", "un", None, 220.00,
     "Estimativa (não há preço público) — solicitar cotação", "Estimativa"),
    ("P32", "PCB própria montada por EMS — Módulo Q (MCU + display 0,56\" + botão + 2× RJ45)", "un", None, 9.00,
     "Estimativa com base na tabela de montagem JLCPCB (jlcpcb.com/help/article/pcb-assembly-price) + componentes", "Estimativa"),
    ("P33", "PCB própria montada por EMS — Módulo E+Q", "un", None, 22.00, "Estimativa (idem)", "Estimativa"),
    ("P34", "PCB própria montada por EMS — Concentrador (MCU + Ethernet + 2× RS-485)", "un", None, 35.00, "Estimativa (idem)", "Estimativa"),
    ("P35", "Engenharia de projeto das PCBs (terceirizada, valor único)", "projeto", 15000.00, None,
     "Estimativa — solicitar orçamento a design house", "Estimativa"),
    ("P36", "Leitor RFID UHF de pulso comercial (FEIG HyWEAR Compact) — referência", "un", None, 997.00,
     "atlasRFIDstore — US$ 997 — 22/10/2026 (UHF; não lê tags NFC)", "Cotado (US$)"),
    ("P37", "Leitor HF/NFC fixo industrial (USB/RS-232) — alternativa comercial ao PN532", "un", 350.00, None,
     "Estimativa — cotar (ex.: ACS ACR122U ou similar)", "Estimativa"),
]
PRECO = {}
for i, (cod, item, un, brl, usd, fonte, st) in enumerate(precos, 2):
    PRECO[cod] = "'Preços'!$D$%d" % i
    cel(wpr, "A%d" % i, cod)
    cel(wpr, "B%d" % i, item, wrap=True)
    cel(wpr, "C%d" % i, un)
    if brl is None:
        cel(wpr, "D%d" % i, C.format(r=i), PRETO, BRL)
    else:
        cel(wpr, "D%d" % i, brl, AZUL if not str(brl).startswith("=") else PRETO, BRL,
            fill=AMARELO if st == "Estimativa" else None)
    if usd is not None:
        cel(wpr, "E%d" % i, usd, AZUL, '"US$ "#,##0.00', fill=AMARELO if st == "Estimativa" else None)
    else:
        cel(wpr, "E%d" % i, None)
    cel(wpr, "F%d" % i, fonte, wrap=True)
    cel(wpr, "G%d" % i, st, fill=AMARELO if st == "Estimativa" else None)
wpr.freeze_panes = "C2"

# =====================================================================
# 5. COMPOSICAO (BOM)
# =====================================================================
wc = wb.create_sheet("Composição")
cabecalho(wc, 1, ["Conjunto", "Código", "Item", "Qtd por unidade", "Preço unit. (R$)", "Subtotal (R$)"],
          [26, 9, 58, 14, 15, 15])
bom = {
    "Módulo Q": [("P01", 1), ("P09", 1), ("P13", 1), ("P10", 1), ("P12", 2), ("P11", 2)],
    "Nó de coluna": [("P03", 1), ("P04", 1), ("P08", 1), ("P15", 1), ("P10", 6), ("P14", 1)],
    "Módulo E+Q": [("P02", 1), ("P01", 1), ("P03", 1), ("P04", 1), ("P08", 1), ("P09", 1), ("P10", 2),
                   ("P14", 1), ("P15", 1)],
    "Concentrador 12 V": [("P05", 1), ("P04", 2), ("P06", 1), ("P08", 1), ("P16", 1), ("P17", 1), ("P10", 2)],
    "Concentrador 5 V": [("P05", 1), ("P04", 2), ("P07", 1), ("P16", 1), ("P17", 1), ("P10", 2)],
    "Pulseira RFID (B1)": [("P24", 1), ("P25", 1), ("P26", 1), ("P27", 1)],
    "Leitor fixo + painel (B2)": [("P25", 1), ("P28", 1), ("P09", 1), ("P14", 1), ("P12", 5), ("P11", 2)],
    "Tag por caixa (B)": [("P22", 1), ("P23", 1)],
}
r = 2
UNIT = {}
for conj, itens in bom.items():
    ini = r
    for cod, q in itens:
        cel(wc, "A%d" % r, conj)
        cel(wc, "B%d" % r, cod)
        cel(wc, "C%d" % r, "=INDEX('Preços'!$B:$B,MATCH(B%d,'Preços'!$A:$A,0))" % r, VERDE, wrap=True)
        cel(wc, "D%d" % r, q, AZUL, NUM2)
        cel(wc, "E%d" % r, "=INDEX('Preços'!$D:$D,MATCH(B%d,'Preços'!$A:$A,0))" % r, VERDE, BRL)
        cel(wc, "F%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
        r += 1
    cel(wc, "A%d" % r, "Custo unitário — " + conj, NEG, fill=TOTAL)
    for col in "BCDE":
        cel(wc, "%s%d" % (col, r), None, fill=TOTAL)
    cel(wc, "F%d" % r, "=SUM(F%d:F%d)" % (ini, r - 1), NEG, BRL, fill=TOTAL)
    UNIT[conj] = "'Composição'!$F$%d" % r
    r += 2
cel(wc, "A%d" % r, "Variante 5 V: os módulos e nós não usam regulador step-down (P08); o custo é descontado na aba A-Interno.",
    Font(name="Arial", size=9, italic=True), borda=False)

# =====================================================================
# 6. A-INTERNO
# =====================================================================
wa = wb.create_sheet("A-Interno")
cabecalho(wa, 1, ["Item", "Base de cálculo", "Qtd piloto", "Qtd completo", "Preço unit. (R$)",
                  "Total piloto (R$)", "Total completo (R$)"], [42, 46, 12, 13, 15, 17, 18])
cel(wa, "A2", "Arquitetura A — produção e montagem interna (12 V)", SUB, borda=False)
res = "(1+%s)" % REF["reserva"]
linhas_a = [
    ("Módulos Q (alto giro 0-3)", "endereços alto giro 0-3 × (1 + reserva)",
     "=ROUNDUP(%s*%s,0)" % (tot("F", "P"), res), "=ROUNDUP(%s*%s,0)" % (tot("F", "C"), res), UNIT["Módulo Q"]),
    ("Nós de coluna (alto giro)", "colunas de alto giro × (1 + reserva)",
     "=ROUNDUP(%s*%s,0)" % (tot("K", "P"), res), "=ROUNDUP(%s*%s,0)" % (tot("K", "C"), res), UNIT["Nó de coluna"]),
    ("Módulos E+Q (blocos 4-5 + zonas baixo giro)", "blocos + zonas × (1 + reserva)",
     "=ROUNDUP(%s*%s,0)" % (tot("M", "P"), res), "=ROUNDUP(%s*%s,0)" % (tot("M", "C"), res), UNIT["Módulo E+Q"]),
    ("Concentradores 12 V", "1 por estação × (1 + reserva)",
     "=ROUNDUP(%s*%s,0)" % (tot("O", "P"), res), "=ROUNDUP(%s*%s,0)" % (tot("O", "C"), res), UNIT["Concentrador 12 V"]),
    ("Cabo de barramento Cat5e (m)", "segmentos × metros por segmento",
     "=%s*%s" % (tot("N", "P"), REF["m_barr"]), "=%s*%s" % (tot("N", "C"), REF["m_barr"]), PRECO["P12"]),
    ("Plugs RJ45 do barramento", "2 por segmento",
     "=%s*2" % tot("N", "P"), "=%s*2" % tot("N", "C"), PRECO["P11"]),
    ("Canaleta / perfil de fixação (m)", "metros por estação",
     "=%s*%s" % (tot("O", "P"), REF["m_canaleta"]), "=%s*%s" % (tot("O", "C"), REF["m_canaleta"]), PRECO["P18"]),
    ("Fixações diversas", "1 kit por estação", "=%s" % tot("O", "P"), "=%s" % tot("O", "C"), PRECO["P19"]),
    ("Cabo de rede até a estação (m)", "metros por estação",
     "=%s*%s" % (tot("O", "P"), REF["m_rede"]), "=%s*%s" % (tot("O", "C"), REF["m_rede"]), PRECO["P12"]),
    ("Switch 24 portas", "estações ÷ portas por switch (arredondado para cima)",
     "=ROUNDUP(%s/%s,0)" % (tot("O", "P"), REF["portas_switch"]),
     "=ROUNDUP(%s/%s,0)" % (tot("O", "C"), REF["portas_switch"]), PRECO["P20"]),
]
r = 3
for nome, base, qp, qc, preco in linhas_a:
    cel(wa, "A%d" % r, nome)
    cel(wa, "B%d" % r, base, wrap=True)
    cel(wa, "C%d" % r, qp, PRETO, NUM)
    cel(wa, "D%d" % r, qc, PRETO, NUM)
    cel(wa, "E%d" % r, "=" + preco, VERDE, BRL)
    cel(wa, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
    cel(wa, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
    r += 1
A_PECAS = r
cel(wa, "A%d" % r, "SUBTOTAL PEÇAS — Arquitetura A (12 V)", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wa, "%s%d" % (col, r), None, fill=TOTAL)
cel(wa, "F%d" % r, "=SUM(F3:F%d)" % (r - 1), NEG, BRL, fill=TOTAL)
cel(wa, "G%d" % r, "=SUM(G3:G%d)" % (r - 1), NEG, BRL, fill=TOTAL)
r += 2
cel(wa, "A%d" % r, "Mão de obra interna", SUB, borda=False)
r += 1
mo = [
    ("Montagem Módulos Q (h)", "módulos × h/un", "=C3*%s" % REF["h_mod_q"], "=D3*%s" % REF["h_mod_q"]),
    ("Montagem Nós de coluna (h)", "nós × h/un", "=C4*%s" % REF["h_no"], "=D4*%s" % REF["h_no"]),
    ("Montagem Módulos E+Q (h)", "módulos × h/un", "=C5*%s" % REF["h_mod_eq"], "=D5*%s" % REF["h_mod_eq"]),
    ("Montagem Concentradores (h)", "concentradores × h/un", "=C6*%s" % REF["h_conc"], "=D6*%s" % REF["h_conc"]),
    ("Instalação nas estações (h)", "estações × h/estação",
     "=%s*%s" % (tot("O", "P"), REF["h_inst"]), "=%s*%s" % (tot("O", "C"), REF["h_inst"])),
    ("Testes e comissionamento (h)", "estações × h/estação",
     "=%s*%s" % (tot("O", "P"), REF["h_comiss"]), "=%s*%s" % (tot("O", "C"), REF["h_comiss"])),
]
ini = r
for nome, base, qp, qc in mo:
    cel(wa, "A%d" % r, nome)
    cel(wa, "B%d" % r, base)
    cel(wa, "C%d" % r, qp, PRETO, NUM2)
    cel(wa, "D%d" % r, qc, PRETO, NUM2)
    cel(wa, "E%d" % r, "=" + REF["custo_hora"], VERDE, BRL)
    cel(wa, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
    cel(wa, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
    r += 1
A_MO = r
cel(wa, "A%d" % r, "SUBTOTAL MÃO DE OBRA", NEG, fill=TOTAL)
cel(wa, "B%d" % r, None, fill=TOTAL)
cel(wa, "C%d" % r, "=SUM(C%d:C%d)" % (ini, r - 1), NEG, NUM2, fill=TOTAL)
cel(wa, "D%d" % r, "=SUM(D%d:D%d)" % (ini, r - 1), NEG, NUM2, fill=TOTAL)
cel(wa, "E%d" % r, None, fill=TOTAL)
cel(wa, "F%d" % r, "=SUM(F%d:F%d)" % (ini, r - 1), NEG, BRL, fill=TOTAL)
cel(wa, "G%d" % r, "=SUM(G%d:G%d)" % (ini, r - 1), NEG, BRL, fill=TOTAL)
r += 2
A_TOT = r
cel(wa, "A%d" % r, "TOTAL — Arquitetura A interna (peças + mão de obra)", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wa, "%s%d" % (col, r), None, fill=TOTAL)
cel(wa, "F%d" % r, "=F%d+F%d" % (A_PECAS, A_MO), NEG, BRL, fill=TOTAL)
cel(wa, "G%d" % r, "=G%d+G%d" % (A_PECAS, A_MO), NEG, BRL, fill=TOTAL)
r += 2
cel(wa, "A%d" % r, "Variante 5 V (peças)", SUB, borda=False)
r += 1
v5 = [
    ("(−) Reguladores step-down dispensados", "nós + módulos E+Q + concentradores",
     "=-(C4+C5+C6)", "=-(D4+D5+D6)", PRECO["P08"]),
    ("(±) Fonte 5 V no lugar da 12 V", "concentradores",
     "=C6", "=D6", "(%s-%s)" % (PRECO["P07"], PRECO["P06"])),
    ("(+) Cabo de força extra para injeção de 5 V (m)", "metros por estação",
     "=%s*%s" % (tot("O", "P"), REF["m_5v_extra"]), "=%s*%s" % (tot("O", "C"), REF["m_5v_extra"]), REF["p_cabo_forca"]),
]
ini = r
for nome, base, qp, qc, preco in v5:
    cel(wa, "A%d" % r, nome)
    cel(wa, "B%d" % r, base)
    cel(wa, "C%d" % r, qp, PRETO, NUM)
    cel(wa, "D%d" % r, qc, PRETO, NUM)
    cel(wa, "E%d" % r, "=" + preco, VERDE, BRL)
    cel(wa, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
    cel(wa, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
    r += 1
A_5V = r
cel(wa, "A%d" % r, "SUBTOTAL PEÇAS — variante 5 V", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wa, "%s%d" % (col, r), None, fill=TOTAL)
cel(wa, "F%d" % r, "=F%d+SUM(F%d:F%d)" % (A_PECAS, ini, r - 1), NEG, BRL, fill=TOTAL)
cel(wa, "G%d" % r, "=G%d+SUM(G%d:G%d)" % (A_PECAS, ini, r - 1), NEG, BRL, fill=TOTAL)
r += 2
cel(wa, "A%d" % r, "Opcional — guia de coluna no baixo giro (1 LED por prédio do fundo)", SUB, borda=False)
r += 1
A_GUIA = r
cel(wa, "A%d" % r, "LEDs guia de coluna")
cel(wa, "B%d" % r, "prédios do fundo × (1 + reserva)")
cel(wa, "C%d" % r, "=ROUNDUP(%s*%s,0)" % (tot("L", "P"), res), PRETO, NUM)
cel(wa, "D%d" % r, "=ROUNDUP(%s*%s,0)" % (tot("L", "C"), res), PRETO, NUM)
cel(wa, "E%d" % r, "=" + PRECO["P21"], VERDE, BRL)
cel(wa, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
cel(wa, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)

# =====================================================================
# 7. A-TERCEIROS
# =====================================================================
wt = wb.create_sheet("A-Terceiros")
cabecalho(wt, 1, ["Item", "Base de cálculo", "Qtd piloto", "Qtd completo", "Preço unit. (R$)",
                  "Total piloto (R$)", "Total completo (R$)"], [44, 44, 12, 13, 15, 17, 18])
cel(wt, "A2", "T1 — Placas próprias fabricadas e montadas por EMS (cada módulo com seu microcontrolador)", SUB, borda=False)
q_mod = "=ROUNDUP(%s*%s,0)"
t1 = [
    ("Módulo Q — PCB montada", "endereços alto giro 0-3 × (1 + reserva)",
     q_mod % (tot("F", "P"), res), q_mod % (tot("F", "C"), res), "%s+%s" % (PRECO["P32"], PRECO["P13"])),
    ("Módulo E+Q — PCB montada", "blocos + zonas × (1 + reserva)",
     q_mod % (tot("M", "P"), res), q_mod % (tot("M", "C"), res), "%s+%s+%s" % (PRECO["P33"], PRECO["P14"], PRECO["P09"])),
    ("Concentrador — PCB montada + fonte + gabinete", "estações × (1 + reserva)",
     q_mod % (tot("O", "P"), res), q_mod % (tot("O", "C"), res),
     "%s+%s+%s+%s" % (PRECO["P34"], PRECO["P06"], PRECO["P16"], PRECO["P17"])),
    ("Cabo de barramento + plugs (m)", "segmentos × metros (módulos em cadeia)",
     "=(%s+%s)*%s" % (tot("F", "P"), tot("M", "P"), REF["m_barr"]) ,
     "=(%s+%s)*%s" % (tot("F", "C"), tot("M", "C"), REF["m_barr"]), "%s+2*%s/%s" % (PRECO["P12"], PRECO["P11"], REF["m_barr"])),
    ("Canaleta, fixações, rede e switches", "igual à Arquitetura A",
     1, 1, None),
    ("Engenharia de projeto das PCBs (valor único)", "1 projeto", 1, 1, PRECO["P35"]),
    ("Instalação + comissionamento (h)", "estações × (h instalação + h testes)",
     "=%s*(%s+%s)" % (tot("O", "P"), REF["h_inst"], REF["h_comiss"]),
     "=%s*(%s+%s)" % (tot("O", "C"), REF["h_inst"], REF["h_comiss"]), REF["custo_hora"]),
]
r = 3
for nome, base, qp, qc, preco in t1:
    cel(wt, "A%d" % r, nome, wrap=True)
    cel(wt, "B%d" % r, base, wrap=True)
    cel(wt, "C%d" % r, qp, PRETO if str(qp).startswith("=") else AZUL, NUM)
    cel(wt, "D%d" % r, qc, PRETO if str(qc).startswith("=") else AZUL, NUM)
    if preco is None:      # infraestrutura reaproveitada da aba A-Interno (linhas 9 a 12)
        cel(wt, "E%d" % r, None)
        cel(wt, "F%d" % r, "=SUM('A-Interno'!F9:F12)", VERDE, BRL)
        cel(wt, "G%d" % r, "=SUM('A-Interno'!G9:G12)", VERDE, BRL)
    else:
        cel(wt, "E%d" % r, "=" + preco, VERDE, BRL)
        cel(wt, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
        cel(wt, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
    r += 1
T1_TOT = r
cel(wt, "A%d" % r, "TOTAL T1 — PCB própria (EMS)", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wt, "%s%d" % (col, r), None, fill=TOTAL)
cel(wt, "F%d" % r, "=SUM(F3:F%d)" % (r - 1), NEG, BRL, fill=TOTAL)
cel(wt, "G%d" % r, "=SUM(G3:G%d)" % (r - 1), NEG, BRL, fill=TOTAL)
r += 2
cel(wt, "A%d" % r, "T2 — Sistema PTL comercial importado (hardware pronto; software de integração continua interno)", SUB, borda=False)
r += 1
ini = r
t2 = [
    ("Módulos PTL 3 dígitos (alto giro 0-3)", "endereços × (1 + reserva)",
     q_mod % (tot("F", "P"), res), q_mod % (tot("F", "C"), res), PRECO["P29"]),
    ("Módulos PTL endereço + quantidade", "blocos + zonas × (1 + reserva)",
     q_mod % (tot("M", "P"), res), q_mod % (tot("M", "C"), res), PRECO["P30"]),
    ("Controlador/gateway PTL por estação", "estações", "=%s" % tot("O", "P"), "=%s" % tot("O", "C"), PRECO["P31"]),
    ("Fonte 12 V + gabinete por estação", "estações", "=%s" % tot("O", "P"), "=%s" % tot("O", "C"),
     "%s+%s+%s" % (PRECO["P06"], PRECO["P16"], PRECO["P17"])),
    ("Cabo de barramento + plugs (m)", "módulos em cadeia",
     "=(%s+%s)*%s" % (tot("F", "P"), tot("M", "P"), REF["m_barr"]),
     "=(%s+%s)*%s" % (tot("F", "C"), tot("M", "C"), REF["m_barr"]), "%s+2*%s/%s" % (PRECO["P12"], PRECO["P11"], REF["m_barr"])),
    ("Canaleta, fixações, rede e switches", "igual à Arquitetura A", 1, 1, None),
    ("Instalação + comissionamento (h)", "estações × (h instalação + h testes)",
     "=%s*(%s+%s)" % (tot("O", "P"), REF["h_inst"], REF["h_comiss"]),
     "=%s*(%s+%s)" % (tot("O", "C"), REF["h_inst"], REF["h_comiss"]), REF["custo_hora"]),
]
for nome, base, qp, qc, preco in t2:
    cel(wt, "A%d" % r, nome, wrap=True)
    cel(wt, "B%d" % r, base, wrap=True)
    cel(wt, "C%d" % r, qp, PRETO if str(qp).startswith("=") else AZUL, NUM)
    cel(wt, "D%d" % r, qc, PRETO if str(qc).startswith("=") else AZUL, NUM)
    if preco is None:
        cel(wt, "E%d" % r, None)
        cel(wt, "F%d" % r, "=SUM('A-Interno'!F9:F12)", VERDE, BRL)
        cel(wt, "G%d" % r, "=SUM('A-Interno'!G9:G12)", VERDE, BRL)
    else:
        cel(wt, "E%d" % r, "=" + preco, VERDE, BRL)
        cel(wt, "F%d" % r, "=C%d*E%d" % (r, r), PRETO, BRL)
        cel(wt, "G%d" % r, "=D%d*E%d" % (r, r), PRETO, BRL)
    r += 1
T2_TOT = r
cel(wt, "A%d" % r, "TOTAL T2 — PTL comercial importado", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wt, "%s%d" % (col, r), None, fill=TOTAL)
cel(wt, "F%d" % r, "=SUM(F%d:F%d)" % (ini, r - 1), NEG, BRL, fill=TOTAL)
cel(wt, "G%d" % r, "=SUM(G%d:G%d)" % (ini, r - 1), NEG, BRL, fill=TOTAL)
r += 2
cel(wt, "A%d" % r, "Valores em US$ convertidos por câmbio × fator de importação (aba Premissas). "
    "Itens de PTL comercial sem preço público devem ser cotados com fornecedores (ex.: ATOP, Aioi, fornecedores nacionais).",
    Font(name="Arial", size=9, italic=True), borda=False)

# =====================================================================
# 8. B-RFID
# =====================================================================
wb_ = wb.create_sheet("B-RFID")
cabecalho(wb_, 1, ["Item", "Base de cálculo", "Qtd piloto", "Qtd completo", "Preço unit. (R$)",
                   "Total piloto (R$)", "Total completo (R$)"], [46, 44, 12, 13, 15, 17, 18])
cel(wb_, "A2", "Arquitetura B = infraestrutura de displays da Arquitetura A + identificação da caixa por RFID", SUB, borda=False)
cel(wb_, "A3", "Infraestrutura de displays (Arquitetura A interna — peças + mão de obra)")
cel(wb_, "B3", "aba A-Interno")
cel(wb_, "F3", "='A-Interno'!F%d" % A_TOT, VERDE, BRL)
cel(wb_, "G3", "='A-Interno'!G%d" % A_TOT, VERDE, BRL)
for col in "CDE":
    cel(wb_, "%s3" % col, None)
cel(wb_, "A4", "Tags NFC nas caixas retornáveis (frota)")
cel(wb_, "B4", "frota de caixas (piloto: proporcional às estações)")
cel(wb_, "C4", "=ROUNDUP(%s*%s/%s,0)" % (REF["frota"], tot("O", "P"), tot("O", "C")), PRETO, NUM)
cel(wb_, "D4", "=%s" % REF["frota"], VERDE, NUM)
cel(wb_, "E4", "=" + UNIT["Tag por caixa (B)"], VERDE, BRL)
cel(wb_, "F4", "=C4*E4", PRETO, BRL)
cel(wb_, "G4", "=D4*E4", PRETO, BRL)
cel(wb_, "A5", "Associação tag ↔ caixa (cadastro inicial) (h)")
cel(wb_, "B5", "30 s por caixa")
cel(wb_, "C5", "=C4*30/3600", PRETO, NUM2)
cel(wb_, "D5", "=D4*30/3600", PRETO, NUM2)
cel(wb_, "E5", "=" + REF["custo_hora"], VERDE, BRL)
cel(wb_, "F5", "=C5*E5", PRETO, BRL)
cel(wb_, "G5", "=D5*E5", PRETO, BRL)
cel(wb_, "A7", "B1 — Pulseira NFC (montagem própria)", SUB, borda=False)
cel(wb_, "A8", "Pulseiras NFC (ESP32-C3 + PN532 + bateria)")
cel(wb_, "B8", "estações × pulseiras por estação")
cel(wb_, "C8", "=ROUNDUP(%s*%s,0)" % (tot("O", "P"), REF["pulseiras_por_est"]), PRETO, NUM)
cel(wb_, "D8", "=ROUNDUP(%s*%s,0)" % (tot("O", "C"), REF["pulseiras_por_est"]), PRETO, NUM)
cel(wb_, "E8", "=" + UNIT["Pulseira RFID (B1)"], VERDE, BRL)
cel(wb_, "F8", "=C8*E8", PRETO, BRL)
cel(wb_, "G8", "=D8*E8", PRETO, BRL)
cel(wb_, "A9", "Montagem das pulseiras (h)")
cel(wb_, "B9", "1,5 h por pulseira")
cel(wb_, "C9", "=C8*1.5", PRETO, NUM2)
cel(wb_, "D9", "=D8*1.5", PRETO, NUM2)
cel(wb_, "E9", "=" + REF["custo_hora"], VERDE, BRL)
cel(wb_, "F9", "=C9*E9", PRETO, BRL)
cel(wb_, "G9", "=D9*E9", PRETO, BRL)
cel(wb_, "A10", "TOTAL B1 — displays + tags + pulseiras", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wb_, "%s10" % col, None, fill=TOTAL)
cel(wb_, "F10", "=F3+F4+F5+F8+F9", NEG, BRL, fill=TOTAL)
cel(wb_, "G10", "=G3+G4+G5+G8+G9", NEG, BRL, fill=TOTAL)
cel(wb_, "A12", "B2 — Leitor fixo na estação + painel (sem item no corpo do operador)", SUB, borda=False)
cel(wb_, "A13", "Leitor PN532 + LCD 20×4 + botão Fechar")
cel(wb_, "B13", "1 por estação (ligado ao concentrador)")
cel(wb_, "C13", "=%s" % tot("O", "P"), PRETO, NUM)
cel(wb_, "D13", "=%s" % tot("O", "C"), PRETO, NUM)
cel(wb_, "E13", "=" + UNIT["Leitor fixo + painel (B2)"], VERDE, BRL)
cel(wb_, "F13", "=C13*E13", PRETO, BRL)
cel(wb_, "G13", "=D13*E13", PRETO, BRL)
cel(wb_, "A14", "Montagem e instalação do leitor (h)")
cel(wb_, "B14", "2 h por estação")
cel(wb_, "C14", "=C13*2", PRETO, NUM2)
cel(wb_, "D14", "=D13*2", PRETO, NUM2)
cel(wb_, "E14", "=" + REF["custo_hora"], VERDE, BRL)
cel(wb_, "F14", "=C14*E14", PRETO, BRL)
cel(wb_, "G14", "=D14*E14", PRETO, BRL)
cel(wb_, "A15", "TOTAL B2 — displays + tags + leitor fixo", NEG, fill=TOTAL)
for col in "BCDE":
    cel(wb_, "%s15" % col, None, fill=TOTAL)
cel(wb_, "F15", "=F3+F4+F5+F13+F14", NEG, BRL, fill=TOTAL)
cel(wb_, "G15", "=G3+G4+G5+G13+G14", NEG, BRL, fill=TOTAL)
cel(wb_, "A17", "Referência de mercado — leitor de pulso comercial")
cel(wb_, "B17", "FEIG HyWEAR (UHF) por operador — não lê NFC; exigiria tags UHF")
cel(wb_, "C17", "=C8", PRETO, NUM)
cel(wb_, "D17", "=D8", PRETO, NUM)
cel(wb_, "E17", "=" + PRECO["P36"], VERDE, BRL)
cel(wb_, "F17", "=C17*E17", PRETO, BRL)
cel(wb_, "G17", "=D17*E17", PRETO, BRL)
cel(wb_, "A19", "Coletores MovFast já existentes não entram no custo (Arquitetura A). Na Arquitetura B eles deixam de ser "
    "necessários na separação, mas continuam disponíveis para as demais operações.",
    Font(name="Arial", size=9, italic=True), borda=False)

# =====================================================================
# 9. SOFTWARE
# =====================================================================
wsw = wb.create_sheet("Software")
cabecalho(wsw, 1, ["Componente", "Arquitetura", "Horas estimadas", "Custo (R$)", "Observação"], [46, 14, 15, 16, 70])
sw = [
    ("Serviço PTL (API REST + MQTT + regras de separação)", "A e B", 240, "Núcleo: abre/fecha caixa, divide por estação/zona, ordena pela rota"),
    ("Integração Sybase ASE (tabelas PTL, views, procedures)", "A e B", 120, "Leitura de itens da caixa e gravação de eventos/log"),
    ("Integração API do sistema BHT (informações da caixa)", "A e B", 60, "Consulta da caixa e, se possível, liberação para a próxima estação"),
    ("App coletor Android (A1 — app próprio)", "A", 160, "Leitura com gatilho para abrir/fechar, progresso da caixa"),
    ("Tela no WMS PowerBuilder para o coletor (A2)", "A", 80, "Alternativa ao app; grava a leitura em tabela consumida pelo serviço"),
    ("Firmware do concentrador (Ethernet + MQTT + 2 barramentos RS-485)", "A e B", 120, "Base no protótipo MicroPython já validado"),
    ("Firmware dos nós de coluna e módulos E+Q", "A e B", 100, "Protocolo de barramento, endereçamento, auto-teste"),
    ("Leitura RFID no concentrador + painel da estação (B2) / pulseira (B1)", "B", 80, "Somente Arquitetura B"),
    ("Painel de monitoramento (gestão e TI)", "A e B", 120, "Status das estações, módulos com falha, produtividade"),
    ("Testes integrados, piloto e homologação", "A e B", 120, "Inclui ajustes no piloto (estações 05 e 27)"),
    ("Documentação e treinamento", "A e B", 40, "Operação, manutenção e suporte"),
]
for i, (comp, arq, h, obs) in enumerate(sw, 2):
    cel(wsw, "A%d" % i, comp, wrap=True)
    cel(wsw, "B%d" % i, arq)
    cel(wsw, "C%d" % i, h, AZUL, NUM, fill=AMARELO)
    cel(wsw, "D%d" % i, "=C%d*%s" % (i, REF["custo_hora_dev"]), PRETO, BRL0)
    cel(wsw, "E%d" % i, obs, wrap=True)
n = len(sw) + 2
cel(wsw, "A%d" % n, "TOTAL — Arquitetura A com app próprio (sem tela WMS e sem itens só da B)", NEG, fill=TOTAL)
cel(wsw, "B%d" % n, None, fill=TOTAL)
cel(wsw, "C%d" % n, '=SUMIF(B2:B%d,"A e B",C2:C%d)+C5' % (n - 1, n - 1), NEG, NUM, fill=TOTAL)
cel(wsw, "D%d" % n, "=C%d*%s" % (n, REF["custo_hora_dev"]), NEG, BRL0, fill=TOTAL)
cel(wsw, "E%d" % n, "Com a tela no WMS (A2) no lugar do app, troque 160 h por 80 h.", wrap=True, fill=TOTAL)
cel(wsw, "A%d" % (n + 1), "TOTAL — Arquitetura B", NEG, fill=TOTAL)
cel(wsw, "B%d" % (n + 1), None, fill=TOTAL)
cel(wsw, "C%d" % (n + 1), '=SUMIF(B2:B%d,"A e B",C2:C%d)+SUMIF(B2:B%d,"B",C2:C%d)' % (n - 1, n - 1, n - 1, n - 1), NEG, NUM, fill=TOTAL)
cel(wsw, "D%d" % (n + 1), "=C%d*%s" % (n + 1, REF["custo_hora_dev"]), NEG, BRL0, fill=TOTAL)
cel(wsw, "E%d" % (n + 1), None, fill=TOTAL)
SW_A, SW_B = n, n + 1

# =====================================================================
# 10. RESUMO
# =====================================================================
wr = wb.create_sheet("Resumo")
cabecalho(wr, 3, ["Cenário", "Descrição", "Piloto (R$)", "Operação completa (R$)", "Por estação — completo (R$)"],
          [40, 62, 17, 21, 21])
cel(wr, "A1", "Resumo do orçamento — Pick-to-Light", TIT, borda=False)
cel(wr, "A2", "Piloto: estações marcadas 'S' na aba Estações (padrão 05 e 27). Valores de hardware; software na última linha.",
    Font(name="Arial", size=9, italic=True), borda=False)
cen = [
    ("A — Interno, só peças (12 V)", "Peças para toda a operação, montagem própria", "'A-Interno'!F%d" % A_PECAS, "'A-Interno'!G%d" % A_PECAS),
    ("A — Interno, só peças (variante 5 V)", "Sem reguladores, fonte 5 V, mais cabo de força", "'A-Interno'!F%d" % A_5V, "'A-Interno'!G%d" % A_5V),
    ("A — Interno, peças + mão de obra", "Montagem, instalação e comissionamento internos", "'A-Interno'!F%d" % A_TOT, "'A-Interno'!G%d" % A_TOT),
    ("A — Terceiros T1 (PCB própria via EMS)", "Placas próprias fabricadas/montadas por terceiros + instalação",
     "'A-Terceiros'!F%d" % T1_TOT, "'A-Terceiros'!G%d" % T1_TOT),
    ("A — Terceiros T2 (PTL comercial importado)", "Hardware PTL pronto + instalação",
     "'A-Terceiros'!F%d" % T2_TOT, "'A-Terceiros'!G%d" % T2_TOT),
    ("B1 — RFID com pulseira", "Displays (A interno) + tags + pulseiras NFC", "'B-RFID'!F10", "'B-RFID'!G10"),
    ("B2 — RFID com leitor fixo na estação", "Displays (A interno) + tags + leitor fixo e painel", "'B-RFID'!F15", "'B-RFID'!G15"),
    ("Opcional — guia de coluna no baixo giro", "1 LED por prédio do fundo", "'A-Interno'!F%d" % A_GUIA, "'A-Interno'!G%d" % A_GUIA),
]
for i, (nome, desc, fp, fc) in enumerate(cen, 4):
    cel(wr, "A%d" % i, nome, NEG)
    cel(wr, "B%d" % i, desc, wrap=True)
    cel(wr, "C%d" % i, "=" + fp, VERDE, BRL0)
    cel(wr, "D%d" % i, "=" + fc, VERDE, BRL0)
    cel(wr, "E%d" % i, "=D%d/%s" % (i, tot("O", "C")), PRETO, BRL0)
n = len(cen) + 4
cel(wr, "A%d" % (n + 1), "Desenvolvimento de software (interno)", SUB, borda=False)
cel(wr, "A%d" % (n + 2), "Arquitetura A (app próprio)", NEG)
cel(wr, "B%d" % (n + 2), "=\"Horas: \"&TEXT(Software!C%d,\"#,##0\")" % SW_A, PRETO)
cel(wr, "D%d" % (n + 2), "=Software!D%d" % SW_A, VERDE, BRL0)
cel(wr, "A%d" % (n + 3), "Arquitetura B", NEG)
cel(wr, "B%d" % (n + 3), "=\"Horas: \"&TEXT(Software!C%d,\"#,##0\")" % SW_B, PRETO)
cel(wr, "D%d" % (n + 3), "=Software!D%d" % SW_B, VERDE, BRL0)
cel(wr, "A%d" % (n + 5), "Volume da operação (informado): ~3.000 volumes/dia e 250.000 a 270.000 produtos separados por dia.",
    Font(name="Arial", size=9, italic=True), borda=False)
wr.freeze_panes = "A4"
wb.move_sheet("Resumo", offset=-(len(wb.sheetnames) - 2))

for w in wb.worksheets:
    w.sheet_view.showGridLines = False
wb.save(SAIDA)
print("ok", SAIDA)
