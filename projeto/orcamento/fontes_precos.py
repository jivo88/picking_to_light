"""Fontes dos preços das peças (Arquitetura A + RFID futuro), consultadas em 27/10/2026.

Cada código de preço (P01...) é composto por um ou mais componentes. Para cada componente:
  loja, produto (título como aparece na loja), URL, preço publicado, forma de pagamento do preço,
  divisor (unidades na embalagem ou metros do rolo) e quantidade usada por unidade do código.
Preço do código = soma de (preço publicado ÷ divisor × quantidade usada).

Exceções, por decisão do projeto: P13 e P14 (carcaças dos LEDs impressas em 3D, valor estipulado) e P46 (serviço de
eletricista, a cotar com a manutenção predial). No RFID futuro, a bateria LiPo do P26 tem link, mas o preço não foi lido
(o site não respondeu; valor estimado).

RFID = códigos da melhoria futura, sempre separados das peças do projeto.
"""

DATA = "27/10/2026"

# (código, descrição do código, unidade do código)
CODIGOS = {
    "P01": ("Display 7 segmentos 4 dígitos TM1637 (usa 3 dígitos, quantidade)", "un"),
    "P02": ("Display 7 segmentos 8 dígitos MAX7219 (endereço)", "un"),
    "P03": ("Microcontrolador Raspberry Pi Pico (RP2040)", "un"),
    "P04": ("Módulo transceptor RS-485 (MAX485)", "un"),
    "P05": ("Placa do concentrador RP2040 + Ethernet W5500 (W5500-EVB-Pico)", "un"),
    "P06": ("Fonte Mean Well LRS-150-12 (12 V / 12,5 A / 150 W)", "un"),
    "P07": ("Fonte Mean Well 5 V 150 W (variante 5 V)", "un"),
    "P08": ("Regulador step-down 12 V → 5 V (MP1584, 3 A)", "un"),
    "P09": ("Botão de confirmação metálico 16 mm com LED 12-24 V (pulsador)", "un"),
    "P10": ("Conector RJ45 fêmea para placa (90°)", "un"),
    "P11": ("Plug RJ45 Cat5e (macho)", "un"),
    "P12": ("Cabo Cat5e (por metro)", "m"),
    "P13": ("Carcaça do Módulo Q (impressão 3D, medida padrão compacta)", "un"),
    "P14": ("Carcaça do Módulo E+Q / Nó de coluna (impressão 3D, medida padrão compacta)", "un"),
    "P15": ("Placa base perfurada 7 × 5 cm + 2 bornes KRE (nó / módulo E+Q)", "un"),
    "P16": ("Gabinete do concentrador (caixa Patola PB-220/70 + cooler 40 mm 12 V + grade)", "un"),
    "P17": ("Trilho DIN + disjuntor 2 A + bornes", "kit"),
    "P18": ("Canaleta PVC 20 × 10 mm com adesivo (por metro)", "m"),
    "P19": ("Fixações por estação (abraçadeiras e etiquetas de endereço)", "kit"),
    "P20": ("Switch 24 portas Gigabit TP-Link TL-SG1024DE", "un"),
    "P22": ("Tag NFC NTAG213 adesiva 13,56 MHz", "un"),
    "P23": ("Proteção da tag na caixa (fita transparente sobre a tag)", "un"),
    "P24": ("ESP32-C3 Super Mini (pulseira)", "un"),
    "P25": ("Módulo leitor NFC PN532", "un"),
    "P26": ("Kit energia pulseira (LiPo + carregador TP4056 + motor de vibração + botão)", "kit"),
    "P27": ("Carcaça da pulseira (caixa Patola PB-060) + fita de velcro", "un"),
    "P38": ("Cabo PP 3 × 1,0 mm² (por metro)", "m"),
    "P39": ("Plugue 2P+T 10 A com prensa-cabo", "un"),
    "P40": ("DPS / protetor de surto 275 V 20 kA", "un"),
    "P41": ("Kit rede: alicate de crimpar + testador + 40 m Cat5e Nexans + 10 RJ45", "kit"),
    "P42": ("Bancada de eletrônica: estação de solda + multímetro + estanho", "kit"),
    "P43": ("Nobreak 720 VA bivolt (Intelbras XNB) para o switch", "un"),
    "P44": ("Mini rack de parede 5U 19\" + organizador de cabos + 2 patch cords", "kit"),
    "P45": ("Carregador USB 2 portas para pulseiras (RFID futuro)", "un"),
    "P46": ("Ponto de tomada 220 V novo (material + eletricista)", "un"),
    "P47": ("Sinal luminoso de baixo giro (sinaleiro LED 22 mm amarelo 12 V + haste + transistor)", "un"),
    "P48": ("Painel de MDF 120 × 60 cm com longarina para a bancada", "kit"),
    "P49": ("Switch 5 portas Gigabit (bancada)", "un"),
}

# código, componente, loja, produto na loja, url, preço publicado, forma, divisor, qtd por unidade do código, observação
C = []


def comp(cod, componente, loja, produto, url, preco, forma, divisor=1, qtd=1, obs="", moeda="BRL"):
    C.append(dict(cod=cod, componente=componente, loja=loja, produto=produto, url=url, preco=preco, forma=forma,
                  divisor=divisor, qtd=qtd, obs=obs, moeda=moeda))


comp("P01", "Display TM1637 4 dígitos", "Usinainfo", "Módulo Display TM1637 LED 7 Segmentos 4 Dígitos Vermelho",
     "https://www.usinainfo.com.br/display-arduino/modulo-display-tm1637-7-segmentos-4-digitos-vermelho-2943.html",
     10.97, "Pix", obs="cartão R$ 11,55; últimas unidades")
comp("P02", "Display MAX7219 8 dígitos", "Usinainfo", "Módulo Display LED 8 Dígitos com Interface Controle SPI - MAX7219",
     "https://www.usinainfo.com.br/display-arduino/modulo-display-led-8-digitos-com-interface-controle-spi-max7219-4416.html",
     20.17, "Pix", obs="cartão R$ 21,23; últimas unidades")
comp("P03", "Raspberry Pi Pico", "MakerHero", "Raspberry Pi Pico (DRA61)",
     "https://www.makerhero.com/produto/raspberry-pi-pico/", 37.90, "Pix", obs="normal R$ 39,90; em estoque")
comp("P04", "Módulo MAX485", "Saravati", "Módulo Conversor de Dados TTL para RS485 MAX485",
     "https://www.saravati.com.br/modulo-conversor-de-dados-ttl-para-rs485-max485.html", 8.90, "preço especial",
     obs="normal R$ 14,90; 246 em estoque")
comp("P05", "W5500-EVB-Pico", "SparkFun (EUA)", "W5500-EVB-Pico (DEV-19958)",
     "https://www.sparkfun.com/w5500-evb-pico.html", 12.50, "US$", moeda="USD",
     obs="em estoque; convertido em reais com câmbio × fator de importação (aba Premissas do orçamento completo)")
comp("P06", "Fonte LRS-150-12", "MCEIG", "LRS-150-12 - Fonte Chaveada 150W 85-264VCA/120-373VCC Saída 12VCC/12.5A - MEAN WELL",
     "https://www.mceig.com.br/produto/lrs-150-12-fonte-chaveada-150w-85-264vca-120-373vcc-saida-12vcc-12-5a-mean-well/",
     189.98, "preço da página", obs="em estoque (pode ser encomendado)")
comp("P07", "Fonte 5 V 150 W", "MCEIG", "RSP-150-5 - Fonte Chaveada Fechada 150W 85-264VCA/120-370VCC Saída 5V-30A - MEAN WELL",
     "https://www.mceig.com.br/produto/rsp-150-5-fonte-chaveada-fechada-150w-85-264vca-120-370vcc-saida-5v-30a-mean-well/",
     591.68, "preço da página", obs="sob encomenda; a LRS-150-5 não foi encontrada à venda no Brasil; só a variante 5 V usa")
comp("P08", "Step-down MP1584", "Saravati", "Módulo Mini Conversor De Tensão DC/DC - MP1584EN Step Down",
     "https://www.saravati.com.br/modulo-mini-conversor-de-tensao-dc-dc-mp1584en-step-down.html", 10.90, "preço especial",
     obs="normal R$ 11,90; 106 em estoque; 3 A")
comp("P09", "Pulsador inox 16 mm com LED", "Usinainfo", "Pulsador 16mm LED Vermelho 12-24V Inox Impermeável - MC320",
     "https://www.usinainfo.com.br/interruptores-e-pulsadores/interruptor-pulsador-16mm-com-led-vermelho-12-24v-em-aco-inox-impermeavel-3134.html",
     20.75, "Pix", obs="cartão R$ 21,84; últimas unidades")
comp("P10", "RJ45 fêmea PCI 90°", "Mult Comercial", "Conector RJ45 Fêmea 8 vias Blindado 90º PCI - JL46057",
     "https://www.multcomercial.com.br/conector-jack-rj45-femea-com-8-vias-blindado-90-pci-jl46057.html", 4.50, "Pix",
     obs="cartão R$ 5,00; 285 em estoque. Alternativa sem blindagem Connfly DS1125-S80BP R$ 2,03 (Pix), só 5 em estoque: "
         "https://www.multcomercial.com.br/conector-jack-rj45-ds1125-s80bp-8p8c-90-com-08-vias-connfly.html")
comp("P11", "Plug RJ45 Cat5e (100 un)", "KaBuM", "Plug Conector Rj45 Macho Cat 5e 8 Vias - Crimpar (100 Unidades)",
     "https://www.kabum.com.br/produto/328777/plug-conector-rj45-macho-cat-5e-8-vias-crimpar-100-unidades-", 70.99, "Pix",
     divisor=100, obs="pacote com 100")
comp("P12", "Cabo Cat5e 305 m", "KaBuM", "Cabo de Rede CAT.5e Furukawa SOHOPLUS, 305 Metros, Branco - 23200101",
     "https://www.kabum.com.br/produto/114681/cabo-de-rede-cat-5e-furukawa-305-metros-branco-23200101", 799.90, "Pix",
     divisor=305, obs="normal R$ 1.111,00; restam 10 caixas")
comp("P13", "Carcaça 3D do módulo Q", "Valor estipulado", "Carcaça impressa em 3D, medida padrão compacta (definida pelo projeto)",
     "", 5.00, "valor estipulado",
     obs="Valor estipulado pelo projeto: carcaça compacta impressa em 3D, sem ocupar espaço na frente da prateleira. "
         "Referência do material: filamento PETG 1 kg R$ 169,82 (Pix) na KaBuM, "
         "https://www.kabum.com.br/produto/1063679/filamento-1-75mm-petg-basico-1kg-marrom-escuro-para-impressora-3d-com-carretel-reutilizavel-bambu-lab")
comp("P14", "Carcaça 3D do módulo E+Q / nó", "Valor estipulado", "Carcaça impressa em 3D, medida padrão compacta (definida pelo projeto)",
     "", 15.00, "valor estipulado",
     obs="Valor estipulado pelo projeto: carcaça compacta impressa em 3D para o E+Q e o nó de coluna. Mesma referência de "
         "filamento do P13")
comp("P15", "Placa fenolite perfurada 7 × 5 cm", "Eletrogate", "Placa Fenolite Perfurada 7x5cm",
     "https://www.eletrogate.com/placa-fenolite-perfurada-7x5cm", 2.38, "Pix", obs="normal R$ 2,50; disponível")
comp("P15", "Borne KRE 2 vias", "Baú da Eletrônica", "Borne KRE KF128 2 Vias - Verde",
     "https://www.baudaeletronica.com.br/produto/borne-kre-kf128-2-vias-verde.html", 1.17, "Pix", qtd=2,
     obs="normal R$ 1,30; 2 por placa (entrada e saída de 12 V)")
comp("P16", "Caixa Patola PB-220/70", "Usinainfo", "Caixa Patola PB-220/70 para Montagem 71 x 228 x 190 mm",
     "https://www.usinainfo.com.br/caixas-patola/caixa-patola-pb-22070-para-montagem-71-x-228-x-190-mm-4383.html", 166.12,
     "Pix", obs="cartão R$ 174,86; últimas unidades; cabe a fonte LRS-150 (159 × 97 × 30 mm) e as placas")
comp("P16", "Cooler 40 × 40 mm 12 V", "Usinainfo", "Cooler PC 40x40mm Fan 12V",
     "https://www.usinainfo.com.br/coolers-para-pc/cooler-pc-40x40mm-fan-12v-3041.html", 15.57, "Pix", obs="cartão R$ 16,39")
comp("P16", "Grade do cooler 40 mm", "Usinainfo", "Grade para Cooler 40mm Metálica",
     "https://www.usinainfo.com.br/coolers-para-pc/grade-para-cooler-40mm-metalica-8398.html", 5.83, "preço da página",
     obs="últimas unidades")
comp("P17", "Trilho DIN curto", "Usinainfo", "Trilho Din Patola FDO 037 para Projetos",
     "https://www.usinainfo.com.br/caixas-patola/trilho-din-patola-fdo-037-para-projetos-8532.html", 3.96, "Pix", qtd=2,
     obs="cartão R$ 4,17; 2 peças de 37 mm (disjuntor e DPS)")
comp("P17", "Minidisjuntor 2 A", "Leroy Merlin", "Minidisjuntor Unipolar 2a Mdwp-c2a Weg",
     "https://www.leroymerlin.com.br/minidisjuntor-unipolar-2a-mdwp-c2a-weg_1572704659", 28.10, "preço do site",
     obs="vendido por Automatize Soluções; frete à parte")
comp("P17", "Borne KRE 2 vias", "Baú da Eletrônica", "Borne KRE KF128 2 Vias - Verde",
     "https://www.baudaeletronica.com.br/produto/borne-kre-kf128-2-vias-verde.html", 1.17, "Pix", qtd=4,
     obs="4 bornes de distribuição de 12 V")
comp("P18", "Canaleta 20 × 10 mm (barra 2 m)", "Telhanorte", "Canaleta Pvc 20X10Mm 2M Com Adesivo Preto Forceline",
     "https://www.telhanorte.com.br/canaleta-pvc-20x10mm-2m-com-adesivo-preto-forceline-2633671/p", 8.72, "Pix", divisor=2,
     obs="site R$ 10,90; barra de 2 m")
comp("P19", "Abraçadeiras 200 mm (100 un)", "Leroy Merlin", "Abraçadeira De Nylon 200x2,5mm Preta Com 100 Peças - Vonder",
     "https://www.leroymerlin.com.br/abracadeira-de-nylon-200x2,5mm-preta-com-100-pecas-vonder_1567218483", 15.52,
     "preço do site", obs="1 pacote por estação; vendido por Zanline")
comp("P19", "Etiquetas de endereço", "Kalunga", "Etiqueta ink-jet/laser Carta 33,9x101,6 6182 Pimaco PT 1400 UN",
     "https://www.kalunga.com.br/prod/etiqueta-ink-jet-laser-carta-33-9x101-6-6182-pimaco-pt-1400-un/278998", 91.00,
     "preço do site", divisor=1400, qtd=200, obs="200 etiquetas por estação; a página mostrou indisponível no site")
comp("P20", "Switch TL-SG1024DE", "KaBuM", "Switch Tp-link Tl-sg1024de 24 Portas 10/100/1000 Gigabit Gerenciavel Rack",
     "https://www.kabum.com.br/produto/429922/switch-tp-link-tl-sg1024de-24-portas-10-100-1000-gigabit-gerenciavel-rack",
     769.32, "Pix", obs="10x R$ 76,93")
comp("P22", "Tag NFC NTAG213 (100 un)", "Loja RFID", "Etiqueta RFID 13,56 MHz NFC NTAG213 Branca - 100 unidades",
     "https://loja.lojarfid.com.br/13-56-mhz-mf/etiquetas/etiqueta-rfid-13-56-mhz-nfc-ntag213-branca-100-unidades",
     237.41, "à vista (boleto)", divisor=100, obs="normal R$ 249,90; lote de 5.000 deve sair mais barato (pedir cotação)")
comp("P23", "Fita transparente 45 mm × 45 m (4 rolos)", "Kalunga", "Fita Adesiva Transparente PP, 45mm x 45m, Stick Tape - PT 4 UN",
     "https://www.kalunga.com.br/prod/fita-adesiva-transparente-pp-45mm-x-45m-stick-tape-pt-4-un/305591", 18.90,
     "preço do site", divisor=3000, obs="4 rolos × 45 m ÷ 6 cm por caixa = 3.000 caixas")
comp("P24", "ESP32-C3 Super Mini", "Usinainfo", "ESP32-C3 Super Mini WiFi Bluetooth USB-C com 13 GPIOs",
     "https://www.usinainfo.com.br/esp32/esp32-c3-super-mini-com-wifi-e-bluetooth-com-usb-c-8967.html", 29.89, "Pix",
     obs="cartão R$ 31,46; últimas unidades")
comp("P25", "Kit leitor PN532", "MakerHero", "Kit Módulo Leitor RFID NFC PN532",
     "https://www.makerhero.com/produto/kit-modulo-leitor-rfid-nfc-pn532/", 42.65, "Pix", obs="normal R$ 44,90; em estoque")
comp("P26", "Bateria LiPo 3,7 V ~500 mAh", "RoboCore", "Bateria LiPo 3,7V 530mAh 30C",
     "https://www.robocore.net/loja/baterias/bateria-lipo-1s-530mah-30c", 25.00, "estimativa (preço não lido)",
     obs="PREÇO NÃO LIDO: o site não respondeu nas consultas de 27/10/2026 e as outras lojas consultadas estavam sem "
         "estoque. Valor estimado, confirmar na página antes da compra")
comp("P26", "Carregador TP4056 USB-C", "Eletrogate", "Módulo Carregador de Baterias de Lítio TP4056 com Proteção - USB-C",
     "https://www.eletrogate.com/modulo-carregador-de-baterias-de-litio-tp4056-com-protecao-usb-c", 4.66, "Pix",
     obs="normal R$ 4,90")
comp("P26", "Motor de vibração 1027", "Eletrogate", "Micro Motor de Vibração Vibracall 1027",
     "https://www.eletrogate.com/micro-motor-de-vibracao-vibracall", 4.18, "Pix", obs="normal R$ 4,40")
comp("P26", "Chave táctil 6 × 6 mm", "Eletrogate", "Push Button (Chave Táctil) 6x6x6mm",
     "https://www.eletrogate.com/push-button-chave-tactil-6x6x6mm", 0.21, "Pix", obs="normal R$ 0,22")
comp("P27", "Caixa Patola PB-060", "Usinainfo", "Caixa Patola PB-060 para Montagem 29 x 52 x 64 mm",
     "https://www.usinainfo.com.br/caixas-patola/caixa-patola-pb-060-para-montagem-29-x-52-x-64-mm-8284.html", 5.94,
     "preço da página", obs="últimas unidades; cabe o PN532 (43 × 40 mm)")
comp("P27", "Fita de velcro 10 mm (rolo 10 m)", "Leroy Merlin", "Fita Fecho De Contato | Organizador De Cabos Preto | Rolo 10m X 10mm",
     "https://www.leroymerlin.com.br/fita-fecho-de-contato-%7C-organizador-de-cabos-preto-%7C-rolo-10m-x-10mm_1571751164",
     18.90, "preço do site", divisor=10, qtd=0.3, obs="0,3 m por pulseira; vendido por 47elétrica")
comp("P38", "Cabo PP 3 × 1,0 mm² (50 m)", "KaBuM", "Cabo Pp 3x1,00 Mm Elétrico Flexível Preto - 50 Metros",
     "https://www.kabum.com.br/produto/722927/cabo-pp-3x1-00-mm-eletrico-flexivel-preto-50-metros", 461.89, "Pix",
     divisor=50, obs="10x R$ 48,62")
comp("P39", "Plugue 2P+T com prensa-cabo (10 un)", "Leroy Merlin", "Pino Plug Macho Ilumi Prensa Cabo 2p+t 10a Embalagem Com 10 Unidades",
     "https://www.leroymerlin.com.br/pino-plug-macho-ilumi-prensa-cabo-2p-t-10a-embalagem-com-10-unidades_1568301310",
     64.95, "preço do site", divisor=10, obs="vendido por Mtop")
comp("P40", "DPS 275 V 20 kA", "Leroy Merlin", "Protetor De Surto Dps Classe Ii/iii 20ka 275vca Fase (Embrastec)",
     "https://www.leroymerlin.com.br/protetor-de-surto-dps-classe-ii-iii-20ka-275vca-fase_1570251308", 64.00,
     "preço do site", obs="vendido por Eletrotécnica Vera Cruz")
comp("P41", "Kit rede Nexans", "KaBuM", "Kit Cabo De Rede Nexans 40 Metros, Alicate, Testador, 10xrj45, Cat5e",
     "https://www.kabum.com.br/produto/386101/kit-cabo-de-rede-nexans-40-metros-alicate-testador-10xrj45-cat5e", 285.99,
     "Pix", obs="10x R$ 28,59")
comp("P42", "Estação de solda 60 W", "Leroy Merlin", "Estacao De Solda Analogica 60w 220v Hk936a Preta Hikari",
     "https://www.leroymerlin.com.br/estacao-de-solda-analogica-60w-220v-hk936a-preta-hikari_1566757438", 487.90,
     "preço do site", obs="de R$ 536,90; vendido por 47elétrica")
comp("P42", "Multímetro digital", "Usinainfo", "Multímetro Digital Hikari HM-1001 CAT I 1000V",
     "https://www.usinainfo.com.br/multimetros/multimetro-digital-hikari-hm-1001-cat-i-1000v-5502.html", 57.79, "Pix",
     obs="cartão R$ 60,83; últimas unidades")
comp("P42", "Estanho 1,0 mm 500 g", "Leroy Merlin", "Solda Estanho Cobix 1.0mm 60x40 500g",
     "https://www.leroymerlin.com.br/solda-estanho-cobix-1-0mm-60x40-500g_1566817011", 160.00, "preço do site",
     obs="de R$ 195,00; vendido por Pd Atacadista")
comp("P43", "Nobreak XNB 720 VA", "KaBuM", "Nobreak Intelbras XNB, 720VA, Bivolt - 4822010",
     "https://www.kabum.com.br/produto/229971/nobreak-intelbras-xnb-720va-bivolt-4822010", 368.10, "Pix",
     obs="normal R$ 697,00; vendido por Kadri Tecnologia")
comp("P44", "Mini rack 5U MRM 537", "KaBuM", "Mini Rack 05U x 19P x 370mm, Montado MRM 537, Preto - Intelbras",
     "https://www.kabum.com.br/produto/291255/mini-rack-05u-x-19p-x-370mm-montado-mrm-537-preto-intelbras", 342.95, "Pix",
     obs="10x R$ 36,10; vendido por MIRANDA")
comp("P44", "Organizador de cabos 1U", "KaBuM", "Organizador De Cabos Intelbras Och1u 40, Para Rack 1u 40mm, Preto - 4770004",
     "https://www.kabum.com.br/produto/235380/organizador-de-cabos-intelbras-para-rack-1u-40-mm-och1u-40", 72.99, "Pix",
     obs="vendido por Digi Mania")
comp("P44", "Patch cord Cat5e 1,5 m", "KaBuM", "Cabo De Rede Md9 Patch Cord 1.5m Azul Cat5e",
     "https://www.kabum.com.br/produto/233241/cabo-de-rede-md9-patch-cord-1-5m-azul-cat5e", 7.57, "Pix", qtd=2,
     obs="normal R$ 8,01; uplink e reserva")
comp("P45", "Carregador USB 2 portas", "KaBuM", "Carregador De Tomada Universal USB Kaidi, 2 portas, Branco - Kd-301",
     "https://www.kabum.com.br/produto/394690/carregador-de-tomada-universal-usb-kaidi-carregador-domestico-2-portas-branco-kd-301",
     27.40, "Pix", obs="vendido por Assistec")
comp("P46", "Ponto de tomada 220 V (serviço)", "A cotar", "Material + eletricista, com a manutenção predial", "",
     350.00, "estimativa", obs="SEM LINK por decisão: serviço a cotar com a manutenção predial")
comp("P47", "Sinaleiro LED 22 mm amarelo 12 V", "Luz Automação", "L20-AR9-Y | Sinaleiro Led 22mm - 12vcc/vca - Amarelo | Metaltex",
     "https://www.luzautomacao.com.br/produto/sinaleiro-led-22mm-12v-amarelo-metaltex", 9.50, "Pix",
     obs="40 em estoque")
comp("P47", "Haste (cantoneira de alumínio 1 m)", "Leroy Merlin",
     "Perfil Aluminio Preto L-013 Cantoneira 1 Pol 25mm Acabamento Canto Parede Barra 1 Mt",
     "https://www.leroymerlin.com.br/perfil-aluminio-preto-l-013-cantoneira-1-pol-25mm-acabamento-canto-parede-barra-1-mt_1572585517",
     30.91, "Pix", qtd=0.5, obs="a prazo R$ 33,24; 0,5 m por estação")
comp("P47", "Transistor BC337 (kit 5)", "Usinainfo", "Transistor BC337 NPN para Projetos - Kit com 5 unidades",
     "https://www.usinainfo.com.br/transistor-bc/transistor-bc337-para-projetos-kit-com-5-unidades-2998.html", 3.28, "Pix",
     divisor=5, obs="cartão R$ 3,45; aciona o sinaleiro pela saída do nó")
comp("P48", "Plano de MDF cru 120 × 60 cm", "Key Móveis", "Plano de Mdf Cru 120x60",
     "https://www.keymoveis.com.br/plano-de-mdf-cru-120x60", 35.75, "Pix", obs="de R$ 54,27; disponível")
comp("P48", "Longarina (cantoneira de alumínio 1 m)", "Leroy Merlin",
     "Perfil Aluminio Preto L-013 Cantoneira 1 Pol 25mm Acabamento Canto Parede Barra 1 Mt",
     "https://www.leroymerlin.com.br/perfil-aluminio-preto-l-013-cantoneira-1-pol-25mm-acabamento-canto-parede-barra-1-mt_1572585517",
     30.91, "Pix", obs="simula a frente da prateleira")
comp("P49", "Switch 5 portas TL-SG1005D", "KaBuM", "Switch 5 Portas Gigabit - Tp-link Tl-sg1005d",
     "https://www.kabum.com.br/produto/205611/switch-5-portas-10-100-1000-gigabit-mesa-tl-sg1005d-tp-link", 93.63, "Pix",
     obs="4x R$ 27,53; vendido por STORN35")


RFID = ["P22", "P23", "P24", "P25", "P26", "P27", "P45"]


def preco_codigo(cod, cambio_x_fator=None):
    """Preço em R$ de um código (soma dos componentes). Componentes sem preço lido contam 0 e são sinalizados."""
    tot = 0.0
    for c in C:
        if c["cod"] != cod or c["preco"] is None:
            continue
        p = c["preco"] * (cambio_x_fator if c["moeda"] == "USD" else 1)
        tot += p / c["divisor"] * c["qtd"]
    return tot


def estimado(c):
    """Componente sem preço lido em loja (valor estipulado ou estimado)."""
    return c["forma"].startswith(("estimativa", "valor estipulado"))
