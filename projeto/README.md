# Modelagem e entregáveis

| Pasta | O que gera | Como rodar |
|---|---|---|
| `dados/` | Classificação dos 7.981 endereços (alto giro 0–3, alto giro 4–5, baixo giro), zonas, totais por estação (`estacoes.json`) e endereços das estações 05 e 27 | `python dados/dimensionar.py <export_wms_endereco.json>` (o export da tabela não está no repositório) |
| `orcamento/` | `Orcamento_PTL.xlsx` com premissas, preços, composição e cenários (piloto e completo) | `python orcamento/gerar_orcamento.py` (openpyxl) |
| `orcamento/` | `Orcamento_Pecas_Fontes.xlsx`: orçamento das peças com o link de cada preço (loja, produto, preço e data da consulta), com o RFID futuro em abas separadas. As carcaças dos LEDs (impressão 3D, medida compacta) têm valor estipulado. Os preços ficam em `fontes_precos.py`, que também alimenta a aba Fontes do orçamento completo | `python orcamento/gerar_pecas_fontes.py` |
| `orcamento/` | `Orcamento_POC_PTL.xlsx` (só a POC) e `Orcamento_Projeto_Interno_PTL.xlsx` (40 estações, equipe interna, aba RFID futuro), lidos do orçamento completo já recalculado | `python orcamento/gerar_orcamento_poc.py` e `python orcamento/gerar_orcamento_interno.py` |
| `diagramas/` | Diagramas em PNG usados no documento e na apresentação | `python diagramas/gerar_diagramas.py` (Playwright) |
| `documento/` | `Arquitetura_PTL_Documento_Tecnico.docx` | `node documento/gerar_documento.js` (docx) |
| `apresentacao/` | `Apresentacao_PTL.pptx` | `node apresentacao/gerar_apresentacao.js` (pptxgenjs) |

Os arquivos prontos estão em `entregaveis/`. Os caminhos nos scripts apontam para a pasta de
trabalho original (`/home/claude/ptl-projeto`); ajuste a constante `BASE` ao rodar em outra máquina.
