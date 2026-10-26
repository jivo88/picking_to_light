// Apresentação para diretoria e arquitetura: projeto Pick-to-Light
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require("/root/.claude/skills/synced/da9afa08-6120-4de3-8d4d-6915cf2cdba3_3227e066-0216-43c3-8836-79c1878be0ea/pptx/scripts/apply_theme.js");

const BASE = "/home/claude/ptl-projeto";
const SAIDA = BASE + "/entregaveis/Apresentacao_PTL.pptx";
const DEMO = BASE + "/diagramas/simulador_3d.png";

const THEME = {
  name: "PTL Flow Rack",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2638", lt1: "FFFFFF", dk2: "2E3A4F", lt2: "EEF1F5",
    accent1: "F2A33A", accent2: "2E8B57", accent3: "2F5597", accent4: "7B4FA0", accent5: "C0392B", accent6: "5B6675",
    hlink: "2F5597", folHlink: "7B4FA0",
  },
};
const HEX = { escuro: "1B2638", ambar: "F2A33A", verde: "2E8B57", azul: "2F5597", roxo: "7B4FA0", cinza: "5B6675", claro: "EEF1F5", branco: "FFFFFF", texto: "1B2638", suave: "5B6675" };

async function icone(Comp, cor = "#FFFFFF", tam = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: cor, size: tam }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}
const imgSize = (nome) => { const b = fs.readFileSync(nome); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = "Pick-to-Light: arquitetura e orçamento";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.333;

  // ---------------------------------------------------------------- layouts
  pres.defineSlideMaster({
    title: "CAPA", background: { color: HEX.escuro },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.3, w: 11.5, h: 1.6, fontSize: 48, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.05, w: 11.5, h: 2.2, fontSize: 20, color: "C9D3E0", align: "left", valign: "top", margin: 0, paraSpaceAfter: 8 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "SECAO", background: { color: HEX.escuro },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.9, w: 11.5, h: 2.0, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.15, w: 11.5, h: 0.9, fontSize: 18, color: "C9D3E0", align: "left", valign: "top", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: 12.4, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: "8A97AB" },
  });
  pres.defineSlideMaster({
    title: "CONTEUDO", background: { color: HEX.branco },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.3, w: 12.1, h: 0.85, fontSize: 26, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
      { text: { text: "Pick-to-Light · Flow rack", options: { x: 0.6, y: 7.0, w: 5, h: 0.3, fontSize: 10, color: "8A97AB", margin: 0 } } },
    ],
    slideNumber: { x: 12.4, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: "8A97AB" },
  });

  const ic = {
    barcode: await icone(fa.FaBarcode), luz: await icone(fa.FaLightbulb), mao: await icone(fa.FaHandPointer),
    ok: await icone(fa.FaCheckCircle), rede: await icone(fa.FaNetworkWired), chip: await icone(fa.FaMicrochip),
    ferr: await icone(fa.FaTools), grafico: await icone(fa.FaChartLine), id: await icone(fa.FaIdCard),
    caixa: await icone(fa.FaBoxOpen), relogio: await icone(fa.FaClock), alerta: await icone(fa.FaExclamationTriangle),
    cubo: await icone(fa.FaCube), escudo: await icone(fa.FaShieldAlt),
  };
  const sombra = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 });
  const circuloIcone = (s, img, x, y, d = 0.62, cor = C.accent1) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: cor }, line: { color: cor } });
    s.addImage({ data: img, x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
  };
  const titulo = (s, txt) => s.addText(txt, { placeholder: "title" });
  const imagem = (s, arq, x, y, wMax, hMax) => {
    const { w, h } = imgSize(arq);
    let ww = wMax, hh = (wMax * h) / w;
    if (hh > hMax) { hh = hMax; ww = (hMax * w) / h; }
    s.addImage({ path: arq, x: x + (wMax - ww) / 2, y, w: ww, h: hh });
    return hh;
  };

  // ================================================================ 1 CAPA
  pres.addSection({ title: "Abertura" });
  let s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Abertura" });
  s.addText("Pick-to-Light no flow rack", { placeholder: "title" });
  s.addText("Proposta de arquitetura, orçamento e piloto para as 40 estações de Medicamento e Perfumaria", { placeholder: "body" });
  s.addText("TI · outubro de 2026", { x: 0.8, y: 6.5, w: 6, h: 0.4, fontSize: 14, color: "8A97AB", margin: 0 });
  s.addNotes("Objetivo da reunião: decidir o piloto e a arquitetura. A planilha, o documento técnico e o simulador estão disponíveis para consulta.");

  // ================================================================ 2 RESUMO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Resumo");
  const stats = [
    ["40", "estações", "20 de Medicamento e 20 de Perfumaria"],
    ["7.981", "endereços", "1.280 com display próprio no alto giro"],
    ["R$ 284 mil", "operação completa", "Arquitetura A, produção interna"],
    ["R$ 15,4 mil", "piloto", "estações 05 e 27"],
  ];
  stats.forEach(([n, r, d], i) => {
    const x = 0.6 + i * 3.08;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w: 2.86, h: 2.2, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
    s.addText(n, { x: x + 0.2, y: 1.7, w: 2.5, h: 0.9, fontSize: i >= 2 ? 30 : 40, bold: true, color: i === 3 ? C.accent1 : C.text1, fontFace: "Arial", margin: 0, isTextBox: true });
    s.addText(r, { x: x + 0.2, y: 2.6, w: 2.5, h: 0.4, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.2, y: 3.0, w: 2.5, h: 0.55, fontSize: 13, color: C.accent6, margin: 0, isTextBox: true });
  });
  s.addText([
    { text: "Proposta: ", options: { bold: true, color: C.text1 } },
    { text: "começar pela Arquitetura A, que usa os coletores MovFast que já temos, com os módulos montados internamente e alimentação em 12 V. O piloto seria nas estações 05 e 27. A Arquitetura B (RFID) pode vir depois, aproveitando os mesmos displays.", options: { color: C.text2 } },
  ], { x: 0.6, y: 4.1, w: 12.1, h: 1.1, fontSize: 17, margin: 0, isTextBox: true, valign: "top" });
  s.addText("Para decidir hoje: aprovação do piloto, Arquitetura A como base e montagem interna dos módulos.", { x: 0.6, y: 5.45, w: 12.1, h: 0.5, fontSize: 16, color: C.text1, bold: true, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Números da tabela wms_endereco e da planilha Orcamento_PTL.xlsx (aba Resumo). O piloto custa cerca de 5% da operação completa e permite medir o ganho antes de investir no restante.");

  // ================================================================ 3 PROBLEMA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Situação atual e objetivos");
  const prob = [
    [ic.caixa, "Cerca de 3.000 volumes por dia", "passam pela linha de separação"],
    [ic.mao, "250 a 270 mil produtos por dia", "separados nas 40 estações"],
    [ic.ferr, "Manutenção no sistema anterior", "fios contínuos na canaleta davam muito trabalho"],
  ];
  prob.forEach(([img, a, b], i) => {
    const y = 1.55 + i * 1.3;
    circuloIcone(s, img, 0.6, y, 0.75, i === 2 ? C.accent5 : C.accent3);
    s.addText(a, { x: 1.55, y: y - 0.05, w: 5.3, h: 0.45, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 1.55, y: y + 0.4, w: 5.3, h: 0.4, fontSize: 15, color: C.accent6, margin: 0, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.2, y: 1.45, w: 5.5, h: 4.9, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
  s.addText("Objetivos do projeto", { x: 7.5, y: 1.65, w: 5, h: 0.5, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true });
  s.addText([
    { text: "Reduzir o tempo por caixa em cada estação", options: { bullet: true, breakLine: true } },
    { text: "Reduzir erros de separação (endereço e quantidade)", options: { bullet: true, breakLine: true } },
    { text: "Abrir e fechar a caixa só com a leitura, sem tocar na tela", options: { bullet: true, breakLine: true } },
    { text: "Trocar um display com defeito em menos de 5 minutos", options: { bullet: true, breakLine: true } },
    { text: "Acompanhamento das estações pela gestão e pela TI", options: { bullet: true } },
  ], { x: 7.5, y: 2.25, w: 5, h: 3.8, fontSize: 16, color: C.text2, paraSpaceAfter: 10, valign: "top", isTextBox: true });
  s.addText("Fica fora nesta fase: controle da esteira (continua no BHT), falta de produto (continua na conferência) e reposição.", { x: 0.6, y: 5.6, w: 6.3, h: 0.8, fontSize: 13, italic: true, color: C.accent6, margin: 0, isTextBox: true });
  s.addNotes("Volume informado pela operação. A falta continua sendo apontada na conferência para não mudar mais processos do que o necessário.");

  // ================================================================ 4 COMO FUNCIONA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Como funciona na estação");
  const passos = [
    [ic.barcode, "1. Lê a etiqueta", "O operador aperta o gatilho do coletor na etiqueta da caixa. A caixa abre na estação."],
    [ic.luz, "2. Displays acendem", "No alto giro acendem todos os endereços da caixa. No baixo giro, cada zona mostra endereço e quantidade."],
    [ic.mao, "3. Pega e confirma", "Pega a quantidade e aperta o botão. O display apaga ou passa ao próximo item da zona."],
    [ic.ok, "4. Lê de novo e fecha", "Com tudo apagado, nova leitura fecha a caixa, grava no Sybase e a caixa volta à esteira."],
  ];
  passos.forEach(([img, t1, t2], i) => {
    const x = 0.6 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 2.85, h: 3.9, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: "D5DBE3" }, shadow: sombra() });
    circuloIcone(s, img, x + 0.3, 1.9, 0.9, i === 1 ? C.accent1 : C.text1);
    s.addText(t1, { x: x + 0.3, y: 3.0, w: 2.35, h: 0.5, fontSize: 19, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(t2, { x: x + 0.3, y: 3.5, w: 2.35, h: 1.8, fontSize: 14, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("Na Arquitetura B, os passos 1 e 4 são feitos pela leitura da tag RFID fixa na caixa.", { x: 0.6, y: 5.85, w: 12, h: 0.5, fontSize: 14, italic: true, color: C.accent4, margin: 0, isTextBox: true });
  s.addNotes("A operação pediu que abrir e fechar a caixa fosse só pela leitura, sem escolher opção na tela.");

  // ================================================================ SECAO ARQUITETURAS
  pres.addSection({ title: "Arquiteturas" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "Arquiteturas" });
  s.addText("Arquiteturas", { placeholder: "title" });
  s.addText("As duas usam os mesmos displays. Muda apenas como a caixa é identificada: pelo coletor (A) ou por RFID (B).", { placeholder: "body" });

  // ================================================================ 6 ARQ A
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Arquitetura A: coletor de dados");
  imagem(s, BASE + "/diagramas/arquitetura_a.png", 0.5, 1.3, 8.6, 5.5);
  const cardsA = [
    ["Coletor MovFast", "A1: app Android próprio (indicado)\nA2: tela do WMS no coletor"],
    ["Serviço PTL", "API e MQTT, ligado ao Sybase e à API do BHT, com painel de acompanhamento"],
    ["Concentrador", "Rede cabeada, dois barramentos RS-485, fonte de 12 V e gabinete ventilado"],
  ];
  cardsA.forEach(([a, b], i) => {
    const y = 1.4 + i * 1.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.35, y, w: 3.4, h: 1.55, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    s.addText(a, { x: 9.55, y: y + 0.12, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.55, y: y + 0.52, w: 3.0, h: 0.95, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("O app (A1) é melhor para o operador. A tela do WMS (A2) é mais rápida de fazer e pode ser usada no piloto se o app atrasar.");

  // ================================================================ 6b COMPONENTES
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Arquitetura de componentes");
  imagem(s, BASE + "/diagramas/componentes.png", 0.5, 1.2, 12.3, 5.7);
  s.addNotes("Azul: software novo (Serviço PTL). Verde: hardware novo em cada estação. Marrom: sistemas que já existem. Tracejado: opcional ou só na Arquitetura B. O serviço fala com o Sybase por SQL, com o BHT por HTTP e com os 40 concentradores por MQTT na rede cabeada; cada concentrador comanda dois barramentos RS-485.");

  // ================================================================ 7 ARQ B
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Arquitetura B: RFID na caixa");
  imagem(s, BASE + "/diagramas/arquitetura_b.png", 0.5, 1.3, 8.6, 5.5);
  const cardsB = [
    ["B2: leitor fixo (indicado)", "Leitor NFC no ponto onde a caixa para e painel LCD. O operador não carrega nada."],
    ["B1: pulseira NFC", "Cerca de R$ 130 por unidade, mãos livres. Bateria e conforto preocupam."],
    ["Tag na caixa", "NTAG213, cerca de R$ 2,37 cada. Frota estimada em 5.000 caixas, a confirmar."],
  ];
  cardsB.forEach(([a, b], i) => {
    const y = 1.4 + i * 1.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.35, y, w: 3.4, h: 1.55, rectRadius: 0.08, fill: { color: "EFE7F6" }, line: { color: "EFE7F6" } });
    s.addText(a, { x: 9.55, y: y + 0.12, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: C.accent4, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.55, y: y + 0.52, w: 3.0, h: 0.95, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Os leitores de pulso comerciais são UHF (o FEIG custa cerca de US$ 997) e leem de longe, podendo pegar a caixa vizinha. Por isso a proposta usa NFC, que lê a poucos centímetros.");

  // ================================================================ 8 A x B
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Comparação entre A e B");
  const cab = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
  const linhasAB = [
    [cab("Critério"), cab("A: coletor"), cab("B2: RFID com leitor fixo")],
    ["Leitura da caixa", "Coletores MovFast que já temos", "Tag em cada caixa e leitor em cada estação"],
    ["O que o operador faz", "Aperta o gatilho para abrir e para fechar", "Posiciona a caixa (abre) e lê de novo (fecha)"],
    ["Hardware, 40 estações", "R$ 284 mil", "R$ 308 mil"],
    ["Custo recorrente novo", "Nenhum", "Tags de caixas novas ou danificadas"],
    ["Software (estimativa)", "Cerca de 1.080 h", "Cerca de 1.000 h, mais o cadastro das tags"],
    ["Principais riscos", "Wi-Fi e disponibilidade dos coletores", "Posição de leitura na esteira; frota de tags"],
    ["Prazo", "Menor", "Maior, por causa das tags, do cadastro e da instalação"],
  ];
  s.addTable(linhasAB, { x: 0.6, y: 1.45, w: 12.1, colW: [3.0, 4.55, 4.55], fontSize: 15, color: C.text2, border: { type: "solid", pt: 0.75, color: "D5DBE3" }, rowH: 0.56, valign: "middle", margin: [4, 8, 4, 8] });
  s.addNotes("Valores com mão de obra interna. A B usa toda a parte de displays da A, então começar pela A não desperdiça investimento.");

  // ================================================================ SECAO ESTACAO
  pres.addSection({ title: "A estação" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "A estação" });
  s.addText("A estação", { placeholder: "title" });
  s.addText("Layout desenhado com a operação e com os endereços da tabela wms_endereco", { placeholder: "body" });

  // ================================================================ 10a PLANTA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Planta da estação e transferência");
  imagem(s, BASE + "/diagramas/planta_estacao.png", 0.5, 1.25, 12.3, 5.6);
  s.addNotes("Esteira de transporte e de separação lado a lado, a uns 20 cm uma da outra. A transferência passa a bacia para a separação e o rolete direcionador manda para 2 estações à esquerda ou 2 à direita (ex.: entre 11 e 12 atende 10 a 13; na ponta, entre 3 e 4 atende 3, 4 e 5). A bacia só entra nas estações com itens do pedido. Alto giro na frente do operador, com a esteira de transporte passando por dentro (por baixo do andar 3 e por cima do andar 4) e a de separação aberta na frente; corredor do baixo giro atrás do operador, com 020-031 à esquerda e 015 + 043 a 032 à direita.");

  // ================================================================ 10 LAYOUT
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Vista frontal da estação 05");
  imagem(s, BASE + "/diagramas/layout_estacao.png", 0.5, 1.4, 12.3, 4.4);
  const leg = [
    [C.accent2, "Alto giro, andares 0 a 3", "um display de quantidade por endereço (29 a 35 por estação)"],
    [C.accent3, "Alto giro, andares 4 e 5", "quatro displays de endereço e quantidade (A4 e A5 em cada lado)"],
    [C.accent1, "Baixo giro", "quatro zonas por lado, com display na altura dos olhos"],
  ];
  leg.forEach(([cor, a, b], i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.OVAL, { x, y: 6.15, w: 0.28, h: 0.28, fill: { color: cor }, line: { color: cor } });
    s.addText([{ text: a + ": ", options: { bold: true, color: C.text1 } }, { text: b, options: { color: C.accent6 } }], { x: x + 0.4, y: 6.0, w: 3.6, h: 0.65, fontSize: 12, margin: 0, valign: "middle", isTextBox: true });
  });
  s.addNotes("Prateleiras alinhadas; a caixa do endereço muda de tamanho pelo tipo. Estação 05: 209 endereços. 49 de alto giro (29 com display próprio e 20 nos andares 4 e 5, atendidos por quatro displays) e 160 de baixo giro em 8 zonas (4 por lado, displays na altura dos olhos). O tamanho da zona é parâmetro e será ajustado no piloto.");

  // ================================================================ 11 DISPLAYS E CABEAMENTO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Displays e cabeamento");
  imagem(s, BASE + "/diagramas/modulos.png", 0.5, 1.3, 7.4, 2.5);
  imagem(s, BASE + "/diagramas/cabeamento.png", 0.5, 3.95, 7.4, 3.0);
  const pontos = [
    [ic.rede, "Cat5e com RJ45", "Dados e 12 V no mesmo cabo. Cada trecho é um cabo curto com conector."],
    [ic.ferr, "Sem fio contínuo na canaleta", "Ao contrário do sistema anterior, o módulo com defeito sai sem abrir a canaleta."],
    [ic.escudo, "12 V em vez de 5 V", "Em 10 m de cabo a queda é de 34% em 5 V e de 14% em 12 V, que os reguladores dos módulos compensam."],
    [ic.chip, "Gabinete ventilado", "Filtro e cooler por causa da poeira e do calor. Teste dos displays a cada turno."],
  ];
  pontos.forEach(([img, a, b], i) => {
    const y = 1.45 + i * 1.35;
    circuloIcone(s, img, 8.3, y, 0.6, i === 2 ? C.accent1 : C.text1);
    s.addText(a, { x: 9.05, y: y - 0.05, w: 3.7, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.05, y: y + 0.35, w: 3.7, h: 0.85, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("O principal pedido da operação é reduzir a manutenção. Cada módulo se liga por RJ45 e o nó de coluna reúne os displays de um prédio.");

  // ================================================================ 12 INTERFACES
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Telas do coletor e painel");
  imagem(s, BASE + "/diagramas/telas_coletor.png", 0.5, 1.3, 8.4, 4.6);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.2, y: 1.4, w: 3.55, h: 4.9, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
  circuloIcone(s, ic.grafico, 9.45, 1.6, 0.6, C.accent3);
  s.addText("Painel de acompanhamento", { x: 10.15, y: 1.65, w: 2.5, h: 0.55, fontSize: 15, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  s.addText([
    { text: "Situação das 40 estações", options: { bullet: true, breakLine: true } },
    { text: "Caixas por hora e tempo médio por caixa", options: { bullet: true, breakLine: true } },
    { text: "Módulos e concentradores com falha", options: { bullet: true, breakLine: true } },
    { text: "Usado pela gestão da operação e pela TI", options: { bullet: true } },
  ], { x: 9.45, y: 2.35, w: 3.15, h: 3.6, fontSize: 14, color: C.text2, paraSpaceAfter: 8, valign: "top", isTextBox: true });
  s.addNotes("Telas do app A1. Com itens pendentes, a segunda leitura gera um alerta e exige nova leitura para fechar; a pendência fica registrada para a conferência.");

  // ================================================================ 13 SEQUENCIA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Integração com Sybase, BHT e concentradores");
  imagem(s, BASE + "/diagramas/sequencia.png", 0.5, 1.3, 8.6, 5.4);
  const integ = [
    ["Sybase ASE", "Tabelas do PTL (sessões, eventos e mapa) e views com os itens da caixa"],
    ["API do BHT", "Dados da caixa. O aviso de conclusão depende do fornecedor."],
    ["MQTT", "Comandos e eventos de cada estação, com usuário e permissão próprios"],
    ["Rede", "VLAN só do PTL. Coletores no Wi-Fi atual."],
  ];
  integ.forEach(([a, b], i) => {
    const y = 1.45 + i * 1.3;
    s.addText(a, { x: 9.35, y, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.35, y: y + 0.4, w: 3.4, h: 0.8, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Para a arquitetura de software: o serviço lê os itens por views no Sybase para não depender do modelo do WMS. Linguagem e servidor ainda serão definidos.");

  // ================================================================ SECAO ORCAMENTO
  pres.addSection({ title: "Orçamento" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "Orçamento" });
  s.addText("Orçamento", { placeholder: "title" });
  s.addText("Preços pesquisados em lojas brasileiras em 23/10/2026. Os itens estimados estão marcados na planilha.", { placeholder: "body" });

  // ================================================================ 15 ORCAMENTO GRAFICO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Orçamento" });
  titulo(s, "Custo de hardware por cenário");
  s.addChart(pres.charts.BAR, [{ name: "Operação completa (R$ mil)", labels: ["A interna, só peças", "A interna, peças e mão de obra", "B2, RFID com leitor fixo", "B1, RFID com pulseira", "A com placa própria (EMS)", "A com PTL comercial"], values: [211, 284, 308, 309, 369, 906] }], {
    x: 0.5, y: 1.35, w: 8.3, h: 5.4, barDir: "bar", chartColors: [THEME.colors.accent3],
    catAxisLabelColor: "5B6675", valAxisLabelColor: "8A97AB", catAxisLabelFontSize: 12, valAxisLabelFontSize: 10,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
    valGridLine: { color: "E3E7ED", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "1B2638", dataLabelFontSize: 12, dataLabelFormatCode: '"R$ "#,##0" mil"',
    valAxisLabelFormatCode: "#,##0", catAxisOrientation: "maxMin", showTitle: true, title: "Hardware para 40 estações (R$ mil)", titleFontSize: 14, titleColor: "1B2638", titleFontFace: "+mn-lt",
  });
  const tabP = [
    [cab("Piloto 05 e 27"), cab("R$")],
    ["A interna, peças", "11.668"],
    ["A interna, com mão de obra", "15.415"],
    ["B2, leitor fixo", "16.588"],
    ["A, placa própria", "34.027"],
    ["A, PTL comercial", "46.363"],
  ];
  s.addTable(tabP, { x: 9.15, y: 1.45, w: 3.6, colW: [2.45, 1.15], fontSize: 13, color: C.text2, border: { type: "solid", pt: 0.75, color: "D5DBE3" }, rowH: 0.45, align: "left" });
  s.addText("Software interno estimado em cerca de 1.080 h (A) e 1.000 h (B). Mão de obra a R$ 34,93 por hora (salário médio de técnico com encargos).", { x: 9.15, y: 4.45, w: 3.6, h: 1.6, fontSize: 12, italic: true, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  s.addNotes("Fonte: Orcamento_PTL.xlsx. A placa própria só compensa em escala, por causa do projeto (cerca de R$ 15 mil) e da importação. Quantidades e preços podem ser alterados na planilha.");

  // ================================================================ 16 INTERNO x TERCEIROS
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Orçamento" });
  titulo(s, "Fazer internamente ou comprar");
  const col = [
    ["Produção interna", C.accent2, "R$ 284 mil", ["Displays e placas comprados no Brasil", "Montagem e manutenção pela equipe", "Reposição imediata", "Precisa de técnico de eletrônica"]],
    ["Placa própria (EMS)", C.accent3, "R$ 369 mil", ["Projeto da placa, cerca de R$ 15 mil", "Fabricação e montagem industrial", "Peças sempre iguais", "Importação e prazo maiores"]],
    ["PTL comercial", C.accent5, "R$ 906 mil", ["Produto pronto e com garantia", "Cerca de três vezes o custo interno", "Dependência do fornecedor", "Precisa de cotação formal"]],
  ];
  col.forEach(([t1, cor, v, itens], i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w: 3.85, h: 4.8, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: "D5DBE3" }, shadow: sombra() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 1.8, w: 0.32, h: 0.32, fill: { color: cor }, line: { color: cor } });
    s.addText(t1, { x: x + 0.75, y: 1.72, w: 2.9, h: 0.5, fontSize: 18, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
    s.addText(v, { x: x + 0.3, y: 2.35, w: 3.3, h: 0.8, fontSize: 30, bold: true, color: cor, margin: 0, isTextBox: true });
    s.addText("operação completa", { x: x + 0.3, y: 3.1, w: 3.3, h: 0.35, fontSize: 12, color: C.accent6, margin: 0, isTextBox: true });
    s.addText(itens.map((it, k) => ({ text: it, options: { bullet: true, breakLine: k < itens.length - 1 } })), { x: x + 0.3, y: 3.6, w: 3.35, h: 2.5, fontSize: 14, color: C.text2, paraSpaceAfter: 6, valign: "top", isTextBox: true });
  });
  s.addNotes("Valores com instalação. 12 V × 5 V: o custo de peças fica praticamente igual (R$ 211 mil × R$ 208 mil), mas o 5 V exige mais pontos de alimentação e aumenta a manutenção. Por isso a indicação é 12 V.");

  // ================================================================ 17 PLANO
  pres.addSection({ title: "Próximos passos" });
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Cronograma");
  const fases = [
    ["Protótipo de bancada", "3 a 4 sem.", "Um concentrador, um nó, displays e versão mínima do Serviço PTL"],
    ["Piloto 05 e 27", "6 a 8 sem.", "Estações completas, app do coletor, painel e medição antes e depois"],
    ["Avaliação", "2 sem.", "Resultados, ajuste das zonas e decisão entre A e B"],
    ["Expansão", "10 a 14 sem.", "Medicamento e depois Perfumaria, de cinco em cinco estações"],
    ["Estabilização", "4 sem.", "Ajustes finais e entrega para a sustentação"],
  ];
  s.addShape(pres.shapes.LINE, { x: 0.9, y: 2.55, w: 11.6, h: 0, line: { color: "C9D1DC", width: 3 } });
  fases.forEach(([a, d, b], i) => {
    const x = 0.6 + i * 2.45;
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: 2.33, w: 0.44, h: 0.44, fill: { color: i === 1 ? C.accent1 : C.text1 }, line: { color: C.background1, width: 2 } });
    s.addText(String(i + 1), { x: x + 0.15, y: 2.33, w: 0.44, h: 0.44, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(d, { x, y: 1.65, w: 2.3, h: 0.45, fontSize: 14, bold: true, color: i === 1 ? C.accent1 : C.accent6, margin: 0, isTextBox: true });
    s.addText(a, { x, y: 3.0, w: 2.3, h: 0.5, fontSize: 17, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x, y: 3.5, w: 2.25, h: 1.6, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.35, w: 12.1, h: 1.15, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
  s.addText([{ text: "Precisamos para começar: ", options: { bold: true, color: C.text1 } },
    { text: "medidas das estações, média de itens por caixa, acesso à API do BHT e às tabelas de pedido no Sybase e a linguagem do Serviço PTL.", options: { color: C.text2 } }],
  { x: 0.85, y: 5.45, w: 11.6, h: 0.95, fontSize: 15, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Os prazos dependem da disponibilidade da equipe e da compra das peças.");

  // ================================================================ 18 RISCOS
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Riscos e como tratar");
  const riscos = [
    ["Dados da caixa na API do BHT", "Validar no protótipo; alternativa por views no Sybase"],
    ["Manutenção alta, como no sistema anterior", "RJ45 em todos os trechos, módulos de troca rápida e teste a cada turno"],
    ["Poeira e calor", "Gabinete com filtro e cooler e componentes para 0 a 50 °C"],
    ["Itens por caixa fora do esperado", "Medir no piloto e ajustar o tamanho das zonas"],
    ["Depender de um único técnico", "Documentação, kits de reserva e, se necessário, placa própria"],
    ["Resistência dos operadores", "Piloto com operadores experientes e treinamento de 30 min"],
  ];
  riscos.forEach(([r, m], i) => {
    const x = 0.6 + (i % 2) * 6.15, y = 1.45 + Math.floor(i / 2) * 1.65;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 1.45, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    circuloIcone(s, ic.alerta, x + 0.25, y + 0.25, 0.55, C.accent1);
    s.addText(r, { x: x + 1.0, y: y + 0.18, w: 4.75, h: 0.45, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(m, { x: x + 1.0, y: y + 0.62, w: 4.75, h: 0.7, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Detalhes no item 14 do documento técnico.");

  // ================================================================ 19 DEMONSTRACAO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Demonstração no simulador 3D");
  if (fs.existsSync(DEMO)) {
    imagem(s, DEMO, 0.5, 1.3, 8.6, 5.4);
  } else {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.3, w: 8.6, h: 5.2, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
  }
  const roteiro = [
    "A caixa entra pela transferência",
    "Leitura no coletor virtual ou por RFID",
    "Alto giro e zonas acendem com os endereços da tabela",
    "Confirmação nos botões",
    "Nova leitura fecha e a caixa volta à esteira",
    "Painel com tempo e produtividade",
  ];
  circuloIcone(s, ic.cubo, 9.4, 1.4, 0.6, C.accent1);
  s.addText("Roteiro (5 minutos)", { x: 10.1, y: 1.45, w: 2.6, h: 0.5, fontSize: 16, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  s.addText(roteiro.map((r, k) => ({ text: r, options: { bullet: { type: "number" }, breakLine: k < roteiro.length - 1 } })), { x: 9.4, y: 2.2, w: 3.4, h: 4.2, fontSize: 14, color: C.text2, paraSpaceAfter: 8, valign: "top", isTextBox: true });
  s.addNotes("Abrir o simulador pela pasta simulador-3d do repositório picking_to_light (python iniciar_3d.py) e usar a estação 05.");

  // ================================================================ 20 DECISAO
  s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Próximos passos" });
  s.addText("Decisões", { placeholder: "title" });
  s.addText("1. Aprovar o piloto nas estações 05 e 27 (cerca de R$ 15,4 mil)\n2. Usar a Arquitetura A como base e deixar a B para depois\n3. Montar os módulos internamente, em 12 V\n4. Liberar medidas, dados de volume, API do BHT e acesso ao Sybase", { placeholder: "body" });
  s.addNotes("Com essas quatro decisões, o protótipo de bancada pode começar na semana seguinte.");

  await pres.writeFile({ fileName: SAIDA });
  await applyTheme(SAIDA, THEME);
  console.log("ok", SAIDA);
})();
