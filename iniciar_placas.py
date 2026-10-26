"""
SIMULADOR PICK-TO-LIGHT (local, sem internet)

Roda as 3 placas com os MESMOS main.py e diagram.json do Wokwi:
  Placa 3 - leitor de pulso  ->  Placa 1 - estacao  ->  Placa 2 - concentrador
As placas conversam por um broker MQTT que sobe junto, na sua maquina.

Uso:   python iniciar_placas.py
Abre:  http://127.0.0.1:8765
"""

import os
import sys
import time
import webbrowser

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

from simulador.broker import Broker          # noqa: E402
from simulador.placa import Placa            # noqa: E402
from simulador.servidor import criar_servidor  # noqa: E402

PORTA_PAGINA = 8765
PORTA_BROKER = 18830     # porta propria para nao brigar com um Mosquitto instalado

PLACAS = [
    # (id, titulo, pasta) - na ordem do fluxo, da esquerda para a direita
    ("leitor", "Placa 3 · Leitor de pulso", "placas/leitor"),
    ("estacao", "Placa 1 · Estação de bipagem", "placas/estacao"),
    ("concentrador", "Placa 2 · Concentrador FR01", "placas/concentrador"),
]
ORDEM_PARTIDA = ["concentrador", "estacao", "leitor"]


def main():
    abrir = "--sem-navegador" not in sys.argv

    broker = Broker(PORTA_BROKER)
    try:
        broker.iniciar()
    except OSError as erro:
        print("Nao consegui abrir a porta %d do broker: %s" % (PORTA_BROKER, erro))
        sys.exit(1)

    placas = []
    for ident, titulo, pasta in PLACAS:
        base = os.path.join(AQUI, pasta)
        placas.append(Placa(ident, titulo, os.path.join(base, "main.py"),
                            os.path.join(base, "diagram.json"), PORTA_BROKER))

    servidor = criar_servidor(PORTA_PAGINA, placas, broker)
    url = "http://127.0.0.1:%d" % PORTA_PAGINA

    por_id = {p.id: p for p in placas}
    for ident in ORDEM_PARTIDA:
        por_id[ident].iniciar()
        time.sleep(0.4)

    print("")
    print("=" * 60)
    print(" Simulador rodando em %s" % url)
    print(" Broker MQTT local na porta %d" % PORTA_BROKER)
    print(" Ctrl+C para parar")
    print("=" * 60)
    if abrir:
        webbrowser.open(url)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nSimulador encerrado.")


if __name__ == "__main__":
    main()
