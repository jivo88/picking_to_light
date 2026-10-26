# Simulador 3D — estação de flow rack com pick-to-light

Estação completa montada com os endereços reais da tabela `wms_endereco` para as estações do
piloto **05 (Medicamento)** e **27 (Perfumaria)**, no layout da operação: esteira de transporte e
esteira de separação lado a lado (≈ 20 cm): a de transporte por dentro do alto giro (por baixo do
andar 3 e por cima do andar 4) e a de separação na frente, aberta; transferência a cada 4 estações com rolete direcionador, alto giro na
frente do operador e corredor do baixo giro atrás dele (020–031 à esquerda; 015 e 043 → 032 à
direita).
Prateleiras alinhadas, andar 0 em cima; a caixa do endereço varia pelo tipo. Bacias verdes de
tamanho único; operador com uniforme verde. Estações vizinhas em cinza.

## Como abrir

- Duplo clique em `index.html` (funciona sem internet), **ou**
- `python iniciar_3d.py` (sobe um servidor local na porta 8770 e abre o navegador).

Parâmetros de URL úteis para a apresentação: `?auto` (operador automático), `?vel=4`,
`?itens=12`, `?cam=planta` (ou `alto`, `baixo`, `operador`), `?semajuda`. Exemplo: `index.html?auto&vel=2&semajuda`.

## O que está modelado

| Elemento | Regra |
|---|---|
| Alto giro, andares 0–3 | 1 módulo **Q** (3 dígitos + botão) por endereço; todos os itens da caixa acendem juntos |
| Alto giro, andares 4–5 | 2 zonas (P001–P005 e P006–P010) com 1 display **E+Q** cada, por baixo da esteira de separação; um item por vez, na ordem da rota |
| Baixo giro | 2 zonas por lado do corredor (E1–E2 e D1–D2), display **E+Q** na altura dos olhos; um item por vez. P015 ocupa a frente do bloco (1 m), virado para a esteira, e entra na D1. Uma barra luminosa âmbar na frente do operador acende enquanto a caixa tem itens no baixo giro |
| LED guia de coluna | Opcional; acende no prédio do item atual de cada bloco/zona |
| Concentrador | Gabinete ventilado, Ethernet, 2 barramentos RS-485 + 12 V em Cat5e com RJ45 |
| Abertura e fechamento | Arquitetura A: gatilho do coletor; B2: leitor NFC fixo + painel LCD + FECHAR; B1: pulseira |
| Bacia | Verde, tamanho único; vem pela esteira de transporte, passa pela transferência e pelo rolete direcionador até a estação e, fechada, é empurrada de volta à esteira de transporte |
| Pendência | Leitura com itens pendentes gera alerta; nova leitura fecha e registra para a conferência |
| Falha de módulo | Botão “Simular falha”: evento `FALHA_MODULO`, alerta no painel e troca do módulo |

O painel da esquerda mostra os indicadores e os eventos na ordem em que o Serviço PTL os
produziria (API REST, MQTT, Sybase e BHT), com os mesmos nomes do documento técnico.

## Ajustes

Medidas do desenho de 26/10/2026: estação de 2,5 m (prédios do alto giro de 25 cm), blocos do baixo giro de
1 m (2 prateleiras de 50 cm × 2 m), corredor de cerca de 1,5 m e concentrador atrás da estação. Câmeras
**Atrás do operador** e **Visão do operador** (o que ele vê, na altura dos olhos). Ficam no bloco `CFG` no topo de
`sim.js`. Os endereços aparecem como na etiqueta (`0.05.0421.A`), inclusive nos displays de 8 dígitos (com
ponto decimal). **Simular falha de módulo** mostra qual LED falhou; **Trocar e cadastrar** põe o módulo novo
piscando **CAd** e o clique no botão dele grava o LED no endereço.
Os dados vêm de `dados.js`, gerado a partir de `../projeto/dados/enderecos_ruaXX.json`.

Biblioteca 3D: Three.js r147 (licença MIT, em `vendor/`).
