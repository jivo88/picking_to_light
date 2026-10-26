# Simulador unificado

Junta as aplicações em uma só tela, sincronizadas:

- **Estação 3D** (`../simulador-3d`): a estação com os endereços reais, o operador, as esteiras e os displays.
- **Comunicação** (`comunicacao.html`): cada ação feita no 3D aparece como mensagens HTTPS, SQL, MQTT e
  RS-485 entre a leitura, o Serviço PTL, o broker, o concentrador e os dispositivos do barramento
  (10 nós de coluna, 4 displays dos andares 4 e 5 e 8 zonas do baixo giro).
- **Controle** (`controle.html`): a interface de controle da manutenção. Mostra qual LED falhou (endereço no
  formato da etiqueta, por exemplo `0.05.0042.A`, nó e porta ou endereço RS-485 do E+Q, local e tipo de falha)
  e tem o cadastro de LED por endereço, com busca, teste (888) e troca de módulo por tela + botão.

Abra `index.html` (funciona sem internet). As abas no topo alternam a visualização:

| Aba | O que mostra |
|---|---|
| Estação 3D | só o 3D, em tela cheia |
| Comunicação | o diagrama de comunicação, com o 3D em uma janela pequena no canto (clique em "ampliar" para voltar) |
| Lado a lado | 3D e comunicação juntos |
| Controle | interface de controle (falhas e cadastro de LED) ao lado do 3D |

Atalhos: teclas 1, 2, 3 e 4 (com o foco fora das telas). A aba escolhida fica salva no navegador.

## O que fica sincronizado

| No 3D | Na comunicação |
|---|---|
| Leitura que abre a caixa (A, B1 ou B2) | POST da leitura (ou leitura NFC pelo SPI no B2), SELECT no Sybase, MQTT `SEPARAR` e um quadro MOSTRAR para cada display |
| Botão de um módulo | LER_BOTOES, APAGAR ou MOSTRAR do próximo item, MQTT `BTN`/`ZONA_FIM`/`CONCLUIDA`, INSERT no Sybase e consulta do coletor |
| Leitura com itens pendentes / fechamento | resposta 409 / UPDATE da sessão, `CANCELAR` e APAGAR quando fecha com pendência |
| Simular falha | conforme o tipo: 3 tentativas sem resposta (E+Q) ou LER_STATUS com "display sem ACK" / "botão travado", `FALHA_MODULO` com endereço e porta, INSERT em `ptl_evento_falha`; o aviso aparece no Controle e o 3D mostra o módulo com moldura vermelha |
| Trocar e cadastrar | POST `/cadastro`, `CONFIG CADASTRO`, MODO_CADASTRO; o módulo novo pisca **CAd**; ao apertar o botão dele: DEF_ENDERECO (E+Q), `CADASTRO_OK` e UPDATE em `ptl_mapa_led` |
| Testar (Controle) | `CONFIG IDENTIFICAR` e IDENTIFICAR: o LED mostra 888 por 3 s |
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
