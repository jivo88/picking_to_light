"""Abre o simulador 3D no navegador.

Também funciona com duplo clique em index.html (não precisa de internet).
Este script só sobe um servidor local, útil se o navegador bloquear arquivos locais.
Uso:  python iniciar_3d.py            (porta 8770)
      python iniciar_3d.py --auto     (já começa com o operador automático)
"""
import http.server, os, socketserver, sys, threading, webbrowser

PORTA = 8770
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

def main():
    url = f"http://localhost:{PORTA}/index.html" + ("?auto" if "--auto" in sys.argv else "")
    with socketserver.TCPServer(("127.0.0.1", PORTA), Silencioso) as srv:
        print(f"Simulador 3D em {url}  (Ctrl+C para sair)")
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
