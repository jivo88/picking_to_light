"""Gera Orcamento_POC_PTL.xlsx: orçamento enxuto só da POC (bancada + estações 04 e 27, Arquitetura A, coletor).

Lê as quantidades do piloto e os preços do orçamento completo (Orcamento_PTL.xlsx, já recalculado) e monta uma
planilha independente, com fórmulas. Uso: python3 gerar_orcamento_poc.py [completo.xlsx] [saida.xlsx]
"""
import sys
from pathlib import Path
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BASE = Path(__file__).resolve().parent.parent
ORIG = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "entregaveis" / "Orcamento_PTL.xlsx"
SAIDA = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "entregaveis" / "Orcamento_POC_PTL.xlsx"

src = openpyxl.load_workbook(ORIG, data_only=True)
ai, poc, est = src["A-Interno"], src["POC"], src["Estações"]
if ai["F21"].value is None:
    sys.exit("Orcamento_PTL.xlsx sem valores calculados: rode recalc.py nele antes.")

F = "Arial"
AZUL = Font(name=F, size=10, color="0000FF")
PRETO = Font(name=F, size=10)
VERDE = Font(name=F, size=10, color="008000")
NEG = Font(name=F, size=10, bold=True)
TIT = Font(name=F, size=14, bold=True, color="1F3864")
CAB = Font(name=F, size=10, bold=True, color="FFFFFF")
NOTA = Font(name=F, size=9, italic=True, color="595959")
F_CAB = PatternFill("solid", fgColor="1F3864")
F_SEC = PatternFill("solid", fgColor="D9E1F2")
F_TOT = PatternFill("solid", fgColor="FCE4D6")
F_CHAVE = PatternFill("solid", fgColor="FFFF00")
FINA = Side(style="thin", color="BFBFBF")
BORDA = Border(left=FINA, right=FINA, top=FINA, bottom=FINA)
BRL = 'R$ #,##0.00;(R$ #,##0.00);"-"'
NUM = '#,##0.##;(#,##0.##);"-"'
PCT = '0.0%;(0.0%);"-"'

wb = openpyxl.Workbook()


def larguras(ws, ls):
    for i, w in enumerate(ls, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def put(ws, ref, v, fonte=PRETO, fmt=None, fill=None, borda=True, wrap=False, alin=None):
    c = ws[ref]
    c.value = v
    c.font = fonte
    if fmt:
        c.number_format = fmt
    if fill:
        c.fill = fill
    if borda:
        c.border = BORDA
    c.alignment = Alignment(wrap_text=wrap, vertical="top", horizontal=alin)
    return c


def cabecalho(ws, r, tit):
    for i, t in enumerate(tit, 1):
        c = ws.cell(row=r, column=i, value=t)
        c.font, c.fill, c.border = CAB, F_CAB, BORDA
        c.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[r].height = 30


def secao(ws, r, texto, ncol=5):
    for i in range(1, ncol + 1):
        ws.cell(row=r, column=i).fill = F_SEC
        ws.cell(row=r, column=i).border = BORDA
    ws.cell(row=r, column=1, value=texto).font = NEG


def total(ws, r, rotulo, formula, ncol=5, col="E"):
    for i in range(1, ncol + 1):
        ws.cell(row=r, column=i).fill = F_TOT
        ws.cell(row=r, column=i).border = BORDA
    ws.cell(row=r, column=1, value=rotulo).font = NEG
    put(ws, f"{col}{r}", formula, NEG, BRL, F_TOT)


def item(ws, r, nome, base, qtd, preco, fonte_preco=AZUL, fmt_q=NUM):
    put(ws, f"A{r}", nome, wrap=True)
    put(ws, f"B{r}", base, wrap=True)
    put(ws, f"C{r}", qtd, AZUL if not str(qtd).startswith("=") else PRETO, fmt_q)
    put(ws, f"D{r}", preco, fonte_preco, BRL)
    put(ws, f"E{r}", f"=C{r}*D{r}", PRETO, BRL)


# ---------------------------------------------------------------- Premissas
wp = wb.active
wp.title = "Premissas"
larguras(wp, [46, 16, 70])
put(wp, "A1", "Premissas da POC", TIT, borda=False)
put(wp, "A2", "Células em azul são entradas; as de fundo amarelo são as premissas principais. Os valores vêm do "
              "orçamento completo (Orcamento_PTL.xlsx) e podem ser alterados aqui.", NOTA, borda=False, wrap=True)
wp.merge_cells("A2:C2")
wp.row_dimensions[2].height = 28
cabecalho(wp, 4, ["Premissa", "Valor", "Origem / observação"])
PREM = [  # chave, rótulo, valor, formato, nota
    ("hora_int", "Custo da hora da equipe interna (R$/h)", ai["E24"].value, BRL,
     "salário + encargos de técnico de manutenção ÷ horas produtivas (aba Premissas do orçamento completo)"),
    ("hora_op", "Custo da hora do operador (R$/h)", ai["E30"].value, BRL, "usado no treinamento dos operadores"),
    ("hora_sw", "Custo da hora de desenvolvimento (R$/h)", poc["D32"].value, BRL,
     "equipe interna de TI (aba Software do orçamento completo)"),
    ("frete", "Frete das compras (% sobre os itens)", ai["E20"].value, PCT, "estimativa média de frete de e-commerce"),
    ("conting", "Contingência (% sobre o hardware)", poc["D28"].value, PCT, "reserva para itens não previstos na POC"),
]
REF = {}
for i, (k, rot, v, fmt, nota) in enumerate(PREM):
    r = 5 + i
    put(wp, f"A{r}", rot)
    put(wp, f"B{r}", v, AZUL, fmt, F_CHAVE if k in ("conting", "hora_int") else None)
    put(wp, f"C{r}", nota, NOTA, wrap=True)
    REF[k] = f"Premissas!$B${r}"
we = wb.create_sheet("Estações")
larguras(we, [36, 26, 26])
put(we, "A1", "Estações da POC", TIT, borda=False)
r = 2
cabecalho(we, r + 1, ["Item", "Estação 04 · Medicamento", "Estação 27 · Perfumaria"])
wp = we   # a tabela abaixo vai na aba Estações
cab_est = [c.value for c in est[1]]
lin = {row[0]: row for row in est.iter_rows(min_row=2, values_only=True) if row[0] in ("04", "27")}
CAMPOS = [("Total de endereços", "Total de endereços"), ("Módulos Q (alto giro 0-3)", "Alto giro 0-3\n(Módulos Q)"),
          ("Endereços alto giro 4-5", "Alto giro 4-5\n(endereços)"), ("E+Q alto giro 4-5 (2 zonas)", "E+Q alto giro\n4-5 (2 zonas)"),
          ("Endereços baixo giro", "Baixo giro\n(endereços)"), ("Zonas baixo giro (E+Q)", "Zonas baixo giro\n(E+Q)"),
          ("Nós de coluna", "Nós de coluna"), ("Concentrador", "Concentrador")]
for j, (rot, chave) in enumerate(CAMPOS):
    rr = r + 2 + j
    ci = cab_est.index(chave)
    put(wp, f"A{rr}", rot)
    put(wp, f"B{rr}", lin["04"][ci], AZUL, NUM, alin="left")
    put(wp, f"C{rr}", lin["27"][ci], AZUL, NUM, alin="left")
rr = r + 2 + len(CAMPOS)
put(wp, f"A{rr + 1}", "Fonte: tabela wms_endereco de 23/10/2026. As quantidades de compra do piloto incluem 10% de reserva "
                     "(arredondado para cima), como no orçamento completo.", NOTA, borda=False, wrap=True)
wp.merge_cells(f"A{rr + 1}:C{rr + 1}")
wp.row_dimensions[rr + 1].height = 28

# ---------------------------------------------------------------- Fase 1, bancada
w1 = wb.create_sheet("Fase 1 - Bancada")
larguras(w1, [46, 52, 10, 16, 16])
put(w1, "A1", "Fase 1: bancada de testes", TIT, borda=False)
put(w1, "A2", "1 coluna de alto giro e 1 zona de cada tipo, montada em painel de MDF. Valida hardware, firmware e software "
              "antes de entrar nas estações.", NOTA, borda=False, wrap=True)
w1.merge_cells("A2:E2")
w1.row_dimensions[2].height = 28
cabecalho(w1, 4, ["Item", "Base de cálculo", "Qtd", "Preço unit. (R$)", "Total (R$)"])
r = 5
F1 = {}
for rp in range(5, 16):   # itens da bancada na aba POC do orçamento completo
    nome, base, q, p = (poc.cell(row=rp, column=c).value for c in range(1, 5))
    item(w1, r, nome, base or "", q, p)
    F1[nome] = r
    r += 1
ult_itens = r - 1
put(w1, f"A{r}", "Frete das compras")
put(w1, f"B{r}", "% sobre os itens acima (aba Premissas)", wrap=True)
put(w1, f"C{r}", None)
put(w1, f"D{r}", f"={REF['frete']}", VERDE, PCT)
put(w1, f"E{r}", f"=SUM(E5:E{ult_itens})*D{r}", PRETO, BRL)
r_frete1 = r
r += 1
for rp in (17, 18):       # horas de montagem e testes
    nome, base, q, _ = (poc.cell(row=rp, column=c).value for c in range(1, 5))
    item(w1, r, nome, base or "", q, f"={REF['hora_int']}", VERDE)
    r += 1
total(w1, r, "TOTAL FASE 1, bancada", f"=SUM(E5:E{r - 1})")
R_F1 = r
F1_MODULOS = [F1[k] for k in F1 if k.startswith(("Concentrador", "Nó de coluna", "Módulos Q", "Módulos E+Q"))]
F1_FERR = [F1[k] for k in F1 if k.startswith(("Ferramentas", "Bancada de eletrônica"))]

# ---------------------------------------------------------------- Fase 2, estações 04 e 27
w2 = wb.create_sheet("Fase 2 - Estações")
larguras(w2, [46, 60, 10, 16, 16])
put(w2, "A1", "Fase 2: instalação nas estações 04 e 27", TIT, borda=False)
put(w2, "A2", "Quantidades das duas estações juntas (com reserva). O concentrador, o nó e os módulos da bancada são "
              "reaproveitados na estação 04, e as ferramentas já foram compradas na fase 1: os dois são descontados no fim.",
    NOTA, borda=False, wrap=True)
w2.merge_cells("A2:E2")
w2.row_dimensions[2].height = 28
cabecalho(w2, 4, ["Item", "Base de cálculo", "Qtd", "Preço unit. (R$)", "Total (R$)"])
secao(w2, 5, "Materiais e infraestrutura")
r = 6
for ra in range(3, 20):
    nome, base, q, _, p = (ai.cell(row=ra, column=c).value for c in range(1, 6))
    item(w2, r, nome, base or "", q, p)
    r += 1
ult = r - 1
put(w2, f"A{r}", "Frete das compras")
put(w2, f"B{r}", "% sobre os materiais acima (aba Premissas)")
put(w2, f"C{r}", None)
put(w2, f"D{r}", f"={REF['frete']}", VERDE, PCT)
put(w2, f"E{r}", f"=SUM(E6:E{ult})*D{r}", PRETO, BRL)
r += 1
total(w2, r, "Subtotal materiais", f"=SUM(E6:E{r - 1})")
R_MAT = r
r += 2
secao(w2, r, "Mão de obra interna e treinamento")
r += 1
ini_mo = r
for ra in range(24, 32):
    nome, base, q, _, _ = (ai.cell(row=ra, column=c).value for c in range(1, 6))
    hora = REF["hora_op"] if "operadores" in nome else REF["hora_int"]
    item(w2, r, nome, base or "", q, f"={hora}", VERDE)
    r += 1
total(w2, r, "Subtotal mão de obra e treinamento", f"=SUM(E{ini_mo}:E{r - 1})")
R_MO = r
r += 2
secao(w2, r, "Descontos (já comprados na fase 1)")
r += 1
put(w2, f"A{r}", "(−) Ferramentas já compradas na fase 1")
put(w2, f"B{r}", "kit de rede + bancada de eletrônica, com frete", wrap=True)
put(w2, f"C{r}", None)
put(w2, f"D{r}", None)
put(w2, f"E{r}", "=-(" + "+".join(f"'Fase 1 - Bancada'!E{x}" for x in F1_FERR) + f")*(1+{REF['frete']})", VERDE, BRL)
r_d1 = r
r += 1
put(w2, f"A{r}", "(−) Módulos da bancada reaproveitados na estação 04")
put(w2, f"B{r}", "concentrador, nó, 4 módulos Q e 2 E+Q", wrap=True)
put(w2, f"C{r}", None)
put(w2, f"D{r}", None)
put(w2, f"E{r}", "=-(" + "+".join(f"'Fase 1 - Bancada'!E{x}" for x in F1_MODULOS) + ")", VERDE, BRL)
r += 1
total(w2, r, "TOTAL FASE 2, estações 04 e 27", f"=E{R_MAT}+E{R_MO}+E{r_d1}+E{r - 1}")
R_F2 = r

# ---------------------------------------------------------------- Software
ws_ = wb.create_sheet("Software")
larguras(ws_, [46, 56, 10, 16, 16])
put(ws_, "A1", "Software da POC (equipe interna, versão mínima)", TIT, borda=False)
put(ws_, "A2", "Horas da equipe interna. É a primeira parte do software do projeto completo, não um custo a mais; "
               "não entra no desembolso de hardware.", NOTA, borda=False, wrap=True)
ws_.merge_cells("A2:E2")
ws_.row_dimensions[2].height = 28
cabecalho(ws_, 4, ["Entrega", "O que inclui", "Horas", "R$/h", "Custo (R$)"])
r = 5
for rp in range(32, 38):
    nome, base, q, _ = (poc.cell(row=rp, column=c).value for c in range(1, 5))
    item(ws_, r, nome, base or "", q, f"={REF['hora_sw']}", VERDE)
    r += 1
for i in range(1, 6):
    ws_.cell(row=r, column=i).fill = F_TOT
    ws_.cell(row=r, column=i).border = BORDA
ws_.cell(row=r, column=1, value="TOTAL SOFTWARE DA POC").font = NEG
put(ws_, f"C{r}", f"=SUM(C5:C{r - 1})", NEG, NUM, F_TOT)
put(ws_, f"E{r}", f"=SUM(E5:E{r - 1})", NEG, BRL, F_TOT)
R_SW = r

# ---------------------------------------------------------------- Resumo (primeira aba)
wr = wb.create_sheet("Resumo", 0)
larguras(wr, [52, 20, 62])
put(wr, "A1", "POC Pick-to-Light: bancada + estações 04 e 27", TIT, borda=False)
put(wr, "A2", "Arquitetura A (módulos próprios 12 V, barramento RS-485), confirmação pelo coletor. Leitor fixo fora do "
              "projeto; identificação por RFID fica como melhoria futura.", NOTA, borda=False, wrap=True)
wr.merge_cells("A2:C2")
wr.row_dimensions[2].height = 28
cabecalho(wr, 4, ["Item", "Valor", "Observação"])
LR = [
    ("Fase 1, bancada", f"='Fase 1 - Bancada'!E{R_F1}", "compra das peças, montagem e testes de bancada"),
    ("Fase 2, estações 04 e 27", f"='Fase 2 - Estações'!E{R_F2}", "materiais, instalação e treinamento, menos o que veio da bancada"),
    ("Hardware da POC", "=B5+B6", None),
    ("Contingência", f"=B7*{REF['conting']}", "percentual na aba Premissas"),
    ("HARDWARE DA POC COM CONTINGÊNCIA (desembolso)", "=B7+B8", "valor para aprovação"),
]
for i, (rot, f, nota) in enumerate(LR):
    r = 5 + i
    tot = rot.startswith(("Hardware", "HARDWARE"))
    put(wr, f"A{r}", rot, NEG if tot else PRETO, fill=F_TOT if rot.startswith("HARDWARE") else None)
    put(wr, f"B{r}", f, VERDE if "!" in f else (NEG if tot else PRETO), BRL, F_TOT if rot.startswith("HARDWARE") else None)
    put(wr, f"C{r}", nota, NOTA, wrap=True, fill=F_TOT if rot.startswith("HARDWARE") else None)
r = 11
put(wr, f"A{r}", "Software da POC (horas da equipe interna)")
put(wr, f"B{r}", f"=Software!C{R_SW}", VERDE, '#,##0" h"')
put(wr, f"C{r}", "não é desembolso; é a primeira parte do software do projeto", NOTA, wrap=True)
put(wr, f"A{r + 1}", "Software da POC (custo interno)")
put(wr, f"B{r + 1}", f"=Software!E{R_SW}", VERDE, BRL)
put(wr, f"C{r + 1}", None)
put(wr, "A14", "Prazo estimado", NEG, borda=False)
for i, (fase, prazo) in enumerate([("Fase 1: compra, montagem, firmware e testes de bancada", "3 a 4 semanas"),
                                   ("Fase 2: instalação nas estações 04 e 27", "1 semana"),
                                   ("Operação assistida: medição de erro e caixas por hora", "4 semanas"),
                                   ("Decisão sobre as 40 estações", "semana 10")]):
    put(wr, f"A{15 + i}", fase)
    put(wr, f"B{15 + i}", prazo, AZUL)
put(wr, "A20", "Abas: Fase 1 - Bancada · Fase 2 - Estações · Software · Premissas (entradas em azul). Valores em reais, "
               "preços de mercado pesquisados em outubro de 2026.", NOTA, borda=False, wrap=True)
wr.merge_cells("A20:C20")
wr.row_dimensions[20].height = 28

for w in wb.worksheets:
    w.sheet_view.showGridLines = False
    w.page_setup.orientation = "landscape"
    w.page_setup.fitToWidth, w.page_setup.fitToHeight = 1, 0
    w.sheet_properties.pageSetUpPr.fitToPage = True
    w.freeze_panes = "A5" if w.title not in ("Resumo", "Estações") else None
wb.save(SAIDA)
print("ok", SAIDA)
