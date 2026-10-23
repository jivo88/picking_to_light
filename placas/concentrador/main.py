# =====================================================================
# PLACA 2 - CONCENTRADOR DA ZONA FR01  (Raspberry Pi Pico W)
#
# Recebe o pedido pela REDE (MQTT), acende os enderecos do flow rack
# e devolve as confirmacoes dos botoes pela rede.
#
# ALTO GIRO - flow rack: 2 niveis x 4 posicoes = 8 enderecos.
#   Cada endereco: display de quantidade (TM1637) + LED (WS2812) + botao.
#   Todos os itens do pedido acendem ao mesmo tempo.
#
# BAIXO GIRO - prateleira sem LED por posicao (FR0103xx).
#   Uma estacao so: LCD com o ENDERECO + display com a QUANTIDADE + botao OK.
#   Mostra UM item por vez, na ordem da rota; o OK passa para o proximo.
#
# A caixa so termina quando o alto giro E o baixo giro estao concluidos.
#
# Rode junto com a PLACA 1 (estacao) e a PLACA 3 (leitor de pulso).
# IMPORTANTE: CANAL precisa ser IGUAL nos tres projetos.
#
# Botao do endereco ou OK do baixo giro:
#   toque curto     = confirma a retirada
#   segurar ~1 seg  = diminui 1 na quantidade (falta de produto)
# =====================================================================

from machine import Pin, I2C
from neopixel import NeoPixel
import network
import socket
import select
import struct
import json
import time

# ---------------- rede ----------------
CANAL = "ptl-teste-4471"           # troque por um codigo seu (igual nos 3 projetos)
BROKER = "broker.hivemq.com"       # servidor MQTT publico de testes
TOPICO_CMD = CANAL + "/zona01/cmd"  # estacao -> concentrador
TOPICO_EVT = CANAL + "/zona01/evt"  # concentrador -> estacao

# ---------------- hardware ----------------
ZONA = "FR01"
PIN_LED = 2                        # dado da corrente de WS2812
PIN_CLK = 3                        # CLK compartilhado dos TM1637
LONG_MS = 800
DEBOUNCE_MS = 30

# MAPA ENDERECO -> HARDWARE (no sistema real esse cadastro fica no MFC)
# (endereco, indice do LED, pino DIO do display, pino do botao)
MAPA = [
    ("FR010101", 0, 4, 5),
    ("FR010102", 1, 6, 7),
    ("FR010103", 2, 8, 9),
    ("FR010104", 3, 10, 11),
    ("FR010201", 4, 12, 13),
    ("FR010202", 5, 14, 15),
    ("FR010203", 6, 16, 17),
    ("FR010204", 7, 18, 19),
]

# BAIXO GIRO: enderecos desta zona sem LED proprio, NA ORDEM DA ROTA de coleta
BAIXO_GIRO = ["FR010301", "FR010302", "FR010303", "FR010304",
              "FR010305", "FR010306", "FR010307", "FR010308"]
PIN_BG_SDA = 20                    # LCD 16x2 I2C (endereco do item)
PIN_BG_SCL = 21
PIN_BG_DIO = 22                    # display de quantidade (TM1637, CLK compartilhado)
PIN_BG_BTN = 26                    # botao OK
PIN_BG_LED = 27                    # LED "tem item no baixo giro"

VERDE = (0, 180, 0)
VERMELHO = (200, 0, 0)
BRANCO = (150, 150, 150)
APAGADO = (0, 0, 0)
SEG = (0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F)


# =====================================================================
# Cliente MQTT minimo (MQTT 3.1.1, QoS 0) - sem bibliotecas externas
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
        self._enviar(0x10, corpo)                       # CONNECT
        resp = self._ler(4)                             # CONNACK
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
            self._enviar(0xC0, b"")                     # PINGREQ (mantem viva)
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
            if (cab & 0xF0) == 0x30 and self.ao_receber:  # PUBLISH recebido
                tl = struct.unpack("!H", dados[:2])[0]
                topico = dados[2:2 + tl].decode()
                ini = 2 + tl + (2 if cab & 0x06 else 0)
                self.ao_receber(topico, dados[ini:])


# =====================================================================
# Driver TM1637 (CLK compartilhado entre os displays)
# =====================================================================
class TM1637:
    def __init__(self, clk, dio):
        self.clk = clk
        self.dio = dio
        self.dio.init(Pin.OUT, value=1)

    def _espera(self):
        time.sleep_us(5)

    def _start(self):
        self.dio(1)
        self.clk(1)
        self._espera()
        self.dio(0)
        self._espera()
        self.clk(0)
        self._espera()

    def _stop(self):
        self.clk(0)
        self.dio(0)
        self._espera()
        self.clk(1)
        self._espera()
        self.dio(1)
        self._espera()

    def _byte(self, b):
        for i in range(8):
            self.dio((b >> i) & 1)
            self._espera()
            self.clk(1)
            self._espera()
            self.clk(0)
            self._espera()
        self.dio.init(Pin.IN, Pin.PULL_UP)              # ACK
        self.clk(1)
        self._espera()
        self.clk(0)
        self._espera()
        self.dio.init(Pin.OUT, value=0)

    def _enviar(self, segs, ligado=True):
        self._start()
        self._byte(0x40)
        self._stop()
        self._start()
        self._byte(0xC0)
        for s in segs:
            self._byte(s)
        self._stop()
        self._start()
        self._byte(0x8F if ligado else 0x80)
        self._stop()

    def numero(self, n):
        n = max(0, min(9999, n))
        segs = [0, 0, 0, 0]
        for i, ch in enumerate(reversed(str(n))):
            segs[3 - i] = SEG[int(ch)]
        self._enviar(segs)

    def todos(self):
        self._enviar([0xFF, 0xFF, 0xFF, 0xFF])

    def apagar(self):
        self._enviar([0, 0, 0, 0], ligado=False)


# =====================================================================
# LCD 16x2 I2C (PCF8574, endereco 0x27) - usado no baixo giro
# =====================================================================
class LCD:
    def __init__(self, i2c, addr=0x27):
        self.i2c = i2c
        self.addr = addr
        self.luz = 0x08
        time.sleep_ms(50)
        for _ in range(3):
            self._meio(0x30, 0)
            time.sleep_ms(5)
        self._meio(0x20, 0)
        time.sleep_ms(1)
        for c in (0x28, 0x0C, 0x06, 0x01):
            self._cmd(c)

    def _w(self, b):
        self.i2c.writeto(self.addr, bytes([b | self.luz]))

    def _meio(self, n, rs):
        self._w(n | rs | 0x04)
        self._w(n | rs)

    def _byte(self, b, rs):
        self._meio(b & 0xF0, rs)
        self._meio((b << 4) & 0xF0, rs)

    def _cmd(self, c):
        self._byte(c, 0)
        if c in (0x01, 0x02):
            time.sleep_ms(2)

    def linha(self, n, txt):
        self._cmd(0x80 | (0x40 if n else 0x00))
        for ch in (txt + " " * 16)[:16]:
            self._byte(ord(ch), 1)


# =====================================================================
# Enderecos do flow rack
# =====================================================================
class Endereco:
    def __init__(self, codigo, led, display, botao):
        self.codigo = codigo
        self.led = led
        self.display = display
        self.botao = botao
        self.ativo = False
        self.qtd_pedida = 0
        self.qtd = 0
        self.estado_botao = 1
        self.mudou_em = 0
        self.apertou_em = 0


clk = Pin(PIN_CLK, Pin.OUT, value=1)
leds = NeoPixel(Pin(PIN_LED), len(MAPA))
enderecos = {}
for codigo, led, pin_dio, pin_btn in MAPA:
    enderecos[codigo] = Endereco(codigo, led, TM1637(clk, Pin(pin_dio)),
                                 Pin(pin_btn, Pin.IN, Pin.PULL_UP))

# =====================================================================
# Estacao de BAIXO GIRO: um item por vez, na ordem da rota
# =====================================================================
class BaixoGiro:
    def __init__(self):
        self.lcd = LCD(I2C(0, sda=Pin(PIN_BG_SDA), scl=Pin(PIN_BG_SCL), freq=100000))
        self.display = TM1637(clk, Pin(PIN_BG_DIO))
        self.botao = Pin(PIN_BG_BTN, Pin.IN, Pin.PULL_UP)
        self.led = Pin(PIN_BG_LED, Pin.OUT, value=0)
        self.fila = []          # [endereco, qtd_pedida, qtd] na ordem da rota
        self.caixa = None
        self.total = 0
        self.feitos = 0
        self.estado_botao = 1
        self.mudou_em = 0
        self.apertou_em = 0

    def ativo(self):
        return bool(self.fila)

    def carregar(self, itens, caixa):
        self.fila = [[end, qtd, qtd] for end, qtd in itens]
        self.caixa = caixa
        self.total = len(self.fila)
        self.feitos = 0
        self.mostrar_atual()

    def mostrar_atual(self):
        end, pedida, qtd = self.fila[0]
        self.lcd.linha(0, "End: " + end)
        self.lcd.linha(1, "%d/%d  Cx %s" % (self.feitos + 1, self.total, self.caixa))
        self.display.numero(qtd)
        self.led.value(1)

    def mostrar_livre(self):
        self.lcd.linha(0, "Baixo giro " + ZONA)
        self.lcd.linha(1, "Sem itens")
        self.display.apagar()
        self.led.value(0)

    def mostrar_concluido(self):
        self.lcd.linha(0, "Baixo giro ok")
        self.lcd.linha(1, "Aguarde alto gir")
        self.display.apagar()
        self.led.value(0)

    def limpar(self):
        self.fila = []
        self.caixa = None
        self.mostrar_livre()


baixo = BaixoGiro()

cliente = None
precisa_reconectar = False
caixa_atual = None
pedido_atual = None
confirmacoes = []


def enviar_evento(evento):
    global precisa_reconectar
    print("  -> rede:", evento)
    try:
        cliente.publicar(TOPICO_EVT, json.dumps(evento))
    except OSError as erro:
        print("ERRO ao enviar pela rede:", erro)
        precisa_reconectar = True


def acender(e, qtd):
    e.ativo = True
    e.qtd_pedida = qtd
    e.qtd = qtd
    e.display.numero(qtd)
    leds[e.led] = VERDE
    leds.write()


def apagar(e):
    e.ativo = False
    e.qtd = 0
    e.qtd_pedida = 0
    e.display.apagar()
    leds[e.led] = APAGADO
    leds.write()


def algum_aceso():
    for e in enderecos.values():
        if e.ativo:
            return True
    return False


def liberar():
    global caixa_atual, pedido_atual, confirmacoes
    caixa_atual = None
    pedido_atual = None
    confirmacoes = []


# ---------------- pedido recebido pela rede ----------------
def separar(caixa, pedido, itens):
    global caixa_atual, pedido_atual, confirmacoes
    if caixa_atual:
        enviar_evento({"tipo": "OCUPADA", "caixa": caixa, "atual": caixa_atual})
        return

    print("")
    print("== CAIXA %s | pedido %s | zona %s ==" % (caixa, pedido, ZONA))
    por_endereco = {}
    for end, qtd in itens:
        por_endereco[end] = por_endereco.get(end, 0) + int(qtd)

    acesos = 0
    itens_bg = []
    outra_zona = []
    alertas = []
    for end in sorted(por_endereco):
        qtd = por_endereco[end]
        if not end.startswith(ZONA):
            outra_zona.append(end)
            print("   OUTRA ZONA  %s qtd=%d" % (end, qtd))
        elif end in enderecos:
            acender(enderecos[end], qtd)
            acesos += 1
            print("   ALTO GIRO   %s qtd=%d (LED aceso)" % (end, qtd))
        elif end in BAIXO_GIRO:
            itens_bg.append((end, qtd))
        else:
            alertas.append(end)
            print("   ALERTA      %s qtd=%d sem display cadastrado" % (end, qtd))

    # baixo giro na ordem da rota de coleta
    itens_bg.sort(key=lambda item: BAIXO_GIRO.index(item[0]))
    for i, (end, qtd) in enumerate(itens_bg):
        print("   BAIXO GIRO  %s qtd=%d (%d o da rota)" % (end, qtd, i + 1))

    if acesos == 0 and not itens_bg:
        enviar_evento({"tipo": "LIBERA", "caixa": caixa,
                       "outra_zona": outra_zona, "alertas": alertas})
        return

    caixa_atual = caixa
    pedido_atual = pedido
    confirmacoes = []
    if itens_bg:
        baixo.carregar(itens_bg, caixa)
    enviar_evento({"tipo": "ACK", "caixa": caixa, "acesos": acesos + len(itens_bg),
                   "alto_giro": acesos, "baixo_giro": len(itens_bg),
                   "outra_zona": outra_zona, "alertas": alertas})


def cancelar():
    caixa = caixa_atual
    for e in enderecos.values():
        apagar(e)
    baixo.limpar()
    liberar()
    enviar_evento({"tipo": "CANCELADO", "caixa": caixa})


def ao_receber(topico, dados):
    try:
        msg = json.loads(dados.decode())
        tipo = msg.get("tipo")
        print("<- rede:", msg)
        if tipo == "SEPARAR":
            separar(msg["caixa"], msg.get("pedido"), msg["itens"])
        elif tipo == "CANCELA":
            cancelar()
        elif tipo == "PING":
            enviar_evento({"tipo": "ONLINE", "zona": ZONA, "enderecos": len(MAPA),
                           "baixo_giro": len(BAIXO_GIRO), "caixa": caixa_atual})
    except (ValueError, KeyError, TypeError) as erro:
        print("Mensagem invalida:", dados, erro)


# ---------------- botoes dos enderecos ----------------
def confirmar(e):
    if not e.ativo:
        print("INFO %s: botao apertado, mas nao tem item aqui" % e.codigo)
        return
    qtd = e.qtd
    pedida = e.qtd_pedida
    status = "ok" if qtd == pedida else "falta"
    confirmacoes.append([e.codigo, qtd, pedida])
    apagar(e)
    enviar_evento({"tipo": "BTN", "caixa": caixa_atual, "end": e.codigo,
                   "qtd": qtd, "pedida": pedida, "status": status, "origem": "alto_giro"})
    verificar_fim()


def verificar_fim():
    """A caixa termina quando o alto giro E o baixo giro estao concluidos."""
    if algum_aceso() or baixo.ativo():
        return
    enviar_evento({"tipo": "FIM", "caixa": caixa_atual, "pedido": pedido_atual,
                   "itens": confirmacoes})
    liberar()
    baixo.limpar()


# ---------------- botao OK do baixo giro ----------------
def confirmar_bg():
    if not baixo.ativo():
        print("INFO baixo giro: OK apertado, mas nao tem item")
        return
    end, pedida, qtd = baixo.fila.pop(0)
    baixo.feitos += 1
    status = "ok" if qtd == pedida else "falta"
    confirmacoes.append([end, qtd, pedida])
    enviar_evento({"tipo": "BTN", "caixa": caixa_atual, "end": end, "qtd": qtd,
                   "pedida": pedida, "status": status, "origem": "baixo_giro"})
    if baixo.ativo():
        print("Baixo giro: proximo endereco %s" % baixo.fila[0][0])
        baixo.mostrar_atual()
    elif algum_aceso():
        baixo.mostrar_concluido()
    verificar_fim()


def ajustar_bg():
    if not baixo.ativo():
        return
    item = baixo.fila[0]
    item[2] = max(0, item[2] - 1)
    baixo.display.numero(item[2])
    baixo.lcd.linha(1, "Falta: %d de %d" % (item[2], item[1]))
    enviar_evento({"tipo": "ADJ", "caixa": caixa_atual, "end": item[0],
                   "qtd": item[2], "pedida": item[1]})


def ler_botao_bg(agora):
    v = baixo.botao.value()
    if v == baixo.estado_botao:
        return
    if time.ticks_diff(agora, baixo.mudou_em) < DEBOUNCE_MS:
        return
    baixo.estado_botao = v
    baixo.mudou_em = agora
    if v == 0:
        baixo.apertou_em = agora
    elif time.ticks_diff(agora, baixo.apertou_em) >= LONG_MS:
        ajustar_bg()
    else:
        confirmar_bg()


def ajustar(e):
    if not e.ativo:
        return
    e.qtd = max(0, e.qtd - 1)
    e.display.numero(e.qtd)
    leds[e.led] = VERMELHO              # vermelho = quantidade ajustada
    leds.write()
    enviar_evento({"tipo": "ADJ", "caixa": caixa_atual, "end": e.codigo,
                   "qtd": e.qtd, "pedida": e.qtd_pedida})


def ler_botao(e, agora):
    v = e.botao.value()
    if v == e.estado_botao:
        return
    if time.ticks_diff(agora, e.mudou_em) < DEBOUNCE_MS:
        return
    e.estado_botao = v
    e.mudou_em = agora
    if v == 0:
        e.apertou_em = agora
    elif time.ticks_diff(agora, e.apertou_em) >= LONG_MS:
        ajustar(e)
    else:
        confirmar(e)


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
            conectar_wifi()
            if cliente:
                cliente.fechar()
            c = MQTT("ptl-conc-" + CANAL, BROKER)
            c.ao_receber = ao_receber
            c.conectar()
            c.assinar(TOPICO_CMD)
            cliente = c
            precisa_reconectar = False
            print("MQTT ok (%s). Ouvindo %s" % (BROKER, TOPICO_CMD))
            enviar_evento({"tipo": "ONLINE", "zona": ZONA, "enderecos": len(MAPA),
                           "baixo_giro": len(BAIXO_GIRO), "caixa": caixa_atual})
            return
        except OSError as erro:
            print("Falha na rede (%s). Nova tentativa em 3 s..." % erro)
            time.sleep(3)


# ---------------- auto-teste e loop principal ----------------
for e in enderecos.values():
    e.display.todos()
    leds[e.led] = BRANCO
leds.write()
baixo.display.todos()
baixo.led.value(1)
baixo.lcd.linha(0, "Concentrador")
baixo.lcd.linha(1, "Auto-teste...")
time.sleep_ms(500)
for e in enderecos.values():
    apagar(e)
baixo.limpar()

print("PLACA 2 - CONCENTRADOR zona %s (%d alto giro + %d baixo giro)"
      % (ZONA, len(MAPA), len(BAIXO_GIRO)))
conectar_rede()
print("Pronto. Aguardando pedidos da estacao de bipagem.")

while True:
    agora = time.ticks_ms()
    try:
        cliente.verificar()
    except OSError as erro:
        print("Conexao perdida:", erro)
        precisa_reconectar = True
    if precisa_reconectar:
        conectar_rede()
    for e in enderecos.values():
        ler_botao(e, agora)
    ler_botao_bg(agora)
    time.sleep_ms(5)
