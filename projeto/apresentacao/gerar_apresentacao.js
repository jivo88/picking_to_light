// Apresentacao para diretoria e arquitetura — Pick-to-Light
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
  pres.title = "Pick-to-Light — Arquitetura e orçamento";
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
  s.addText("Arquitetura, funcionamento, orçamento e demonstração · 40 estações de Medicamento e Perfumaria", { placeholder: "body" });
  for (let i = 0; i < 12; i++) {
    const aceso = [1, 4, 7, 8].includes(i);
    s.addShape(pres.shapes.OVAL, { x: 0.8 + i * 0.55, y: 1.45, w: 0.28, h: 0.28, fill: { color: aceso ? HEX.ambar : "2E3A4F" }, line: { color: aceso ? HEX.ambar : "2E3A4F" } });
  }
  s.addText("Versão para decisão · 23/10/2026", { x: 0.8, y: 6.5, w: 6, h: 0.4, fontSize: 14, color: "8A97AB", margin: 0 });
  s.addNotes("Abertura: o objetivo da reunião é decidir o piloto e a arquitetura. Tudo o que for mostrado tem planilha, documento técnico e simulador como apoio.");

  // ================================================================ 2 RESUMO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Resumo: piloto de R$ 14,6 mil para validar a operação completa");
  const stats = [
    ["40", "estações", "20 Medicamento + 20 Perfumaria"],
    ["7.981", "endereços", "1.280 com display próprio no alto giro"],
    ["R$ 270 mil", "operação completa", "Arquitetura A, produção interna"],
    ["R$ 14,6 mil", "piloto", "estações 05 e 27"],
  ];
  stats.forEach(([n, r, d], i) => {
    const x = 0.6 + i * 3.08;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w: 2.86, h: 2.2, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
    s.addText(n, { x: x + 0.2, y: 1.7, w: 2.5, h: 0.9, fontSize: i >= 2 ? 30 : 40, bold: true, color: i === 3 ? C.accent1 : C.text1, fontFace: "Arial", margin: 0, isTextBox: true });
    s.addText(r, { x: x + 0.2, y: 2.6, w: 2.5, h: 0.4, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.2, y: 3.0, w: 2.5, h: 0.55, fontSize: 13, color: C.accent6, margin: 0, isTextBox: true });
  });
  s.addText([
    { text: "Recomendação: ", options: { bold: true, color: C.text1 } },
    { text: "Arquitetura A (coletores MovFast já existentes + concentrador + displays), produção interna em 12 V, piloto nas estações 05 e 27. A Arquitetura B (RFID) fica como evolução, usando a mesma infraestrutura de displays.", options: { color: C.text2 } },
  ], { x: 0.6, y: 4.1, w: 12.1, h: 1.1, fontSize: 17, margin: 0, isTextBox: true, valign: "top" });
  circuloIcone(s, ic.ok, 0.6, 5.45, 0.5, C.accent2);
  s.addText("Decisões pedidas hoje: aprovar o piloto, a arquitetura A como base e o caminho de produção interna.", { x: 1.25, y: 5.45, w: 11.4, h: 0.5, fontSize: 16, color: C.text1, bold: true, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Números da tabela wms_endereco e da planilha Orcamento_PTL.xlsx (aba Resumo). O piloto custa cerca de 5% da operação completa e mede o ganho real antes do investimento maior.");

  // ================================================================ 3 PROBLEMA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Hoje o operador procura o endereço; a luz passa a indicar onde e quanto");
  const prob = [
    [ic.caixa, "≈ 3.000 volumes/dia", "passam pela linha de separação"],
    [ic.mao, "250 a 270 mil produtos/dia", "separados em linha nas 40 estações"],
    [ic.ferr, "Manutenção era o problema", "na experiência anterior (fios contínuos na canaleta)"],
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
    { text: "Troca de qualquer display em menos de 5 minutos", options: { bullet: true, breakLine: true } },
    { text: "Visão em tempo real para gestão e TI", options: { bullet: true } },
  ], { x: 7.5, y: 2.25, w: 5, h: 3.8, fontSize: 16, color: C.text2, paraSpaceAfter: 10, valign: "top", isTextBox: true });
  s.addText("Fora do escopo agora: controle da esteira (BHT), falta no display (segue na conferência) e reposição (melhoria futura).", { x: 0.6, y: 5.6, w: 6.3, h: 0.8, fontSize: 13, italic: true, color: C.accent6, margin: 0, isTextBox: true });
  s.addNotes("Volume informado pela operação. A falta continua sendo apontada na conferência, como hoje, para não alterar processos além do necessário.");

  // ================================================================ 4 COMO FUNCIONA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Abertura" });
  titulo(s, "Quatro passos, nenhum toque na tela");
  const passos = [
    [ic.barcode, "1. Lê a etiqueta", "O operador aperta o gatilho do coletor na etiqueta da caixa. A caixa abre na estação."],
    [ic.luz, "2. Displays acendem", "Alto giro: todos os endereços com a quantidade. Baixo giro: endereço + quantidade por zona."],
    [ic.mao, "3. Pega e confirma", "Pega a quantidade e aperta o botão. O display apaga ou passa ao próximo item da zona."],
    [ic.ok, "4. Lê de novo e fecha", "Com todos apagados, nova leitura fecha, registra no Sybase e a bacia volta à esteira."],
  ];
  passos.forEach(([img, t1, t2], i) => {
    const x = 0.6 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 2.85, h: 3.9, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: "D5DBE3" }, shadow: sombra() });
    circuloIcone(s, img, x + 0.3, 1.9, 0.9, i === 1 ? C.accent1 : C.text1);
    s.addText(t1, { x: x + 0.3, y: 3.0, w: 2.35, h: 0.5, fontSize: 19, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(t2, { x: x + 0.3, y: 3.5, w: 2.35, h: 1.8, fontSize: 14, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("Na Arquitetura B, os passos 1 e 4 acontecem com a leitura RFID da tag fixa na caixa retornável.", { x: 0.6, y: 5.85, w: 12, h: 0.5, fontSize: 14, italic: true, color: C.accent4, margin: 0, isTextBox: true });
  s.addNotes("Abertura e fechamento só com a leitura atende ao pedido da operação: selecionar opção na tela reduz produtividade.");

  // ================================================================ SECAO ARQUITETURAS
  pres.addSection({ title: "Arquiteturas" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "Arquiteturas" });
  s.addText("Duas arquiteturas, uma mesma infraestrutura de displays", { placeholder: "title" });
  s.addText("A muda só a forma de identificar a caixa: coletor (A) ou RFID (B)", { placeholder: "body" });

  // ================================================================ 6 ARQ A
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Arquitetura A: coletor existente + concentrador por estação");
  imagem(s, BASE + "/diagramas/arquitetura_a.png", 0.5, 1.3, 8.6, 5.5);
  const cardsA = [
    ["Coletor MovFast", "A1: app Android próprio (recomendado)\nA2: tela do WMS no coletor"],
    ["Serviço PTL", "API + MQTT, integra Sybase e API do BHT, painel de gestão"],
    ["Concentrador", "Ethernet cabeada, 2 barramentos RS-485, fonte 12 V, gabinete ventilado"],
  ];
  cardsA.forEach(([a, b], i) => {
    const y = 1.4 + i * 1.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.35, y, w: 3.4, h: 1.55, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    s.addText(a, { x: 9.55, y: y + 0.12, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.55, y: y + 0.52, w: 3.0, h: 0.95, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("A alternativa A1 (app) dá a melhor experiência; A2 (tela do WMS) é mais rápida de desenvolver e pode servir no piloto se o app atrasar.");

  // ================================================================ 7 ARQ B
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "Arquitetura B: RFID na caixa retornável, mesmos displays");
  imagem(s, BASE + "/diagramas/arquitetura_b.png", 0.5, 1.3, 8.6, 5.5);
  const cardsB = [
    ["B2 — leitor fixo (recomendado)", "Leitor NFC na posição da caixa + painel LCD. Nada no corpo do operador."],
    ["B1 — pulseira NFC", "≈ R$ 130 por unidade, mãos livres; bateria e conforto são o ponto de atenção."],
    ["Tag na caixa", "NTAG213 ≈ R$ 2,37/un; frota estimada de 5.000 caixas (confirmar)."],
  ];
  cardsB.forEach(([a, b], i) => {
    const y = 1.4 + i * 1.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.35, y, w: 3.4, h: 1.55, rectRadius: 0.08, fill: { color: "EFE7F6" }, line: { color: "EFE7F6" } });
    s.addText(a, { x: 9.55, y: y + 0.12, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: C.accent4, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.55, y: y + 0.52, w: 3.0, h: 0.95, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Leitores de pulso comerciais são UHF (ex.: FEIG ≈ US$ 997) e leem de longe, com risco de pegar a caixa vizinha. Por isso a proposta usa NFC de curto alcance.");

  // ================================================================ 8 A x B
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Arquiteturas" });
  titulo(s, "A começa mais rápido e mais barato; B tira o coletor da mão do operador");
  const cab = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
  const linhasAB = [
    [cab("Critério"), cab("A — Coletor"), cab("B2 — RFID leitor fixo")],
    ["Leitura da caixa", "Coletores MovFast já existentes", "Tag fixa na caixa + leitor por estação"],
    ["Ação do operador", "Gatilho para abrir e para fechar", "Posiciona a caixa (abre); nova leitura (fecha)"],
    ["Hardware — 40 estações", "R$ 270 mil", "R$ 293 mil"],
    ["Custo recorrente novo", "Nenhum", "Tags de caixas novas ou danificadas"],
    ["Software (estimativa)", "≈ 1.080 h", "≈ 1.000 h + cadastro das tags"],
    ["Principais riscos", "Wi-Fi e disponibilidade dos coletores", "Posição de leitura na esteira; frota de tags"],
    ["Prazo", "Menor", "Maior (tags, cadastro, mecânica)"],
  ];
  s.addTable(linhasAB, { x: 0.6, y: 1.45, w: 12.1, colW: [3.0, 4.55, 4.55], fontSize: 15, color: C.text2, border: { type: "solid", pt: 0.75, color: "D5DBE3" }, rowH: 0.56, valign: "middle", margin: [4, 8, 4, 8] });
  s.addNotes("Valores com mão de obra interna. A Arquitetura B reaproveita 100% da infraestrutura de displays da A, então começar pela A não perde investimento.");

  // ================================================================ SECAO ESTACAO
  pres.addSection({ title: "A estação" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "A estação" });
  s.addText("A estação: alto giro na esteira, baixo giro no corredor", { placeholder: "title" });
  s.addText("Layout conforme o desenho da operação, com os endereços reais da tabela wms_endereco", { placeholder: "body" });

  // ================================================================ 10a PLANTA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Uma transferência atende 4 estações; a bacia volta à esteira de qualquer ponto");
  imagem(s, BASE + "/diagramas/planta_estacao.png", 0.5, 1.25, 12.3, 5.6);
  s.addNotes("Esteira de transporte e de separação lado a lado (≈ 20 cm). A transferência passa a bacia para a separação e o rolete direcionador manda para 2 estações à esquerda ou 2 à direita (ex.: entre 11 e 12 atende 10 a 13; na ponta, entre 3 e 4 atende 3, 4 e 5). A bacia só entra nas estações com itens do pedido. Alto giro atrás do operador; corredor do baixo giro com 020-031 à esquerda e 015 + 043 a 032 à direita.");

  // ================================================================ 10 LAYOUT
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Andar 0 em cima; alto giro com display por endereço e baixo giro por zonas");
  imagem(s, BASE + "/diagramas/layout_estacao.png", 0.5, 1.4, 12.3, 4.4);
  const leg = [
    [C.accent2, "Alto giro, andares 0-3 (de cima)", "1 display de quantidade por endereço (29 a 35 por estação)"],
    [C.accent3, "Alto giro, andares 4-5", "4 displays por estação (A4 e A5 em cada lado) com endereço + quantidade"],
    [C.accent1, "Baixo giro", "1 display de endereço + quantidade a cada 4 prédios (6 a 9 zonas)"],
  ];
  leg.forEach(([cor, a, b], i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.OVAL, { x, y: 6.15, w: 0.28, h: 0.28, fill: { color: cor }, line: { color: cor } });
    s.addText([{ text: a + ": ", options: { bold: true, color: C.text1 } }, { text: b, options: { color: C.accent6 } }], { x: x + 0.4, y: 6.0, w: 3.6, h: 0.65, fontSize: 12, margin: 0, valign: "middle", isTextBox: true });
  });
  s.addNotes("Prateleiras alinhadas; a caixa do endereço muda de tamanho pelo tipo. Estação 05: 209 endereços. 49 de alto giro (29 com display próprio + 20 nos andares 4-5, atendidos por 4 displays E+Q) e 160 de baixo giro em 6 zonas. O tamanho da zona é parâmetro e será ajustado no piloto.");

  // ================================================================ 11 DISPLAYS E CABEAMENTO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Conector em todos os trechos: display trocado em menos de 5 minutos");
  imagem(s, BASE + "/diagramas/modulos.png", 0.5, 1.3, 7.4, 2.5);
  imagem(s, BASE + "/diagramas/cabeamento.png", 0.5, 3.95, 7.4, 3.0);
  const pontos = [
    [ic.rede, "Cat5e com RJ45", "RS-485 e 12 V no mesmo cabo; cada trecho é um cabo curto com conector."],
    [ic.ferr, "Sem fio contínuo na canaleta", "Diferente do sistema anterior: o módulo com defeito sai sem abrir a canaleta."],
    [ic.escudo, "12 V em vez de 5 V", "Em 10 m de cabo a queda chega a 34% em 5 V e a 14% em 12 V, absorvida pelos reguladores locais."],
    [ic.chip, "Gabinete ventilado", "Filtro e cooler contra poeira e calor; auto-teste diário dos displays."],
  ];
  pontos.forEach(([img, a, b], i) => {
    const y = 1.45 + i * 1.35;
    circuloIcone(s, img, 8.3, y, 0.6, i === 2 ? C.accent1 : C.text1);
    s.addText(a, { x: 9.05, y: y - 0.05, w: 3.7, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.05, y: y + 0.35, w: 3.7, h: 0.85, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("O requisito central da operação é reduzir manutenção. Cada módulo se conecta por RJ45; o nó de coluna concentra os displays de um prédio.");

  // ================================================================ 12 INTERFACES
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "No coletor, só o necessário: abrir, acompanhar e fechar");
  imagem(s, BASE + "/diagramas/telas_coletor.png", 0.5, 1.3, 8.4, 4.6);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.2, y: 1.4, w: 3.55, h: 4.9, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
  circuloIcone(s, ic.grafico, 9.45, 1.6, 0.6, C.accent3);
  s.addText("Painel de monitoramento", { x: 10.15, y: 1.65, w: 2.5, h: 0.55, fontSize: 15, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  s.addText([
    { text: "Status das 40 estações em tempo real", options: { bullet: true, breakLine: true } },
    { text: "Caixas/hora e tempo médio por caixa", options: { bullet: true, breakLine: true } },
    { text: "Módulos e concentradores com falha", options: { bullet: true, breakLine: true } },
    { text: "Para gestão da operação e TI", options: { bullet: true } },
  ], { x: 9.45, y: 2.35, w: 3.15, h: 3.6, fontSize: 14, color: C.text2, paraSpaceAfter: 8, valign: "top", isTextBox: true });
  s.addNotes("Telas do app A1. Com itens pendentes, a segunda leitura gera um alerta e exige nova leitura para fechar; a pendência fica registrada para a conferência.");

  // ================================================================ 13 SEQUENCIA
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "A estação" });
  titulo(s, "Integração: o Serviço PTL fala com o Sybase, a API do BHT e os concentradores");
  imagem(s, BASE + "/diagramas/sequencia.png", 0.5, 1.3, 8.6, 5.4);
  const integ = [
    ["Sybase ASE", "Tabelas PTL (sessões, eventos, mapa) e views dos itens da caixa"],
    ["API do BHT", "Dados da caixa; aviso de conclusão a validar com o fornecedor"],
    ["MQTT", "Comandos e eventos por estação, com usuário e ACL próprios"],
    ["Rede", "VLAN dedicada; coletores no Wi-Fi existente"],
  ];
  integ.forEach(([a, b], i) => {
    const y = 1.45 + i * 1.3;
    s.addText(a, { x: 9.35, y, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.35, y: y + 0.4, w: 3.4, h: 0.8, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Para o arquiteto de software: o serviço lê os itens por views no Sybase para não acoplar ao modelo do WMS. Linguagem e hospedagem do serviço ficam para a decisão da arquitetura.");

  // ================================================================ SECAO ORCAMENTO
  pres.addSection({ title: "Orçamento" });
  s = pres.addSlide({ masterName: "SECAO", sectionTitle: "Orçamento" });
  s.addText("Orçamento e caminhos de produção", { placeholder: "title" });
  s.addText("Preços cotados em lojas brasileiras em 23/10/2026; estimativas marcadas na planilha", { placeholder: "body" });

  // ================================================================ 15 ORCAMENTO GRAFICO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Orçamento" });
  titulo(s, "Produção interna custa um terço de um sistema comercial importado");
  s.addChart(pres.charts.BAR, [{ name: "Operação completa (R$ mil)", labels: ["A interna — só peças", "A interna — peças + mão de obra", "B2 — RFID leitor fixo", "B1 — RFID pulseira", "A terceiros — placa própria (EMS)", "A terceiros — PTL comercial"], values: [199, 270, 293, 294, 348, 852] }], {
    x: 0.5, y: 1.35, w: 8.3, h: 5.4, barDir: "bar", chartColors: [THEME.colors.accent3],
    catAxisLabelColor: "5B6675", valAxisLabelColor: "8A97AB", catAxisLabelFontSize: 12, valAxisLabelFontSize: 10,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
    valGridLine: { color: "E3E7ED", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "1B2638", dataLabelFontSize: 12, dataLabelFormatCode: '"R$ "#,##0" mil"',
    valAxisLabelFormatCode: "#,##0", catAxisOrientation: "maxMin", showTitle: true, title: "Hardware — 40 estações (R$ mil)", titleFontSize: 14, titleColor: "1B2638", titleFontFace: "+mn-lt",
  });
  const tabP = [
    [cab("Piloto 05 + 27"), cab("R$")],
    ["A interna — peças", "10.994"],
    ["A interna — peças + MO", "14.566"],
    ["B2 — RFID leitor fixo", "15.738"],
    ["A — placa própria (EMS)", "32.808"],
    ["A — PTL comercial", "43.196"],
  ];
  s.addTable(tabP, { x: 9.15, y: 1.45, w: 3.6, colW: [2.45, 1.15], fontSize: 13, color: C.text2, border: { type: "solid", pt: 0.75, color: "D5DBE3" }, rowH: 0.45, align: "left" });
  s.addText("Software interno estimado: ≈ 1.080 h (A) e ≈ 1.000 h (B). Mão de obra a R$ 34,93/h (salário médio de técnico + encargos).", { x: 9.15, y: 4.45, w: 3.6, h: 1.6, fontSize: 12, italic: true, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  s.addNotes("Fonte: Orcamento_PTL.xlsx. A placa própria (EMS) só se paga em escala por causa do projeto (≈ R$ 15 mil) e da importação. Todas as quantidades e preços são editáveis na planilha.");

  // ================================================================ 16 INTERNO x TERCEIROS
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Orçamento" });
  titulo(s, "Interno no piloto; placa própria como opção de escala");
  const col = [
    ["Produção interna", C.accent2, "R$ 270 mil", ["Displays e placas comprados no Brasil", "Montagem e manutenção pela equipe", "Reposição imediata, domínio total", "Exige técnico de eletrônica"]],
    ["Placa própria (EMS)", C.accent3, "R$ 348 mil", ["Projeto da placa ≈ R$ 15 mil", "Fabricação e montagem industrial", "Qualidade e repetibilidade", "Importação e prazo maiores"]],
    ["PTL comercial", C.accent5, "R$ 852 mil", ["Produto pronto e com garantia", "≈ 3× o custo da produção interna", "Dependência do fornecedor", "Cotação formal necessária"]],
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
  s.addNotes("Valores com instalação. 12 V × 5 V: o custo de peças fica praticamente igual (R$ 199 mil × R$ 197 mil), mas 5 V exige mais pontos de alimentação e aumenta a manutenção — por isso a recomendação é 12 V.");

  // ================================================================ 17 PLANO
  pres.addSection({ title: "Próximos passos" });
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Piloto em cerca de 10 semanas, expansão por esteira");
  const fases = [
    ["Protótipo de bancada", "3-4 sem.", "1 concentrador, 1 nó, displays, Serviço PTL mínimo"],
    ["Piloto 05 e 27", "6-8 sem.", "Estações completas, app do coletor, painel, medição antes/depois"],
    ["Avaliação", "2 sem.", "Indicadores, ajuste das zonas, decisão A/B e produção"],
    ["Expansão", "10-14 sem.", "Medicamento e depois Perfumaria, em lotes de 5 estações"],
    ["Estabilização", "4 sem.", "Ajustes finais e passagem para a sustentação"],
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
  s.addText([{ text: "Para começar: ", options: { bold: true, color: C.text1 } },
    { text: "fotos e medidas das estações, média de itens por caixa, acesso à API do BHT e às tabelas de pedido no Sybase, e definição da linguagem do Serviço PTL.", options: { color: C.text2 } }],
  { x: 0.85, y: 5.45, w: 11.6, h: 0.95, fontSize: 15, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Prazos estimados; dependem da disponibilidade da equipe e da compra das peças.");

  // ================================================================ 18 RISCOS
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Riscos conhecidos já têm mitigação no desenho");
  const riscos = [
    ["Dados da caixa na API do BHT", "Validar no protótipo; alternativa por views no Sybase"],
    ["Manutenção alta (experiência anterior)", "RJ45 em todos os trechos, módulos de troca rápida, auto-teste diário"],
    ["Poeira e calor", "Gabinete com filtro e cooler; componentes para 0-50 °C"],
    ["Itens por caixa fora do esperado", "Medir no piloto e ajustar o tamanho das zonas"],
    ["Dependência de um técnico", "Documentação, kits de reserva e opção de placa própria"],
    ["Adoção pelos operadores", "Piloto com operadores-chave e treinamento de 30 min"],
  ];
  riscos.forEach(([r, m], i) => {
    const x = 0.6 + (i % 2) * 6.15, y = 1.45 + Math.floor(i / 2) * 1.65;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 1.45, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    circuloIcone(s, ic.alerta, x + 0.25, y + 0.25, 0.55, C.accent1);
    s.addText(r, { x: x + 1.0, y: y + 0.18, w: 4.75, h: 0.45, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(m, { x: x + 1.0, y: y + 0.62, w: 4.75, h: 0.7, fontSize: 13, color: C.accent6, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Detalhes completos na seção 14 do documento técnico.");

  // ================================================================ 19 DEMONSTRACAO
  s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: "Próximos passos" });
  titulo(s, "Demonstração: a estação 05 em 3D, com o fluxo completo");
  if (fs.existsSync(DEMO)) {
    imagem(s, DEMO, 0.5, 1.3, 8.6, 5.4);
  } else {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.3, w: 8.6, h: 5.2, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 } });
  }
  const roteiro = [
    "Bacia entra pela transferência",
    "Leitura no coletor virtual (ou modo RFID)",
    "Alto giro e zonas acendem (endereços reais)",
    "Confirmação nos botões; zonas avançam",
    "Nova leitura fecha; bacia volta à esteira",
    "Painel mostra tempo e produtividade",
  ];
  circuloIcone(s, ic.cubo, 9.4, 1.4, 0.6, C.accent1);
  s.addText("Roteiro (≈ 5 min)", { x: 10.1, y: 1.45, w: 2.6, h: 0.5, fontSize: 16, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  s.addText(roteiro.map((r, k) => ({ text: r, options: { bullet: { type: "number" }, breakLine: k < roteiro.length - 1 } })), { x: 9.4, y: 2.2, w: 3.4, h: 4.2, fontSize: 14, color: C.text2, paraSpaceAfter: 8, valign: "top", isTextBox: true });
  s.addNotes("Abrir o simulador (repositório picking_to_light, pasta simulador-3d): python iniciar_3d.py. Usar a estação 05 com os 209 endereços reais.");

  // ================================================================ 20 DECISAO
  s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Próximos passos" });
  s.addText("Decisões para hoje", { placeholder: "title" });
  s.addText("1. Aprovar o piloto nas estações 05 e 27 (≈ R$ 14,6 mil)\n2. Adotar a Arquitetura A como base, com B como evolução\n3. Produção interna em 12 V no piloto\n4. Liberar fotos, dados de volume, API do BHT e acesso ao Sybase", { placeholder: "body" });
  s.addNotes("Fechamento: as quatro decisões permitem iniciar o protótipo de bancada na próxima semana.");

  await pres.writeFile({ fileName: SAIDA });
  await applyTheme(SAIDA, THEME);
  console.log("ok", SAIDA);
})();
