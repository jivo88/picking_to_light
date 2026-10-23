# =====================================================================
# PLACA 1 - ESTACAO DE BIPAGEM  (Raspberry Pi Pico W)
#
# Le a etiqueta da caixa, busca os itens do pedido (simulando a
# resposta do MFC) e envia pela REDE (MQTT) para o concentrador
# da zona acender os enderecos. Mostra o andamento no LCD.
#
#   Leitor de pulso (PLACA 3) = envia pela rede a etiqueta lida
#   Botao azul  BIPAR CAIXA  = simula a leitura da proxima etiqueta
#   Botao vermelho CANCELA   = cancela a caixa em separacao
#   LED verde  LIVRE         = estacao pronta para bipar
#   LED amarelo SEPARANDO    = caixa em separacao no flow rack
#
# Tambem aceita no Serial Monitor: C0001234 | CAIXAS | CANCELA
#
# Rode junto com a PLACA 2 (concentrador) e a PLACA 3 (leitor de pulso).
# IMPORTANTE: CANAL precisa ser IGUAL nos tres projetos.
# =====================================================================

from machine import Pin, I2C
import network
import socket
import select
import struct
import json
import time
import sys

# ---------------- rede ----------------
CANAL = "ptl-teste-4471"           # troque por um codigo seu (igual nos 3 projetos)
BROKER = "broker.hivemq.com"
TOPICO_CMD = CANAL + "/zona01/cmd"  # estacao -> concentrador
TOPICO_EVT = CANAL + "/zona01/evt"  # concentrador -> estacao
TOPICO_TAG = CANAL + "/estacao01/tag"        # leitor de pulso -> estacao
TOPICO_TAG_RESP = CANAL + "/estacao01/tag_resp"  # estacao -> leitor de pulso
TIMEOUT_MS = 6000                   # espera pela resposta do concentrador

# ---------------- pedidos (simula a resposta do MFC) ----------------
# caixa: (pedido, [[endereco, quantidade], ...])
# FR0101xx / FR0102xx = alto giro (flow rack com LED)
# FR0103xx            = baixo giro (estacao com endereco + quantidade)
# FR02xxxx            = outra zona
PEDIDOS = {
    "C0001234": (78901, [["FR010101", 3], ["FR010103", 1], ["FR010202", 12],
                         ["FR010305", 2], ["FR010302", 1], ["FR020101", 2]]),
    "C0001235": (78902, [["FR010104", 5], ["FR010201", 2],
                         ["FR010204", 1]]),
    "C0001236": (78903, [["FR010102", 4], ["FR010199", 1]]),
    "C0001237": (78904, [["FR020301", 1]]),
    "C0001238": (78905, [["FR010307", 6], ["FR010301", 2], ["FR010304", 1]]),
}


# =====================================================================
# LCD 16x2 I2C (PCF8574, endereco 0x27)
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
# Hardware da estacao
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


lcd = LCD(I2C(0, sda=Pin(4), scl=Pin(5), freq=100000))
bt_bipar = Botao(14)
bt_cancela = Botao(15)
led_livre = Pin(16, Pin.OUT, value=0)
led_separando = Pin(17, Pin.OUT, value=0)

cliente = None
precisa_reconectar = False
lista_caixas = sorted(PEDIDOS)
proxima = 0

caixa_atual = None
aguardando_desde = None
total = 0
confirmados = 0

conc_online = False          # o concentrador ja respondeu?
servidor_ok = False          # o servidor MQTT devolveu o nosso proprio envio (eco)?
ultimo_ping = -10000
PING_MS = 5000


def mostrar(l1, l2=""):
    lcd.linha(0, l1)
    lcd.linha(1, l2)
    print("[LCD] %-16s | %s" % (l1, l2))


def atualizar_leds():
    led_livre.value(0 if caixa_atual else 1)
    led_separando.value(1 if caixa_atual else 0)


def encerrar_caixa():
    global caixa_atual, aguardando_desde, total, confirmados
    caixa_atual = None
    aguardando_desde = None
    total = 0
    confirmados = 0
    atualizar_leds()


def enviar(msg, topico=None):
    global precisa_reconectar
    print("  -> rede:", msg)
    try:
        cliente.publicar(topico or TOPICO_CMD, json.dumps(msg))
        return True
    except OSError as erro:
        print("ERRO ao enviar pela rede:", erro)
        precisa_reconectar = True
        return False


# ---------------- acoes do operador ----------------
def bipar(caixa):
    """Bipa a caixa. Devolve (True, "") ou (False, motivo)."""
    global caixa_atual, aguardando_desde
    if caixa_atual:
        mostrar("Termine a caixa", caixa_atual)
        return False, "estacao ocupada com " + caixa_atual
    if caixa not in PEDIDOS:
        mostrar("Caixa invalida", caixa)
        return False, "caixa nao encontrada"
    pedido, itens = PEDIDOS[caixa]
    print("")
    print("== BIP %s | pedido %d | %d itens ==" % (caixa, pedido, len(itens)))
    caixa_atual = caixa
    aguardando_desde = time.ticks_ms()
    atualizar_leds()
    mostrar("Cx " + caixa, "Enviando...")
    if not enviar({"tipo": "SEPARAR", "caixa": caixa, "pedido": pedido, "itens": itens}):
        mostrar("Falha na rede", "Tente de novo")
        encerrar_caixa()
        return False, "falha na rede"
    return True, ""


def tag_do_leitor(ev):
    """Etiqueta lida pelo leitor de pulso (PLACA 3)."""
    tag = str(ev.get("tag", "")).strip().upper()
    leitor = ev.get("leitor", "?")
    print("")
    print("<- leitor %s: etiqueta %s" % (leitor, tag))
    ok, motivo = bipar(tag)
    resposta = {"tipo": "TAG_OK" if ok else "TAG_ERRO", "tag": tag, "leitor": leitor}
    if not ok:
        resposta["motivo"] = motivo
    enviar(resposta, TOPICO_TAG_RESP)


def bipar_proxima():
    global proxima
    if caixa_atual:
        mostrar("Termine a caixa", caixa_atual)
        return
    caixa = lista_caixas[proxima % len(lista_caixas)]
    proxima += 1
    bipar(caixa)


def cancelar():
    global aguardando_desde
    if not caixa_atual:
        mostrar("Nada para", "cancelar")
        return
    aguardando_desde = time.ticks_ms()      # se o concentrador nao responder, libera
    mostrar("Cancelando", caixa_atual)
    enviar({"tipo": "CANCELA", "caixa": caixa_atual})


# ---------------- eventos que chegam do concentrador ----------------
def ao_receber(topico, dados):
    global aguardando_desde, total, confirmados, conc_online, servidor_ok
    try:
        ev = json.loads(dados.decode())
    except ValueError:
        print("Mensagem invalida:", dados)
        return
    tipo = ev.get("tipo")

    if topico == TOPICO_TAG:
        if tipo == "TAG":
            tag_do_leitor(ev)
        return

    if topico == TOPICO_CMD:
        # eco do nosso proprio envio: prova que o servidor MQTT esta ok
        if not servidor_ok:
            print("[diagnostico] servidor MQTT ok: recebeu e devolveu o nosso %s" % tipo)
        servidor_ok = True
        return

    print("<- rede:", ev)

    if tipo == "ONLINE":
        conc_online = True
        if caixa_atual:
            return
        mostrar("Concentrador ok", "Zona %s: BIPAR" % ev.get("zona"))
        return

    if ev.get("caixa") != caixa_atual:
        return                              # evento de outra caixa

    if tipo == "ACK":
        aguardando_desde = None
        total = ev.get("acesos", 0)
        confirmados = 0
        if "baixo_giro" in ev:
            print("   Alto giro: %d item(ns) | Baixo giro: %d item(ns)"
                  % (ev.get("alto_giro", 0), ev.get("baixo_giro", 0)))
        for end in ev.get("alertas", []):
            print("   ALERTA: %s sem display cadastrado!" % end)
        for end in ev.get("outra_zona", []):
            print("   Outra zona: %s" % end)
        if ev.get("alertas"):
            mostrar("Cx " + caixa_atual, "Sep 0/%d ALERTA" % total)
        else:
            mostrar("Cx " + caixa_atual, "Separando 0/%d" % total)

    elif tipo == "LIBERA":
        mostrar("Cx " + caixa_atual, "Nada nesta zona")
        encerrar_caixa()

    elif tipo == "OCUPADA":
        mostrar("Zona ocupada:", ev.get("atual", ""))
        encerrar_caixa()

    elif tipo == "BTN":
        confirmados += 1
        if ev.get("status") == "ok":
            mostrar("Cx " + caixa_atual, "Separando %d/%d" % (confirmados, total))
        else:
            mostrar("Falta " + ev.get("end", ""),
                    "%d de %d  (%d/%d)" % (ev.get("qtd"), ev.get("pedida"), confirmados, total))

    elif tipo == "ADJ":
        mostrar("Ajuste " + ev.get("end", ""), "Qtd %d de %d" % (ev.get("qtd"), ev.get("pedida")))

    elif tipo == "FIM":
        falta = False
        for end, qtd, pedida in ev.get("itens", []):
            if qtd < pedida:
                falta = True
        mostrar("FIM " + caixa_atual, "COM FALTA" if falta else "OK - proxima cx")
        encerrar_caixa()

    elif tipo == "CANCELADO":
        mostrar("Cancelada", caixa_atual)
        encerrar_caixa()


# ---------------- Serial Monitor (opcional) ----------------
leitor = select.poll()
leitor.register(sys.stdin, select.POLLIN)
buffer = ""


def ler_linha():
    global buffer
    while leitor.poll(0):
        ch = sys.stdin.read(1)
        if ch in ("\n", "\r"):
            if buffer:
                linha = buffer
                buffer = ""
                return linha
        else:
            buffer += ch
    return None


def tratar(linha):
    cmd = linha.strip().upper()
    if cmd == "CAIXAS":
        for caixa in lista_caixas:
            pedido, itens = PEDIDOS[caixa]
            print("%s  pedido %d  %s" % (caixa, pedido,
                  " ".join("%s:%d" % (e, q) for e, q in itens)))
    elif cmd == "CANCELA":
        cancelar()
    elif cmd:
        bipar(cmd)


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
            mostrar("Conectando", "Wi-Fi...")
            conectar_wifi()
            mostrar("Conectando", "MQTT...")
            if cliente:
                cliente.fechar()
            c = MQTT("ptl-est-" + CANAL, BROKER)
            c.ao_receber = ao_receber
            c.conectar()
            c.assinar(TOPICO_EVT)
            c.assinar(TOPICO_CMD)           # eco: confirma que o servidor repassa
            c.assinar(TOPICO_TAG)           # etiquetas do leitor de pulso
            cliente = c
            precisa_reconectar = False
            print("MQTT ok (%s). Canal: %s" % (BROKER, CANAL))
            mostrar("Rede ok", "Procurando conc.")
            return
        except OSError as erro:
            print("Falha na rede (%s). Nova tentativa em 3 s..." % erro)
            mostrar("Falha na rede", "Tentando de novo")
            time.sleep(3)


# ---------------- inicio e loop principal ----------------
print("PLACA 1 - ESTACAO DE BIPAGEM")
atualizar_leds()
conectar_rede()
print("Clique em BIPAR CAIXA (ou digite C0001234 / CAIXAS / CANCELA).")

while True:
    agora = time.ticks_ms()
    try:
        cliente.verificar()
    except OSError as erro:
        print("Conexao perdida:", erro)
        precisa_reconectar = True
    if precisa_reconectar:
        conectar_rede()

    if bt_bipar.apertou(agora):
        bipar_proxima()
    if bt_cancela.apertou(agora):
        cancelar()

    linha = ler_linha()
    if linha:
        tratar(linha)

    if aguardando_desde is not None and time.ticks_diff(agora, aguardando_desde) > TIMEOUT_MS:
        mostrar("Sem resposta do", "concentrador")
        print("Concentrador nao respondeu. Ele esta rodando com o mesmo CANAL?")
        encerrar_caixa()
        conc_online = False

    # procura o concentrador a cada 5 s enquanto ele nao responde
    if not conc_online and not caixa_atual and time.ticks_diff(agora, ultimo_ping) > PING_MS:
        if ultimo_ping >= 0:
            if servidor_ok:
                mostrar("Sem concentrad.", "Servidor ok")
                print("[diagnostico] servidor ok, mas o concentrador nao respondeu."
                      " Confira: concentrador rodando, aba visivel e CANAL igual (%s)" % CANAL)
            else:
                mostrar("Sem servidor", "MQTT: verificar")
                print("[diagnostico] o servidor MQTT nao devolveu o eco."
                      " Problema de rede/servidor nesta placa.")
        ultimo_ping = agora
        enviar({"tipo": "PING"})

    time.sleep_ms(5)
