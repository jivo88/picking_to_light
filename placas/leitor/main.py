# =====================================================================
# PLACA 3 - LEITOR NFC DE PULSO  (simulacao no Wokwi com Pico W)
#
# No real: ESP32-C3 Super Mini + PN532. O Wokwi nao tem o PN532, entao
# as ETIQUETAS sao botoes: clicar numa etiqueta = encostar o leitor nela.
#
# Como usar:
#   1. Clique em LER          -> o leitor liga por 5 s (LED azul)
#   2. Clique numa etiqueta   -> le a caixa e envia para a estacao
#   3. Resposta da estacao:
#        verde + 1 bip + vibra curto   = caixa aceita
#        vermelho + 3 bips + vibra longo = erro (caixa invalida, ocupada...)
#        vermelho piscando              = estacao nao respondeu
#
# LED de status: apagado = economizando bateria | azul = pronto para ler
#                amarelo = aguardando a estacao | verde/vermelho = resposta
#
# Rode junto com a PLACA 1 (estacao) e a PLACA 2 (concentrador).
# IMPORTANTE: CANAL precisa ser IGUAL nos tres projetos.
# =====================================================================

from machine import Pin, PWM
from neopixel import NeoPixel
import network
import socket
import select
import struct
import json
import time

# ---------------- rede ----------------
CANAL = "ptl-teste-4471"                    # igual nos 3 projetos
BROKER = "broker.hivemq.com"
TOPICO_TAG = CANAL + "/estacao01/tag"       # leitor -> estacao
TOPICO_RESP = CANAL + "/estacao01/tag_resp"  # estacao -> leitor
ID_LEITOR = "pulso01"

# ---------------- comportamento ----------------
ATIVO_MS = 5000          # tempo que o leitor fica ligado apos apertar LER
RESPOSTA_MS = 4000       # espera pela resposta da estacao
REPETE_MS = 2000         # ignora a mesma etiqueta encostada de novo

# ---------------- etiquetas simuladas (pino do botao -> conteudo) ----------
# No real o conteudo vem gravado na etiqueta NFC colada na caixa.
ETIQUETAS = [
    (6, "C0001234"),
    (7, "C0001235"),
    (8, "C0001236"),
    (9, "C0001237"),
    (10, "C0001238"),    # so baixo giro
    (11, "C0009999"),    # caixa que nao existe: testa o erro
]

PIN_LER = 14
PIN_STATUS = 2           # LED RGB (WS2812)
PIN_VIBRA = 16           # LED laranja no lugar do motor de vibracao
PIN_BUZZER = 15

AZUL = (0, 0, 120)
AMARELO = (150, 110, 0)
VERDE = (0, 150, 0)
VERMELHO = (160, 0, 0)
BRANCO = (40, 40, 40)
APAGADO = (0, 0, 0)


# =====================================================================
# Cliente MQTT minimo (MQTT 3.1.1, QoS 0) - igual ao das outras placas
# =====================================================================
class MQTT:
    def __init__(self, cid, host, port=1883):
        self.cid = cid
        self.host = host
        self.port = port
        self.sock = None
        self.poller = None
        self.ao_receber = None
        self.pid = 0
        self.ultimo_envio = 0

    def _tam(self, n):
        out = bytearray()
        while True:
            b = n & 0x7F
            n >>= 7
            if n:
                b |= 0x80
            out.append(b)
            if not n:
                return bytes(out)

    def _txt(self, s):
        if isinstance(s, str):
            s = s.encode()
        return struct.pack("!H", len(s)) + s

    def _enviar(self, tipo, corpo):
        self.sock.write(bytes([tipo]) + self._tam(len(corpo)) + corpo)
        self.ultimo_envio = time.ticks_ms()

    def _ler(self, n):
        buf = b""
        while len(buf) < n:
            parte = self.sock.read(n - len(buf))
            if not parte:
                raise OSError("conexao MQTT fechada")
            buf += parte
        return buf

    def conectar(self):
        endereco = socket.getaddrinfo(self.host, self.port)[0][-1]
        self.sock = socket.socket()
        self.sock.connect(endereco)
        corpo = (self._txt("MQTT") + bytes([4, 2]) +
                 struct.pack("!H", 60) + self._txt(self.cid))
        self._enviar(0x10, corpo)
        resp = self._ler(4)
        if resp[0] != 0x20 or resp[3] != 0:
            raise OSError("MQTT recusou a conexao")
        self.poller = select.poll()
        self.poller.register(self.sock, select.POLLIN)

    def fechar(self):
        try:
            self.sock.close()
        except Exception:
            pass

    def assinar(self, topico):
        self.pid += 1
        self._enviar(0x82, struct.pack("!H", self.pid) + self._txt(topico) + b"\x00")

    def publicar(self, topico, msg):
        if isinstance(msg, str):
            msg = msg.encode()
        self._enviar(0x30, self._txt(topico) + msg)

    def verificar(self):
        if time.ticks_diff(time.ticks_ms(), self.ultimo_envio) > 30000:
            self._enviar(0xC0, b"")
        while self.poller.poll(0):
            cab = self._ler(1)[0]
            n = 0
            mult = 1
            while True:
                b = self._ler(1)[0]
                n += (b & 0x7F) * mult
                if not b & 0x80:
                    break
                mult *= 128
            dados = self._ler(n) if n else b""
            if (cab & 0xF0) == 0x30 and self.ao_receber:
                tl = struct.unpack("!H", dados[:2])[0]
                topico = dados[2:2 + tl].decode()
                ini = 2 + tl + (2 if cab & 0x06 else 0)
                self.ao_receber(topico, dados[ini:])


# =====================================================================
# Hardware do leitor
# =====================================================================
class Botao:
    def __init__(self, pino):
        self.pin = Pin(pino, Pin.IN, Pin.PULL_UP)
        self.estado = 1
        self.mudou_em = 0

    def apertou(self, agora):
        v = self.pin.value()
        if v != self.estado and time.ticks_diff(agora, self.mudou_em) > 30:
            self.estado = v
            self.mudou_em = agora
            return v == 0
        return False


status = NeoPixel(Pin(PIN_STATUS), 1)
vibra = Pin(PIN_VIBRA, Pin.OUT, value=0)
buzzer = PWM(Pin(PIN_BUZZER))
buzzer.duty_u16(0)
bt_ler = Botao(PIN_LER)
etiquetas = [(Botao(p), conteudo) for p, conteudo in ETIQUETAS]

cliente = None
precisa_reconectar = False

ativo_desde = None          # instante em que o leitor foi ligado
aguardando = None         # (etiqueta, instante do envio)
ultima_tag = ""
ultima_leitura = -10000
apagar_em = None          # quando apagar o LED depois de uma resposta


def cor(c):
    status[0] = c
    status.write()


def bip(vezes=1, ms=80, freq=2400):
    for i in range(vezes):
        buzzer.freq(freq)
        buzzer.duty_u16(30000)
        time.sleep_ms(ms)
        buzzer.duty_u16(0)
        if i < vezes - 1:
            time.sleep_ms(70)


def vibrar(ms):
    vibra.value(1)
    time.sleep_ms(ms)
    vibra.value(0)


def ok_feedback():
    cor(VERDE)
    bip(1, 120, 2600)
    vibrar(150)


def erro_feedback():
    cor(VERMELHO)
    bip(3, 70, 900)
    vibrar(500)


def enviar(msg):
    global precisa_reconectar
    print("  -> rede:", msg)
    try:
        cliente.publicar(TOPICO_TAG, json.dumps(msg))
        return True
    except OSError as erro:
        print("ERRO ao enviar pela rede:", erro)
        precisa_reconectar = True
        return False


# ---------------- acoes ----------------
def ligar_leitor(agora):
    global ativo_desde, apagar_em
    if aguardando:
        return
    ativo_desde = agora
    apagar_em = None
    cor(AZUL)
    bip(1, 30, 3200)
    print("Leitor LIGADO por %d s: encoste numa etiqueta" % (ATIVO_MS // 1000))


def ler_etiqueta(conteudo, agora):
    global ativo_desde, aguardando, ultima_tag, ultima_leitura
    if ativo_desde is None:
        print("Leitor desligado: aperte LER antes de encostar na etiqueta")
        return
    if aguardando:
        print("Aguardando resposta da leitura anterior")
        return
    if conteudo == ultima_tag and time.ticks_diff(agora, ultima_leitura) < REPETE_MS:
        return
    ultima_tag = conteudo
    ultima_leitura = agora
    ativo_desde = None
    print("")
    print("== ETIQUETA LIDA: %s ==" % conteudo)
    cor(AMARELO)
    bip(1, 40, 3000)
    if enviar({"tipo": "TAG", "tag": conteudo, "leitor": ID_LEITOR}):
        aguardando = (conteudo, agora)
    else:
        erro_feedback()


def ao_receber(topico, dados):
    global aguardando, apagar_em
    try:
        ev = json.loads(dados.decode())
    except ValueError:
        return
    if ev.get("leitor") != ID_LEITOR or not aguardando:
        return
    if ev.get("tag") != aguardando[0]:
        return
    print("<- rede:", ev)
    aguardando = None
    if ev.get("tipo") == "TAG_OK":
        print("Estacao aceitou a caixa %s" % ev.get("tag"))
        ok_feedback()
    else:
        print("Estacao recusou: %s" % ev.get("motivo"))
        erro_feedback()
    apagar_em = time.ticks_add(time.ticks_ms(), 1500)


# ---------------- conexao ----------------
def conectar_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Conectando ao Wi-Fi Wokwi-GUEST...")
        wlan.connect("Wokwi-GUEST", "")
        while not wlan.isconnected():
            time.sleep_ms(200)
    print("Wi-Fi ok, IP", wlan.ifconfig()[0])


def conectar_rede():
    global cliente, precisa_reconectar
    while True:
        try:
            cor(BRANCO)
            conectar_wifi()
            if cliente:
                cliente.fechar()
            c = MQTT("ptl-leitor-" + CANAL, BROKER)
            c.ao_receber = ao_receber
            c.conectar()
            c.assinar(TOPICO_RESP)
            cliente = c
            precisa_reconectar = False
            print("MQTT ok (%s). Canal: %s" % (BROKER, CANAL))
            cor(APAGADO)
            return
        except OSError as erro:
            print("Falha na rede (%s). Nova tentativa em 3 s..." % erro)
            cor(VERMELHO)
            time.sleep(3)


# ---------------- inicio e loop principal ----------------
print("PLACA 3 - LEITOR NFC DE PULSO (%s)" % ID_LEITOR)
conectar_rede()
bip(2, 40, 3000)
print("Pronto. Aperte LER e depois clique numa etiqueta.")

while True:
    agora = time.ticks_ms()
    try:
        cliente.verificar()
    except OSError as erro:
        print("Conexao perdida:", erro)
        precisa_reconectar = True
    if precisa_reconectar:
        conectar_rede()

    if bt_ler.apertou(agora):
        ligar_leitor(agora)
    for botao, conteudo in etiquetas:
        if botao.apertou(agora):
            ler_etiqueta(conteudo, agora)

    # desliga o leitor depois de 5 s sem leitura (economia de bateria)
    if ativo_desde is not None and time.ticks_diff(agora, ativo_desde) > ATIVO_MS:
        ativo_desde = None
        cor(APAGADO)
        print("Leitor desligado (economia de bateria)")

    # estacao nao respondeu
    if aguardando and time.ticks_diff(agora, aguardando[1]) > RESPOSTA_MS:
        print("Sem resposta da estacao. Ela esta rodando com o mesmo CANAL?")
        aguardando = None
        for _ in range(3):
            cor(VERMELHO)
            time.sleep_ms(150)
            cor(APAGADO)
            time.sleep_ms(150)
        bip(1, 400, 600)

    # apaga o LED um tempo depois da resposta
    if apagar_em is not None and time.ticks_diff(agora, apagar_em) > 0:
        apagar_em = None
        cor(APAGADO)

    time.sleep_ms(5)
