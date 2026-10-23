"""Servidor da pagina do simulador e API usada por ela."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PASTA_WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


def criar_servidor(porta, placas, broker):
    por_id = {p.id: p for p in placas}

    class Atendente(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass                                    # sem poluir o terminal

        def _json(self, obj, codigo=200):
            corpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(codigo)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)

        def do_GET(self):
            url = urlparse(self.path)
            if url.path in ("/", "/index.html"):
                with open(os.path.join(PASTA_WEB, "index.html"), "rb") as f:
                    corpo = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(corpo)))
                self.end_headers()
                self.wfile.write(corpo)
            elif url.path == "/api/placas":
                self._json([{"id": p.id, "titulo": p.titulo, "diagrama": p.diagrama}
                            for p in placas])
            elif url.path == "/api/estado":
                q = parse_qs(url.query)
                resposta = {"placas": {}, "broker": broker.estado(int(q.get("broker", ["0"])[0]))}
                for p in placas:
                    desde = int(q.get("log_" + p.id, ["0"])[0])
                    resposta["placas"][p.id] = p.estado(desde)
                self._json(resposta)
            else:
                self._json({"erro": "nao encontrado"}, 404)

        def do_POST(self):
            tamanho = int(self.headers.get("Content-Length", "0") or 0)
            try:
                dados = json.loads(self.rfile.read(tamanho) or b"{}")
            except ValueError:
                return self._json({"erro": "json invalido"}, 400)
            placa = por_id.get(dados.get("placa"))
            if placa is None:
                return self._json({"erro": "placa desconhecida"}, 404)
            if self.path == "/api/botao":
                placa.botao(int(dados["gp"]), bool(dados["apertado"]))
            elif self.path == "/api/serial":
                placa.entrada_serial.put(str(dados.get("texto", "")) + "\n")
            else:
                return self._json({"erro": "nao encontrado"}, 404)
            self._json({"ok": True})

    return ThreadingHTTPServer(("127.0.0.1", porta), Atendente)
