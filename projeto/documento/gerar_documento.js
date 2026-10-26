// Gera o documento técnico de arquitetura (.docx) do projeto Pick-to-Light
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, TableOfContents, PageBreak, Header, Footer,
  PageNumber, LevelFormat, VerticalAlign, TabStopType,
} = require("docx");

const BASE = "/home/claude/ptl-projeto";
const EST = JSON.parse(fs.readFileSync(BASE + "/dados/estacoes.json", "utf8"));
const AZ = "1F3864", CZ = "5B6675", CLARO = "DEE6F2", CINZA = "F2F4F7";
const LARG = 9638; // largura util A4 com margens de 2 cm (DXA)
const FONTE = "Arial";

// ---------------------------------------------------------------- helpers
const t = (texto, o = {}) => new TextRun({ text: texto, font: FONTE, size: o.size || 21, bold: o.bold, italics: o.italic, color: o.color });
function P(conteudo, o = {}) {
  const runs = Array.isArray(conteudo) ? conteudo : [t(conteudo, o)];
  return new Paragraph({ children: runs, spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 300 }, alignment: o.align });
}
// texto com trechos em negrito: "normal **negrito** normal"
function R(texto, o = {}) {
  const partes = texto.split("**");
  return P(partes.map((p, i) => t(p, { bold: i % 2 === 1, color: o.color, size: o.size })), o);
}
const H1 = (x) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: x, font: FONTE })], spacing: { before: 240, after: 160 } });
const H2 = (x) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: x, font: FONTE })], spacing: { before: 200, after: 120 } });
const H3 = (x) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: x, font: FONTE })], spacing: { before: 160, after: 100 } });
function B(texto, nivel = 0) {
  const partes = texto.split("**");
  return new Paragraph({ numbering: { reference: "marcadores", level: nivel },
    children: partes.map((p, i) => t(p, { bold: i % 2 === 1 })), spacing: { after: 60, line: 290 } });
}
function N(texto) {
  const partes = texto.split("**");
  return new Paragraph({ numbering: { reference: "numeros", level: 0 },
    children: partes.map((p, i) => t(p, { bold: i % 2 === 1 })), spacing: { after: 60, line: 290 } });
}
const quebra = () => new Paragraph({ children: [new PageBreak()] });
const borda = { style: BorderStyle.SINGLE, size: 4, color: "BFC7D2" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

function tabela(cab, linhas, pesos, o = {}) {
  const soma = pesos.reduce((a, b) => a + b, 0);
  const larg = pesos.map((p) => Math.round((p / soma) * LARG));
  larg[larg.length - 1] += LARG - larg.reduce((a, b) => a + b, 0);
  const cel = (txt, i, cabecalho, destaque) => new TableCell({
    borders: bordas, width: { size: larg[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: cabecalho ? { fill: AZ, type: ShadingType.CLEAR, color: "auto" } : (destaque ? { fill: CLARO, type: ShadingType.CLEAR, color: "auto" } : undefined),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(txt).split("\n").map((linha) => {
      const partes = linha.split("**");
      return new Paragraph({ alignment: (o.direita || []).includes(i) && !cabecalho ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: partes.map((p, k) => new TextRun({ text: p, font: FONTE, size: o.size || 18, bold: cabecalho || k % 2 === 1 || destaque, color: cabecalho ? "FFFFFF" : "1C2430" })) });
    }),
  });
  const rows = [new TableRow({ tableHeader: true, children: cab.map((c, i) => cel(c, i, true)) })];
  linhas.forEach((l) => {
    const destaque = o.destacarUltima && l === linhas[linhas.length - 1];
    rows.push(new TableRow({ children: l.map((c, i) => cel(c, i, false, destaque)) }));
  });
  return new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: larg, rows });
}
function img(nome, w, h, legenda) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(`${BASE}/diagramas/${nome}.png`), transformation: { width: w, height: h } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [t(legenda, { italic: true, size: 18, color: CZ })] }),
  ];
}
function nota(texto) {
  return new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [LARG], rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "F2A33A" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "F2A33A" },
      left: { style: BorderStyle.SINGLE, size: 24, color: "F2A33A" }, right: { style: BorderStyle.SINGLE, size: 4, color: "F2A33A" } },
    shading: { fill: "FFF6E8", type: ShadingType.CLEAR, color: "auto" }, width: { size: LARG, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: texto.split("\n").map((l) => { const p = l.split("**"); return new Paragraph({ spacing: { after: 40 }, children: p.map((x, i) => t(x, { bold: i % 2 === 1, size: 19 })) }); }),
  })] })] });
}
const fmt = (n) => n.toLocaleString("pt-BR");

// ---------------------------------------------------------------- dados das estacoes
const ests = Object.values(EST).sort((a, b) => a.rua.localeCompare(b.rua));
const tot = ests.reduce((a, e) => { for (const k of ["total", "alto_0a3", "alto_45", "baixo", "blocos_alto_45", "zonas_baixo"]) a[k] = (a[k] || 0) + e[k]; return a; }, {});

// ---------------------------------------------------------------- conteudo
const c = [];

// CAPA
c.push(new Paragraph({ spacing: { before: 2600, after: 120 }, children: [t("Projeto Pick-to-Light", { size: 30, bold: true, color: CZ })] }));
c.push(new Paragraph({ spacing: { after: 120 }, children: [t("Documento de Arquitetura", { size: 52, bold: true, color: AZ })] }));
c.push(new Paragraph({ spacing: { after: 700 }, children: [t("Separação por luz nas estações de flow rack de Medicamento e Perfumaria", { size: 26, color: CZ })] }));
c.push(tabela(["Item", "Descrição"], [
  ["Arquiteturas", "A: coletor de dados, concentrador e displays\nB: identificação por RFID, concentrador e displays"],
  ["Abrangência", "40 estações (20 de Medicamento, ruas 03 a 22, e 20 de Perfumaria, ruas 26 a 45), 7.981 endereços"],
  ["Piloto", "Estações 05 (Medicamento) e 27 (Perfumaria)"],
  ["Material de apoio", "Orcamento_PTL.xlsx, Apresentacao_PTL.pptx e simulador 3D (repositório picking_to_light)"],
  ["Versão", "1.2, de 26/10/2026 (orçamento revisado), em revisão pela TI, arquitetura de software e diretoria"],
  ["Elaboração", "Equipe de TI"],
], [1, 3]));
c.push(quebra());

// SUMARIO
c.push(new Paragraph({ children: [t("Sumário", { size: 32, bold: true, color: AZ })], spacing: { after: 200 } }));
c.push(new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }));
c.push(P("Se o sumário aparecer vazio, clique nele com o botão direito e escolha \"Atualizar campo\".", { italic: true, size: 18, color: CZ }));
c.push(quebra());

// 1 OBJETIVO
c.push(H1("1. Objetivo e escopo"));
c.push(P("Hoje o operador procura cada endereço na estante e confere a quantidade na tela. Com o pick-to-light, a leitura da etiqueta da caixa acende os displays dos endereços que têm itens daquela caixa, já com a quantidade. O operador pega, aperta o botão do display e passa ao próximo. O objetivo é reduzir o tempo por caixa e os erros de separação em uma linha que movimenta cerca de 3.000 volumes e 250 a 270 mil produtos por dia."));
c.push(H2("1.1 O que está no escopo"));
[
  "Duas formas de identificar a caixa: pelo coletor de dados MovFast que já usamos (Arquitetura A) ou por uma tag RFID fixa na caixa retornável (Arquitetura B).",
  "A parte de displays é a mesma nas duas: um concentrador por estação, displays de quantidade no alto giro e displays de endereço e quantidade nos andares 4 e 5 do alto giro e nas zonas do baixo giro.",
  "Um serviço no servidor (Serviço PTL) ligado ao Sybase e à API do sistema BHT, com um painel de acompanhamento para a gestão e para a TI.",
  "Comparação entre fazer os módulos internamente e comprar de terceiros.",
  "Orçamento do piloto (estações 05 e 27) e da operação completa (40 estações), em 12 V e em 5 V.",
  "Simulador 3D de uma estação, usado na apresentação.",
].forEach((x) => c.push(B(x)));
c.push(H2("1.2 O que fica fora nesta fase"));
[
  "Controle da esteira. Continua com o sistema BHT, que já lê a etiqueta e movimenta as caixas.",
  "Tratamento de falta no display. A falta continua sendo apontada na conferência, como acontece hoje.",
  "Reposição guiada pelos displays. Fica como melhoria futura; o hardware já permite.",
  "Interface MFC do fornecedor anterior (192.168.254.4:8080). Não será usada; os dados da caixa virão por API.",
].forEach((x) => c.push(B(x)));

// 2 SITUACAO ATUAL
c.push(H1("2. Situação atual"));
c.push(tabela(["Tema", "Como é hoje"], [
  ["Sistemas", "WMS próprio em PowerBuilder 12 com banco Sybase ASE 16. O sistema BHT, de terceiro, controla a esteira e lê a etiqueta da caixa."],
  ["Coletores", "MovFast com Android atualizado, na rede Wi-Fi."],
  ["Operadores", "Um operador por estação, uma caixa por vez."],
  ["Volume", "Cerca de 3.000 volumes e 250 a 270 mil produtos por dia. A média de itens por caixa ainda precisa ser levantada; em Perfumaria ela é menor."],
  ["Caixas", "Retornáveis, o que permite fixar uma tag RFID na Arquitetura B."],
  ["Rede", "Os concentradores serão ligados por cabo. Só os coletores usam Wi-Fi."],
  ["Energia", "Preferência por 12 V para displays e concentrador. O 5 V foi avaliado junto (item 9.4)."],
  ["Ambiente", "Poeira e calor, sem lavagem com água. O gabinete precisa de ventilação com filtro."],
  ["Instalação", "É possível instalar canaletas nas estações."],
  ["Sistema anterior", "No SmartPicking, quatro fios corriam direto pela canaleta atrás das plaquinhas. Faltava espaço, o encaixe era difícil e a manutenção era frequente. Reduzir manutenção é requisito deste projeto."],
], [1, 4]));

// 3 LEVANTAMENTO FISICO
c.push(H1("3. Levantamento físico"));
c.push(P("Os números vêm da tabela wms_endereco (esteiras 1 e 2), exportada em 23/10/2026: 7.981 endereços em 40 ruas, e cada rua é uma estação. A rua 90 (Marketing/Almoxarifado, 2 endereços) ficou de fora. O endereço tem 8 posições: bairro (1), rua (2), prédio (3), andar (1) e apartamento (1). Exemplo: 0050230A é a rua 05, prédio 023, andar 0."));
c.push(H2("3.1 Estrutura de uma estação"));
c.push(tabela(["Área", "Prédios", "Andares", "Display proposto"], [
  ["Alto giro, na frente do operador", "001 a 010", "0 a 3, acima das esteiras", "Um display de quantidade (módulo Q) por endereço"],
  ["Alto giro, parte de baixo", "001 a 010", "4 e 5, abaixo das esteiras", "Quatro displays de endereço e quantidade: um por andar em cada lado (prédios 001 a 005 e 006 a 010), como no sistema atual"],
  ["Início do lado direito do corredor (150 a 153)", "015", "0 a 3 (até 7 nas esquinas de Medicamento)", "Entra na zona D1 do baixo giro"],
  ["Baixo giro, corredor atrás do operador", "Esquerdo: 020 (ou 022) a 031\nDireito: 032 até o último", "0 a 7", "Quatro zonas por lado, cada uma com um display de endereço e quantidade na altura dos olhos"],
  ["Esquinas", "060 a 063 (Medicamento)\n060 a 071 (Perfumaria)", "0 a 7", "Zonas a mais no baixo giro: 1 em Medicamento e 3 em Perfumaria"],
], [2.2, 1.8, 1.7, 3.8]));
c.push(P("O campo nr_ordem_separacao_flow define a ordem de percurso. Nas estações 10 e 16 essa ordem é invertida, porque são espelhadas. A rota de cada zona segue esse campo e, depois, prédio e andar."));
c.push(H2("3.2 Disposição física"));
c.push(P("O alto giro fica na frente do operador. A esteira de transporte passa por dentro dele, entre o andar 3 e o andar 4. A esteira de separação fica do lado de fora, aberta, uns 20 cm à frente da de transporte, com os endereços logo acima e logo abaixo dela. O corredor do baixo giro fica atrás do operador, perpendicular às esteiras. As prateleiras são alinhadas: os níveis são os mesmos em toda a estante."));
[
  "Transferência: cada transferência atende até quatro estações. A caixa passa da esteira de transporte para a de separação e um rolete direcionador a manda para as duas estações da esquerda ou para as duas da direita. A transferência entre a 11 e a 12, por exemplo, atende a 10 e a 11 de um lado e a 12 e a 13 do outro. Nas pontas, a transferência entre a 3 e a 4 atende a 3 de um lado e a 4 e a 5 do outro; em Perfumaria, a que fica entre a 26 e a 27 atende a 26 de um lado e a 27 e a 28 do outro.",
  "A caixa só entra nas estações em que o pedido tem itens. Se o pedido começa na 3 e só continua na 7, depois da 3 a caixa volta para a esteira de transporte e passa direto pela 4 e pela 5.",
  "Terminada a separação, o operador empurra a caixa de volta para a esteira de transporte de qualquer ponto da estação.",
  "No corredor, olhando a partir da esteira, o lado esquerdo tem os prédios 020 (ou 022) a 031 e o lado direito vai do 032 até o último. O percurso é em U: entra pelo lado esquerdo e volta pelo direito. O prédio 015 (150 a 153) é o primeiro do lado direito, na entrada do corredor.",
  "Os blocos do baixo giro ficam de costas um para o outro: cada bloco tem um lado de uma estação e o outro lado da estação vizinha. A profundidade é de cerca de 2 m.",
  "O andar 0 é o de cima. As prateleiras não mudam de altura; o que muda é a caixa do endereço, conforme o tipo (A, B, C, F ou N), e a maioria é pequena. Andar sem endereço fica vazio. As caixas que circulam na esteira têm tamanho único.",
].forEach((x) => c.push(B(x)));
c.push(...img("planta_estacao", 640, 324, "Figura 1. Planta da estação 05 e das vizinhas (sem escala)"));
c.push(...img("layout_estacao", 640, 230, "Figura 2. Vista frontal da estação 05 com os 209 endereços da tabela e as 8 zonas do baixo giro"));
c.push(H2("3.3 Totais por tipo de estação"));
c.push(tabela(["Tipo", "Estações", "Alto giro 0-3", "Alto giro 4-5", "Baixo giro", "Zonas baixo giro"], [
  ["Medicamento comum", "04-08, 11-14, 17-21 (14)", "29", "10 a 20", "156-160", "8"],
  ["Medicamento esquina", "09, 10, 15, 16", "29", "10 a 20", "188-192", "9"],
  ["Medicamento ponta", "03 / 22", "29", "20 / 10", "82 / 4", "4 / 1"],
  ["Perfumaria comum", "27-31, 34-37, 40-44 (14)", "35", "7 a 15", "131", "8"],
  ["Perfumaria esquina", "32, 33, 38, 39", "35", "9 a 15", "227-230", "11"],
  ["Perfumaria ponta", "26 / 45", "35", "13 / 15", "128 / 131", "8"],
  ["Total (40 estações)", "", fmt(tot.alto_0a3), fmt(tot.alto_45), fmt(tot.baixo), fmt(tot.zonas_baixo)],
], [2.2, 2.6, 1.2, 1.2, 1.2, 1.3], { destacarUltima: true }));
c.push(nota("Conferir com a operação: na tabela, as esquinas de Perfumaria têm 227 a 230 endereços de baixo giro (o número informado foi 203); a estação 26 tem 48 endereços de alto giro (informado: 49); e Medicamento tem 20 estações (informado: 21). A planilha usa os números da tabela, e todos podem ser alterados na aba Estações."));
c.push(H2("3.4 Zonas do baixo giro"));
c.push(P("Cada lado do corredor tem quatro zonas de cerca de três prédios. Cada zona tem um display de endereço, um de quantidade e um botão, presos na longarina à altura dos olhos (cerca de 1,5 m), no meio da zona. Olhando um lado do corredor, o operador vê oito displays: quatro de endereço e quatro de quantidade. A zona mostra um item por vez, na ordem da rota. O botão confirma a retirada e o display passa ao item seguinte. Todas as zonas com itens trabalham ao mesmo tempo."));
[
  "Estação comum: lado esquerdo 020 a 031 em quatro zonas (E1 a E4) e lado direito 015 e 043 a 032 em quatro zonas (D1 a D4), oito zonas no total. As esquinas têm zonas a mais, de quatro prédios.",
  "Com três prédios por zona, uma zona tem até 24 endereços. O display mostra prédio e andar, por exemplo P031 A2.",
  "Opcional: um LED guia no topo de cada prédio, que acende a coluna do item atual da zona. Custa cerca de R$ 1.000 para a operação toda.",
  "O número de zonas por lado é configurável e pode mudar depois do piloto, conforme a produtividade.",
].forEach((x) => c.push(B(x)));

// 4 REQUISITOS
c.push(H1("4. Requisitos"));
c.push(tabela(["Código", "Requisito funcional"], [
  ["RF01", "Abrir a caixa na estação com a leitura da etiqueta (gatilho do coletor ou tag RFID), sem tocar na tela."],
  ["RF02", "Acender todos os endereços de alto giro (andares 0 a 3) que têm itens da caixa, com a quantidade."],
  ["RF03", "Nos andares 4 e 5 do alto giro e nas zonas do baixo giro, mostrar endereço e quantidade de um item por vez, na ordem da rota."],
  ["RF04", "Confirmar cada retirada no botão do display e apagar o display quando não houver mais itens."],
  ["RF05", "Mostrar o andamento da caixa no coletor (A) ou no painel da estação (B)."],
  ["RF06", "Fechar a caixa com uma nova leitura. Se houver itens pendentes, avisar e só fechar após outra leitura."],
  ["RF07", "Gravar no Sybase a sessão da caixa e cada confirmação: estação, endereço, quantidade, horário e operador."],
  ["RF08", "Informar ao BHT que a caixa terminou na estação, se o fornecedor permitir."],
  ["RF09", "Painel com a situação de cada estação e módulo, caixas por hora, tempo médio por caixa e alarmes."],
  ["RF10", "Cadastro do mapa endereço/display pela TI, sem mexer no firmware."],
], [1, 7]));
c.push(tabela(["Código", "Requisito não funcional"], [
  ["RNF01", "Menos de 1 segundo entre a leitura e o acendimento."],
  ["RNF02", "Trocar um módulo com defeito em menos de 5 minutos, sem ferramenta especial e sem abrir a canaleta."],
  ["RNF03", "Funcionar com poeira e calor: gabinete com filtro e ventilação e componentes para 0 a 50 °C."],
  ["RNF04", "Se a rede cair, o concentrador mantém a caixa aberta e guarda as confirmações até a rede voltar."],
  ["RNF05", "Atualização remota do firmware dos concentradores e configuração centralizada."],
  ["RNF06", "Rede do PTL separada em VLAN, com usuário no broker MQTT e acesso restrito por estação."],
  ["RNF07", "Reserva de 10% de módulos e concentradores."],
], [1, 7]));

// 5 ARQUITETURA A
c.push(H1("5. Arquitetura A: coletor, concentrador e displays"));
c.push(...img("arquitetura_a", 640, 347, "Figura 3. Visão geral da Arquitetura A"));
c.push(H2("5.1 Componentes"));
c.push(P("A Figura 4 mostra os componentes do sistema e como se comunicam. Os blocos em azul são o software novo, os verdes são o hardware novo de cada estação e os marrons são os sistemas que já existem. Os tracejados são opcionais ou só valem para a Arquitetura B."));
c.push(...img("componentes", 640, 404, "Figura 4. Arquitetura de componentes"));
c.push(tabela(["Componente", "Função", "Tecnologia proposta"], [
  ["API REST", "Recebe as leituras do coletor e do RFID, informa o estado da estação, permite cancelar uma caixa e atualizar o mapa.", "HTTPS com JSON. Linguagem a definir pela arquitetura (Java, .NET ou Node)."],
  ["Orquestrador de caixas", "Controla o estado da caixa na estação, separa os itens por display e ordena pela rota.", "Módulo do Serviço PTL."],
  ["Mapa de endereços", "Relaciona cada cd_endereco a um módulo Q ou a uma zona.", "Tabela no Sybase, editável pela TI."],
  ["Adaptador Sybase", "Lê os itens da caixa por views e grava sessões e eventos.", "jConnect ou ODBC."],
  ["Adaptador BHT", "Consulta os dados da caixa e, se possível, avisa a conclusão.", "API do sistema BHT."],
  ["Gateway MQTT e broker", "Envia os comandos para os 40 concentradores e recebe os eventos.", "Eclipse Mosquitto na mesma VM, com usuário e permissão por estação."],
  ["Painel e monitor", "Mostra a situação das estações e os indicadores.", "Páginas web servidas pelo próprio serviço."],
  ["Registro de eventos", "Guarda leituras, botões e falhas.", "Tabela ptl_evento, com retenção definida pela TI."],
  ["Coletor (A1 ou A2)", "Lê a etiqueta com o gatilho (abre e fecha) e mostra o andamento.", "A1: app Android próprio. A2: tela do WMS no coletor."],
  ["Concentrador", "Recebe a caixa, comanda os dois barramentos e devolve as confirmações. Mantém o estado se a rede cair.", "RP2040 com Ethernet W5500, duas saídas RS-485, fonte Mean Well de 12 V e gabinete IP54 ventilado."],
  ["Nó de coluna", "Liga os módulos Q de um prédio do alto giro ao barramento.", "RP2040, RS-485 e regulador de 12 para 5 V, com RJ45 de entrada, saída e por módulo."],
  ["Módulo Q", "Quantidade de 3 dígitos e botão com LED, um por endereço do alto giro (andares 0 a 3).", "Display de 7 segmentos de 0,56\" e botão metálico de 16 mm com anel de LED."],
  ["Módulo E+Q", "Endereço de 8 dígitos, quantidade de 3 dígitos e botão. Usado nos andares 4 e 5 (quatro por estação) e nas zonas do baixo giro.", "MAX7219, display de 3 dígitos, RP2040 e RS-485."],
], [1.4, 3, 2.6], { size: 17 }));
c.push(H2("5.2 Duas opções para o coletor"));
c.push(tabela(["Critério", "A1: app Android próprio", "A2: tela do WMS no coletor"], [
  ["Como funciona", "App simples no MovFast. Lê com o gatilho e chama a API do Serviço PTL.", "Tela em PowerBuilder aberta no coletor. Grava a leitura numa tabela que o Serviço PTL lê."],
  ["Para o operador", "Tela própria, letra grande, sem toque, com som e vibração.", "Depende do acesso ao WMS no coletor e responde mais devagar."],
  ["Desenvolvimento", "Cerca de 160 h", "Cerca de 80 h"],
  ["Dependências", "Instalar o app nos coletores (MDM ou manual).", "Sessão do WMS aberta no coletor; a consulta periódica ao banco aumenta o tempo de resposta."],
  ["Indicação", "Melhor opção para a operação", "Pode servir no piloto se o app atrasar"],
], [1.4, 2.4, 2.4]));
c.push(H2("5.3 Fluxo de uma caixa"));
c.push(...img("sequencia", 640, 375, "Figura 5. Mensagens trocadas durante uma caixa na estação"));
[
  "A caixa vem pela esteira de transporte, passa pela transferência para a esteira de separação e o rolete direcionador a leva até a estação. Essa parte é do BHT.",
  "O operador aponta o coletor para a etiqueta e aperta o gatilho. A caixa abre na estação.",
  "O Serviço PTL busca os itens da caixa, separa os que são daquela estação, divide entre alto giro, andares 4 e 5 e zonas, e ordena pela rota.",
  "O concentrador acende todos os displays de alto giro com a quantidade e mostra o primeiro item de cada display de endereço e quantidade.",
  "O operador pega e aperta o botão. No alto giro o display apaga; nos outros, passa ao próximo item. O coletor mostra o andamento.",
  "Quando o último display apaga, o coletor mostra \"Estação concluída\". O operador lê a etiqueta de novo, a caixa fecha, o Serviço PTL grava a sessão e o operador empurra a caixa de volta para a esteira de transporte.",
].forEach((x) => c.push(N(x)));

// 6 ARQUITETURA B
c.push(H1("6. Arquitetura B: identificação por RFID"));
c.push(P("A Arquitetura B usa os mesmos displays, concentradores e Serviço PTL da A. Muda só a forma de identificar a caixa: cada caixa retornável recebe uma tag NFC (13,56 MHz) fixa e a leitura acontece sem o coletor."));
c.push(...img("arquitetura_b", 640, 347, "Figura 6. Visão geral da Arquitetura B"));
c.push(H2("6.1 Opções de leitura"));
c.push(tabela(["Opção", "Como funciona", "Vantagens", "Desvantagens"], [
  ["B1: pulseira NFC", "Leitor no pulso (ESP32-C3, PN532 e bateria). O operador encosta o pulso na tag para abrir e para fechar.", "Mãos livres, leitura em menos de 1 s, cerca de R$ 130 por unidade.", "Pode atrapalhar o operador; precisa de carga diária; higiene e conforto."],
  ["B2: leitor fixo na estação", "Leitor NFC sob a posição de pega na esteira de separação, ligado ao barramento da estação como mais um nó. Um painel LCD mostra a caixa e os itens que faltam; fecha com nova leitura ou com o botão FECHAR.", "Nada no corpo do operador e sem bateria. Abre sozinho.", "A caixa precisa parar sempre no mesmo ponto; exige instalação mecânica na esteira."],
  ["B3: produto de mercado", "Leitores de pulso comerciais (em geral UHF, como o FEIG HyWEAR, cerca de US$ 997) ou leitores HF industriais.", "Robustez e garantia.", "Custo muito maior. O UHF lê de longe e pode pegar a caixa vizinha; exige tags UHF."],
], [1.2, 2.6, 1.8, 1.8], { size: 17 }));
c.push(nota("Para a Arquitetura B, indicamos o leitor fixo (B2): ele resolve a preocupação de a pulseira atrapalhar o operador e não tem bateria. A pulseira (B1) fica como alternativa para estações em que a caixa não pare sempre no mesmo lugar."));
c.push(H2("6.2 Tag na caixa retornável"));
[
  "Tag NFC NTAG213 adesiva, cerca de R$ 2,37 a unidade em lote, colada em um ponto protegido da caixa.",
  "Cadastro inicial: associar o código da tag ao número da caixa no Sybase, cerca de 30 segundos por caixa.",
  "A frota estimada é de 5.000 caixas, mas precisa ser confirmada com a operação, porque o custo das tags depende dela.",
  "Caixa danificada: a tag é trocada na manutenção de caixas.",
].forEach((x) => c.push(B(x)));
c.push(H2("6.3 Comparação entre A e B"));
c.push(tabela(["Critério", "A: coletor", "B: RFID (B2)"], [
  ["Leitura", "Coletores MovFast que já temos", "Leitor fixo por estação e tag em cada caixa"],
  ["O que o operador faz", "Aponta e aperta o gatilho, uma vez para abrir e outra para fechar", "Coloca a caixa na posição (abre) e faz nova leitura ou aperta o botão (fecha)"],
  ["Hardware, 40 estações*", "R$ 364 mil", "R$ 391 mil"],
  ["Custo contínuo", "Nenhum novo", "Tags para caixas novas ou danificadas"],
  ["Riscos", "Disponibilidade e bateria dos coletores; Wi-Fi", "Posição da caixa na leitura; tamanho da frota"],
  ["Prazo", "Menor, porque usa os coletores atuais", "Maior por causa das tags, do cadastro e da instalação"],
], [1.6, 2.2, 2.2]));
c.push(P("* Com mão de obra interna, instalação e treinamento, sem contingência. O detalhamento está no item 12 e na planilha Orcamento_PTL.xlsx.", { italic: true, size: 18, color: CZ }));

// 7 FUNCIONAMENTO
c.push(H1("7. Funcionamento e regras"));
c.push(H2("7.1 Estados da caixa na estação"));
c.push(tabela(["Estado", "Quando começa", "Próximo passo"], [
  ["Aguardando", "Estação livre", "Primeira leitura: passa para Aberta"],
  ["Aberta", "Itens enviados aos displays", "Último display confirmado: Concluída\nNova leitura com itens pendentes: Alerta"],
  ["Concluída", "Todos os itens confirmados", "Nova leitura: Fechada"],
  ["Alerta", "Leitura de fechamento com itens pendentes", "Outra leitura confirma e fecha com pendência, que fica registrada para a conferência"],
  ["Fechada", "Sessão gravada no Sybase", "Estação volta para Aguardando"],
  ["Sem itens", "Caixa sem endereços nesta estação", "Coletor ou painel mostra \"nada nesta estação\" e a caixa segue"],
], [1.6, 2.2, 3]));
c.push(H2("7.2 Regras de separação"));
[
  "Alto giro, andares 0 a 3: todos os endereços da caixa acendem juntos, cada um com a sua quantidade.",
  "Andares 4 e 5 e zonas do baixo giro: cada display mostra um item por vez. Todos os displays com itens ficam ativos ao mesmo tempo.",
  "Ordem: nr_ordem_separacao_flow, depois prédio e andar, respeitando as estações espelhadas.",
  "Endereço repetido na mesma caixa: as quantidades são somadas e o endereço acende uma vez só.",
  "O botão confirma a quantidade pedida. Falta é apontada na conferência, como hoje.",
].forEach((x) => c.push(B(x)));
c.push(H2("7.3 Exceções"));
c.push(tabela(["Situação", "O que o sistema faz"], [
  ["Caixa sem itens nesta estação", "Mostra \"nada nesta estação\", não acende nenhum display e a caixa pode seguir."],
  ["Caixa não encontrada", "Avisa no coletor ou no painel, registra no log e o operador segue o procedimento manual."],
  ["Leitura de outra caixa com uma aberta", "Não abre e informa qual caixa está em andamento. É uma caixa por estação."],
  ["Fechamento com itens pendentes", "Mostra o que falta; uma nova leitura confirma e a pendência fica registrada para a conferência."],
  ["Botão apertado sem item", "Ignora e registra para diagnóstico."],
  ["Módulo sem resposta", "O concentrador avisa o Serviço PTL, o coletor mostra o endereço e a quantidade daquele item e o painel gera alerta para a manutenção."],
  ["Concentrador sem rede", "Os displays continuam funcionando e as confirmações ficam guardadas até a rede voltar. Nova caixa só abre com rede."],
  ["Serviço PTL fora do ar", "O coletor informa e a estação passa para a operação manual. A TI recebe o alarme."],
  ["Falta de energia na estação", "Quando a energia volta, o concentrador pede ao Serviço PTL o estado da caixa aberta e acende o que falta."],
  ["Troca de operador no meio da caixa", "A caixa continua; o fechamento registra quem fez a leitura."],
  ["Cancelamento pela supervisão", "Apaga a estação e registra o motivo."],
], [2.2, 5]));

// 8 INTERFACES
c.push(H1("8. Interfaces"));
c.push(H2("8.1 Telas do coletor (A1)"));
c.push(...img("telas_coletor", 640, 302, "Figura 7. Telas do app: espera, separação, conclusão e alerta"));
c.push(H2("8.2 Displays"));
c.push(...img("modulos", 640, 215, "Figura 8. Módulo Q, módulo E+Q e gabinete do concentrador"));
[
  "O display de 8 dígitos mostra o endereço como \"P031 A2\" (prédio 031, andar 2). A rua não aparece porque é a própria estação.",
  "Dígitos de 0,56\" (14 mm), legíveis a 2 ou 3 m, em vermelho, que tem o melhor contraste em 7 segmentos.",
  "LED do botão: aceso quando há item para pegar, piscando quando chega item novo na zona e apagado quando não há nada.",
].forEach((x) => c.push(B(x)));
c.push(H2("8.3 API REST do Serviço PTL"));
c.push(tabela(["Método e rota", "Uso"], [
  ["POST /v1/estacoes/{est}/leituras", "Leitura do coletor ou do RFID {caixa, operador}. Abre ou fecha conforme o estado e devolve o andamento."],
  ["GET /v1/estacoes/{est}", "Estado da estação, caixa aberta e itens pendentes por área e zona."],
  ["GET /v1/caixas/{caixa}", "Histórico da caixa nas estações."],
  ["POST /v1/estacoes/{est}/cancelar", "Cancelamento pela supervisão {motivo}."],
  ["GET /v1/monitor/resumo", "Indicadores do painel: caixas por hora, tempo médio e módulos com falha."],
  ["PUT /v1/estacoes/{est}/mapa", "Atualiza o mapa endereço/display (uso da TI)."],
], [2.4, 4.6]));
c.push(H2("8.4 Mensagens MQTT entre o serviço e o concentrador"));
c.push(tabela(["Tópico", "Mensagem (JSON)"], [
  ["ptl/est05/cmd", "SEPARAR {caixa, alto_giro:[{mod, qtd}], andares_45:[{display, itens:[{end, qtd}]}], zonas:[{zona, itens:[…]}]}"],
  ["ptl/est05/cmd", "CANCELAR {caixa} · CONFIG {mapa} · PING"],
  ["ptl/est05/evt", "ACK {caixa, acesos} · BTN {caixa, end, qtd} · ZONA_FIM {zona} · CONCLUIDA {caixa}"],
  ["ptl/est05/evt", "FALHA_MODULO {mod} · HEARTBEAT {uptime, temperatura, versão}"],
  ["ptl/est05/status", "Mensagem retida: online ou offline (last will) e caixa aberta"],
], [1.6, 5.4]));
c.push(H2("8.5 Barramento RS-485 entre o concentrador e os módulos"));
[
  "Dois barramentos por estação, um para o alto giro e outro para o baixo giro, a 38.400 bps. O concentrador é o mestre e cada dispositivo tem um endereço de 1 byte, definido por chave ou na instalação.",
  "Comandos: MOSTRAR (endereço, quantidade, modo), APAGAR, PISCAR, LER_BOTOES e AUTO_TESTE. O concentrador consulta todos os dispositivos a cada 50 ms.",
  "Resistor de terminação de 120 Ω nas pontas e polarização no concentrador. O sinal vai em um par trançado do Cat5e.",
].forEach((x) => c.push(B(x)));
c.push(H2("8.6 Tabelas no Sybase (proposta)"));
c.push(tabela(["Tabela", "Conteúdo"], [
  ["ptl_estacao", "Rua, segmento, tipo, identificação do concentrador e se está ativa"],
  ["ptl_dispositivo", "Estação, barramento, endereço RS-485, tipo (Q, E+Q ou nó) e situação"],
  ["ptl_endereco_mapa", "cd_endereco e o display correspondente (módulo Q ou zona)"],
  ["ptl_caixa_sessao", "Caixa, estação, operador, abertura, conclusão, fechamento e situação"],
  ["ptl_caixa_item", "Sessão, cd_endereco, quantidade, horário da confirmação e dispositivo"],
  ["ptl_evento", "Log de eventos e falhas, com prazo de retenção"],
  ["ptl_tag_caixa (B)", "Código da tag e número da caixa"],
], [1.8, 5.2]));
c.push(P("A origem dos itens da caixa (tabelas do pedido no WMS ou API do BHT) será definida com o DBA e com o fornecedor do BHT. O Serviço PTL lê por views para não depender do modelo interno do WMS.", { size: 19 }));
c.push(H2("8.7 Painel de acompanhamento"));
[
  "Mapa das 40 estações: livre, separando, alerta ou sem comunicação.",
  "Indicadores: caixas por hora por estação e no total, tempo médio por caixa, itens por hora e tempo de espera da caixa.",
  "Saúde do sistema: módulos sem resposta, concentradores sem comunicação, temperatura do gabinete e versão do firmware.",
  "Quem usa: a gestão da operação acompanha os indicadores e a TI acompanha a saúde e faz o diagnóstico.",
].forEach((x) => c.push(B(x)));

// 9 HARDWARE
c.push(H1("9. Hardware"));
c.push(H2("9.1 Quantidades"));
c.push(tabela(["Item", "Estação comum (Medicamento)", "Piloto (05 e 27)", "Operação completa"], [
  ["Módulos Q (alto giro, andares 0 a 3)", "29", "64", fmt(tot.alto_0a3)],
  ["Nós de coluna", "10", "20", "400"],
  ["Módulos E+Q (andares 4 e 5 e zonas)", "4 + 8 = 12", "24", fmt(tot.blocos_alto_45 + tot.zonas_baixo)],
  ["Concentradores", "1", "2", "40"],
  ["Reserva", "", "10%", "10%"],
], [2.6, 1.6, 1.4, 1.6], { direita: [1, 2, 3] }));
c.push(H2("9.2 Cabeamento"));
c.push(...img("cabeamento", 640, 274, "Figura 9. Cabeamento da estação: barramento do alto giro com nós de coluna e barramento do baixo giro com os módulos em cadeia pela eletrocalha"));
[
  "Cabo Cat5e com RJ45 em todos os trechos. Par 1: RS-485; par 2: 12 V; par 3: GND; par 4: reserva.",
  "Não há fio contínuo atrás das plaquinhas. Cada trecho é um cabo curto com conector, e trocar um módulo é soltar dois RJ45 e encaixar o reserva.",
  "A canaleta só conduz e protege os cabos. Os módulos ficam encaixados na frente dela.",
  "Cada módulo e cada cabo têm etiqueta com o código do dispositivo, e o mapa de cada estação fica no Serviço PTL.",
].forEach((x) => c.push(B(x)));
c.push(H2("9.3 Concentrador e gabinete"));
[
  "Placa RP2040 com Ethernet W5500, duas saídas RS-485, regulador de 12 para 5 V, auto-teste ao ligar e watchdog.",
  "Fonte Mean Well LRS-150-12 (12 V, 12,5 A). A estação consome cerca de 1,5 A, o que deixa folga para os LEDs guia e para ampliações.",
  "Gabinete IP54 com cooler de 40 mm com termostato, entrada de ar com filtro lavável, trilho DIN e disjuntor de 2 A.",
].forEach((x) => c.push(B(x)));
c.push(H2("9.4 12 V ou 5 V"));
c.push(P("Cálculo de referência: 10 m de Cat5e (24 AWG, cerca de 0,084 Ω/m por condutor), com um par para o positivo e outro para o negativo (0,042 Ω/m cada) e 2 A de corrente. A resistência do circuito fica em torno de 0,84 Ω e a queda de tensão em 1,7 V. Em 5 V isso é 34%, o que exigiria vários pontos de alimentação. Em 12 V são 14%, que os reguladores dos módulos absorvem, porque aceitam de 7 a 24 V."));
c.push(tabela(["Critério", "12 V (indicado)", "5 V"], [
  ["Queda de tensão em cabo longo", "Os reguladores dos módulos compensam", "Crítica; exige cabos de força extras"],
  ["Componentes", "Um regulador por nó ou módulo, cerca de R$ 8", "Sem reguladores"],
  ["Custo dos materiais (operação completa)", "Cerca de R$ 266 mil", "Cerca de R$ 269 mil; o cabo de força extra custa mais do que os reguladores economizados"],
  ["Manutenção", "Menor: um cabo só por trecho", "Maior: mais pontos de ligação de energia"],
  ["Indicação", "Adotar", "Só em trechos curtos"],
], [2, 2.4, 2.4]));
c.push(H2("9.5 Fazer internamente ou comprar"));
c.push(tabela(["Caminho", "Como seria", "Vantagens", "Desvantagens"], [
  ["Interno", "A equipe monta os módulos com placas e displays comprados no Brasil.", "Menor custo, controle total e reposição rápida.", "Precisa de técnico de eletrônica; padronização manual."],
  ["Terceiros: placa própria (EMS)", "Projeto de placa nosso, fabricado e montado por uma fábrica (JLCPCB, por exemplo) e importado.", "Qualidade industrial e peças iguais; menos mão de obra.", "Projeto da placa (cerca de R$ 15 mil), importação e prazo."],
  ["Terceiros: PTL comercial", "Módulos e controladores prontos de um fornecedor de pick-to-light.", "Produto testado e com garantia.", "Custa cerca de duas vezes e meia mais; dependência do fornecedor."],
], [1.4, 2.4, 1.8, 1.8], { size: 17 }));

// 10 REDE
c.push(H1("10. Rede, segurança e disponibilidade"));
[
  "Um ponto de rede por estação, ligado a switches de 24 portas (dois para a operação completa), em uma VLAN só do PTL, com IP reservado para cada concentrador.",
  "Broker MQTT com um usuário por estação e permissão restrita: cada concentrador só publica e lê os próprios tópicos. TLS é opcional na rede interna.",
  "Sinal de vida a cada 10 s. Estação sem sinal por 30 s aparece como sem comunicação no painel.",
  "Atualização remota do firmware, com volta automática para a versão anterior se a nova falhar.",
  "Backup diário das tabelas do PTL e prazo de retenção dos logs definido pela TI.",
  "Horário sincronizado por NTP no servidor e nos concentradores, para cruzar os eventos.",
].forEach((x) => c.push(B(x)));

// 11 MANUTENCAO
c.push(H1("11. Operação e manutenção"));
[
  "Teste no início de cada turno: todos os displays mostram 8888 por alguns segundos, para achar falhas antes de começar.",
  "Kit de reserva por esteira com módulos Q e E+Q, nós, um concentrador completo e cabos.",
  "Troca de módulo em três passos: desconectar, encaixar o reserva e conferir o teste no painel.",
  "Treinamento de cerca de 2 horas por operador, com prática na estação, e de 16 horas para a equipe de manutenção.",
].forEach((x) => c.push(B(x)));

// 12 ORCAMENTO
c.push(H1("12. Orçamento"));
c.push(P("Os valores de hardware estão na planilha Orcamento_PTL.xlsx, com preços pesquisados em lojas brasileiras em 23 e 26/10/2026. Os itens sem preço público aparecem como estimativa e precisam de cotação. Câmbio usado: US$ 1 = R$ 5,04. Fator de importação estimado: 1,9."));
c.push(tabela(["Cenário", "Piloto (05 e 27)", "Operação completa", "Por estação"], [
  ["A interno, só materiais (12 V)", "R$ 16.707", "R$ 266.040", "R$ 6.651"],
  ["A interno, só materiais (5 V)", "R$ 16.824", "R$ 268.636", "R$ 6.716"],
  ["A interno, materiais e mão de obra", "R$ 22.204", "R$ 364.094", "R$ 9.102"],
  ["A com placa própria (EMS)", "R$ 38.859", "R$ 412.582", "R$ 10.315"],
  ["A com PTL comercial importado", "R$ 50.447", "R$ 936.605", "R$ 23.415"],
  ["B1, RFID com pulseira", "R$ 23.964", "R$ 397.134", "R$ 9.928"],
  ["B2, RFID com leitor fixo", "R$ 23.542", "R$ 390.862", "R$ 9.772"],
], [3, 1.5, 1.7, 1.3], { direita: [1, 2, 3] }));
c.push(P("Os materiais incluem, além dos módulos: canaleta calculada pelo layout de cada estação (cerca de 42 m por estação), cabos, alimentação e protetor de surto dos concentradores, pontos de tomada novos onde faltar, switches com nobreak e mini rack, cabo de uplink, ferramentas de montagem e 5% de frete. A mão de obra inclui montagem, instalação fora do horário de separação (hora extra de 50%), comissionamento e treinamento."));
c.push(P("Software, com desenvolvimento interno: cerca de 1.104 h para a Arquitetura A e 1.024 h para a B, a R$ 103,78 por hora (salário médio de analista de desenvolvimento, R$ 8.458,30, salario.com.br, CBO 212405, com encargos), ou cerca de R$ 115 mil e R$ 106 mil. É custo da equipe interna, não desembolso novo, a menos que o desenvolvimento seja contratado."));
c.push(P("Com 10% de contingência sobre o hardware e somando o software, o investimento total fica em cerca de R$ 515 mil na Arquitetura A e R$ 536 mil na B2."));
c.push(P("Mão de obra interna: R$ 34,93 por hora de técnico, calculados com salário médio de R$ 2.846,84 (salario.com.br, CBO 313215, outubro de 2026), encargos de 100% e 163 horas por mês."));

// 13 IMPLANTACAO
c.push(H1("13. Plano de implantação"));
c.push(tabela(["Fase", "Entregas", "Duração estimada"], [
  ["0. Proposta", "Arquitetura, orçamento e simulador 3D", "Concluída"],
  ["1. Protótipo de bancada", "Um concentrador, um nó com quatro módulos Q e dois módulos E+Q; firmware e versão mínima do Serviço PTL", "3 a 4 semanas"],
  ["2. Piloto", "Estações 05 e 27 completas, app do coletor e painel; medição do tempo por caixa antes e depois", "6 a 8 semanas"],
  ["3. Avaliação", "Resultados do piloto, ajuste de zonas e rota, decisão entre A e B e entre fazer e comprar", "2 semanas"],
  ["4. Expansão", "Medicamento e depois Perfumaria, em lotes de cinco estações", "10 a 14 semanas"],
  ["5. Estabilização", "Ajustes finais, documentação e entrega para a sustentação", "4 semanas"],
], [1.6, 4, 1.4]));

// 14 RISCOS
c.push(H1("14. Riscos"));
c.push(tabela(["Risco", "Impacto", "Como tratar"], [
  ["API do BHT sem os dados necessários da caixa", "Alto", "Testar a API já no protótipo; ter como alternativa a leitura por views no Sybase."],
  ["Itens por caixa diferentes do previsto", "Médio", "Medir no piloto e ajustar o tamanho das zonas."],
  ["Poeira e calor reduzindo a vida útil", "Médio", "Gabinete com filtro e cooler; componentes adequados à temperatura."],
  ["Manutenção alta, como no SmartPicking", "Alto", "RJ45 em todos os trechos, módulos de troca rápida e teste diário."],
  ["Depender de um único técnico de eletrônica", "Médio", "Documentação, padronização e kits de reserva; placa própria (EMS) se a escala justificar."],
  ["Prazo de importação", "Médio", "Fazer o piloto com produção interna enquanto a placa própria é fabricada."],
  ["Resistência dos operadores", "Médio", "Piloto com operadores experientes, treinamento curto e retorno no coletor."],
], [2.6, 0.8, 3.6]));

// 15 PONTOS EM ABERTO
c.push(H1("15. Pontos em aberto"));
c.push(tabela(["#", "Ponto", "Responsável"], [
  ["1", "Medidas das estações (largura do prédio, altura dos andares, canaletas)", "Operação"],
  ["2", "Média de itens por caixa em cada segmento", "Operação / BI"],
  ["3", "Campos e limites da API do BHT e possibilidade de liberar a caixa ao fechar", "TI / fornecedor BHT"],
  ["4", "Origem dos itens da caixa no WMS (tabelas e views) e acesso do Serviço PTL ao Sybase", "DBA"],
  ["5", "Divergências de contagem (esquinas de Perfumaria, estação 26, 21ª estação de Medicamento)", "Operação"],
  ["6", "Tamanho da frota de caixas retornáveis (Arquitetura B)", "Operação"],
  ["7", "Fator de importação e fornecedores para placa própria ou PTL comercial", "Compras / Comex"],
  ["8", "Linguagem e servidor do Serviço PTL; pontos de rede e VLAN", "Arquitetura / Infraestrutura"],
  ["9", "Custo por hora de técnico e de desenvolvimento", "RH / TI"],
], [0.4, 4.6, 2]));

// ANEXO A
c.push(quebra());
c.push(H1("Anexo A. Estações (tabela wms_endereco, 23/10/2026)"));
c.push(tabela(["Rua", "Segmento", "Tipo", "Total", "Alto 0-3", "Alto 4-5", "Baixo", "Zonas", "E+Q"],
  ests.map((e) => [e.rua, e.segmento, e.tipo, e.total, e.alto_0a3, e.alto_45, e.baixo, e.zonas_baixo, e.blocos_alto_45 + e.zonas_baixo].map(String))
    .concat([["Total", "", "", fmt(tot.total), fmt(tot.alto_0a3), fmt(tot.alto_45), fmt(tot.baixo), fmt(tot.zonas_baixo), fmt(tot.blocos_alto_45 + tot.zonas_baixo)]]),
  [0.7, 1.4, 1.1, 0.8, 0.9, 0.9, 0.8, 0.8, 0.7], { size: 16, destacarUltima: true, direita: [3, 4, 5, 6, 7, 8] }));

// ANEXO B
c.push(H1("Anexo B. Glossário"));
c.push(tabela(["Termo", "Significado"], [
  ["Pick-to-light (PTL)", "Separação guiada por displays que mostram onde e quanto pegar."],
  ["Alto giro e baixo giro", "Endereços com muita e com pouca saída. O alto giro (prédios 001 a 010) fica na frente do operador, com a esteira de transporte passando por dentro; o baixo giro fica no corredor atrás dele."],
  ["Andar", "Nível do prédio. O andar 0 é o de cima."],
  ["Esteira de separação", "Esteira aberta na frente do alto giro, a uns 20 cm da de transporte, onde a caixa fica durante a separação."],
  ["Transferência", "Desvio da esteira de transporte para a de separação. Com o rolete direcionador, atende até quatro estações."],
  ["Concentrador", "Controlador da estação, ligado à rede e aos barramentos de displays."],
  ["Módulo Q e módulo E+Q", "Display de quantidade e display de endereço e quantidade, os dois com botão."],
  ["Nó de coluna", "Placa que liga os módulos Q de um prédio do alto giro ao barramento."],
  ["Zona", "Grupo de cerca de três prédios do baixo giro com um display de endereço e quantidade."],
  ["RS-485", "Padrão de comunicação serial próprio para cabos longos em ambiente industrial."],
  ["MQTT", "Protocolo de mensagens usado entre o Serviço PTL e os concentradores."],
  ["NFC / RFID", "Identificação por radiofrequência. O NFC (13,56 MHz) lê a poucos centímetros."],
  ["EMS", "Empresa que fabrica e monta placas eletrônicas por encomenda."],
], [1.8, 5.2]));

// ---------------------------------------------------------------- documento
const doc = new Document({
  features: { updateFields: true },
  creator: "Projeto Pick-to-Light",
  title: "Pick-to-Light: Documento de Arquitetura",
  styles: {
    default: { document: { run: { font: FONTE, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONTE, color: AZ }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONTE, color: "2F5597" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: FONTE, color: CZ }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "marcadores", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 900, hanging: 270 } } } }] },
    { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [t("Projeto Pick-to-Light · Documento de Arquitetura · versão 1.2", { size: 16, color: CZ })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: FONTE, size: 16, color: CZ })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(BASE + "/entregaveis/Arquitetura_PTL_Documento_Tecnico.docx", buf);
  console.log("ok");
});
