"""
SIMULADOR PICK-TO-LIGHT (local, sem internet)

Abre a versão unificada: estação 3D + comunicação (HTTPS, SQL, MQTT e RS-485) sincronizadas.

Uso:   python iniciar.py                abre o simulador unificado
       python iniciar.py --3d           abre só a estação 3D
       python iniciar.py --comunicacao  abre só a demonstração da comunicação
       python iniciar.py --placas       abre o simulador antigo das 3 placas (MicroPython)
Abre:  http://127.0.0.1:8780
"""

import http.server
import os
import socketserver
import subprocess
import sys
import threading
import webbrowser

AQUI = os.path.dirname(os.path.abspath(__file__))
PORTA = 8780
PAGINAS = {
    "--3d": "simulador-3d/index.html",
    "--comunicacao": "demo-comunicacao/index.html",
}


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=AQUI, **k)

    def end_headers(self):
        # evita que o navegador mostre uma versão antiga guardada em cache
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def main():
    if "--placas" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--placas"]
        sys.exit(subprocess.call([sys.executable, os.path.join(AQUI, "iniciar_placas.py"), *args]))
    pagina = "simulador-unificado/index.html"
    for chave, caminho in PAGINAS.items():
        if chave in sys.argv:
            pagina = caminho
    url = f"http://127.0.0.1:{PORTA}/{pagina}"
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORTA), Silencioso) as srv:
        print(f"Simulador Pick-to-Light em {url}")
        print("Para parar: Ctrl+C (ou Shift+F5 no VS Code)")
        if "--sem-navegador" not in sys.argv:
            threading.Timer(0.8, lambda: webbrowser.open(url)).start()
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
