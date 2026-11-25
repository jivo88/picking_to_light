# Planta 2D das esteiras

Planta das duas linhas redesenhada a limpo a partir do esboço `Desenho_esteira_original.png` (25/11/2026). Mostra
o divisor, as linhas Asi 1 (Perfumaria, estações 26 a 45) e Asi 3 (Medicamento, estações 03 a 22), as 12
transferências (TR_02 e TR_03), as 22 áreas de desvio (EP_01 e EP_02) e o loop da conferência (TR_04) com a área
de escape.

| Arquivo | O que é |
|---|---|
| `Layout_esteiras_2D.html` | Planta interativa: clique em uma estação para ver a ficha (endereços, alto giro, andares 4–5, baixo giro, zonas, TR e EP); passe o mouse em uma TR para ver o que ela atende. Abre com duplo clique, sem internet |
| `Layout_esteiras_2D.svg` | A planta em vetor, para documentos e apresentações |
| `Layout_esteiras_2D.png` | A planta em imagem (alta resolução) |
| `Desenho_esteira_original.png` | O esboço original que deu origem à planta |
| `layout_2d.modelo.html` + `gerar_layout_2d.py` | Geram os arquivos acima a partir de `../dados/estacoes.json` |

Para gerar de novo (depois de mudar `estacoes.json` ou o modelo):

```bash
python gerar_layout_2d.py            # só o .html
python gerar_layout_2d.py --imagens  # .html, .png e .svg (precisa do Playwright)
```

## Transferências e áreas de desvio

| Linha | TR | Fica entre | Áreas de desvio (estações) |
|---|---|---|---|
| Medicamento · Asi 3 | TR_02_01 | 03 \| 04 | EP_01_01 (03) · EP_01_02 (04, 05) |
| | TR_02_02 | 07 \| 08 | EP_01_03 (06, 07) · EP_01_04 (08, 09) |
| | TR_02_03 | 11 \| 12 | EP_01_05 (10, 11) · EP_01_06 (12, 13) |
| | TR_02_04 | 15 \| 16 | EP_01_07 (14, 15) — um lado só |
| | TR_02_05 | 17 \| 18 | EP_01_08 (16, 17) · EP_01_09 (18, 19) |
| | TR_02_06 | 21 \| 22 | EP_01_10 (20, 21) · EP_01_11 (22) |
| Perfumaria · Asi 1 | TR_03_01 | 26 \| 27 | EP_02_01 (26) · EP_02_02 (27, 28) |
| | TR_03_02 | 30 \| 31 | EP_02_03 (29, 30) · EP_02_04 (31, 32) |
| | TR_03_03 | 34 \| 35 | EP_02_05 (33, 34) · EP_02_06 (35, 36) |
| | TR_03_04 | 38 \| 39 | EP_02_07 (37, 38) — um lado só |
| | TR_03_05 | 40 \| 41 | EP_02_08 (39, 40) · EP_02_09 (41, 42) |
| | TR_03_06 | 44 \| 45 | EP_02_10 (43, 44) · EP_02_11 (45) |

A mesma tabela está em `simulador-3d/sim.js` e em `simulador-unificado/operacao.html` (constante `TRS`): ao mudar
uma TR, mude nos três lugares.
