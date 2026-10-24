# Simulador 3D — estação de flow rack com pick-to-light

Estação completa montada com os endereços reais da tabela `wms_endereco` para as estações do
piloto **05 (Medicamento)** e **27 (Perfumaria)**, no layout da operação: esteira de transporte →
alto giro ao longo da esteira → transferências entre estações → área de espera → corredor
perpendicular do baixo giro (P015 na cabeceira, 020–031 no lado esquerdo, 032 até o último no lado
direito). Andar 0 é o de cima; a altura de cada endereço depende de quantos endereços o prédio tem.
As estações vizinhas aparecem em cinza.

## Como abrir

- Duplo clique em `index.html` (funciona sem internet), **ou**
- `python iniciar_3d.py` (sobe um servidor local na porta 8770 e abre o navegador).

Parâmetros de URL úteis para a apresentação: `?auto` (operador automático), `?vel=4`,
`?itens=12`, `?cam=planta` (ou `alto`, `baixo`, `operador`), `?semajuda`. Exemplo: `index.html?auto&vel=2&semajuda`.

## O que está modelado

| Elemento | Regra |
|---|---|
| Alto giro, andares 0–3 | 1 módulo **Q** (3 dígitos + botão) por endereço; todos os itens da caixa acendem juntos |
| Alto giro, andares 4–5 | 2 blocos **E+Q** (esquerdo P001–P005, direito P006–P010); um item por vez, na ordem da rota |
| Baixo giro | Zonas de 4 prédios (prédio 015 na zona 1), 1 módulo **E+Q** por zona; um item por vez |
| LED guia de coluna | Opcional; acende no prédio do item atual de cada bloco/zona |
| Concentrador | Gabinete ventilado, Ethernet, 2 barramentos RS-485 + 12 V em Cat5e com RJ45 |
| Abertura e fechamento | Arquitetura A: gatilho do coletor; B2: leitor NFC fixo + painel LCD + FECHAR; B1: pulseira |
| Bacia | Tamanho único; entra pela transferência do vão oeste, espera em frente ao alto giro e, fechada, é empurrada para a transferência de saída (vão leste), que a devolve à esteira |
| Pendência | Leitura com itens pendentes gera alerta; nova leitura fecha e registra para a conferência |
| Falha de módulo | Botão “Simular falha”: evento `FALHA_MODULO`, alerta no painel e troca do módulo |

O painel da esquerda mostra os indicadores e os eventos na ordem em que o Serviço PTL os
produziria (API REST, MQTT, Sybase e BHT), com os mesmos nomes do documento técnico.

## Ajustes

Medidas (largura de prédio, altura de andar, posição da esteira) e a disposição física ficam no
bloco `CFG` no topo de `sim.js`. São premissas até chegarem as fotos e medidas das estações.
Os dados vêm de `dados.js`, gerado a partir de `../projeto/dados/enderecos_ruaXX.json`.

Biblioteca 3D: Three.js r147 (licença MIT, em `vendor/`).
