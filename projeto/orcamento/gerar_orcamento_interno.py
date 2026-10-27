"""Gera Orcamento_Projeto_Interno_PTL.xlsx: projeto inteiro (40 estações) feito pela equipe interna, Arquitetura A 12 V,
com a aba de projeção do RFID (custo de implantação, etapas e ganho/retorno). Sem software (só hardware, instalação e
treinamento).

Lê quantidades e preços do orçamento completo (Orcamento_PTL.xlsx, já recalculado).
Uso: python3 gerar_orcamento_interno.py [completo.xlsx] [saida.xlsx]
"""
import sys
from pathlib import Path
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BASE = Path(__file__).resolve().parent.parent
ORIG = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "entregaveis" / "Orcamento_PTL.xlsx"
SAIDA = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "entregaveis" / "Orcamento_Projeto_Interno_PTL.xlsx"

src = openpyxl.load_workbook(ORIG, data_only=True)
ai, rf, est, pr = src["A-Interno"], src["RFID-futuro"], src["Estações"], src["Premissas"]
if ai["G21"].value is None:
    sys.exit("Orcamento_PTL.xlsx sem valores calculados: rode recalc.py nele antes.")


def premissa(rotulo_inicio):
    for row in pr.iter_rows(min_row=2, values_only=True):
        if row[0] and str(row[0]).startswith(rotulo_inicio):
            return row[1]
    raise KeyError(rotulo_inicio)


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
INT = '#,##0;(#,##0);"-"'
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


def faixa(ws, r, ncol, rotulo):
    for i in range(1, ncol + 1):
        ws.cell(row=r, column=i).fill = F_TOT
        ws.cell(row=r, column=i).border = BORDA
    ws.cell(row=r, column=1, value=rotulo).font = NEG


def nota(ws, r, texto, ate="E", altura=28):
    put(ws, f"A{r}", texto, NOTA, borda=False, wrap=True)
    ws.merge_cells(f"A{r}:{ate}{r}")
    ws.row_dimensions[r].height = altura


def item(ws, r, nome, base, qtd, preco, fonte_preco=AZUL, fmt_q=NUM):
    put(ws, f"A{r}", nome, wrap=True)
    put(ws, f"B{r}", base, wrap=True)
    put(ws, f"C{r}", qtd, PRETO if str(qtd).startswith("=") else AZUL, fmt_q)
    put(ws, f"D{r}", preco, fonte_preco, BRL)
    put(ws, f"E{r}", f"=C{r}*D{r}", PRETO, BRL)


# ================================================================ Premissas
wp = wb.active
wp.title = "Premissas"
larguras(wp, [58, 16, 12, 70])
put(wp, "A1", "Premissas", TIT, borda=False)
nota(wp, 2, "Entradas em azul; fundo amarelo = premissas principais. Valores do orçamento completo (Orcamento_PTL.xlsx), "
            "fontes na coluna D. Alterar aqui recalcula as outras abas.", ate="D")
cabecalho(wp, 4, ["Premissa", "Valor", "Unidade", "Fonte / observação"])
REF = {}
r = 5


def bloco(titulo, itens):
    global r
    secao(wp, r, titulo, 4)
    r += 1
    for k, rot, v, fmt, un, fonte, chave in itens:
        put(wp, f"A{r}", rot, wrap=True)
        put(wp, f"B{r}", v, AZUL, fmt, F_CHAVE if chave else None)
        put(wp, f"C{r}", un)
        put(wp, f"D{r}", fonte, NOTA, wrap=True)
        REF[k] = f"Premissas!$B${r}"
        r += 1
    r += 1


bloco("Custos e percentuais", [
    ("hora_tec", "Custo-hora da equipe interna (técnico)", premissa("Custo-hora técnico"), BRL, "R$/h",
     "salário médio de técnico eletrônico (salario.com.br, CAGED 08/10/2026) × 2 de encargos ÷ 163 h", True),
    ("hora_op", "Custo-hora do operador da estação", premissa("Custo-hora operador"), BRL, "R$/h",
     "salário médio de auxiliar de logística (salario.com.br, CAGED 08/10/2026) × 2 de encargos ÷ 163 h", True),
    ("frete", "Frete das compras", premissa("Frete das compras"), PCT, "%", "estimativa sobre peças e infraestrutura", False),
    ("conting", "Contingência do projeto", premissa("Contingência do projeto"), PCT, "%",
     "imprevistos de instalação e variação de preço", True),
])
bloco("RFID (melhoria futura): implantação", [
    ("frota", "Frota de caixas retornáveis", premissa("Frota de caixas"), INT, "caixas",
     "estimativa: ~1,7 × 3.000 volumes/dia. CONFIRMAR com a operação", True),
    ("p_tag", "Tag NFC por caixa", rf["E3"].value, BRL, "R$/un", "orçamento completo, aba RFID-futuro", False),
    ("s_assoc", "Associação tag ↔ caixa (cadastro inicial)", 30, NUM, "s/caixa", "estimativa", False),
    ("pulseiras", "Pulseiras por estação", premissa("Pulseiras por estação"), NUM, "un",
     "2 por estação (uma carregando) + 10% de reserva", False),
    ("p_puls", "Pulseira NFC (ESP32-C3 + PN532 + bateria)", rf["E5"].value, BRL, "R$/un", "orçamento completo, aba RFID-futuro", False),
    ("p_carr", "Carregador USB das pulseiras (1 por estação)", rf["E6"].value, BRL, "R$/un", "orçamento completo, aba RFID-futuro", False),
    ("h_puls", "Montagem por pulseira", 1.5, NUM, "h/un", "estimativa", False),
])
bloco("RFID (melhoria futura): ganho", [
    ("vol_dia", "Volumes por dia (as duas linhas)", 3000, INT, "volumes", "informado pela operação", True),
    ("est_vol", "Estações visitadas por volume (média)", 12, NUM, "estações",
     "simulador, aba Operação completa: 20 itens por volume espalhados pelas 20 estações da linha", True),
    ("leit", "Leituras de etiqueta por visita", 2, INT, "leituras", "abrir e fechar a caixa na estação", False),
    ("s_leit", "Tempo economizado por leitura com a pulseira", 1.5, NUM, "s",
     "PREMISSA A MEDIR NA POC: pegar o coletor, mirar e apertar o gatilho × encostar a mão na caixa", True),
    ("dias", "Dias de operação por mês", 22, INT, "dias", "CONFIRMAR com a operação", False),
])
nota(wp, r, "O ganho do RFID é tempo de operador liberado. Ele vira economia em reais quando reduz hora extra ou pessoas, "
            "ou quando permite absorver mais volume com a mesma equipe.", ate="D")

# ================================================================ Estações
we = wb.create_sheet("Estações")
cab_est = [c.value for c in est[1]]
CAMPOS = [("Estação (rua)", "Rua (estação)"), ("Segmento", "Segmento"), ("Endereços", "Total de endereços"),
          ("Módulos Q\n(alto giro 0-3)", "Alto giro 0-3\n(Módulos Q)"), ("Nós de coluna", "Nós de coluna"),
          ("E+Q andares 4-5", "E+Q alto giro\n4-5 (2 zonas)"), ("E+Q zonas\nbaixo giro", "Zonas baixo giro\n(E+Q)"),
          ("Concentrador", "Concentrador")]
larguras(we, [12, 16, 12, 14, 12, 14, 14, 14])
put(we, "A1", "Estações (40)", TIT, borda=False)
nota(we, 2, "Fonte: tabela wms_endereco de 23/10/2026. As quantidades de compra na aba Projeto somam estas colunas "
            "com 10% de reserva.", ate="H")
cabecalho(we, 4, [c for c, _ in CAMPOS])
we.row_dimensions[4].height = 42
linhas = sorted((row for row in est.iter_rows(min_row=2, values_only=True) if row[0] and str(row[0]).isdigit()),
                key=lambda x: x[0])
for i, row in enumerate(linhas):
    rr = 5 + i
    for j, (_, chave) in enumerate(CAMPOS):
        v = row[cab_est.index(chave)]
        put(we, f"{get_column_letter(j + 1)}{rr}", v, AZUL if j >= 2 else PRETO, INT if j >= 2 else None,
            alin="left" if j < 2 else None)
ult_est = 5 + len(linhas) - 1
rt = ult_est + 1
faixa(we, rt, 8, "Total")
for j in range(2, 8):
    col = get_column_letter(j + 1)
    put(we, f"{col}{rt}", f"=SUM({col}5:{col}{ult_est})", NEG, INT, F_TOT)
R_EST_TOT = rt
we.freeze_panes = "A5"

# ================================================================ Projeto (40 estações)
wj = wb.create_sheet("Projeto")
larguras(wj, [46, 62, 11, 16, 17])
put(wj, "A1", "Projeto inteiro: 40 estações, equipe interna", TIT, borda=False)
nota(wj, 2, "Arquitetura A (12 V): módulos montados pela equipe interna, concentrador por estação e barramento RS-485. "
            "Quantidades com 10% de reserva. Software fora desta planilha.")
cabecalho(wj, 4, ["Item", "Base de cálculo", "Qtd", "Preço unit. (R$)", "Total (R$)"])
secao(wj, 5, "Materiais e infraestrutura")
r = 6
for ra in range(3, 20):
    nome, base, _, qc, p = (ai.cell(row=ra, column=c).value for c in range(1, 6))
    item(wj, r, nome, base or "", qc, p)
    r += 1
ult = r - 1
put(wj, f"A{r}", "Frete das compras")
put(wj, f"B{r}", "% sobre os materiais acima (aba Premissas)")
put(wj, f"C{r}", None)
put(wj, f"D{r}", f"={REF['frete']}", VERDE, PCT)
put(wj, f"E{r}", f"=SUM(E6:E{ult})*D{r}", PRETO, BRL)
r += 1
faixa(wj, r, 5, "Subtotal materiais")
put(wj, f"E{r}", f"=SUM(E6:E{r - 1})", NEG, BRL, F_TOT)
R_MAT = r
r += 2
secao(wj, r, "Mão de obra interna e treinamento")
r += 1
ini = r
for ra in range(24, 32):
    nome, base, _, qc, _ = (ai.cell(row=ra, column=c).value for c in range(1, 6))
    hora = REF["hora_op"] if "operadores" in nome else REF["hora_tec"]
    item(wj, r, nome, base or "", qc, f"={hora}", VERDE)
    r += 1
faixa(wj, r, 5, "Subtotal mão de obra e treinamento")
put(wj, f"C{r}", f"=SUM(C{ini}:C{r - 1})", NEG, '#,##0" h"', F_TOT)
put(wj, f"E{r}", f"=SUM(E{ini}:E{r - 1})", NEG, BRL, F_TOT)
R_MO = r
r += 2
faixa(wj, r, 5, "TOTAL DO PROJETO (materiais + mão de obra)")
put(wj, f"E{r}", f"=E{R_MAT}+E{R_MO}", NEG, BRL, F_TOT)
R_PROJ = r
wj.freeze_panes = "A5"

# ================================================================ RFID futuro
wr = wb.create_sheet("RFID futuro")
larguras(wr, [46, 34, 14, 16, 16, 18, 20])
put(wr, "A1", "Projeção futura: identificação por RFID", TIT, borda=False)
nota(wr, 2, "Melhoria futura, fora do investimento inicial: tag NFC em cada caixa e pulseira no operador. A caixa abre e fecha "
            "quando o operador encosta a mão, sem o gatilho do coletor. O hardware e o software do projeto já ficam preparados. "
            "As cerca de 80 h de software do RFID não estão somadas, como no restante desta planilha.", ate="G", altura=42)

# --- 1. custo de implantação (40 estações)
secao(wr, 4, "1. Custo de implantação nas 40 estações", 7)
cabecalho(wr, 5, ["Item", "Base de cálculo", "Qtd", "Preço unit. (R$)", "Total (R$)", "", ""])
for col in "FG":
    wr[f"{col}5"].fill = PatternFill(None)
    wr[f"{col}5"].border = Border()
EST_TOT = f"'Estações'!$C${R_EST_TOT}"   # usado só para contar estações (40)
N_EST = f"COUNT('Estações'!$C$5:$C${ult_est})"
LIN_IMP = [
    ("Tags NFC nas caixas retornáveis", "frota de caixas", f"={REF['frota']}", f"={REF['p_tag']}"),
    ("Associação tag ↔ caixa (h)", "frota × segundos por caixa ÷ 3.600", f"={REF['frota']}*{REF['s_assoc']}/3600", f"={REF['hora_tec']}"),
    ("Pulseiras NFC", "estações × pulseiras por estação (arredondado para cima)", f"=ROUNDUP({N_EST}*{REF['pulseiras']},0)", f"={REF['p_puls']}"),
    ("Carregadores USB", "1 por estação", f"={N_EST}", f"={REF['p_carr']}"),
    ("Montagem das pulseiras (h)", "pulseiras × horas por pulseira", "=C8*{0}".format(REF["h_puls"]), f"={REF['hora_tec']}"),
]
r = 6
for nome, base, q, p in LIN_IMP:
    put(wr, f"A{r}", nome)
    put(wr, f"B{r}", base, wrap=True)
    put(wr, f"C{r}", q, PRETO, NUM)
    put(wr, f"D{r}", p, VERDE, BRL)
    put(wr, f"E{r}", f"=C{r}*D{r}", PRETO, BRL)
    r += 1
faixa(wr, r, 5, "Subtotal RFID")
put(wr, f"E{r}", f"=SUM(E6:E{r - 1})", NEG, BRL, F_TOT)
R_RF_SUB = r
r += 1
put(wr, f"A{r}", "Contingência")
put(wr, f"B{r}", "% da aba Premissas")
put(wr, f"C{r}", None)
put(wr, f"D{r}", f"={REF['conting']}", VERDE, PCT)
put(wr, f"E{r}", f"=E{R_RF_SUB}*D{r}", PRETO, BRL)
r += 1
faixa(wr, r, 5, "TOTAL RFID COM CONTINGÊNCIA")
put(wr, f"E{r}", f"=E{R_RF_SUB}+E{r - 1}", NEG, BRL, F_TOT)
R_RF_TOT = r
r += 2

# --- 2. etapas
secao(wr, r, "2. Implantação em etapas", 7)
r += 1
cabecalho(wr, r, ["Etapa", "Estações", "Tags NFC", "Pulseiras", "Carregadores", "Horas (assoc. + montagem)",
                  "Custo com contingência (R$)"])
wr.row_dimensions[r].height = 42
r += 1
ini_et = r
ETAPAS = [("Etapa 1: estações da POC (04 e 27)", 2),
          ("Etapa 2: demais estações de Medicamento", 19),
          ("Etapa 3: demais estações de Perfumaria", 19)]
for nome, n in ETAPAS:
    put(wr, f"A{r}", nome, wrap=True)
    put(wr, f"B{r}", n, AZUL, INT)
    put(wr, f"C{r}", f"=ROUND({REF['frota']}*B{r}/{N_EST},0)", PRETO, INT)
    put(wr, f"D{r}", f"=ROUNDUP(B{r}*{REF['pulseiras']},0)", PRETO, INT)
    put(wr, f"E{r}", f"=B{r}", PRETO, INT)
    put(wr, f"F{r}", f"=C{r}*{REF['s_assoc']}/3600+D{r}*{REF['h_puls']}", PRETO, NUM)
    put(wr, f"G{r}", f"=(C{r}*{REF['p_tag']}+D{r}*{REF['p_puls']}+E{r}*{REF['p_carr']}+F{r}*{REF['hora_tec']})*(1+{REF['conting']})",
        PRETO, BRL)
    r += 1
faixa(wr, r, 7, "Total das etapas")
for col, fmt in zip("BCDEFG", [INT, INT, INT, INT, NUM, BRL]):
    put(wr, f"{col}{r}", f"=SUM({col}{ini_et}:{col}{r - 1})", NEG, fmt, F_TOT)
R_ET_TOT = r
r += 1
nota(wr, r, "Tags divididas pela frota na proporção das estações de cada etapa. Se as caixas circulam entre as duas linhas, "
            "a frota inteira precisa de tag já na etapa 2. Pulseiras arredondadas para cima em cada etapa, por isso o total "
            "das etapas pode passar um pouco do item 1.", ate="G", altura=42)
r += 2

# --- 3. ganho e retorno
secao(wr, r, "3. Ganho e retorno", 7)
r += 1
cabecalho(wr, r, ["Indicador", "Valor", "Unidade", "", "", "", ""])
for col in "DEFG":
    wr[f"{col}{r}"].fill = PatternFill(None)
    wr[f"{col}{r}"].border = Border()
r += 1
G = {}
GANHO = [
    ("leit_dia", "Leituras de etiqueta por dia", f"={REF['vol_dia']}*{REF['est_vol']}*{REF['leit']}", INT, "leituras"),
    ("h_dia", "Tempo de operador liberado por dia", "=B{leit_dia}*{s}/3600", NUM, "h/dia"),
    ("h_mes", "Tempo de operador liberado por mês", "=B{h_dia}*{dias}", NUM, "h/mês"),
    ("fte", "Equivalente em operadores", "=B{h_mes}/163", NUM, "operadores (163 h/mês)"),
    ("valor_mes", "Valor do tempo liberado por mês", "=B{h_mes}*{hora_op}", BRL, "R$/mês"),
    ("payback", "Retorno do investimento no RFID (40 estações)", "=IF(B{valor_mes}>0,E{tot}/B{valor_mes},0)", NUM, "meses"),
]
for k, rot, f, fmt, un in GANHO:
    G[k] = r
    fr = f.format(s=REF["s_leit"], dias=REF["dias"], hora_op=REF["hora_op"], tot=R_RF_TOT, **G)
    put(wr, f"A{r}", rot, NEG if k == "payback" else PRETO)
    put(wr, f"B{r}", fr, NEG if k == "payback" else PRETO, fmt, F_CHAVE if k == "payback" else None)
    put(wr, f"C{r}", un)
    r += 1
r += 1
cabecalho(wr, r, ["Etapa", "Estações", "Investimento acumulado (R$)", "Ganho por mês (R$)", "Ganho acumulado por mês (R$)",
                  "Retorno da etapa (meses)", ""])
wr[f"G{r}"].fill = PatternFill(None)
wr[f"G{r}"].border = Border()
wr.row_dimensions[r].height = 42
r += 1
ini_g = r
for i, (nome, _) in enumerate(ETAPAS):
    re_ = ini_et + i
    put(wr, f"A{r}", nome, wrap=True)
    put(wr, f"B{r}", f"=B{re_}", PRETO, INT)
    put(wr, f"C{r}", f"=SUM($G${ini_et}:G{re_})", PRETO, BRL)
    put(wr, f"D{r}", f"=$B${G['valor_mes']}*B{r}/{N_EST}", PRETO, BRL)
    put(wr, f"E{r}", f"=SUM($D${ini_g}:D{r})", PRETO, BRL)
    put(wr, f"F{r}", f"=IF(D{r}>0,G{re_}/D{r},0)", PRETO, NUM)
    r += 1
nota(wr, r, "O ganho de cada etapa é proporcional às estações cobertas. Todos os tempos são premissas (aba Premissas); "
            "o tempo economizado por leitura deve ser medido na POC antes de decidir o RFID.", ate="G")

# ================================================================ Resumo (primeira aba)
wz = wb.create_sheet("Resumo", 0)
larguras(wz, [54, 20, 64])
put(wz, "A1", "Pick-to-Light: projeto inteiro feito pela equipe interna", TIT, borda=False)
nota(wz, 2, "40 estações: Medicamento (ruas 03 a 22, Asi 3) e Perfumaria (ruas 26 a 45, Asi 1). Arquitetura A 12 V com "
            "confirmação pelo coletor. Valores em reais, preços de mercado de outubro de 2026. Software não incluído.", ate="C")
cabecalho(wz, 4, ["Item", "Valor (R$)", "Observação"])
LR = [
    ("Materiais e infraestrutura", f"=Projeto!E{R_MAT}", "módulos, nós, concentradores, cabos, rede, energia, frete"),
    ("Mão de obra interna e treinamento", f"=Projeto!E{R_MO}", "montagem, instalação, comissionamento e treinamento"),
    ("Total do projeto", "=B5+B6", None),
    ("Contingência", f"=B7*{REF['conting']}", "percentual na aba Premissas"),
    ("TOTAL COM CONTINGÊNCIA", "=B7+B8", "valor para aprovação"),
    ("Por estação (com contingência)", f"=B9/{N_EST}", None),
]
for i, (rot, f, obs) in enumerate(LR):
    rr = 5 + i
    destaque = rot.startswith("TOTAL")
    neg = rot.startswith(("Total", "TOTAL"))
    put(wz, f"A{rr}", rot, NEG if neg else PRETO, fill=F_TOT if destaque else None)
    put(wz, f"B{rr}", f, VERDE if "!" in f else (NEG if neg else PRETO), BRL, F_TOT if destaque else None)
    put(wz, f"C{rr}", obs, NOTA, wrap=True, fill=F_TOT if destaque else None)
put(wz, "A12", "Projeção futura: RFID (não incluído no total acima)", NEG, borda=False)
LRF = [
    ("Implantação do RFID nas 40 estações (com contingência)", f"='RFID futuro'!E{R_RF_TOT}", BRL, "tags nas caixas, pulseiras, carregadores e montagem"),
    ("Tempo de operador liberado por mês", f"='RFID futuro'!B{G['h_mes']}", '#,##0" h"', "premissa de tempo por leitura a medir na POC"),
    ("Valor do tempo liberado por mês", f"='RFID futuro'!B{G['valor_mes']}", BRL, None),
    ("Retorno do investimento no RFID", f"='RFID futuro'!B{G['payback']}", '0.0" meses"', "detalhe por etapa na aba RFID futuro"),
]
for i, (rot, f, fmt, obs) in enumerate(LRF):
    rr = 13 + i
    put(wz, f"A{rr}", rot)
    put(wz, f"B{rr}", f, VERDE, fmt)
    put(wz, f"C{rr}", obs, NOTA, wrap=True)
put(wz, "A18", "Quantidades principais", NEG, borda=False)
QTD = [("Módulos Q (com reserva)", "Projeto!C6"), ("Nós de coluna (com reserva)", "Projeto!C7"),
       ("Módulos E+Q (com reserva)", "Projeto!C8"), ("Concentradores (com reserva)", "Projeto!C9"),
       ("Horas de mão de obra interna", f"Projeto!C{R_MO}")]
for i, (rot, ref) in enumerate(QTD):
    put(wz, f"A{19 + i}", rot)
    put(wz, f"B{19 + i}", f"={ref}", VERDE, INT)
nota(wz, 25, "Abas: Projeto (itens e mão de obra) · RFID futuro (custo, etapas, ganho e retorno) · Estações (dados das 40 "
             "estações) · Premissas (entradas em azul).", ate="C")

for w in wb.worksheets:
    w.sheet_view.showGridLines = False
    w.page_setup.orientation = "landscape"
    w.page_setup.fitToWidth, w.page_setup.fitToHeight = 1, 0
    w.sheet_properties.pageSetUpPr.fitToPage = True
wb.save(SAIDA)
print("ok", SAIDA)
