"""
Simula uma placa (Raspberry Pi Pico W) rodando o main.py em MicroPython,
SEM alterar o codigo: os modulos machine, neopixel, network, socket,
select, time e sys sao trocados por versoes simuladas, so para esta placa.

O estado (LEDs, displays, LCD, buzzer, rede) fica em Placa e e lido pela
pagina web. As ligacoes vem do proprio diagram.json do Wokwi.
"""

import builtins
import collections
import json
import queue
import select as _select_real
import socket as _socket_real
import threading
import time as _time_real
import traceback
import types

_T0 = _time_real.monotonic()


# =====================================================================
# Ligacoes do diagram.json -> qual GPIO esta ligado em cada pino de peca
# =====================================================================
def mapear_gpios(diagrama):
    pai = {}

    def achar(x):
        pai.setdefault(x, x)
        while pai[x] != x:
            pai[x] = pai[pai[x]]
            x = pai[x]
        return x

    def unir(a, b):
        pai[achar(a)] = achar(b)

    for c in diagrama.get("connections", []):
        unir(c[0], c[1])
    for p in diagrama.get("parts", []):
        if p["type"] == "wokwi-resistor":          # resistor passa o sinal
            unir(p["id"] + ":1", p["id"] + ":2")

    gp_da_rede = {}
    for no in list(pai):
        if no.startswith("pico:GP"):
            gp_da_rede[achar(no)] = int(no[len("pico:GP"):])

    def gpio(pino):
        if pino not in pai:
            return None
        return gp_da_rede.get(achar(pino))

    return gpio


# =====================================================================
# Chips emulados
# =====================================================================
DIGITOS = {0x3F: "0", 0x06: "1", 0x5B: "2", 0x4F: "3", 0x66: "4", 0x6D: "5",
           0x7D: "6", 0x07: "7", 0x7F: "8", 0x6F: "9", 0xFF: "8", 0x00: " ",
           0x40: "-"}


class ChipTM1637:
    """Decodifica o protocolo do TM1637 observando os pinos CLK e DIO."""

    def __init__(self, placa, clk, dio):
        self.placa = placa
        self.clk = clk
        self.dio = dio
        self.ativo = False
        self.bits = 0
        self.byte = 0
        self.bytes = []
        self.segs = [0, 0, 0, 0]
        self.ligado = False

    def mudou(self, gp, v):
        clk = self.placa.niveis.get(self.clk, 1)
        dio = self.placa.niveis.get(self.dio, 1)
        if gp == self.dio and clk == 1:
            if v == 0:                       # START
                self.ativo = True
                self.bits = 0
                self.byte = 0
                self.bytes = []
            elif self.ativo:                 # STOP
                self.ativo = False
                self._processar()
        elif gp == self.clk and v == 1 and self.ativo:
            if self.bits < 8:
                self.byte |= (dio & 1) << self.bits
                self.bits += 1
            else:                            # 9o pulso = ACK
                self.bytes.append(self.byte)
                self.bits = 0
                self.byte = 0

    def _processar(self):
        if not self.bytes:
            return
        cmd = self.bytes[0]
        if (cmd & 0xC0) == 0xC0:             # endereco + dados
            end = cmd & 0x03
            for i, b in enumerate(self.bytes[1:]):
                if end + i < 4:
                    self.segs[end + i] = b
        elif (cmd & 0xF0) == 0x80:           # liga/desliga display
            self.ligado = bool(cmd & 0x08)

    def texto(self):
        if not self.ligado:
            return ""
        return "".join(DIGITOS.get(s, DIGITOS.get(s & 0x7F, "?")) for s in self.segs)


class ChipLCD:
    """LCD 16x2 HD44780 atras de um PCF8574 (I2C 0x27)."""

    def __init__(self):
        self.linhas = [[" "] * 16, [" "] * 16]
        self.modo4 = False
        self.meio = None
        self.ultimo = 0
        self.linha = 0
        self.coluna = 0
        self.luz = False

    def escrever(self, dados):
        for b in dados:
            self.luz = bool(b & 0x08)
            if (self.ultimo & 0x04) and not (b & 0x04):   # borda de descida do E
                self._nibble(self.ultimo & 0xF0, self.ultimo & 0x01)
            self.ultimo = b

    def _nibble(self, n, rs):
        if not self.modo4:
            if n == 0x20:
                self.modo4 = True
            return
        if self.meio is None:
            self.meio = (n, rs)
            return
        valor = self.meio[0] | (n >> 4)
        rs = self.meio[1]
        self.meio = None
        if rs:
            if self.coluna < 16:
                self.linhas[self.linha][self.coluna] = chr(valor)
            self.coluna += 1
        elif valor == 0x01:
            self.linhas = [[" "] * 16, [" "] * 16]
            self.linha = 0
            self.coluna = 0
        elif valor & 0x80:
            end = valor & 0x7F
            self.linha = 1 if end >= 0x40 else 0
            self.coluna = end & 0x3F

    def texto(self):
        return ["".join(l) for l in self.linhas]


# =====================================================================
# Placa
# =====================================================================
class Placa:
    def __init__(self, ident, titulo, arquivo_main, arquivo_diagrama, porta_broker):
        self.id = ident
        self.titulo = titulo
        self.arquivo_main = arquivo_main
        with open(arquivo_diagrama, encoding="utf-8") as f:
            self.diagrama = json.load(f)
        self.porta_broker = porta_broker
        self.gpio = mapear_gpios(self.diagrama)

        self.trava = threading.RLock()
        self.niveis = {}           # gp -> 0/1 (saidas)
        self.modos = {}            # gp -> "in"/"out"
        self.apertados = set()     # gp de botoes apertados na tela
        self.ouvintes = collections.defaultdict(list)
        self.fitas = {}            # gp -> lista de cores (NeoPixel)
        self.pwm = {}              # gp -> duty
        self.lcd = ChipLCD()
        self.tms = {}              # id da peca -> ChipTM1637
        self.rede = {"wifi": False, "mqtt": False}
        self.erro = None
        self.entrada_serial = queue.Queue()
        self.log = collections.deque(maxlen=400)
        self.log_total = 0

        for p in self.diagrama.get("parts", []):
            if p["type"] == "wokwi-tm1637-7segment":
                clk = self.gpio(p["id"] + ":CLK")
                dio = self.gpio(p["id"] + ":DIO")
                if clk is not None and dio is not None:
                    chip = ChipTM1637(self, clk, dio)
                    self.tms[p["id"]] = chip
                    self.ouvintes[clk].append(chip.mudou)
                    self.ouvintes[dio].append(chip.mudou)

    # ---------------- pinos ----------------
    def definir(self, gp, v):
        with self.trava:
            if self.niveis.get(gp) == v:
                return
            self.niveis[gp] = v
            for cb in self.ouvintes.get(gp, ()):
                cb(gp, v)

    def ler(self, gp):
        with self.trava:
            if self.modos.get(gp) == "in":
                if gp in self.apertados:
                    return 0
                return self.niveis.get(gp, 1)
            return self.niveis.get(gp, 0)

    def botao(self, gp, apertado):
        with self.trava:
            if apertado:
                self.apertados.add(gp)
            else:
                self.apertados.discard(gp)

    def escrever_log(self, texto):
        with self.trava:
            for linha in texto.splitlines() or [""]:
                self.log.append(linha)
                self.log_total += 1
        try:
            print("[%s] %s" % (self.id, texto), flush=True)
        except UnicodeEncodeError:                      # terminal do Windows sem UTF-8
            print(("[%s] %s" % (self.id, texto)).encode("ascii", "replace").decode(), flush=True)

    # ---------------- estado para a pagina ----------------
    def estado(self, desde=0):
        with self.trava:
            primeiro = self.log_total - len(self.log)
            ini = max(desde, primeiro)
            linhas = list(self.log)[ini - primeiro:]
            pecas = {}
            for p in self.diagrama.get("parts", []):
                pid, tipo = p["id"], p["type"]
                if tipo == "wokwi-tm1637-7segment" and pid in self.tms:
                    pecas[pid] = {"texto": self.tms[pid].texto()}
                elif tipo == "wokwi-led":
                    gp = self.gpio(pid + ":A")
                    pecas[pid] = {"aceso": gp is not None and self.niveis.get(gp, 0) == 1}
                elif tipo == "wokwi-buzzer":
                    gp = self.gpio(pid + ":2")
                    pecas[pid] = {"tocando": gp is not None and self.pwm.get(gp, 0) > 0}
                elif tipo == "wokwi-lcd1602":
                    pecas[pid] = {"linhas": self.lcd.texto(), "luz": self.lcd.luz}
                elif tipo == "wokwi-pushbutton":
                    gp = self.gpio(pid + ":1.l")
                    pecas[pid] = {"gp": gp, "apertado": gp in self.apertados}
            for pid, cor in self._cores_neopixel().items():
                pecas[pid] = {"cor": cor}
            return {
                "rede": dict(self.rede),
                "erro": self.erro,
                "pecas": pecas,
                "log": linhas,
                "log_total": self.log_total,
            }

    def _cores_neopixel(self):
        """Segue a corrente DIN -> DOUT a partir do GPIO de cada fita."""
        pixels = [p["id"] for p in self.diagrama.get("parts", []) if p["type"] == "wokwi-neopixel"]
        saida_para = {}
        for c in self.diagrama.get("connections", []):
            a, b = c[0], c[1]
            if a.endswith(":DOUT") and b.endswith(":DIN"):
                saida_para[a.split(":")[0]] = b.split(":")[0]
            elif b.endswith(":DOUT") and a.endswith(":DIN"):
                saida_para[b.split(":")[0]] = a.split(":")[0]
        cores = {}
        for pid in pixels:
            gp = self.gpio(pid + ":DIN")
            if gp is None or gp not in self.fitas:
                continue
            atual, i = pid, 0
            while atual and i < len(self.fitas[gp]):
                cores[atual] = list(self.fitas[gp][i])
                atual = saida_para.get(atual)
                i += 1
        for pid in pixels:
            cores.setdefault(pid, [0, 0, 0])
        return cores

    # ---------------- execucao ----------------
    def iniciar(self):
        t = threading.Thread(target=self._rodar, name="placa-" + self.id, daemon=True)
        t.start()

    def _rodar(self):
        try:
            with open(self.arquivo_main, encoding="utf-8") as f:
                codigo = f.read()
            globais = {"__name__": "__main__", "__builtins__": self._builtins()}
            exec(compile(codigo, self.arquivo_main, "exec"), globais)
        except Exception:
            self.erro = traceback.format_exc().strip().splitlines()[-1]
            self.escrever_log("ERRO NA PLACA:\n" + traceback.format_exc())

    def _builtins(self):
        modulos = criar_modulos(self)
        importar_real = builtins.__import__

        def importar(nome, globals=None, locals=None, fromlist=(), level=0):
            if nome in modulos:
                return modulos[nome]
            return importar_real(nome, globals, locals, fromlist, level)

        def imprimir(*args, sep=" ", end="\n", **kw):
            texto = sep.join(str(a) for a in args)
            if end != "\n":
                texto += end
            self.escrever_log(texto)

        b = dict(builtins.__dict__)
        b["__import__"] = importar
        b["print"] = imprimir
        return b


# =====================================================================
# Modulos MicroPython simulados (um conjunto por placa)
# =====================================================================
def criar_modulos(placa):
    # ---------------- machine ----------------
    class Pin:
        OUT = 1
        IN = 0
        PULL_UP = 2
        PULL_DOWN = 3

        def __init__(self, n, mode=-1, pull=-1, value=None):
            self.n = n
            self.init(mode, pull, value=value)

        def init(self, mode=-1, pull=-1, value=None):
            if mode == Pin.IN:
                placa.modos[self.n] = "in"
                placa.definir(self.n, 1 if pull == Pin.PULL_UP else 0)
            elif mode == Pin.OUT:
                placa.modos[self.n] = "out"
            if value is not None:
                placa.definir(self.n, 1 if value else 0)

        def value(self, v=None):
            if v is None:
                return placa.ler(self.n)
            placa.definir(self.n, 1 if v else 0)

        __call__ = value

        def on(self):
            self.value(1)

        def off(self):
            self.value(0)

    class PWM:
        def __init__(self, pino, freq=1000, duty_u16=0):
            self.n = pino.n
            placa.pwm[self.n] = duty_u16

        def freq(self, f=None):
            return 1000

        def duty_u16(self, d=None):
            if d is not None:
                placa.pwm[self.n] = d
            return placa.pwm.get(self.n, 0)

        def deinit(self):
            placa.pwm[self.n] = 0

    class I2C:
        def __init__(self, *a, **k):
            pass

        def writeto(self, endereco, dados, stop=True):
            if endereco == 0x27:
                with placa.trava:
                    placa.lcd.escrever(bytes(dados))
            return len(dados)

        def scan(self):
            return [0x27]

    machine = types.ModuleType("machine")
    machine.Pin = Pin
    machine.PWM = PWM
    machine.I2C = I2C

    # ---------------- neopixel ----------------
    class NeoPixel:
        def __init__(self, pino, n):
            self.n_pino = pino.n
            self.buf = [(0, 0, 0)] * n
            placa.fitas[self.n_pino] = list(self.buf)

        def __len__(self):
            return len(self.buf)

        def __setitem__(self, i, cor):
            self.buf[i] = tuple(cor)

        def __getitem__(self, i):
            return self.buf[i]

        def fill(self, cor):
            self.buf = [tuple(cor)] * len(self.buf)

        def write(self):
            with placa.trava:
                placa.fitas[self.n_pino] = list(self.buf)

    neopixel = types.ModuleType("neopixel")
    neopixel.NeoPixel = NeoPixel

    # ---------------- network ----------------
    class WLAN:
        def __init__(self, interface=0):
            pass

        def active(self, a=None):
            return True

        def connect(self, ssid=None, senha=None):
            placa.rede["wifi"] = True

        def isconnected(self):
            return placa.rede["wifi"]

        def ifconfig(self):
            return ("10.13.37.%d" % (10 + len(placa.id)), "255.255.255.0", "10.13.37.1", "8.8.8.8")

    network = types.ModuleType("network")
    network.STA_IF = 0
    network.AP_IF = 1
    network.WLAN = WLAN

    # ---------------- socket (sempre vai para o broker local) ----------------
    class Socket:
        def __init__(self, *a, **k):
            self._sock = _socket_real.socket(_socket_real.AF_INET, _socket_real.SOCK_STREAM)

        def connect(self, endereco):
            try:
                self._sock.connect(endereco)
                placa.rede["mqtt"] = True
            except OSError:
                placa.rede["mqtt"] = False
                raise

        def write(self, dados):
            try:
                self._sock.sendall(dados)
            except OSError:
                placa.rede["mqtt"] = False
                raise
            return len(dados)

        send = write

        def read(self, n):
            try:
                dados = self._sock.recv(n)
            except OSError:
                placa.rede["mqtt"] = False
                raise
            if not dados:
                placa.rede["mqtt"] = False
            return dados

        recv = read

        def setblocking(self, b):
            self._sock.setblocking(b)

        def settimeout(self, t):
            self._sock.settimeout(t)

        def close(self):
            placa.rede["mqtt"] = False
            try:
                self._sock.close()
            except OSError:
                pass

    def getaddrinfo(host, porta, *a, **k):
        # qualquer servidor MQTT do codigo vira o broker local
        return [(2, 1, 0, "", ("127.0.0.1", placa.porta_broker))]

    socket = types.ModuleType("socket")
    socket.socket = Socket
    socket.getaddrinfo = getaddrinfo
    socket.AF_INET = 2
    socket.SOCK_STREAM = 1

    # ---------------- sys.stdin (caixa de texto da pagina) ----------------
    class EntradaSerial:
        def __init__(self):
            self.pendente = ""

        def pronto(self):
            while True:
                try:
                    self.pendente += placa.entrada_serial.get_nowait()
                except queue.Empty:
                    break
            return bool(self.pendente)

        def read(self, n=1):
            self.pronto()
            dados, self.pendente = self.pendente[:n], self.pendente[n:]
            return dados

    sys_mod = types.ModuleType("sys")
    sys_mod.stdin = EntradaSerial()
    sys_mod.platform = "rp2"
    sys_mod.implementation = types.SimpleNamespace(name="micropython")

    # ---------------- select ----------------
    POLLIN = 1

    class Poll:
        def __init__(self):
            self.objetos = []

        def register(self, obj, mascara=POLLIN):
            if obj not in self.objetos:
                self.objetos.append(obj)

        def unregister(self, obj):
            if obj in self.objetos:
                self.objetos.remove(obj)

        def poll(self, espera=-1):
            prontos = []
            socks = []
            for o in self.objetos:
                if isinstance(o, Socket):
                    socks.append(o)
                elif hasattr(o, "pronto") and o.pronto():
                    prontos.append((o, POLLIN))
            if socks:
                try:
                    r, _, _ = _select_real.select([s._sock for s in socks], [], [], 0)
                except (OSError, ValueError):
                    r = [s._sock for s in socks]      # socket fechado: deixa a leitura falhar
                for s in socks:
                    if s._sock in r:
                        prontos.append((s, POLLIN))
            return prontos

    select = types.ModuleType("select")
    select.poll = Poll
    select.POLLIN = POLLIN
    select.POLLOUT = 4
    select.POLLHUP = 16
    select.POLLERR = 8

    # ---------------- time ----------------
    tempo = types.ModuleType("time")

    def ticks_ms():
        return int((_time_real.monotonic() - _T0) * 1000)

    tempo.ticks_ms = ticks_ms
    tempo.ticks_us = lambda: int((_time_real.monotonic() - _T0) * 1_000_000)
    tempo.ticks_diff = lambda a, b: a - b
    tempo.ticks_add = lambda a, b: a + b
    tempo.sleep = _time_real.sleep
    tempo.sleep_ms = lambda ms: _time_real.sleep(ms / 1000) if ms > 0 else None
    tempo.sleep_us = lambda us: None
    tempo.time = _time_real.time
    tempo.localtime = _time_real.localtime

    return {
        "machine": machine,
        "neopixel": neopixel,
        "network": network,
        "socket": socket,
        "select": select,
        "time": tempo,
        "sys": sys_mod,
    }
