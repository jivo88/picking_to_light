# Simulador 3D — estação de flow rack com pick-to-light

Estação completa montada com os endereços reais da tabela `wms_endereco` para as estações do
piloto **05 (Medicamento)** e **27 (Perfumaria)**, no layout da operação: esteira de transporte e
esteira de separação lado a lado (≈ 20 cm), transferência a cada 4 estações com rolete
direcionador, operador entre a esteira de separação e o alto giro (atrás dele) e corredor do baixo
giro entrando pelo meio do alto giro (020–031 à esquerda; 015 e 043 → 032 à direita).
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
| Alto giro, andares 4–5 | 4 displays **E+Q** (A4 e A5 em cada lado, P001–P005 e P006–P010); um item por vez, na ordem da rota |
| Baixo giro | Zonas de 4 prédios (prédio 015 na zona 1), 1 módulo **E+Q** por zona; um item por vez |
| LED guia de coluna | Opcional; acende no prédio do item atual de cada bloco/zona |
| Concentrador | Gabinete ventilado, Ethernet, 2 barramentos RS-485 + 12 V em Cat5e com RJ45 |
| Abertura e fechamento | Arquitetura A: gatilho do coletor; B2: leitor NFC fixo + painel LCD + FECHAR; B1: pulseira |
| Bacia | Verde, tamanho único; vem pela esteira de transporte, passa pela transferência e pelo rolete direcionador até a estação e, fechada, é empurrada de volta à esteira de transporte |
| Pendência | Leitura com itens pendentes gera alerta; nova leitura fecha e registra para a conferência |
| Falha de módulo | Botão “Simular falha”: evento `FALHA_MODULO`, alerta no painel e troca do módulo |

O painel da esquerda mostra os indicadores e os eventos na ordem em que o Serviço PTL os
produziria (API REST, MQTT, Sybase e BHT), com os mesmos nomes do documento técnico.

## Ajustes

Medidas (largura de prédio, altura de andar, posição da esteira) e a disposição física ficam no
bloco `CFG` no topo de `sim.js`. São premissas até chegarem as fotos e medidas das estações.
Os dados vêm de `dados.js`, gerado a partir de `../projeto/dados/enderecos_ruaXX.json`.

Biblioteca 3D: Three.js r147 (licença MIT, em `vendor/`).
