# Modelagem e entregáveis

| Pasta | O que gera | Como rodar |
|---|---|---|
| `dados/` | Classificação dos 7.981 endereços (alto giro 0–3, alto giro 4–5, baixo giro), zonas, totais por estação (`estacoes.json`) e endereços das estações 05 e 27 | `python dados/dimensionar.py <export_wms_endereco.json>` (o export da tabela não está no repositório) |
| `orcamento/` | `Orcamento_PTL.xlsx` com premissas, preços, composição e cenários (piloto e completo) | `python orcamento/gerar_orcamento.py` (openpyxl) |
| `diagramas/` | Diagramas em PNG usados no documento e na apresentação | `python diagramas/gerar_diagramas.py` (Playwright) |
| `documento/` | `Arquitetura_PTL_Documento_Tecnico.docx` | `node documento/gerar_documento.js` (docx) |
| `apresentacao/` | `Apresentacao_PTL.pptx` | `node apresentacao/gerar_apresentacao.js` (pptxgenjs) |

Os arquivos prontos estão em `entregaveis/`. Os caminhos nos scripts apontam para a pasta de
trabalho original (`/home/claude/ptl-projeto`); ajuste a constante `BASE` ao rodar em outra máquina.
