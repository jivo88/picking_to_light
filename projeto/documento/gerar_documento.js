// Gera o documento tecnico de arquitetura (.docx) do projeto Pick-to-Light
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
c.push(new Paragraph({ spacing: { before: 2400 }, children: [t("PROJETO PICK-TO-LIGHT", { size: 24, bold: true, color: "F2A33A" })] }));
c.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [t("Documento de Arquitetura", { size: 56, bold: true, color: AZ })] }));
c.push(new Paragraph({ spacing: { after: 600 }, children: [t("Separação guiada por luz no flow rack — Medicamento e Perfumaria", { size: 28, color: CZ })] }));
c.push(tabela(["Item", "Conteúdo"], [
  ["Arquiteturas", "A — Coletor de dados + concentrador + displays\nB — Identificação por RFID + concentrador + displays"],
  ["Abrangência", "40 estações (20 Medicamento, ruas 03-22; 20 Perfumaria, ruas 26-45) — 7.981 endereços"],
  ["Piloto proposto", "Estação 05 (Medicamento, comum) e Estação 27 (Perfumaria, comum)"],
  ["Documentos relacionados", "Orcamento_PTL.xlsx · Apresentacao_PTL.pptx · Simulador 3D (repositório picking_to_light)"],
  ["Versão", "1.0 — 23/10/2026 — rascunho para revisão (TI, arquitetura e diretoria)"],
], [1, 3]));
c.push(quebra());

// SUMARIO
c.push(new Paragraph({ children: [t("Sumário", { size: 32, bold: true, color: AZ })], spacing: { after: 200 } }));
c.push(new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }));
c.push(P("Para atualizar o sumário no Word: clique com o botão direito sobre ele e escolha \"Atualizar campo\".", { italic: true, size: 18, color: CZ }));
c.push(quebra());

// 1 OBJETIVO
c.push(H1("1. Objetivo e escopo"));
c.push(R("O projeto substitui a busca visual do endereço pelo operador por **separação guiada por luz** (pick-to-light): ao ler a etiqueta da caixa, os displays dos endereços com itens daquela caixa acendem com a **quantidade** a pegar; o operador pega, confirma no botão e o display apaga. O objetivo é reduzir o tempo por caixa e os erros de separação na linha, que hoje movimenta cerca de **3.000 volumes e 250 a 270 mil produtos por dia**."));
c.push(H2("1.1 Dentro do escopo"));
[
  "Duas arquiteturas de identificação da caixa: **A — coletor de dados** (MovFast Android, já existente) e **B — RFID** (tag fixa na caixa retornável).",
  "Infraestrutura de displays comum às duas: concentrador por estação, displays de quantidade no alto giro, displays de endereço + quantidade nos andares 4-5 do alto giro e nas zonas de baixo giro.",
  "Serviço PTL (servidor) integrado ao Sybase ASE e à API do sistema BHT, com painel de monitoramento para gestão e TI.",
  "Dois caminhos de produção: **interna** (equipe própria) e **terceiros** (placas montadas por fábrica ou sistema comercial importado).",
  "Orçamento do **piloto** (estações 05 e 27) e da **operação completa** (40 estações), em 12 V e 5 V.",
  "Simulador 3D de uma estação completa (alto giro, área de espera e corredor do baixo giro, com as vizinhas) para demonstração.",
].forEach((x) => c.push(B(x)));
c.push(H2("1.2 Fora do escopo (nesta fase)"));
[
  "**Controle da esteira**: continua com o sistema BHT, que já lê a etiqueta da caixa e movimenta a esteira.",
  "**Tratamento de falta no display**: a falta de produto continua sendo identificada na **conferência**, operação que já existe após a separação.",
  "**Reposição/reabastecimento** guiado pelos displays: sugerido como melhoria futura (o hardware já comporta).",
  "Reaproveitamento da interface MFC de terceiros (192.168.254.4:8080): não será usada; as informações da caixa virão por API.",
].forEach((x) => c.push(B(x)));

// 2 SITUACAO ATUAL
c.push(H1("2. Situação atual e premissas da operação"));
c.push(tabela(["Tema", "Situação levantada"], [
  ["Sistemas", "WMS legado próprio em PowerBuilder 12 com banco Sybase ASE 16. Sistema BHT (terceiro) controla a esteira e lê a etiqueta da caixa."],
  ["Coletores", "MovFast com Android na versão mais recente, conectados por Wi-Fi."],
  ["Operadores", "1 operador por estação; uma caixa por vez em cada estação."],
  ["Volume", "≈ 3.000 volumes/dia e 250.000 a 270.000 produtos/dia. Itens por caixa variam bastante (Perfumaria tem menos itens por caixa) — número médio a confirmar."],
  ["Caixas", "Retornáveis (permite tag RFID fixa na Arquitetura B)."],
  ["Rede", "Concentradores ligados por cabo; apenas os coletores usam Wi-Fi."],
  ["Energia", "Preferência por 12 V para displays e concentrador; 5 V avaliado em paralelo (seção 9.4)."],
  ["Ambiente", "Poeira e calor; sem limpeza com água. Gabinete com ventilação e filtro."],
  ["Instalação", "É possível instalar canaletas nas estações. Fotos e medidas das prateleiras serão enviadas para refinar o layout."],
  ["Experiência anterior", "Sistema SmartPicking com fios quádruplos contínuos na canaleta, atrás das plaquinhas: muita manutenção por falta de espaço e encaixe difícil. Requisito: reduzir ao máximo a manutenção."],
], [1, 4]));

// 3 LEVANTAMENTO FISICO
c.push(H1("3. Levantamento físico (tabela wms_endereco)"));
c.push(R("A tabela **wms_endereco** (esteiras 1 e 2, exportada em 23/10/2026) tem **7.981 endereços** em **40 ruas — cada rua é uma estação**. A rua 90 (Marketing/Almoxarifado, 2 endereços) foi desconsiderada. Formato do endereço: bairro (1) + rua (2) + prédio (3) + andar (1) + apartamento (1), por exemplo **0050230A** = rua 05, prédio 023, andar 0."));
c.push(H2("3.1 Estrutura de uma estação"));
c.push(tabela(["Área", "Prédios", "Andares", "Uso proposto"], [
  ["Alto giro (atrás do operador, de frente para as esteiras)", "001 a 010", "0 a 3 (de cima)", "1 display de quantidade (Módulo Q) por endereço"],
  ["Alto giro (níveis de baixo)", "001 a 010", "4 e 5", "4 displays de endereço + quantidade por estação: um por andar (A4 e A5) em cada lado (prédios 001-005 e 006-010), como no sistema atual"],
  ["Início do lado direito do corredor (\"150-153\")", "015", "0 a 3 (esquinas de Medicamento: até 7)", "Entram na zona 1 do baixo giro"],
  ["Baixo giro (corredor perpendicular)", "Lado esquerdo: 020/022-031 · lado direito: 032 até o último", "0 a 7 (de cima)", "Zonas de 4 prédios, cada uma com 1 display de endereço + quantidade"],
  ["Esquinas", "060-063 (Med.) / 060-071 (Perf.)", "0 a 7", "Zonas adicionais de baixo giro (+1 em Medicamento, +3 em Perfumaria)"],
], [2.2, 1.6, 1.7, 4]));
c.push(R("O campo **nr_ordem_separacao_flow** indica a ordem de percurso das seções. Nas estações 10 e 16 a ordem é invertida (estações espelhadas) — a rota de cada zona respeita esse campo, depois prédio e andar."));
c.push(H2("3.2 Disposição física"));
c.push(R("A **esteira de transporte** e a **esteira de separação** correm lado a lado, com cerca de 20 cm entre elas. O operador fica entre a esteira de separação e o **alto giro**, que fica atrás dele, de frente para as esteiras; no meio do alto giro há a passagem para o **corredor do baixo giro**, perpendicular às esteiras. As prateleiras são alinhadas (mesmos níveis em toda a estante)."));
[
  "**Transferência:** cada transferência alimenta até 4 estações. A bacia passa da esteira de transporte para a de separação e, na zona de espera, um **rolete direcionador** manda a bacia para a esquerda (2 estações) ou para a direita (2 estações). Ex.: transferência entre 11 e 12 atende 10 e 11 (esquerda) e 12 e 13 (direita). Nas pontas, a transferência entre 3 e 4 atende 3 (esquerda) ou 4 e 5 (direita); na Perfumaria, entre 26 e 27 atende 26 ou 27 e 28.",
  "**Pedido:** a bacia só entra nas estações em que o pedido tem itens. Se o pedido começa na 3 e continua só na 7, depois da 3 a bacia volta à esteira de transporte e não entra na 4 nem na 5.",
  "**Saída:** terminada a separação, o operador empurra a bacia de volta para a esteira de transporte a partir de qualquer ponto da estação.",
].forEach((x) => c.push(B(x)));
[
  "No corredor, olhando a partir da área de espera: **lado esquerdo** com os prédios 020 (ou 022) a 031 (\"210 a 310\") e **lado direito** do 032 até o último (\"320 em diante\"). A rota é em U: desce pelo lado esquerdo e volta pelo direito.",
  "O **prédio 015** (\"150 a 153\") é o primeiro prédio do lado direito, logo na entrada do corredor.",
  "Os blocos do baixo giro são de costas: cada bloco tem um lado de uma estação e o outro lado da estação vizinha.",
  "**O andar 0 é o de cima.** As prateleiras são alinhadas; o que muda de tamanho é a caixa do endereço, conforme o tipo (A, B, C, F, N). Andar que o prédio não usa fica vazio. As bacias que percorrem as esteiras têm tamanho único.",
].forEach((x) => c.push(B(x)));
c.push(...img("planta_estacao", 640, 324, "Figura 1 — Planta da estação 05 e das vizinhas: esteiras, transferência, alto giro e corredor do baixo giro (sem escala)"));
c.push(...img("layout_estacao", 640, 230, "Figura 2 — Elevações da estação 05 com os 209 endereços reais (andar 0 em cima) e as 6 zonas do baixo giro"));
c.push(H2("3.3 Totais por tipo de estação"));
c.push(tabela(["Tipo", "Estações", "Alto giro 0-3", "Alto giro 4-5", "Baixo giro", "Zonas baixo giro"], [
  ["Medicamento comum", "04-08, 11-14, 17-21 (14)", "29", "10 a 20", "156-160", "6"],
  ["Medicamento esquina", "09, 10, 15, 16", "29", "10 a 20", "188-192", "7"],
  ["Medicamento ponta", "03 / 22", "29", "20 / 10", "82 / 4", "3 / 1"],
  ["Perfumaria comum", "27-31, 34-37, 40-44 (14)", "35", "7 a 15", "131", "6"],
  ["Perfumaria esquina", "32, 33, 38, 39", "35", "9 a 15", "227-230", "9"],
  ["Perfumaria ponta", "26 / 45", "35", "13 / 15", "128 / 131", "6"],
  ["**TOTAL (40 estações)**", "", fmt(tot.alto_0a3), fmt(tot.alto_45), fmt(tot.baixo), fmt(tot.zonas_baixo)],
], [2.2, 2.6, 1.2, 1.2, 1.2, 1.3]));
c.push(nota("**Divergências com os números informados (para conferência):** Perfumaria esquina tem 227-230 endereços de baixo giro na tabela (informado: 203); a estação 26 tem 48 endereços de alto giro (informado: 49); Medicamento tem 20 estações na tabela (informado: 21). A planilha de orçamento usa a tabela, mas **todos os números são editáveis** na aba Estações."));
c.push(H2("3.4 Zoneamento do baixo giro"));
c.push(R("Regra inicial: **1 zona a cada 4 prédios** do baixo giro, com todas as zonas que têm itens trabalhando ao mesmo tempo. Cada zona mostra **um item por vez**, na ordem da rota; o botão confirma e o display passa para o próximo item da zona. Com 4 prédios × 8 andares, cada zona tem 20 a 32 endereços — o display mostra prédio e andar (ex.: **P031 A2**), suficiente para localizar a posição em poucos segundos."));
c.push(B("Opcional de baixo custo: **LED guia** no topo de cada prédio do baixo giro, que acende a coluna do item atual da zona (≈ R$ 1.000 para toda a operação)."));
c.push(B("O tamanho da zona é parâmetro do sistema (3, 4 ou 6 prédios) e pode ser ajustado no piloto conforme a produtividade medida."));

// 4 REQUISITOS
c.push(H1("4. Requisitos"));
c.push(tabela(["Código", "Requisito funcional"], [
  ["RF01", "Abrir a caixa com a **leitura da etiqueta** (gatilho do coletor ou leitura RFID), sem toque na tela."],
  ["RF02", "Acender, na estação, todos os endereços de alto giro com itens da caixa, com a quantidade."],
  ["RF03", "Nos andares 4-5 do alto giro e nas zonas de baixo giro, mostrar endereço e quantidade de um item por vez, na ordem da rota."],
  ["RF04", "Confirmar cada retirada no botão do display; apagar o display quando não houver mais item."],
  ["RF05", "Mostrar o progresso da caixa no coletor (A) ou no painel da estação (B)."],
  ["RF06", "Fechar a caixa com **nova leitura** da etiqueta; com itens pendentes, alertar e exigir confirmação por nova leitura."],
  ["RF07", "Registrar no Sybase a sessão da caixa e cada confirmação (estação, endereço, quantidade, horário, operador)."],
  ["RF08", "Informar ao sistema BHT a conclusão da caixa na estação (a validar com o fornecedor)."],
  ["RF09", "Painel de monitoramento: status de cada estação e módulo, caixas/hora, tempo médio por caixa, alarmes."],
  ["RF10", "Cadastro do mapa endereço → módulo/zona, editável pela TI sem alterar firmware."],
], [1, 7]));
c.push(tabela(["Código", "Requisito não funcional"], [
  ["RNF01", "Tempo entre a leitura e o acendimento < 1 segundo (rede cabeada até o concentrador)."],
  ["RNF02", "Troca de um módulo com defeito em < 5 minutos, sem ferramenta especial e sem abrir a canaleta."],
  ["RNF03", "Operação em ambiente com poeira e calor: gabinete com filtro e ventilação; componentes de 0 a 50 °C."],
  ["RNF04", "Se a rede cair, o concentrador mantém a caixa aberta e guarda as confirmações até reconectar."],
  ["RNF05", "Atualização remota de firmware (OTA) dos concentradores e configuração centralizada."],
  ["RNF06", "Rede PTL isolada em VLAN; autenticação no broker MQTT e controle de acesso por estação."],
  ["RNF07", "Reserva técnica de 10% de módulos e concentradores."],
], [1, 7]));

// 5 ARQUITETURA A
c.push(H1("5. Arquitetura A — Coletor + concentrador + displays"));
c.push(...img("arquitetura_a", 640, 347, "Figura 3 — Visão geral da Arquitetura A"));
c.push(H2("5.1 Componentes"));
c.push(tabela(["Componente", "Responsabilidade", "Tecnologia proposta"], [
  ["Serviço PTL", "Abre/fecha caixas, consulta itens, divide por estação/área/zona, ordena pela rota, envia comandos, recebe confirmações, grava log, alimenta o painel.", "Serviço em VM (Linux ou Windows) com API REST; linguagem a definir pela TI (Java, .NET ou Node). Driver jConnect/ODBC para Sybase."],
  ["Broker MQTT", "Canal de mensagens entre o serviço e os 40 concentradores (comando e eventos).", "Eclipse Mosquitto na mesma VM, com usuário e ACL por estação."],
  ["Banco Sybase ASE", "Tabelas PTL (estação, mapa de módulos, zonas, sessões, eventos) e views de leitura dos itens da caixa.", "Sybase ASE 16 existente."],
  ["Integração BHT", "Consulta das informações da caixa pela API do fornecedor; aviso de conclusão (a validar).", "API do sistema BHT."],
  ["Coletor (A1 ou A2)", "Leitura da etiqueta com o gatilho (abre e fecha) e exibição do progresso.", "A1: app Android próprio. A2: tela do WMS PowerBuilder no coletor."],
  ["Concentrador", "Recebe a caixa, comanda os 2 barramentos, devolve as confirmações; mantém o estado em queda de rede.", "RP2040 + Ethernet W5500, 2 transceptores RS-485, fonte 12 V Mean Well, gabinete IP54 ventilado."],
  ["Nó de coluna", "Liga os Módulos Q de um prédio do alto giro ao barramento.", "RP2040 + RS-485 + regulador 12→5 V; RJ45 de entrada/saída e por módulo."],
  ["Módulo Q", "Quantidade (3 dígitos) + botão com LED, um por endereço de alto giro (andares 0-3).", "Display 7 segmentos 0,56\" + botão 16 mm com LED."],
  ["Módulo E+Q", "Endereço (8 dígitos) + quantidade (3 dígitos) + botão; andares 4-5 do alto giro (4 por estação) e zonas de baixo giro.", "MAX7219 8 dígitos + display 3 dígitos + RP2040 + RS-485."],
  ["Painel de monitoramento", "Visão em tempo real para gestão e TI.", "Página web servida pelo Serviço PTL."],
], [1.4, 3, 2.6], { size: 17 }));
c.push(H2("5.2 Duas alternativas para o coletor"));
c.push(tabela(["Critério", "A1 — App Android próprio", "A2 — Tela do WMS no coletor"], [
  ["Como funciona", "App leve no MovFast; lê com o gatilho e chama a API do Serviço PTL.", "Tela PowerBuilder acessada no coletor; grava a leitura em tabela que o Serviço PTL consome."],
  ["Experiência do operador", "Tela dedicada, letras grandes, sem toque; feedback imediato (som/vibração).", "Depende do acesso atual ao WMS no coletor; mais lenta para responder."],
  ["Esforço de desenvolvimento", "≈ 160 h", "≈ 80 h"],
  ["Dependências", "Distribuição do app (MDM ou instalação manual).", "Sessão do WMS no coletor; polling do banco aumenta latência."],
  ["Recomendação", "**Recomendada** para a operação", "Alternativa rápida para o piloto, se o app atrasar"],
], [1.4, 2.4, 2.4]));
c.push(H2("5.3 Fluxo de operação"));
c.push(...img("sequencia", 640, 375, "Figura 4 — Sequência de mensagens de uma caixa na estação"));
[
  "A bacia vem pela esteira de transporte, passa pela transferência para a esteira de separação e o rolete direcionador a leva até a estação (controle do sistema BHT).",
  "O operador aponta o coletor para a etiqueta e aperta o gatilho: a leitura **abre** a caixa na estação.",
  "O Serviço PTL busca os itens da caixa (Sybase/API), filtra os endereços daquela estação, separa em alto giro, andares 4-5 e zonas, e ordena pela rota.",
  "O concentrador acende todos os displays de alto giro com a quantidade e o primeiro item de cada display E+Q (andares 4-5 e zonas).",
  "O operador pega a quantidade e aperta o botão; o display apaga (alto giro) ou passa ao próximo item (andares 4-5 e zonas). O coletor mostra o progresso.",
  "Ao apagar o último display, o coletor mostra **Estação concluída**. O operador lê a etiqueta de novo: a caixa **fecha**, o Serviço PTL grava a sessão e (se validado) avisa o BHT, e o operador empurra a bacia de volta para a esteira de transporte.",
].forEach((x) => c.push(N(x)));

// 6 ARQUITETURA B
c.push(H1("6. Arquitetura B — Identificação por RFID"));
c.push(R("A Arquitetura B mantém **toda a infraestrutura de displays, concentradores e Serviço PTL** da Arquitetura A e troca apenas a forma de identificar a caixa: cada caixa retornável recebe uma **tag NFC (13,56 MHz) fixa**, e a leitura acontece sem o coletor."));
c.push(...img("arquitetura_b", 640, 347, "Figura 5 — Visão geral da Arquitetura B"));
c.push(H2("6.1 Opções de leitura"));
c.push(tabela(["Opção", "Como funciona", "Prós", "Contras"], [
  ["B1 — Pulseira NFC", "Leitor no pulso (ESP32-C3 + PN532 + bateria). O operador encosta o pulso na tag da caixa para abrir e para fechar.", "Mãos livres; leitura em < 1 s; baixo custo por unidade (≈ R$ 130).", "Pode atrapalhar o operador; bateria e carga diária; higiene/conforto."],
  ["B2 — Leitor fixo na estação", "Leitor NFC sob a posição de pega na esteira de separação, ligado ao concentrador. Painel LCD mostra caixa e itens restantes; fechar com nova leitura ou botão FECHAR.", "Nada no corpo do operador; sem bateria; abre automaticamente.", "Exige posição de parada definida para a caixa; instalação mecânica na esteira."],
  ["B3 — Produtos de mercado", "Leitores de pulso comerciais (em geral UHF, ex.: FEIG HyWEAR ≈ US$ 997) ou leitores HF industriais.", "Robustez e garantia.", "Custo muito maior; UHF lê de longe (risco de ler a caixa vizinha) e exige tags UHF."],
], [1.2, 2.6, 1.8, 1.8], { size: 17 }));
c.push(nota("**Recomendação para a Arquitetura B:** opção **B2 (leitor fixo)**, porque atende à preocupação de que a pulseira atrapalhe o operador e elimina bateria. B1 fica como alternativa para estações onde a caixa não tenha posição fixa."));
c.push(H2("6.2 Tag na caixa retornável"));
[
  "Tag NFC NTAG213 adesiva (≈ R$ 2,37/un em lote) aplicada em local protegido da caixa, com cobertura/suporte contra atrito.",
  "Cadastro inicial: associar o UID da tag ao número da caixa (≈ 30 s por caixa) em tabela do Sybase.",
  "Frota de caixas estimada em 5.000 (≈ 1,7 × o volume diário) — **confirmar com a operação**; o custo das tags escala com a frota.",
  "Caixas danificadas: substituir a tag no processo de manutenção de caixas.",
].forEach((x) => c.push(B(x)));
c.push(H2("6.3 Comparativo A × B"));
c.push(tabela(["Critério", "A — Coletor", "B — RFID (B2)"], [
  ["Equipamento de leitura", "Coletores MovFast já existentes", "Leitor fixo por estação + tag por caixa"],
  ["Ação do operador para abrir/fechar", "Apontar e apertar o gatilho (2×)", "Colocar a caixa na posição (abre); nova leitura/botão (fecha)"],
  ["Custo de hardware (40 estações)*", "R$ 270 mil", "R$ 293 mil"],
  ["Custo recorrente", "Nenhum novo", "Tags para caixas novas/danificadas"],
  ["Riscos", "Disponibilidade e bateria dos coletores; Wi-Fi", "Posição de leitura da caixa; frota de tags"],
  ["Prazo", "Menor (reaproveita coletores)", "Maior (tags, cadastro, mecânica)"],
], [1.6, 2.2, 2.2]));
c.push(P("* Hardware com mão de obra interna; detalhes na seção 12 e na planilha Orcamento_PTL.xlsx.", { italic: true, size: 18, color: CZ }));

// 7 FUNCIONAMENTO
c.push(H1("7. Funcionamento e regras"));
c.push(H2("7.1 Estados da caixa na estação"));
c.push(tabela(["Estado", "Entrada", "Saída"], [
  ["Aguardando", "Estação livre", "1ª leitura da etiqueta/tag → Aberta"],
  ["Aberta", "Itens enviados aos displays", "Último display confirmado → Concluída\n2ª leitura com pendências → Alerta"],
  ["Concluída", "Todos os itens confirmados", "2ª leitura → Fechada"],
  ["Alerta (fechamento antecipado)", "Leitura de fechamento com itens pendentes", "Nova leitura confirma → Fechada com pendência (registrada para a conferência)"],
  ["Fechada", "Sessão gravada no Sybase", "Estação volta a Aguardando"],
  ["Sem itens", "Caixa sem endereços nesta estação", "Coletor/painel avisa \"nada nesta estação\"; caixa segue"],
], [1.6, 2.2, 3]));
c.push(H2("7.2 Regras de separação"));
[
  "**Alto giro (andares 0-3):** todos os endereços da caixa acendem juntos, cada um com a sua quantidade.",
  "**Andares 4-5 e zonas de baixo giro:** um item por vez em cada display E+Q; todos os displays com itens ficam ativos ao mesmo tempo.",
  "**Ordem da rota:** nr_ordem_separacao_flow, depois prédio e andar (respeitando estações espelhadas).",
  "**Mesmo endereço repetido na caixa:** as quantidades são somadas em um único acendimento.",
  "**Confirmação:** o botão confirma a quantidade pedida. A falta é apontada na conferência, como hoje.",
].forEach((x) => c.push(B(x)));
c.push(H2("7.3 Exceções"));
c.push(tabela(["Situação", "Comportamento do sistema"], [
  ["Caixa lida sem itens nesta estação", "Mensagem \"nada nesta estação\"; nenhum display acende; caixa pode seguir."],
  ["Caixa não encontrada na API/banco", "Alerta no coletor/painel; registro no log; operador segue o procedimento manual."],
  ["Leitura de outra caixa com uma aberta", "Bloqueia e informa a caixa em andamento (1 caixa por estação)."],
  ["Fechamento com itens pendentes", "Alerta com a lista do que falta; nova leitura confirma; pendência registrada para a conferência."],
  ["Botão apertado sem item", "Ignorado; registro de diagnóstico."],
  ["Módulo sem resposta (defeito)", "Concentrador avisa o Serviço PTL; coletor mostra o endereço e a quantidade daquele item; alerta no painel para a manutenção."],
  ["Queda de rede do concentrador", "Displays continuam; confirmações ficam em memória e são enviadas ao reconectar. Nova caixa só abre com rede."],
  ["Queda do Serviço PTL", "Coletor informa indisponibilidade; operação manual de contingência; alarme para a TI."],
  ["Queda de energia na estação", "Ao voltar, o concentrador pede ao Serviço PTL o estado da caixa aberta e reacende o que falta."],
  ["Troca de operador no meio da caixa", "A caixa continua; o fechamento registra o operador que leu."],
  ["Cancelamento pela supervisão", "Endpoint de cancelamento apaga a estação e registra o motivo."],
], [2.2, 5]));

// 8 INTERFACES
c.push(H1("8. Interfaces"));
c.push(H2("8.1 Telas do coletor (A1)"));
c.push(...img("telas_coletor", 640, 302, "Figura 6 — Telas do app PTL: espera, separação, conclusão e alerta"));
c.push(H2("8.2 Displays"));
c.push(...img("modulos", 640, 215, "Figura 7 — Módulo Q, Módulo E+Q e gabinete do concentrador"));
[
  "**Formato do endereço no display de 8 dígitos:** \"P031 A2\" (prédio 031, andar 2); a rua não aparece porque é a própria estação.",
  "**Displays de 0,56\" (14 mm)** de altura de dígito para leitura a 2-3 m; cor vermelha (melhor contraste em 7 segmentos).",
  "**LED do botão:** aceso = item a pegar; piscando = item novo na zona; apagado = nada a fazer.",
].forEach((x) => c.push(B(x)));
c.push(H2("8.3 API REST do Serviço PTL"));
c.push(tabela(["Método e rota", "Uso"], [
  ["POST /v1/estacoes/{est}/leituras", "Leitura do coletor/RFID {caixa, operador}. Abre ou fecha conforme o estado; responde estado e progresso."],
  ["GET /v1/estacoes/{est}", "Estado da estação, caixa aberta, itens pendentes por área/zona."],
  ["GET /v1/caixas/{caixa}", "Histórico da caixa nas estações."],
  ["POST /v1/estacoes/{est}/cancelar", "Cancelamento pela supervisão {motivo}."],
  ["GET /v1/monitor/resumo", "Indicadores para o painel (caixas/h, tempo médio, módulos com falha)."],
  ["PUT /v1/estacoes/{est}/mapa", "Atualiza o mapa endereço → módulo/zona (uso da TI)."],
], [2.4, 4.6]));
c.push(H2("8.4 Mensagens MQTT (Serviço ↔ concentrador)"));
c.push(tabela(["Tópico", "Mensagem (JSON)"], [
  ["ptl/est05/cmd", "SEPARAR {caixa, alto_giro:[{mod, qtd}], blocos:[{bloco, itens:[{end, qtd}]}], zonas:[{zona, itens:[…]}]}"],
  ["ptl/est05/cmd", "CANCELAR {caixa} · CONFIG {mapa} · PING"],
  ["ptl/est05/evt", "ACK {caixa, acesos} · BTN {caixa, end, qtd} · ZONA_FIM {zona} · CONCLUIDA {caixa}"],
  ["ptl/est05/evt", "FALHA_MODULO {mod} · HEARTBEAT {uptime, temperatura, versão}"],
  ["ptl/est05/status", "Mensagem retida: online/offline (last will), caixa aberta"],
], [1.6, 5.4]));
c.push(H2("8.5 Barramento RS-485 (concentrador ↔ nós e módulos)"));
[
  "Dois barramentos por estação (alto giro e baixo giro), 38.400 bps, protocolo mestre-escravo com endereço de 1 byte por dispositivo (dip switch ou gravado na instalação).",
  "Comandos: MOSTRAR (endereço, quantidade, modo), APAGAR, PISCAR, LER_BOTOES, AUTO_TESTE. O concentrador consulta todos os dispositivos a cada 50 ms.",
  "Terminação de 120 Ω nas pontas e polarização no concentrador; cabo Cat5e com par trançado para o sinal.",
].forEach((x) => c.push(B(x)));
c.push(H2("8.6 Tabelas no Sybase (proposta)"));
c.push(tabela(["Tabela", "Conteúdo"], [
  ["ptl_estacao", "rua, segmento, tipo, IP/ID do concentrador, ativo"],
  ["ptl_dispositivo", "estação, barramento, endereço RS-485, tipo (Q, E+Q, nó), situação"],
  ["ptl_endereco_mapa", "cd_endereco → dispositivo/posição (alto giro) ou bloco/zona (E+Q)"],
  ["ptl_caixa_sessao", "caixa, estação, operador, abertura, conclusão, fechamento, situação"],
  ["ptl_caixa_item", "sessão, cd_endereco, quantidade, confirmado em, dispositivo"],
  ["ptl_evento", "log de eventos e falhas (com retenção definida)"],
  ["ptl_tag_caixa (B)", "UID da tag → número da caixa"],
], [1.8, 5.2]));
c.push(P("A origem dos itens da caixa (tabelas do pedido no WMS ou API do BHT) será definida com o DBA e o fornecedor do BHT; o Serviço PTL lê por views para não acoplar ao modelo do WMS.", { size: 19 }));
c.push(H2("8.7 Painel de monitoramento"));
[
  "Mapa das 40 estações: livre, separando, alerta, offline.",
  "Indicadores: caixas/hora por estação e total, tempo médio por caixa, itens/hora, tempo de espera da caixa.",
  "Saúde: módulos sem resposta, concentradores offline, temperatura do gabinete, versão de firmware.",
  "Usuários: gestão da operação (indicadores) e TI (saúde e diagnóstico).",
].forEach((x) => c.push(B(x)));

// 9 HARDWARE
c.push(H1("9. Hardware"));
c.push(H2("9.1 Quantidades"));
c.push(tabela(["Item", "Por estação comum (Med.)", "Piloto (05 + 27)", "Operação completa"], [
  ["Módulos Q (alto giro 0-3)", "29", "64", fmt(tot.alto_0a3)],
  ["Nós de coluna", "10", "20", "400"],
  ["Módulos E+Q (andares 4-5 + zonas)", "4 + 6 = 10", "20", fmt(tot.blocos_alto_45 + tot.zonas_baixo)],
  ["Concentradores", "1", "2", "40"],
  ["Reserva técnica", "—", "+10%", "+10%"],
], [2.6, 1.6, 1.4, 1.6], { direita: [1, 2, 3] }));
c.push(H2("9.2 Cabeamento — foco em manutenção"));
c.push(...img("cabeamento", 640, 274, "Figura 8 — Topologia de cabeamento: barramento do alto giro com nós de coluna e do baixo giro com módulos em cadeia (eletrocalha sobre o corredor)"));
[
  "**Cabo Cat5e com RJ45** em todos os trechos: par 1 RS-485, par 2 +12 V, par 3 GND, par 4 reserva.",
  "**Sem fio contínuo atrás das plaquinhas:** cada trecho é um cabo curto com conector; trocar um módulo = desconectar dois RJ45 e encaixar o reserva.",
  "Canaleta/perfil fixado na prateleira apenas para conduzir e proteger os cabos; os módulos ficam presos por encaixe na frente da canaleta.",
  "Etiquetas com o código do dispositivo em cada módulo e cabo; mapa de cada estação no Serviço PTL.",
].forEach((x) => c.push(B(x)));
c.push(H2("9.3 Concentrador e gabinete"));
[
  "Placa RP2040 + W5500 (Ethernet), 2 transceptores RS-485, regulador 12→5 V, auto-teste na partida e watchdog.",
  "Fonte Mean Well LRS-150-12 (12 V, 12,5 A) — consumo estimado da estação ≈ 1,5 A em 12 V; a folga permite LEDs guia e expansão.",
  "Gabinete IP54 com cooler 40 mm 12 V com termostato, entrada de ar com filtro lavável, trilho DIN e disjuntor de 2 A.",
].forEach((x) => c.push(B(x)));
c.push(H2("9.4 12 V × 5 V"));
c.push(R("Exemplo de cálculo: 10 m de Cat5e (24 AWG ≈ 0,084 Ω/m por condutor), usando um par para positivo e outro para negativo (0,042 Ω/m cada), com 2 A: resistência do laço ≈ 0,84 Ω → **queda de 1,7 V**. Em 5 V isso é **34%** (inviável sem várias injeções de energia); em 12 V são **14%**, absorvidos pelos reguladores locais, que aceitam de 7 a 24 V."));
c.push(tabela(["Critério", "12 V (recomendado)", "5 V"], [
  ["Queda de tensão em cabos longos", "Tolerada pelos reguladores locais", "Crítica: exige cabos de força extras e várias injeções"],
  ["Componentes", "+1 regulador por nó/módulo (≈ R$ 8)", "Sem reguladores"],
  ["Custo de peças (operação completa)", "≈ R$ 199 mil", "≈ R$ 197 mil (economia nos reguladores compensada pelo cabo de força)"],
  ["Manutenção", "Baixa: um único cabo por trecho", "Maior: mais pontos de conexão de energia"],
  ["Recomendação", "**Adotar**", "Apenas para trechos curtos"],
], [2, 2.4, 2.4]));
c.push(H2("9.5 Produção interna × terceiros"));
c.push(tabela(["Caminho", "Descrição", "Prós", "Contras"], [
  ["Interna", "Módulos montados pela equipe com placas e displays comprados no Brasil.", "Menor custo; domínio total; reposição rápida.", "Exige técnico de eletrônica; padronização manual."],
  ["Terceiros T1 — placa própria (EMS)", "Projeto de PCB próprio, fabricado e montado por fábrica (ex.: JLCPCB) e importado.", "Qualidade industrial e repetibilidade; menor mão de obra.", "Projeto da placa (≈ R$ 15 mil); importação e prazo."],
  ["Terceiros T2 — PTL comercial", "Módulos e controladores prontos de fornecedor de pick-to-light.", "Produto testado e com garantia.", "Custo ≈ 3× maior; dependência do fornecedor."],
], [1.4, 2.4, 1.8, 1.8], { size: 17 }));

// 10 REDE
c.push(H1("10. Rede, segurança e confiabilidade"));
[
  "Um ponto de rede cabeado por estação ligado a switches de 24 portas (2 para a operação completa), em **VLAN dedicada** ao PTL; IP reservado por concentrador.",
  "Broker MQTT com usuário por estação e ACL (cada concentrador só publica/assina os próprios tópicos); TLS opcional na rede interna.",
  "Heartbeat a cada 10 s; estação sem heartbeat por 30 s aparece como offline no painel.",
  "Atualização de firmware remota (OTA) com retorno automático à versão anterior se falhar.",
  "Backup diário das tabelas PTL; logs com retenção definida pela TI.",
  "Sincronização de horário (NTP) no Serviço PTL e nos concentradores para correlacionar eventos.",
].forEach((x) => c.push(B(x)));

// 11 MANUTENCAO
c.push(H1("11. Operação e manutenção"));
[
  "Auto-teste diário no início do turno (todos os displays acendem 8888) para detectar falhas antes da operação.",
  "Kit de reserva por esteira: módulos Q e E+Q, nós, 1 concentrador completo e cabos.",
  "Procedimento de troca de módulo em 3 passos (desconectar, encaixar o reserva, confirmar o auto-teste no painel).",
  "Treinamento de operadores (≈ 30 min) e de manutenção (≈ 4 h).",
].forEach((x) => c.push(B(x)));

// 12 ORCAMENTO
c.push(H1("12. Orçamento (resumo)"));
c.push(R("Valores de hardware calculados na planilha **Orcamento_PTL.xlsx** com preços cotados em lojas brasileiras em 23/10/2026; itens sem preço público estão marcados como estimativa a cotar. Câmbio US$ 1 = R$ 5,04; fator de importação 1,9 (estimativa)."));
c.push(tabela(["Cenário", "Piloto (05 + 27)", "Operação completa", "Por estação"], [
  ["A — interna, só peças (12 V)", "R$ 10.994", "R$ 199.239", "R$ 4.981"],
  ["A — interna, só peças (5 V)", "R$ 10.873", "R$ 196.956", "R$ 4.924"],
  ["A — interna, peças + mão de obra", "R$ 14.566", "R$ 269.764", "R$ 6.744"],
  ["A — terceiros T1 (placa própria via EMS)", "R$ 32.808", "R$ 347.860", "R$ 8.697"],
  ["A — terceiros T2 (PTL comercial importado)", "R$ 43.196", "R$ 852.330", "R$ 21.308"],
  ["B1 — RFID com pulseira", "R$ 15.896", "R$ 294.206", "R$ 7.355"],
  ["B2 — RFID com leitor fixo", "R$ 15.738", "R$ 293.220", "R$ 7.330"],
], [3, 1.5, 1.7, 1.3], { direita: [1, 2, 3] }));
c.push(R("**Software (desenvolvimento interno, estimativa):** Arquitetura A ≈ 1.080 h; Arquitetura B ≈ 1.000 h. Na planilha, o custo é calculado a R$ 60/h (premissa ajustável)."));
c.push(R("**Mão de obra interna:** custo-hora de técnico de R$ 34,93 (salário médio de R$ 2.846,84 — salario.com.br, CBO 313215, out/2026 — × 2,0 de encargos ÷ 163 h)."));

// 13 IMPLANTACAO
c.push(H1("13. Plano de implantação"));
c.push(tabela(["Fase", "Entregas", "Duração estimada"], [
  ["0 — Demonstração", "Arquitetura, orçamento e simulador 3D (este pacote)", "Concluída"],
  ["1 — Protótipo de bancada", "1 concentrador, 1 nó com 4 Módulos Q, 2 Módulos E+Q; firmware e Serviço PTL mínimo", "3 a 4 semanas"],
  ["2 — Piloto", "Estações 05 e 27 completas; app do coletor; painel; medição de tempo por caixa antes/depois", "6 a 8 semanas"],
  ["3 — Avaliação", "Indicadores do piloto, ajustes de zona/rota, decisão A/B e interna/terceiros", "2 semanas"],
  ["4 — Expansão", "Medicamento (esteira 2) e depois Perfumaria (esteira 1), em lotes de 5 estações", "10 a 14 semanas"],
  ["5 — Estabilização", "Ajustes finais, documentação e passagem para a sustentação", "4 semanas"],
], [1.6, 4, 1.4]));

// 14 RISCOS
c.push(H1("14. Riscos e mitigação"));
c.push(tabela(["Risco", "Impacto", "Mitigação"], [
  ["Dados da caixa indisponíveis na API do BHT", "Alto", "Validar a API no protótipo; alternativa de leitura direta por views no Sybase."],
  ["Itens por caixa diferentes do esperado", "Médio", "Medir no piloto; ajustar o tamanho das zonas."],
  ["Poeira/calor reduzindo a vida útil", "Médio", "Gabinete com filtro e cooler; displays e placas com faixa de temperatura adequada."],
  ["Manutenção alta (experiência SmartPicking)", "Alto", "Conectores RJ45 em todos os trechos; módulos de troca rápida; auto-teste diário."],
  ["Dependência de um único técnico de eletrônica", "Médio", "Documentação, padronização e kits de reserva; opção T1 (placa própria) para escala."],
  ["Prazo de importação (T1/T2)", "Médio", "Piloto com produção interna enquanto a placa própria é fabricada."],
  ["Adoção pelos operadores", "Médio", "Piloto com operadores-chave; treinamento curto; feedback no coletor."],
], [2.6, 0.8, 3.6]));

// 15 PONTOS EM ABERTO
c.push(H1("15. Premissas e pontos em aberto"));
c.push(tabela(["#", "Ponto", "Responsável sugerido"], [
  ["1", "Fotos e medidas das estações (largura do prédio, altura dos andares, canaletas)", "Operação"],
  ["2", "Número médio de itens por caixa por segmento", "Operação / BI"],
  ["3", "Campos e limites da API do BHT; possibilidade de liberar a caixa ao fechar", "TI / fornecedor BHT"],
  ["4", "Origem dos itens da caixa no WMS (tabelas/views) e acesso do Serviço PTL ao Sybase", "DBA"],
  ["5", "Divergências de contagem (esquinas de Perfumaria, estação 26, 21ª estação de Medicamento)", "Operação"],
  ["6", "Frota de caixas retornáveis (Arquitetura B)", "Operação"],
  ["7", "Fator de importação e fornecedores para T1/T2", "Compras / Comex"],
  ["8", "Linguagem e hospedagem do Serviço PTL; pontos de rede e VLAN", "Arquitetura de software / Infra"],
  ["9", "Custo-hora interno de técnico e de desenvolvimento", "RH / TI"],
], [0.4, 4.6, 2]));

// ANEXO A
c.push(quebra());
c.push(H1("Anexo A — Estações (fonte: wms_endereco, 23/10/2026)"));
c.push(tabela(["Rua", "Segmento", "Tipo", "Total", "Alto 0-3", "Alto 4-5", "Baixo", "Zonas", "E+Q"],
  ests.map((e) => [e.rua, e.segmento, e.tipo, e.total, e.alto_0a3, e.alto_45, e.baixo, e.zonas_baixo, e.blocos_alto_45 + e.zonas_baixo].map(String))
    .concat([["TOTAL", "", "", fmt(tot.total), fmt(tot.alto_0a3), fmt(tot.alto_45), fmt(tot.baixo), fmt(tot.zonas_baixo), fmt(tot.blocos_alto_45 + tot.zonas_baixo)]]),
  [0.7, 1.4, 1.1, 0.8, 0.9, 0.9, 0.8, 0.8, 0.7], { size: 16, destacarUltima: true, direita: [3, 4, 5, 6, 7, 8] }));

// ANEXO B
c.push(H1("Anexo B — Glossário"));
c.push(tabela(["Termo", "Significado"], [
  ["Pick-to-light (PTL)", "Separação guiada por luz: displays indicam onde e quanto pegar."],
  ["Alto giro / baixo giro", "Endereços com muita / pouca saída. Alto giro atrás do operador, de frente para as esteiras (prédios 001-010); baixo giro no corredor perpendicular."],
  ["Andar", "Nível do prédio; o andar 0 é o de cima."],
  ["Esteira de separação", "Esteira paralela à de transporte (≈ 20 cm entre elas) onde a bacia fica durante a separação."],
  ["Transferência", "Desvio da esteira de transporte para a de separação; com o rolete direcionador atende até 4 estações."],
  ["Concentrador", "Controlador da estação, ligado à rede e aos barramentos de displays."],
  ["Módulo Q / E+Q", "Display de quantidade / display de endereço + quantidade, ambos com botão de confirmação."],
  ["Nó de coluna", "Placa que liga os Módulos Q de um prédio do alto giro ao barramento."],
  ["Zona", "Grupo de 4 prédios do baixo giro atendido por um Módulo E+Q."],
  ["RS-485", "Padrão de comunicação serial robusto para cabos longos em ambiente industrial."],
  ["MQTT", "Protocolo de mensagens leve entre o Serviço PTL e os concentradores."],
  ["NFC / RFID", "Identificação por radiofrequência; NFC (13,56 MHz) lê a poucos centímetros."],
  ["EMS", "Empresa que fabrica e monta placas eletrônicas sob encomenda."],
], [1.8, 5.2]));

// ---------------------------------------------------------------- documento
const doc = new Document({
  features: { updateFields: true },
  creator: "Projeto Pick-to-Light",
  title: "Pick-to-Light — Documento de Arquitetura",
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
      children: [t("Pick-to-Light — Documento de Arquitetura · v1.0", { size: 16, color: CZ })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: FONTE, size: 16, color: CZ })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(BASE + "/entregaveis/Arquitetura_PTL_Documento_Tecnico.docx", buf);
  console.log("ok");
});
