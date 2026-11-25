# Simulador unificado

Junta as aplicações em uma só tela, sincronizadas:

- **Estação 3D** (`../simulador-3d`): a estação com os endereços reais, o operador, as esteiras e os displays.
- **Comunicação** (`comunicacao.html`): cada ação feita no 3D aparece como mensagens HTTPS, SQL, MQTT e
  RS-485 entre a leitura, o Serviço PTL, o broker, o concentrador e os dispositivos do barramento
  (10 nós de coluna, 2 displays dos andares 4 e 5 e 4 zonas do baixo giro).
- **Controle** (`controle.html`): a interface de controle da manutenção. Mostra qual LED falhou (endereço no
  formato da etiqueta, por exemplo `0.05.0042.A`, nó e porta ou endereço RS-485 do E+Q, local e tipo de falha)
  e tem o cadastro de LED por endereço, com busca, teste (888) e troca de módulo por tela + botão.
- **Operação completa** (`operacao.html`): as duas linhas inteiras no layout do desenho (divisor, Perfumaria · Asi 1
  e Medicamento · Asi 3, 40 estações, 12 TRs, 22 áreas de desvio e o loop da conferência) em uma planta 2D animada,
  com volumes por hora, produtividade, conferência e a capacidade máxima com e sem LEDs.

Abra `index.html` (funciona sem internet). O modo **com ou sem LEDs** fica sincronizado entre a Estação 3D e a
Operação completa. As abas no topo alternam a visualização:

| Aba | O que mostra |
|---|---|
| Estação 3D | só o 3D, em tela cheia |
| Comunicação | o diagrama de comunicação, com o 3D em uma janela pequena no canto (clique em "ampliar" para voltar) |
| Lado a lado | 3D e comunicação juntos |
| Controle | interface de controle (falhas e cadastro de LED) ao lado do 3D |
| Operação completa | simulação das duas linhas com indicadores (só avança com a aba aberta) |

Atalhos: teclas 1 a 5 (com o foco fora das telas). A aba escolhida fica salva no navegador.

## O que fica sincronizado

| No 3D | Na comunicação |
|---|---|
| Leitura que abre a caixa (coletor, ou pulseira RFID no futuro) | POST da leitura, SELECT no Sybase, MQTT `SEPARAR` e um quadro MOSTRAR para cada display |
| Botão de um módulo | LER_BOTOES, APAGAR ou MOSTRAR do próximo item, MQTT `BTN`/`ZONA_FIM`/`CONCLUIDA`, INSERT no Sybase e consulta do coletor |
| Leitura com itens pendentes / fechamento | resposta 409 / UPDATE da sessão, `CANCELAR` e APAGAR quando fecha com pendência |
| Simular falha | conforme o tipo: 3 tentativas sem resposta (E+Q) ou LER_STATUS com "display sem ACK" / "botão travado", `FALHA_MODULO` com endereço e porta, INSERT em `ptl_evento_falha`; o aviso aparece no Controle e o 3D mostra o módulo com moldura vermelha |
| Trocar e cadastrar | POST `/cadastro`, `CONFIG CADASTRO`, MODO_CADASTRO; o módulo novo pisca **CAd**; ao apertar o botão dele: DEF_ENDERECO (E+Q), `CADASTRO_OK` e UPDATE em `ptl_mapa_led` |
| Testar (Controle) | `CONFIG IDENTIFICAR` e IDENTIFICAR: o LED mostra 888 por 3 s |
| Sinal de baixo giro aceso/apagado | SINAL_BG para o nó do prédio 005 (saída extra que liga a barra âmbar) |
| Troca de estação, de arquitetura ou de velocidade | o barramento é redesenhado com os dispositivos da estação |

No sentido contrário, a tela de comunicação também comanda o 3D: o botão **Gatilho / leitura**, o clique
em um display aceso (confirma a retirada) e o **cabo de rede do concentrador** (desligado, o 3D recusa
abrir caixas, os displays seguem funcionando e as confirmações ficam na fila até a rede voltar).

Com o operador automático em velocidade alta, a comunicação entra em modo rápido: registra todas as
mensagens, mas anima só quando a fila de eventos diminui.

## Como demonstrar a falha e o cadastro de LED

1. Abra a aba **Controle** (tecla 4) e clique em **Simular falha** (escolha o tipo ao lado).
2. O alerta mostra o endereço, o módulo e o tipo de falha, e o 3D vai até o LED com problema.
3. Clique em **Trocar e cadastrar**: o módulo novo pisca **CAd** no 3D.
4. Clique no botão desse módulo no 3D (ou em **Simular aperto no botão do módulo novo**). O LED fica gravado
   no endereço, o display volta ao item que estava aceso e o histórico registra a troca.

A tabela **LEDs cadastrados por endereço** permite buscar qualquer endereço, testar (888 por 3 s) e cadastrar
de novo, por exemplo quando um módulo muda de lugar.

## Operação completa

Segue o layout do *Desenho_esteira* (25/11/2026). As caixas saem das impressoras, sobem pela esteira de entrada e o
**divisor** manda para a esquerda as de Medicamento (Asi 3, estações 03 a 22) e deixa seguir reto as de Perfumaria
(Asi 1, estações 26 a 45). As duas linhas correm do divisor para a **conferência** (loop TR_04), onde se encontram.
Cada volume pertence a uma linha só (um pedido com Medicamento e Perfumaria vira volumes separados).

**Separação com ou sem LEDs.** O seletor no topo alterna entre *Com LEDs (PTL)*, em que os endereços da caixa acendem
juntos, e *Sem LEDs (como hoje)*, em que o coletor mostra um endereço por vez e o operador procura e bipa (soma o
tempo de procura por item). O seletor acompanha o da Estação 3D. `operacao.html?semled` já abre sem LEDs.

**Pedido em ondas.** No topo, *Pedido em ondas* troca a entrada contínua (volumes por hora) por um pedido de até
4.000 volumes, com operador nas 40 estações: divisão Medicamento/Perfumaria (padrão 55% / 45%), volumes por onda,
intervalo entre ondas (0 = a próxima onda sai quando a anterior termina de entrar) e ritmo de entrada no divisor
(caixas por minuto). O botão **Comparar o pedido com e sem LEDs** roda o pedido inteiro nos dois modos com as mesmas
caixas (semente fixa, editável nas premissas) e mostra lado a lado o tempo até o último volume conferido, volumes e
itens por hora, ocupação, incompletos e escape, além do **ritmo máximo** de entrada de cada modo (até 2% de volumes
incompletos e 1% no escape) e a curva de volumes conferidos.

**Vista 3D das 40 estações.** O botão *3D · 40 estações* na planta mostra a operação inteira em 3D, andando junto com
a simulação, no formato da Estação 3D (mesmas medidas, cores e peças do `CFG` de `simulador-3d/sim.js`): alto giro com
10 prédios de 25 cm, andares 0–3 por cima da esteira de transporte e 4–5 por baixo da esteira de separação, esteiras
com roletes, corredor do baixo giro de 1,5 m atrás do operador com 12 prédios × 8 andares de cada lado e o mesmo
operador de uniforme verde. As caixas nos racks seguem o número de endereços de cada estação (`estacoes.json`). As
linhas são espelhadas (corredores de costas no meio). Também aparecem as TRs com o rolete direcionador, as áreas de
desvio, o divisor com as impressoras e o loop da conferência com as bancadas e os conferentes (padrão: 16). Câmeras:
geral, Perfumaria, Medicamento, estação 05, conferência e divisor. Também como na Estação 3D: módulos Q em cada endereço
do alto giro 0–3, displays E+Q nos andares 4–5 e nas zonas do baixo giro, prédio 015 na frente do bloco, barra âmbar
do baixo giro, placa do alto giro, nome da estação no piso e concentrador atrás. Com LEDs, os módulos dos itens da
caixa em separação acendem. O 3D com os endereços reais e os displays continua
na aba Estação 3D (05 e 27).

Transferências e áreas de desvio (iguais no 3D e em `projeto/layout-2d/`):

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

Como funciona:

- **Entrada**: volumes por hora em cada linha. Cada volume tem em média N itens (varia de 0,5 a 1,5 vez),
  sorteados entre as estações proporcionalmente ao número de endereços de cada uma (`projeto/dados/estacoes.json`),
  com a fração de itens no alto giro ajustável.
- **Desvio**: ao passar por uma TR, a caixa entra na área de desvio da estação que tem item dela, se a estação tiver
  lugar na esteira de separação (padrão: 2 caixas). Terminada uma estação, vai direto para a próxima da mesma TR.
- **Sem retorno às linhas** (como no desenho): se a estação estiver cheia, a caixa segue e o item fica sem separar;
  ela chega **incompleta** à conferência. Os indicadores mostram os itens não separados e os volumes incompletos.
- **Conferência**: a caixa tenta um conferente a cada volta no loop. Depois de 6 voltas sem ser conferida vai para a
  **área de escape**. Conferentes (padrão: 16), tempo por caixa, tamanho da volta e número de voltas são editáveis.
- **Separação**: tempo por item conforme o local (alto giro 0-3, andares 4-5 ou baixo giro, com deslocamento) mais
  um tempo por unidade e o tempo de abrir, fechar e empurrar a caixa. Sem LEDs soma a procura do endereço em cada item.

Indicadores por linha, da operação e da conferência: volumes conferidos por hora, itens por hora, itens por hora por
operador, ocupação, tempo do divisor até conferida, itens não separados, volumes incompletos, caixas no loop, voltas
e escape. **Simular turno de 8 h** roda o turno inteiro de uma vez e **Calcular capacidade máxima** procura o maior
volume por hora que cada linha escoa (≥ 97% conferido, até 2% incompletos e 1% no escape), com e sem LEDs.

Todos os tempos e medidas são premissas iniciais, editáveis na tela. Os dados das estações são embutidos na página
por `projeto/dados/embutir_operacao.py`.
