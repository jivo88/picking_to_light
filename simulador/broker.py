"""
Broker MQTT local, minimo (MQTT 3.1.1, QoS 0), so para o simulador.
Roda numa thread e guarda o trafego para a pagina mostrar.
"""

import collections
import json
import socket
import struct
import threading
import time


class Broker:
    def __init__(self, porta):
        self.porta = porta
        self.assinaturas = {}            # topico -> set(conexoes)
        self.nomes = {}                  # conexao -> client id
        self.trava = threading.Lock()
        self.trafego = collections.deque(maxlen=300)
        self.trafego_total = 0
        self.clientes = 0

    # ---------------- leitura de pacotes ----------------
    @staticmethod
    def _ler(c, n):
        dados = b""
        while len(dados) < n:
            parte = c.recv(n - len(dados))
            if not parte:
                raise ConnectionError("cliente saiu")
            dados += parte
        return dados

    def _tamanho(self, c):
        mult, n = 1, 0
        while True:
            b = self._ler(c, 1)[0]
            n += (b & 0x7F) * mult
            if not b & 0x80:
                return n
            mult *= 128

    @staticmethod
    def _codificar_tamanho(n):
        out = bytearray()
        while True:
            b = n & 0x7F
            n >>= 7
            if n:
                b |= 0x80
            out.append(b)
            if not n:
                return bytes(out)

    def _registrar(self, origem, topico, carga):
        try:
            texto = json.dumps(json.loads(carga.decode()), ensure_ascii=False)
        except Exception:
            texto = carga.decode(errors="replace")
        with self.trava:
            self.trafego.append({"hora": time.strftime("%H:%M:%S"), "de": origem,
                                 "topico": topico, "msg": texto})
            self.trafego_total += 1

    # ---------------- atendimento de um cliente ----------------
    def _atender(self, c):
        with self.trava:
            self.clientes += 1
        try:
            while True:
                cab = c.recv(1)
                if not cab:
                    break
                tipo = cab[0] & 0xF0
                n = self._tamanho(c)
                dados = self._ler(c, n) if n else b""
                if tipo == 0x10:                                   # CONNECT
                    tl = struct.unpack("!H", dados[:2])[0]
                    pos = 2 + tl + 4
                    cl = struct.unpack("!H", dados[pos:pos + 2])[0]
                    nome = dados[pos + 2:pos + 2 + cl].decode(errors="replace")
                    with self.trava:
                        self.nomes[c] = nome
                    c.sendall(b"\x20\x02\x00\x00")
                elif tipo == 0x80:                                 # SUBSCRIBE
                    pid = dados[:2]
                    pos, codigos = 2, b""
                    while pos < len(dados):
                        tl = struct.unpack("!H", dados[pos:pos + 2])[0]
                        topico = dados[pos + 2:pos + 2 + tl].decode()
                        pos += 2 + tl + 1
                        with self.trava:
                            self.assinaturas.setdefault(topico, set()).add(c)
                        codigos += b"\x00"
                    c.sendall(bytes([0x90]) + self._codificar_tamanho(2 + len(codigos)) + pid + codigos)
                elif tipo == 0x30:                                 # PUBLISH
                    tl = struct.unpack("!H", dados[:2])[0]
                    topico = dados[2:2 + tl].decode()
                    ini = 2 + tl + (2 if cab[0] & 0x06 else 0)
                    carga = dados[ini:]
                    self._registrar(self.nomes.get(c, "?"), topico, carga)
                    pacote = (bytes([0x30]) + self._codificar_tamanho(2 + tl + len(carga)) +
                              dados[:2 + tl] + carga)
                    with self.trava:
                        destinos = list(self.assinaturas.get(topico, ()))
                    for d in destinos:
                        try:
                            d.sendall(pacote)
                        except OSError:
                            pass
                elif tipo == 0xC0:                                 # PINGREQ
                    c.sendall(b"\xd0\x00")
                elif tipo == 0xE0:                                 # DISCONNECT
                    break
        except (ConnectionError, OSError):
            pass
        finally:
            with self.trava:
                for s in self.assinaturas.values():
                    s.discard(c)
                self.nomes.pop(c, None)
                self.clientes -= 1
            try:
                c.close()
            except OSError:
                pass

    # ---------------- servidor ----------------
    def iniciar(self):
        self.servidor = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.servidor.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.servidor.bind(("127.0.0.1", self.porta))
        self.servidor.listen(16)
        threading.Thread(target=self._aceitar, name="broker", daemon=True).start()

    def _aceitar(self):
        while True:
            c, _ = self.servidor.accept()
            c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            threading.Thread(target=self._atender, args=(c,), daemon=True).start()

    def estado(self, desde=0):
        with self.trava:
            primeiro = self.trafego_total - len(self.trafego)
            ini = max(desde, primeiro)
            return {"clientes": self.clientes,
                    "trafego": list(self.trafego)[ini - primeiro:],
                    "trafego_total": self.trafego_total}
