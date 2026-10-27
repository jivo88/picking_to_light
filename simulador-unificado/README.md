# Simulador unificado

Junta as aplicações em uma só tela, sincronizadas:

- **Estação 3D** (`../simulador-3d`): a estação com os endereços reais, o operador, as esteiras e os displays.
- **Comunicação** (`comunicacao.html`): cada ação feita no 3D aparece como mensagens HTTPS, SQL, MQTT e
  RS-485 entre a leitura, o Serviço PTL, o broker, o concentrador e os dispositivos do barramento
  (10 nós de coluna, 2 displays dos andares 4 e 5 e 4 zonas do baixo giro).
- **Controle** (`controle.html`): a interface de controle da manutenção. Mostra qual LED falhou (endereço no
  formato da etiqueta, por exemplo `0.05.0042.A`, nó e porta ou endereço RS-485 do E+Q, local e tipo de falha)
  e tem o cadastro de LED por endereço, com busca, teste (888) e troca de módulo por tela + botão.
- **Operação completa** (`operacao.html`): as duas linhas inteiras (Medicamento · Asi 3 e Perfumaria · Asi 1,
  40 estações, 1 operador por estação) em uma planta 2D animada, com volumes por hora, itens por hora,
  produtividade por operador e a capacidade máxima de cada linha com e sem PTL.

Abra `index.html` (funciona sem internet). As abas no topo alternam a visualização:

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

Simula a entrada de volumes nas duas esteiras e a separação nas 40 estações. Cada volume pertence a uma
linha só (um pedido com Medicamento e Perfumaria vira volumes separados). As estações EP_01 e EP_02 não
entram na simulação.

Como funciona:

- **Entrada**: volumes por hora em cada linha. Cada volume tem em média N itens (varia de 0,5 a 1,5 vez),
  sorteados entre as estações proporcionalmente ao número de endereços de cada uma (`projeto/dados/estacoes.json`),
  com a fração de itens no alto giro ajustável.
- **Transferência**: cada transferência atende as estações do seu grupo (2 de cada lado; na ponta 1 + 2),
  como no 3D. A caixa entra se a estação tiver lugar na esteira de separação (padrão: 2 caixas). Se não
  tiver, segue e volta pelo retorno (TR_04) para tentar de novo: isso conta como recirculação.
- **Separação**: tempo por item conforme o local (alto giro 0-3, andares 4-5 ou baixo giro, com
  deslocamento) mais um tempo por unidade e o tempo de abrir, fechar e empurrar a caixa. No modo
  **Sem PTL** soma o tempo de procurar o endereço em cada item.
- **Mesma transferência**: terminada uma estação, a caixa vai direto para a próxima estação do mesmo grupo
  pela esteira de separação, sem voltar ao transporte.

Indicadores por linha e da operação: volumes por hora e itens por hora (média da última hora), itens por
hora por operador, itens por hora de trabalho efetivo, ocupação das estações, tempo médio do volume na linha,
volumes esperando, recirculações e a estação mais ocupada. O botão **Simular turno de 8 h** roda o turno
inteiro de uma vez, e **Calcular capacidade máxima** procura o maior volume por hora que cada linha ainda
escoa, com e sem PTL.

Todos os tempos são premissas iniciais, editáveis em **Premissas de tempo e esteira**. Os dados das
estações são embutidos na página por `projeto/dados/embutir_operacao.py`.
