# Pick-to-Light — projeto do flow rack

## Como abrir

**No VS Code:** abra esta pasta, aperte **F5** e escolha **Simulador unificado (3D + comunicação)**.
O navegador abre em http://127.0.0.1:8780 com as abas *Estação 3D*, *Comunicação*, *Lado a lado*, *Controle* e *Operação completa*
(falhas de LED e cadastro de LED por endereço).

**Pelo terminal:** `python iniciar.py` (ou `--3d`, `--comunicacao`, `--placas`).

**Sem Python:** abra `simulador-unificado/index.html` direto no navegador.

| Pasta | Conteúdo |
|---|---|
| [`simulador-unificado/`](simulador-unificado/) | **Versão unificada**: estação 3D, comunicação e interface de controle sincronizadas, com abas para alternar (3D, comunicação, lado a lado, controle) e a aba *Operação completa*, que simula as duas linhas com as 40 estações e mostra volumes por hora, produtividade e capacidade. Abra `index.html`. |
| [`demo-comunicacao/`](demo-comunicacao/) | **Demonstração da comunicação** entre coletor, Serviço PTL, broker MQTT, concentrador e módulos de LED, com os bytes de cada mensagem. Abra `index.html`. |
| [`simulador-3d/`](simulador-3d/) | **Simulador 3D da estação completa** (estações 05 e 27, endereços reais, arquiteturas A e B). Abra `index.html`. |
| [`projeto/entregaveis/`](projeto/entregaveis/) | Apresentação (.pptx), documento técnico (.docx), orçamentos (.xlsx: completo, só da POC e projeto interno com RFID futuro) e `Simulador_PTL.html`, o simulador unificado em um único arquivo que abre com duplo clique, sem internet |
| [`ferramentas/`](ferramentas/) | `montar_offline.py` gera o `Simulador_PTL.html` a partir das pastas dos simuladores (`python3 ferramentas/montar_offline.py`) |
| [`projeto/`](projeto/) | Scripts que geram os entregáveis, os diagramas e os dados das estações |
| raiz (`iniciar_placas.py`, `placas/`, `simulador/`) | Simulador antigo das 3 placas do protótipo (MicroPython), descrito abaixo |

---

# Simulador das 3 placas (versão antiga, MicroPython)

Simula as 3 placas do protótipo na sua máquina, **sem internet e sem o site do Wokwi**:

| Placa | O que faz |
|---|---|
| **Placa 3 · Leitor de pulso** | Lê a etiqueta NFC da caixa e envia para a estação |
| **Placa 1 · Estação de bipagem** | Recebe a etiqueta, busca o pedido e manda o concentrador acender |
| **Placa 2 · Concentrador FR01** | Acende os endereços do flow rack e devolve as confirmações |

Cada placa roda o **mesmo `main.py` em MicroPython** usado no Wokwi, sem alteração.
O desenho de cada placa é montado a partir do **mesmo `diagram.json`**.
As placas conversam por um **broker MQTT local** que sobe junto com o simulador.

## Requisitos

- Python 3.8 ou mais novo (não precisa instalar nenhuma biblioteca)
- VS Code com a extensão **Python** (da Microsoft)

## Como rodar

**Pelo VS Code (recomendado)**
1. Abra esta pasta no VS Code (*Arquivo › Abrir Pasta*).
2. Aperte **F5** (ou *Executar › Iniciar Depuração*) e escolha **Simulador das 3 placas (versão antiga)**.
3. O navegador abre em **http://127.0.0.1:8765** com as 3 placas.

**Pelo terminal**
```
python iniciar_placas.py
```

Para parar: **Shift+F5** no VS Code, ou **Ctrl+C** no terminal.

> Quer ver dentro do VS Code? `Ctrl+Shift+P` › **Simple Browser: Show** › `http://127.0.0.1:8765`

## Como testar o fluxo

1. **Leitor:** clique em **LER (gatilho)** — o LED de status fica azul por 5 s.
2. **Leitor:** clique em **TAG C0001234** (equivale a encostar o leitor na etiqueta).
3. **Estação:** o LCD mostra `Cx C0001234 / Separando 0/3`.
4. **Concentrador:** acendem FR010101 (3), FR010103 (1) e FR010202 (12).
5. **Concentrador:** clique no botão de cada endereço aceso para confirmar.
   Segure ~1 s para marcar falta (a quantidade diminui 1 e o LED fica vermelho).
6. Quando todos apagam, a estação mostra `FIM C0001234` e o leitor está livre para a próxima caixa.

### Alto giro + baixo giro no mesmo concentrador

| Área | Como funciona |
|---|---|
| **Alto giro** (FR0101xx, FR0102xx) | Flow rack com LED + display + botão por endereço. Todos os itens acendem juntos. |
| **Baixo giro** (FR0103xx) | Uma estação só: LCD com o **endereço**, display com a **quantidade** e botão **OK**. Mostra um item por vez, **na ordem da rota**; o OK passa para o próximo. |

A caixa só termina quando o alto giro **e** o baixo giro estão concluídos.

- **TAG C0001234** — mista: 3 itens de alto giro + 2 de baixo giro (FR010302 e depois FR010305).
- **TAG C0001238** — só baixo giro: FR010301 → FR010304 → FR010307 (na ordem da rota).
- No baixo giro, segure o **OK** ~1 s para marcar falta.

A ordem da rota e os endereços de baixo giro ficam na lista `BAIXO_GIRO` do
`placas/concentrador/main.py`.

Outros testes: **TAG C0009999** (caixa que não existe), ler uma caixa com outra em separação
(estação ocupada), **CANCELA** na estação, e digitar `CAIXAS` no Monitor Serial da estação.

O painel **Tráfego MQTT**, no fim da página, mostra cada mensagem que passa entre as placas.

## Estrutura

```
iniciar_placas.py          sobe o broker, as 3 placas e a página
placas/
  leitor/       main.py, diagram.json   (Placa 3)
  estacao/      main.py, diagram.json   (Placa 1)
  concentrador/ main.py, diagram.json   (Placa 2)
simulador/
  placa.py                 MicroPython simulado (Pin, PWM, I2C, NeoPixel, Wi-Fi, socket...)
                           + chips emulados: display TM1637 e LCD 16x2 I2C
  broker.py                broker MQTT local
  servidor.py              página e API
  web/index.html           desenho das placas
```

## Alterando o código

- Edite o `main.py` da placa e rode o simulador de novo (Shift+F5, F5).
- O mesmo arquivo pode ser colado no Wokwi ou gravado na placa de verdade.
- Breakpoints no `main.py` das placas funcionam ao rodar com F5.
- O `CANAL` e o `BROKER` do código são ignorados aqui: tudo vai para o broker local.

## Limites da simulação

- **Bluetooth não é simulado.** O leitor fala com a estação por Wi-Fi/MQTT.
- **O leitor NFC (PN532) é simulado pelos botões de etiqueta.** A leitura real
  só é testada com a placa física.
- Portas usadas: **8765** (página) e **18830** (broker). Se alguma estiver ocupada,
  troque em `iniciar_placas.py`.
