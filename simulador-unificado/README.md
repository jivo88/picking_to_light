# Simulador unificado

Junta as duas aplicações em uma só tela, sincronizadas:

- **Estação 3D** (`../simulador-3d`): a estação com os endereços reais, o operador, as esteiras e os displays.
- **Comunicação** (`comunicacao.html`): cada ação feita no 3D aparece como mensagens HTTPS, SQL, MQTT e
  RS-485 entre a leitura, o Serviço PTL, o broker, o concentrador e os dispositivos do barramento
  (10 nós de coluna, 4 displays dos andares 4 e 5 e 8 zonas do baixo giro).

Abra `index.html` (funciona sem internet). As abas no topo alternam a visualização:

| Aba | O que mostra |
|---|---|
| Estação 3D | só o 3D, em tela cheia |
| Comunicação | o diagrama de comunicação, com o 3D em uma janela pequena no canto (clique em "ampliar" para voltar) |
| Lado a lado | as duas telas juntas |

Atalhos: teclas 1, 2 e 3 (com o foco fora das telas). A aba escolhida fica salva no navegador.

## O que fica sincronizado

| No 3D | Na comunicação |
|---|---|
| Leitura que abre a caixa (A, B1 ou B2) | POST da leitura (ou leitura NFC pelo SPI no B2), SELECT no Sybase, MQTT `SEPARAR` e um quadro MOSTRAR para cada display |
| Botão de um módulo | LER_BOTOES, APAGAR ou MOSTRAR do próximo item, MQTT `BTN`/`ZONA_FIM`/`CONCLUIDA`, INSERT no Sybase e consulta do coletor |
| Leitura com itens pendentes / fechamento | resposta 409 / UPDATE da sessão, `CANCELAR` e APAGAR quando fecha com pendência |
| Simular falha / trocar módulo | 3 tentativas sem resposta e `FALHA_MODULO` / AUTO_TESTE e `MODULO_OK` |
| Troca de estação, de arquitetura ou de velocidade | o barramento é redesenhado com os dispositivos da estação |

No sentido contrário, a tela de comunicação também comanda o 3D: o botão **Gatilho / leitura**, o clique
em um display aceso (confirma a retirada) e o **cabo de rede do concentrador** (desligado, o 3D recusa
abrir caixas, os displays seguem funcionando e as confirmações ficam na fila até a rede voltar).

Com o operador automático em velocidade alta, a comunicação entra em modo rápido: registra todas as
mensagens, mas anima só quando a fila de eventos diminui.
