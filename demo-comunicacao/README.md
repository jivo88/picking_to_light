# Demonstração da comunicação do pick-to-light

Página única, sem dependências e sem internet, que mostra o caminho de cada mensagem entre o
coletor, o Serviço PTL, o broker MQTT, o concentrador e os módulos de LED da estação 05.
Abra `index.html` no navegador.

## O que aparece

| Trecho | Protocolo | Exemplo |
|---|---|---|
| Coletor ↔ Serviço PTL | HTTPS pelo Wi-Fi | `POST /v1/estacoes/05/leituras`, `GET /v1/estacoes/05` |
| Serviço PTL ↔ Sybase | SQL | leitura da view do pedido, gravação das confirmações |
| Serviço PTL ↔ broker ↔ concentrador | MQTT pela rede cabeada | `ptl/est05/cmd` (SEPARAR, CANCELAR), `ptl/est05/evt` (ACK, BTN, ZONA_FIM, CONCLUIDA, FALHA_MODULO, HEARTBEAT), `ptl/est05/status` (retido, last will) |
| Concentrador ↔ módulos | RS-485, 38.400 bps | MOSTRAR_Q, MOSTRAR_EQ, APAGAR, LER_BOTOES com CRC-16/Modbus |

Cada mensagem fica no registro; ao clicar nela, o inspetor mostra o conteúdo (requisição HTTP,
tópico e carga MQTT, consulta SQL ou os bytes do quadro RS-485 com cada campo decodificado e o
CRC conferido).

## Como usar

1. **Gatilho do coletor** (ou barra de espaço): abre a caixa. Os módulos acendem.
2. Clique nos **botões verdes** dos módulos para confirmar as retiradas. A zona E2 mostra um item por vez.
3. Com tudo apagado, o gatilho fecha a caixa. Antes disso, o gatilho gera o alerta de pendência.
4. **Cabo de rede do concentrador**: desligue para ver o last will (`offline`), os displays continuando a funcionar e as confirmações guardadas na fila; ao religar, a fila é enviada.
5. **Dispositivo com defeito**: o concentrador tenta 3 vezes, gera `FALHA_MODULO` e o coletor passa a mostrar o item para confirmação manual.
6. **Mostrar polling e heartbeat**: exibe a consulta periódica dos botões (na estação real é a cada 50 ms) e o sinal de vida do concentrador.

## Formato do quadro RS-485 (proposta)

`STX 0x02 | endereço | comando | tamanho | dados | CRC-16/Modbus (baixo, alto)`

| Comando | Código | Dados |
|---|---|---|
| MOSTRAR_Q | 0x10 | posição, quantidade (2 bytes), modo (1 aceso, 2 piscando) |
| MOSTRAR_EQ | 0x11 | endereço (8 ASCII), quantidade (2 bytes), modo |
| APAGAR | 0x12 | posição (opcional) |
| LER_BOTOES | 0x20 | resposta: máscara dos botões apertados |
| AUTO_TESTE | 0x30 | |

A resposta usa o mesmo comando com o bit 0x80 ligado. Os endereços 0x01 (nó de coluna), 0x41 e
0x52 são exemplos; na estação real cada dispositivo recebe o seu na instalação.
