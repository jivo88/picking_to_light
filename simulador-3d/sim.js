/* Simulador 3D — estação de flow rack com pick-to-light
 * Layout conforme a operação (desenho, fotos e explicações):
 *   o alto giro fica na frente do operador; a esteira de transporte passa por dentro dele (por baixo do
 *   andar 3 e por cima do andar 4) e a esteira de separação fica na frente, aberta, ≈ 20 cm da de transporte;
 *   transferência a cada 4 estações com rolete direcionador (2 estações à esquerda, 2 à direita);
 *   o corredor do baixo giro fica atrás do operador, perpendicular às esteiras.
 *   Medidas do desenho de 26/10/2026: estação de 2,5 m (alto giro com prédios de 25 cm); andares 4 e 5 do alto giro
 *   ficam por baixo da esteira de separação. Baixo giro com corredor de ~1,5 m e blocos de 1 m (duas prateleiras de 50 cm
 *   de costas, 2 m de comprimento, 12 prédios × 8 andares por lado); o prédio 015 ocupa a frente do bloco inteiro (1 m),
 *   virado para a esteira. Concentrador atrás da estação (do outro lado do alto giro).
 *   Sinal luminoso na frente do operador avisa quando a caixa tem itens no baixo giro.
 *   Prateleiras alinhadas, andar 0 em cima; a caixa do endereço varia pelo tipo (A, B, C, F, N), em geral pequena.
 *   Andares 4-5: 2 zonas (P001–P005 e P006–P010), 1 display E+Q cada. Baixo giro: 2 zonas por lado do corredor,
 *   display de endereço + quantidade na altura dos olhos.
 *   Endereços no formato da etiqueta: bairro.rua.prédio+andar.apto (ex.: 0.05.0421.A).
 * Regras de funcionamento iguais às do documento técnico (Arquitetura A e B).
 * Medidas ficam em CFG e são premissas até chegarem as medidas reais. */
(function () {
  'use strict';
  const DADOS = window.PTL_DADOS;
  const $ = (s) => document.querySelector(s);

  // ======================================================================= CONFIGURAÇÃO
  const CFG = {
    // alto giro: na frente do operador; andares 0-3 acima das esteiras, 4-5 abaixo
    WA: 0.25, profAlto: 1.2, zAltoFace: -0.95,
    baseAlto: 0.2, hAltoBaixo: 0.29,            // andares 5 e 4 (de baixo para cima), por baixo da esteira de separação
    profAltoBaixo: 1.0,                         // profundidade da estante dos andares 4-5
    yAltoCima: 1.38, hAltoCima: 0.29,           // andares 3, 2, 1, 0 (andar 0 em cima)
    // baixo giro: corredor perpendicular atrás do operador
    baseBaixo: 0.25, alturaBaixo: 2.04, niveisBaixo: 8, profBaixo: 0.5, compBaixo: 2.0,
    prof015: 0.3,                // faixa do prédio 015 na frente do bloco da direita (virada para a esteira)
    yDisplayBaixo: 1.5,          // displays das zonas do baixo giro na altura dos olhos
    larguraCorredor: 1.5,        // 2,5 m − bloco de 1 m (2 prateleiras de 50 cm de costas)
    passo: 2.5,                  // largura da estação (= frente do alto giro)
    predioVirada: 32,            // prédios < 32 no lado esquerdo do corredor; 015 e >= 32 no direito
    tilt: 0.1,
    // esteira de transporte por dentro do alto giro; esteira de separação na frente, aberta (≈ 20 cm entre elas)
    zTransp: -1.29, largTransp: 0.55, altTransp: 0.98,
    zSep: -0.535, largSep: 0.55, altSep: 0.92,
    zOperAlto: 0.12, zFaces: 1.35,
    xPega: 0.0, distFila: 1.45,
    velEsteira: 1.8, velEmpurre: 0.9, velOperador: 1.3,
    tempoPega: 1.6, tempoPorUnidade: 0.25, tempoDeposito: 0.5,
    bacia: { c: 0.56, a: 0.26, l: 0.4, cor: '#2E9E4F', borda: '#1d6b35' },   // bacia retornável verde, tamanho único
    // caixa do endereço por tipo (fração da largura e da altura do vão) — em geral pequenas
    // caixa ocupa quase toda a largura do vão; o tipo muda a altura (e um pouco a largura)
    caixaTipo: { A: [0.94, 0.62], B: [0.92, 0.56], C: [0.9, 0.52], F: [0.88, 0.46], N: [0.93, 0.6] },
    fatorCaixaAlto: 1.3,
    segmentos: { Medicamento: [3, 22], Perfumaria: [26, 45] },
  };
  CFG.zAltoBaixoFace = CFG.zSep + CFG.largSep / 2 + 0.03;           // frente dos andares 4-5 (sob a esteira de separação)
  CFG.zCorr = CFG.zFaces + CFG.prof015;                              // início das prateleiras do corredor
  CFG.compAlto = 10 * CFG.WA;
  // níveis do alto giro por andar: {yb, h}
  CFG.niveisAlto = [0, 1, 2, 3].map((a) => ({ yb: CFG.yAltoCima + (3 - a) * CFG.hAltoCima, h: CFG.hAltoCima }))
    .concat([{ yb: CFG.baseAlto + CFG.hAltoBaixo, h: CFG.hAltoBaixo }, { yb: CFG.baseAlto, h: CFG.hAltoBaixo }]);
  CFG.niveisBaixoY = Array.from({ length: CFG.niveisBaixo }, (_, a) => ({ yb: CFG.baseBaixo + (CFG.niveisBaixo - 1 - a) * (CFG.alturaBaixo / CFG.niveisBaixo), h: CFG.alturaBaixo / CFG.niveisBaixo }));

  const CORES_ZONA = ['#2E8B57', '#2F5597', '#D68910', '#7B4FA0', '#C0392B', '#138D90', '#8E6C3A', '#D35400', '#5B6675'];

  // transferência que atende a estação: cada uma atende 2 estações à esquerda e 2 à direita;
  // na ponta inicial (3 ou 26) atende a ponta à esquerda e as duas seguintes à direita
  function transferenciaDe(est) {
    const seg = DADOS[est].info.segmento;
    const [p0, p1] = CFG.segmentos[seg] || [3, 22];
    let b = p0 + 4 * Math.round((est - p0 - 0.5) / 4);
    if (b + 1 > p1) b = p1 - 1;
    if (b < p0) b = p0;
    return { b, x: (b + 0.5 - est) * CFG.passo, lado: est <= b ? 'esquerda' : 'direita', p0, p1 };
  }

  // ======================================================================= ESTADO
  const S = { redeOk: true, est: '05', modo: 'A', itens: 8, vel: 1, auto: false, guia: true, destaque: true, cabos: true, cam: 'geral' };
  const K = { caixas: 0, itens: 0, tempoTotal: 0, pendencias: 0, falhas: 0 };
  let simT = 0;
  let estado = 'AGUARDANDO';
  let atual = null, fila = null;
  const caixasCena = [];
  let seqCaixa = 1200;
  let fechadaAte = 0;
  let autoToken = 0;
  let ultimoHeartbeat = 0;
  let modulos = [], enderecos = [], guias = {};
  const clicaveis = [];

  // ======================================================================= THREE
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#cena').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe4ea');
  scene.fog = new THREE.Fog('#dfe4ea', 32, 62);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 220);
  camera.position.set(1.15, 3.3, 4.9);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0.8, 1.05, -0.55);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 0.6;
  controls.maxDistance = 40;

  scene.add(new THREE.HemisphereLight('#ffffff', '#8d96a0', 0.78));
  const sol = new THREE.DirectionalLight('#ffffff', 0.6);
  sol.position.set(-7, 12, 9);
  sol.target.position.set(0, 0, 3);
  scene.add(sol.target);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: 1, far: 50 });
  scene.add(sol);
  const luz2 = new THREE.DirectionalLight('#ffffff', 0.25);
  luz2.position.set(6, 7, -9);
  scene.add(luz2);

  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o || {}));
  const M = {
    piso: mat('#C9CED5', { roughness: 0.95 }),
    montante: mat('#2F5597', { metalness: 0.3, roughness: 0.5 }),
    longarina: mat('#E8892B', { metalness: 0.2, roughness: 0.55 }),
    trilho: mat('#9AA4AE', { metalness: 0.5, roughness: 0.4 }),
    corpo: mat('#1d2129', { roughness: 0.5 }),
    tote: mat('#3E5C7E', { roughness: 0.6 }),
    caixaPapelao: mat('#C9A574', { roughness: 0.85 }),
    rolete: mat('#B8C0C8', { metalness: 0.7, roughness: 0.3 }),
    esteira: mat('#4A5563', { metalness: 0.4, roughness: 0.5 }),
    amarelo: mat('#F4C430'),
    gabinete: mat('#CBD2DC', { metalness: 0.4, roughness: 0.45 }),
    cinzaEstr: mat('#A3ABB5', { metalness: 0.2, roughness: 0.6 }),
    cinzaViga: mat('#B9C0C8', { metalness: 0.2, roughness: 0.6 }),
    cinzaTote: mat('#C4CAD1', { roughness: 0.8 }),
    etiqueta: new THREE.MeshBasicMaterial({ color: '#f4f4f2' }),
  };
  const PRODUTOS = ['#E74C3C', '#F5F5F5', '#3498DB', '#F1C40F', '#2ECC71', '#E67E22', '#9B59B6', '#ECF0F1', '#1ABC9C', '#FADBD8', '#D6EAF8'].map((c) => mat(c, { roughness: 0.6 }));
  const BOX1 = new THREE.BoxGeometry(1, 1, 1);

  // ======================================================================= UTILITÁRIOS
  function texCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return { c, ctx: c.getContext('2d'), t };
  }
  function placa(txt, w, h, o) {
    o = o || {};
    const px = o.px || 512;
    const tc = texCanvas(px, Math.max(16, Math.round((px * h) / w)));
    const { ctx, c } = tc;
    ctx.fillStyle = o.fundo || '#1B2638';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = o.cor || '#ffffff';
    ctx.font = `${o.peso || 700} ${Math.round(c.height * (o.escala || 0.6))}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, c.width / 2, c.height / 2 + 1);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tc.t, transparent: !!o.transparente }));
  }
  function textoPiso(txt, w, h, cor) {
    const tc = texCanvas(1024, Math.round((1024 * h) / w));
    const { ctx, c } = tc;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = cor || 'rgba(27,38,56,0.75)';
    ctx.font = `800 ${Math.round(c.height * 0.7)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, c.width / 2, c.height / 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tc.t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  function sprite(linhas, larguraM, o) {
    o = o || {};
    const tc = texCanvas(1024, 128 * linhas.length + 40);
    const { ctx, c } = tc;
    ctx.fillStyle = o.fundo || 'rgba(27,38,56,0.92)';
    const r = 28;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r); ctx.arcTo(c.width, c.height, 0, c.height, r);
    ctx.arcTo(0, c.height, 0, 0, r); ctx.arcTo(0, 0, c.width, 0, r); ctx.fill();
    linhas.forEach((l, i) => {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#C9D3E0';
      ctx.font = `${i === 0 ? 700 : 500} ${i === 0 ? 70 : 52}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l, c.width / 2, 20 + 128 * i + 64);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tc.t, depthWrite: false }));
    sp.scale.set(larguraM, (larguraM * c.height) / c.width, 1);
    return sp;
  }
  // etiquetas impressas dos endereços: um único mesh com atlas de textura (uma chamada de desenho por rack)
  function etiquetasMesh(lista) {
    const CW = 256, CH = 72, COLS = 8, rows = Math.max(1, Math.ceil(lista.length / COLS));
    const tc = texCanvas(CW * COLS, CH * rows);
    const { ctx } = tc;
    ctx.fillStyle = '#f7f7f4';
    ctx.fillRect(0, 0, tc.c.width, tc.c.height);
    const pos = [], uv = [], idx = [];
    const v = new THREE.Vector3();
    lista.forEach((l, i) => {
      const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
      ctx.fillStyle = '#111';
      ctx.font = '800 40px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.txt, cx + CW / 2, cy + 26);
      for (let k = 0, x = cx + 30; x < cx + CW - 30; k++) { const w = 2 + ((i * 7 + k * 5) % 3); ctx.fillRect(x, cy + 50, w, 16); x += w + 2 + ((k * 3) % 3); }
      [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].forEach(([a, b]) => { v.set(a, b, 0).applyMatrix4(l.m); pos.push(v.x, v.y, v.z); });
      const u0 = cx / tc.c.width, u1 = (cx + CW) / tc.c.width, v1 = 1 - cy / tc.c.height, v0 = 1 - (cy + CH) / tc.c.height;
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    tc.t.anisotropy = 8;
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tc.t }));
  }
  function caixaMesh(w, h, d, m) {
    const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    x.castShadow = true;
    x.receiveShadow = true;
    return x;
  }
  function instanciado(geo, material, matrizes, sombra) {
    const im = new THREE.InstancedMesh(geo, material, Math.max(1, matrizes.length));
    matrizes.forEach((mt, i) => im.setMatrixAt(i, mt));
    im.count = matrizes.length;
    im.castShadow = !!sombra;
    im.receiveShadow = true;
    return im;
  }
  const dummy = new THREE.Object3D();
  function matriz(x, y, z, rx, ry, rz, sx, sy, sz) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx || 0, ry || 0, rz || 0);
    dummy.scale.set(sx || 1, sy || 1, sz || 1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  }
  function cabo(pontos, cor, raio) {
    const g = new THREE.Group();
    const m = mat(cor, { roughness: 0.5 });
    const r = raio || 0.012;
    for (let i = 0; i < pontos.length - 1; i++) {
      const a = new THREE.Vector3(...pontos[i]), b = new THREE.Vector3(...pontos[i + 1]);
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      const cil = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
      cil.position.copy(a).add(b).multiplyScalar(0.5);
      cil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(cil);
      const j = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      j.position.copy(b);
      g.add(j);
    }
    return g;
  }
  const pad = (n, k) => String(n).padStart(k, '0');
  const fmtT = (s) => { s = Math.max(0, Math.round(s)); return `${pad(Math.floor(s / 60), 2)}:${pad(s % 60, 2)}`; };
  const relogio = () => { const s = 8 * 3600 + Math.floor(simT); return `${pad(Math.floor(s / 3600) % 24, 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}`; };
  // etiqueta do endereço: bairro.rua.prédio+andar.apto (cd_endereco 0050421A → 0.05.0421.A)
  const fmtEnd = (cd) => `${cd[0]}.${cd.slice(1, 3)}.${cd.slice(3, 7)}.${cd.slice(7)}`;
  const rotEnd = (e) => fmtEnd(e.end);
  // ---------------- integração com a versão unificada (janela pai recebe os eventos)
  const EMBUTIDO = window.parent !== window;
  const ADDR_EQ = { 'AG-E': 0x41, 'AG-D': 0x42, 'BG-E1': 0x51, 'BG-E2': 0x52, 'BG-D1': 0x55, 'BG-D2': 0x56 };
  function dispDe(m) {
    if (m.tipo === 'Q') return { tipo: 'Q', addr: m.end.predio, pos: m.end.andar, id: m.id };
    const a = ADDR_EQ[m.id] || (0x60 + (parseInt(String(m.id).replace(/\D/g, ''), 10) || 0));
    return { tipo: 'EQ', addr: a, id: m.id, nome: m.nome || m.id };
  }
  function emitir(tipo, dados) {
    if (!EMBUTIDO) return;
    // 'evento' é o nome do evento; 'tipo' continua sendo o tipo do módulo (Q/EQ) quando o evento é de um display
    try { window.parent.postMessage(Object.assign({ ptl: true, tipo, est: S.est, modo: S.modo }, dados || {}, { evento: tipo }), '*'); } catch (e) { /* sem janela pai */ }
  }
  const estVizinha = (d) => pad(Math.max(1, +S.est + d), 2);
  function limpar(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse((o) => {
        if (o.geometry && o.geometry !== BOX1) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); if (!Object.values(M).includes(m) && !PRODUTOS.includes(m) && !ROT_ANDAR.includes(m)) m.dispose(); });
      });
    }
  }
  function aleat(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // rótulos "A0".."A7" compartilhados
  const ROT_ANDAR = Array.from({ length: 8 }, (_, a) => {
    const tc = texCanvas(64, 40);
    tc.ctx.fillStyle = '#ffffff'; tc.ctx.fillRect(0, 0, 64, 40);
    tc.ctx.fillStyle = '#1B2638'; tc.ctx.font = '700 28px Arial'; tc.ctx.textAlign = 'center'; tc.ctx.textBaseline = 'middle';
    tc.ctx.fillText('A' + a, 32, 21);
    return new THREE.MeshBasicMaterial({ map: tc.t });
  });
  const GEO_ROT = new THREE.PlaneGeometry(0.064, 0.04);

  // ======================================================================= DISPLAY 7 SEGMENTOS
  const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
    A: 'abcefg', b: 'cdefg', C: 'adef', c: 'deg', d: 'bcdeg', E: 'adefg', F: 'aefg', H: 'bcefg', L: 'def', n: 'ceg', o: 'cdeg', P: 'abefg', r: 'eg', t: 'defg', U: 'bcdef', '-': 'g', ' ': '' };
  // texto com '.' acende o ponto decimal do dígito anterior (ex.: "0.05.0421.A" ocupa 8 dígitos)
  function digitos(txt) {
    const out = [];
    for (const ch of txt) {
      if (ch === '.' && out.length && !out[out.length - 1].dp) out[out.length - 1].dp = true;
      else out.push({ ch, dp: false });
    }
    return out;
  }
  function seg7(ctx, txt, x, y, dw, dh, on, off) {
    const t = dw * 0.22, gp = t * 0.14;
    const dg = digitos(txt);
    ctx.save();
    ctx.transform(1, 0, -0.1, 1, 0.1 * (y + dh / 2), 0);
    for (let i = 0; i < dg.length; i++) {
      const segs = SEG[dg[i].ch] !== undefined ? SEG[dg[i].ch] : '';
      const ox = x + i * dw * 1.42;
      ctx.fillStyle = dg[i].dp ? on : off;
      ctx.shadowBlur = dg[i].dp ? t * 1.3 : 0;
      ctx.shadowColor = on;
      ctx.beginPath();
      ctx.arc(ox + dw + t * 1.0, y + dh - t * 0.15, t * 0.7, 0, Math.PI * 2);
      ctx.fill();
      const P = {
        a: [[ox + t / 2 + gp, y], [ox + dw - t / 2 - gp, y]], g: [[ox + t / 2 + gp, y + dh / 2], [ox + dw - t / 2 - gp, y + dh / 2]],
        d: [[ox + t / 2 + gp, y + dh], [ox + dw - t / 2 - gp, y + dh]], f: [[ox, y + t / 2 + gp], [ox, y + dh / 2 - t / 2 - gp]],
        b: [[ox + dw, y + t / 2 + gp], [ox + dw, y + dh / 2 - t / 2 - gp]], e: [[ox, y + dh / 2 + t / 2 + gp], [ox, y + dh - t / 2 - gp]],
        c: [[ox + dw, y + dh / 2 + t / 2 + gp], [ox + dw, y + dh - t / 2 - gp]],
      };
      for (const k of 'abcdefg') {
        const [[x1, y1], [x2, y2]] = P[k];
        const aceso = segs.includes(k);
        ctx.fillStyle = aceso ? on : off;
        ctx.shadowBlur = aceso ? t * 1.3 : 0;
        ctx.shadowColor = on;
        ctx.beginPath();
        if (y1 === y2) {
          ctx.moveTo(x1 - t / 2, y1); ctx.lineTo(x1, y1 - t / 2); ctx.lineTo(x2, y2 - t / 2);
          ctx.lineTo(x2 + t / 2, y2); ctx.lineTo(x2, y2 + t / 2); ctx.lineTo(x1, y1 + t / 2);
        } else {
          ctx.moveTo(x1, y1 - t / 2); ctx.lineTo(x1 + t / 2, y1); ctx.lineTo(x2 + t / 2, y2);
          ctx.lineTo(x2, y2 + t / 2); ctx.lineTo(x2 - t / 2, y2); ctx.lineTo(x1 - t / 2, y1);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ======================================================================= MÓDULOS
  const grpEst = new THREE.Group();
  scene.add(grpEst);
  let grpAlto, grpBaixo, grpCabos;

  let seqSerial = 0x3A1F20;
  function serialNovo() { seqSerial = (seqSerial * 1103515245 + 12345) & 0xffffff; return seqSerial.toString(16).toUpperCase().padStart(6, '0'); }
  function criarModulo(tipo, pai, x, y, z, rotX, id, lado) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.x = rotX || 0;
    pai.add(g);
    const Q = tipo === 'Q';
    const W = Q ? 0.2 : 0.46, H = Q ? 0.066 : 0.1;
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.036), M.corpo);
    corpo.castShadow = true;
    g.add(corpo);
    const tc = Q ? texCanvas(220, 110) : texCanvas(545, 110);
    const dispW = Q ? 0.118 : 0.33;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(dispW, (dispW * tc.c.height) / tc.c.width), new THREE.MeshBasicMaterial({ map: tc.t }));
    disp.position.set(Q ? -0.03 : -0.045, 0, 0.0185);
    g.add(disp);
    const btnMat = mat('#1f5f3a', { roughness: 0.35, emissive: '#000000' });
    const r = Q ? 0.021 : 0.03;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.018, 24), btnMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(W / 2 - (Q ? 0.033 : 0.04), 0, 0.024);
    g.add(btn);
    const m = { tipo, id, lado, g, tc, btn, btnMat, fila: [], item: null, falha: false, flash: 0, press: 0, ident: 0, cad: false, cadPisca: false,
      serial: serialNovo(), W, H };
    [corpo, disp, btn].forEach((o) => { o.userData.mod = m; clicaveis.push(o); });
    modulos.push(m);
    desenhar(m);
    return m;
  }

  function desenhar(m) {
    const { ctx, c, t } = m.tc;
    ctx.fillStyle = '#07090c';
    ctx.fillRect(0, 0, c.width, c.height);
    const it = m.falha ? null : m.item;
    if (m.tipo === 'Q') {
      const txt = m.cad ? (m.cadPisca ? 'CAd' : '   ') : m.ident > 0 ? '888' : m.falha ? '   ' : it ? String(it.qtd).padStart(3, ' ') : m.flash > 0 ? '---' : '   ';
      seg7(ctx, txt, 44, 20, 34, 70, '#ff3b30', '#170808');
    } else {
      const end = m.cad ? (m.cadPisca ? ' -CAd-  ' : '        ') : m.ident > 0 ? '8.8.8.8.8.8.8.8.' : m.falha ? '        ' : it ? rotEnd(it.e) : m.flash > 0 ? '--------' : '        ';
      const q = m.cad ? (m.cadPisca ? '888' : '   ') : m.ident > 0 ? '888' : m.falha ? '   ' : it ? String(it.qtd).padStart(3, ' ') : m.flash > 0 ? '---' : '   ';
      seg7(ctx, end, 26, 20, 30, 70, '#ff3b30', '#170808');
      seg7(ctx, q, 26 + 8 * 30 * 1.42 + 34, 20, 30, 70, '#39ff6a', '#071509');
      ctx.fillStyle = '#5B6675';
      ctx.font = '600 13px Arial';
      ctx.fillText('ENDEREÇO', 30, 104);
      ctx.fillText('QTD', 26 + 8 * 30 * 1.42 + 38, 104);
    }
    t.needsUpdate = true;
    const aceso = (!m.falha && !!m.item) || m.ident > 0 || (m.cad && m.cadPisca);
    m.btnMat.color.set(m.cad ? '#F2A33A' : aceso ? '#2ecc71' : m.falha ? '#8e1b12' : '#1d4b31');
    m.btnMat.emissive.set(m.cad && m.cadPisca ? '#b86e10' : aceso ? '#1fbf5a' : '#000000');
  }

  // ======================================================================= RACK (frente local +z, prédios ao longo de x local)
  // colunas: [{x, w, predio, ends:{andar: endereço}}]; o: {niveis:[{yb,h}] por andar, prof, cinza, lado}
  // Prateleiras alinhadas: todos os prédios têm os mesmos níveis; andar 0 em cima.
  function construirRack(colunas, o) {
    const g = new THREE.Group();
    const nvs = o.niveis.filter(Boolean);
    const top = Math.max(...nvs.map((n) => n.yb + n.h));
    const hM = o.semTopo ? top + 0.02 : top + 0.5;
    const cinza = !!o.cinza;
    // montantes só nas pontas de cada vão (o.porVao prédios por vão), como no flow rack real
    const pv = o.porVao || 1;
    const arestas = [...new Set(colunas.flatMap((c) => [Math.round((c.x - c.w / 2) * 1000) / 1000, Math.round((c.x + c.w / 2) * 1000) / 1000]))].sort((x, y) => x - y);
    const bordas = new Set(arestas.filter((_, k) => k % pv === 0 || k === arestas.length - 1));
    const mont = [], vigas = [], trilhos = [], reservas = [], caixas = [], etiquetas = [];
    const rotPorAndar = ROT_ANDAR.map(() => []), prodPorMat = PRODUTOS.map(() => []);
    bordas.forEach((bx) => {
      mont.push(matriz(bx, hM / 2, -0.02, 0, 0, 0, 0.05, hM, 0.04));
      mont.push(matriz(bx, hM / 2, -o.prof, 0, 0, 0, 0.05, hM, 0.04));
    });
    const profs = [];
    for (let zz = -0.55; zz > -o.prof + 0.2; zz -= 0.36) profs.push(zz);
    const ys = new Set();
    o.niveis.forEach((n) => { ys.add(Math.round(n.yb * 1000) / 1000); ys.add(Math.round((n.yb + n.h) * 1000) / 1000); });
    const r = aleat(o.seed || 7);
    colunas.forEach((c, ci) => {
      c.i = ci;
      ys.forEach((y) => {
        vigas.push(matriz(c.x, y - 0.02, 0, 0, 0, 0, c.w, 0.05, 0.035));
        vigas.push(matriz(c.x, y - 0.02 + o.prof * Math.tan(CFG.tilt), -o.prof, 0, 0, 0, c.w, 0.05, 0.035));
      });
      o.niveis.forEach((nv, a) => {
        const yb = nv.yb, h = nv.h;
        trilhos.push(matriz(c.x, yb + (o.prof / 2) * Math.tan(CFG.tilt), -o.prof / 2, CFG.tilt, 0, 0, c.w, 0.012, o.prof));
        const e = cinza ? null : c.ends[a];
        const tipo = cinza ? (r() < 0.25 ? null : 'ABCF'[Math.floor(r() * 4)]) : e && e.dim;
        if (!tipo) return;
        const [fw0, fh0] = CFG.caixaTipo[tipo] || [0.5, 0.5];
        const fa = o.lado === 'alto' ? CFG.fatorCaixaAlto : 1;
        const wt = c.w * fw0 - 0.006, ht = h * Math.min(0.8, fh0 * fa), dt = o.lado === 'alto' ? 0.38 : 0.3;
        const yc = (zz) => yb + 0.012 + ht / 2 - zz * Math.tan(CFG.tilt);
        profs.forEach((zz) => reservas.push(matriz(c.x, yc(zz), zz, CFG.tilt, 0, 0, wt, ht, dt)));
        if (cinza) { caixas.push(matriz(c.x, yc(-0.2), -0.2, CFG.tilt, 0, 0, wt, ht, dt)); return; }
        const tm = M.caixaPapelao.clone();
        const caixa = new THREE.Mesh(BOX1, tm);
        caixa.scale.set(wt, ht, dt);
        caixa.position.set(c.x, yc(-0.2), -0.2);
        caixa.rotation.x = CFG.tilt;
        g.add(caixa);
        const lw = Math.min(0.15, wt * 0.82);
        etiquetas.push({ m: matriz(c.x, yc(-0.2) - ht * 0.12, -0.2 + dt / 2 + 0.003, CFG.tilt, 0, 0, lw, Math.min(lw * 0.28, ht * 0.4), 1), txt: fmtEnd(e.end) });
        e.tote = caixa;
        e.toteMat = tm;
        if (c.i % pv === 0) rotPorAndar[Math.min(7, a)].push(matriz(c.x - c.w / 2 + 0.04, yb - 0.022, 0.024));
        if (e.cat === 'alto_0a3') { e.modulo = criarModulo('Q', g, c.x, yb - 0.036, 0.04, 0, rotEnd(e), 'alto'); e.modulo.end = e; }
      });
      if (!cinza && !o.semTopo) {
        const lb = placa(pad(c.predio, 3), Math.min(0.2, c.w - 0.06), 0.065, { fundo: '#ffffff', cor: '#1B2638' });
        lb.position.set(c.x, top + 0.1, 0.03);
        g.add(lb);
      }
    });
    g.add(instanciado(BOX1, cinza ? M.cinzaEstr : M.montante, mont, true));
    g.add(instanciado(BOX1, cinza ? M.cinzaViga : M.longarina, vigas, !cinza));
    g.add(instanciado(BOX1, M.trilho, trilhos, false));
    g.add(instanciado(BOX1, cinza ? M.cinzaTote : M.caixaPapelao, reservas, false));
    if (cinza) g.add(instanciado(BOX1, M.cinzaTote, caixas, false));
    else {
      if (etiquetas.length) g.add(etiquetasMesh(etiquetas));
      rotPorAndar.forEach((ms, a) => { if (ms.length) g.add(instanciado(GEO_ROT, ROT_ANDAR[a], ms, false)); });
      prodPorMat.forEach((ms, k) => { if (ms.length) g.add(instanciado(BOX1, PRODUTOS[k], ms, false)); });
    }
    const xs = colunas.map((c) => c.x);
    g.userData = { top, xmin: Math.min(...xs) - colunas[0].w / 2, xmax: Math.max(...xs) + colunas[0].w / 2 };
    if (!o.semTopo) {
      const header = caixaMesh(g.userData.xmax - g.userData.xmin + 0.06, 0.05, 0.05, cinza ? M.cinzaEstr : M.montante);
      header.position.set((g.userData.xmin + g.userData.xmax) / 2, top + 0.48, -0.01);
      g.add(header);
    }
    return g;
  }
  function posicionar(g, x, z, normal) {
    g.position.set(x, 0, z);
    g.rotation.y = { '+z': 0, '-z': Math.PI, '-x': -Math.PI / 2, '+x': Math.PI / 2 }[normal];
  }

  // alto giro de uma estação com centro em xc (frente para o operador, +z)
  function altoGiro(xc, porPredio, cinza, seed) {
    const W = CFG.WA;
    const xMundo = (p) => xc + (p - 5.5) * W;
    const cols = [];
    for (let p = 1; p <= 10; p++) {
      const ends = {};
      if (!cinza) (porPredio[p] || []).forEach((e) => { ends[e.andar] = e; });
      cols.push({ x: xMundo(p), w: W, predio: p, ends });
    }
    // andares 0-3: estante com a esteira de transporte por baixo; andares 4-5: estante por baixo da esteira de separação
    const sup = construirRack(cols, { niveis: CFG.niveisAlto.slice(0, 4), prof: CFG.profAlto, lado: 'alto', cinza, seed, porVao: 5 });
    posicionar(sup, 0, CFG.zAltoFace, '+z');
    const niv45 = [];
    niv45[4] = CFG.niveisAlto[4];
    niv45[5] = CFG.niveisAlto[5];
    const inf = construirRack(cols, { niveis: niv45, prof: CFG.profAltoBaixo, lado: 'alto', cinza, seed: (seed || 7) + 11, porVao: 5, semTopo: true });
    posicionar(inf, 0, CFG.zAltoBaixoFace, '+z');
    const g = new THREE.Group();
    g.add(sup, inf);
    g.userData = { top: sup.userData.top, xMundo, sup, inf };
    return g;
  }
  // lado do corredor: prédios em ordem a partir da entrada; normal '-x' = lado esquerdo (+x), '+x' = lado direito (-x)
  // cada lado tem 2 m de prateleira (50 cm de profundidade); a largura do prédio = 2 m ÷ número de prédios do lado
  function ladoCorredor(xFace, normal, predios, porPredio, cinza, seed, n) {
    const sgn = normal === '-x' ? 1 : -1;
    const lista = cinza ? Array.from({ length: n }, (_, i) => i) : predios;
    const wb = CFG.compBaixo / Math.max(1, lista.length);
    const cols = lista.map((p, i) => {
      const ends = {};
      if (!cinza) porPredio[p].forEach((e) => { ends[e.andar] = e; });
      return { x: sgn * (i + 0.5) * wb, w: wb, predio: cinza ? 0 : p, ends };
    });
    const g = construirRack(cols, { niveis: CFG.niveisBaixoY, prof: CFG.profBaixo, lado: 'baixo', cinza, seed, porVao: Math.ceil(lista.length / 2) });
    posicionar(g, xFace, CFG.zCorr, normal);
    g.userData.wb = wb;
    return g;
  }
  // prédio 015: faixa de 30 cm na frente do bloco inteiro (1 m, as duas prateleiras de costas), virada para a esteira
  CFG.niveis015 = [0, 1, 2, 3].map((a) => ({ yb: CFG.baseBaixo + (3 - a) * (CFG.alturaBaixo / 4), h: CFG.alturaBaixo / 4 }));
  function frente015(xc, porPredio, cinza, seed) {
    const ends = {};
    if (!cinza) (porPredio[15] || []).forEach((e) => { ends[e.andar] = e; });
    const g = construirRack([{ x: 0, w: 2 * CFG.profBaixo, predio: cinza ? 0 : 15, ends }], { niveis: CFG.niveis015, prof: CFG.prof015, lado: 'baixo', cinza, seed });
    posicionar(g, xc, CFG.zFaces, '-z');
    return g;
  }

  // ======================================================================= ESTAÇÃO
  let transf = null, faixaX = [-12, 12];
  function construirEstacao() {
    limpar(grpEst);
    clicaveis.length = 0;
    modulos = [];
    guias = {};
    emCadastro = null;
    noSerial = {};
    for (let p = 1; p <= 10; p++) noSerial[p] = serialNovo();
    const est = +S.est;
    enderecos = DADOS[S.est].enderecos.map((a) => ({ end: a[0], predio: a[1], andar: a[2], cat: a[3], zona: a[4], dim: a[5], ordem: a[6] }));
    const porPredio = {};
    enderecos.forEach((e) => { (porPredio[e.predio] = porPredio[e.predio] || []).push(e); });
    transf = transferenciaDe(S.est);
    const sMin = Math.max(transf.p0, Math.min(transf.b, est - 1)), sMax = Math.min(transf.p1, Math.max(transf.b + 1, est + 1));
    faixaX = [(sMin - est - 0.5) * CFG.passo - 3, (sMax - est + 0.5) * CFG.passo + 3];

    grpAlto = new THREE.Group();
    grpBaixo = new THREE.Group();
    grpCabos = new THREE.Group();
    grpEst.add(grpAlto, grpBaixo, grpCabos);
    const cabosA = new THREE.Group(), cabosB = new THREE.Group();
    grpAlto.add(cabosA);
    grpBaixo.add(cabosB);
    grpCabos.userData = { cabosA, cabosB };
    const hc = CFG.larguraCorredor / 2;

    // ---------------- ALTO GIRO da estação (esteiras passam entre o andar 3 e o andar 4)
    const alto = altoGiro(0, porPredio, false);
    grpAlto.add(alto);
    const topA = alto.userData.top;
    const xm = alto.userData.xMundo;
    const blocos = {};
    // andares 4-5: 2 zonas (esquerda P001–P005 e direita P006–P010), 1 display E+Q cada, na longarina entre A4 e A5
    [['AG-E', 1, 5, 'P001–P005'], ['AG-D', 6, 10, 'P006–P010']].forEach(([id, p1, p2, nome]) => {
      const cx = (xm(p1) + xm(p2)) / 2;
      const m = criarModulo('EQ', alto.userData.inf, cx, CFG.niveisAlto[4].yb - 0.035, 0.05, 0, id, 'alto');
      m.nome = `Alto giro ${nome} A4–A5`;
      blocos[id] = m;
    });
    for (let p = 1; p <= 10; p++) {
      const no = caixaMesh(0.1, 0.07, 0.1, M.corpo);
      no.position.set(xm(p), topA + 0.08, -0.22);
      alto.userData.sup.add(no);
    }
    const sinal = placa(`ALTO GIRO · ESTAÇÃO ${S.est} · P001–P010`, CFG.compAlto - 0.1, 0.16, { escala: 0.5 });
    sinal.position.set(0, topA + 0.66, -0.01);
    alto.userData.sup.add(sinal);

    // ---------------- BAIXO GIRO (corredor atrás do operador)
    const baixos = enderecos.filter((e) => e.cat === 'baixo');
    const pb = [...new Set(baixos.map((e) => e.predio))].filter((p) => p !== 15);
    const esq = pb.filter((p) => p < CFG.predioVirada).sort((a, b) => a - b);
    const dir = pb.filter((p) => p >= CFG.predioVirada).sort((a, b) => b - a);
    const rackE = ladoCorredor(hc, '-x', esq, porPredio, false);
    const rackW = ladoCorredor(-hc, '+x', dir, porPredio, false);
    grpBaixo.add(rackE, rackW);
    const x015 = -(hc + CFG.profBaixo);   // centro do bloco da direita (divisa com a estação vizinha)
    if (porPredio[15]) {
      const r15 = frente015(x015, porPredio, false);
      grpBaixo.add(r15);
      const s15 = placa('P015 · frente do bloco (150 a 153)', 0.9, 0.07, { escala: 0.55 });
      s15.position.set(0, r15.userData.top + 0.2, 0.02);
      r15.add(s15);
    }
    const topB = rackE.userData.top;
    const sinalE = placa(`BAIXO GIRO · ESQUERDA · P${pad(esq[0], 3)}–P${pad(esq[esq.length - 1], 3)}`, CFG.compBaixo - 0.05, 0.13, { escala: 0.5 });
    sinalE.position.set(CFG.compBaixo / 2, topB + 0.66, -0.01);
    rackE.add(sinalE);
    const sinalW = placa(`DIREITA · P${pad(dir[0] || 0, 3)} → P${pad(dir[dir.length - 1] || 0, 3)}`, CFG.compBaixo - 0.05, 0.13, { escala: 0.5 });
    sinalW.position.set(-CFG.compBaixo / 2, topB + 0.66, -0.01);
    rackW.add(sinalW);
    const zonasIds = [...new Set(baixos.map((e) => e.zona))].sort();
    const zonas = {};
    const hB = CFG.alturaBaixo / CFG.niveisBaixo;
    const yViga = CFG.baseBaixo + Math.round((CFG.yDisplayBaixo - CFG.baseBaixo) / hB) * hB;   // longarina mais perto da altura dos olhos
    zonasIds.forEach((z, k) => {
      const ps = [...new Set(baixos.filter((e) => e.zona === z).map((e) => e.predio))];
      const ladoE = /-E\d/.test(z) || (!/-D\d/.test(z) && ps.filter((p) => esq.includes(p)).length >= ps.filter((p) => dir.includes(p)).length);
      const rack = ladoE ? rackE : rackW;
      const lista = ladoE ? esq : dir;
      const idx = ps.filter((p) => lista.includes(p)).map((p) => lista.indexOf(p));
      if (!idx.length) return;
      const sgn = ladoE ? 1 : -1, wb = rack.userData.wb;
      const i1 = Math.min(...idx), i2 = Math.max(...idx);
      const x1 = sgn * i1 * wb, x2 = sgn * (i2 + 1) * wb, cx = (x1 + x2) / 2, larg = Math.abs(x2 - x1);
      const cor = CORES_ZONA[k % CORES_ZONA.length];
      const nomes = ps.slice().sort((a, b) => a - b).filter((p) => p !== 15);
      const rotulo = z.replace('BG-', '');
      const txt = `ZONA ${rotulo} · ${ps.includes(15) ? 'P015 + ' : ''}P${pad(nomes[0], 3)}–P${pad(nomes[nomes.length - 1], 3)}`;
      const pl = placa(txt, larg - 0.03, 0.07, { fundo: cor, escala: 0.42, px: 768 });
      pl.position.set(cx, topB + 0.2, 0.03);
      rack.add(pl);
      const m = criarModulo('EQ', rack, cx, yViga - 0.05, 0.06, 0, z, 'baixo');
      const tarja = placa(rotulo, 0.08, 0.05, { fundo: cor, escala: 0.7 });
      tarja.position.set(-0.17, 0.078, 0.005);
      m.g.add(tarja);
      zonas[z] = m;
      zonas[z].cor = cor;
      zonas[z].nome = `Zona ${rotulo}`;
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(larg - 0.04, 0.2), mat(cor, { transparent: true, opacity: 0.55 }));
      faixa.rotation.x = -Math.PI / 2;
      faixa.position.set(cx, 0.006, 0.13);
      rack.add(faixa);
    });

    // ---------------- estações vizinhas (cinza)
    for (let s = sMin; s <= sMax; s++) {
      if (s === est) continue;
      const xc = (s - est) * CFG.passo;
      grpAlto.add(altoGiro(xc, {}, true, s * 3));
      grpBaixo.add(ladoCorredor(xc + hc, '-x', null, null, true, s * 5 + 1, 12));
      grpBaixo.add(ladoCorredor(xc - hc, '+x', null, null, true, s * 5 + 2, 12));
      grpBaixo.add(frente015(xc + x015, null, true, s * 5 + 3));
      const pl = placa(`ALTO GIRO · ESTAÇÃO ${pad(s, 2)}`, CFG.compAlto - 0.2, 0.15, { fundo: '#7f8995', escala: 0.55 });
      pl.position.set(xc, topA + 0.66, CFG.zAltoFace - 0.01);
      grpAlto.add(pl);
      const t = textoPiso(`ESTAÇÃO ${pad(s, 2)}`, 1.9, 0.34, 'rgba(91,102,117,0.55)');
      t.position.set(xc, 0.008, 0.85);
      grpEst.add(t);
    }
    const tP = textoPiso(`ESTAÇÃO ${S.est}`, 1.9, 0.34, 'rgba(27,38,56,0.8)');
    tP.position.set(0.25, 0.008, 0.95);
    grpEst.add(tP);

    construirEsteiras();

    // ---------------- vínculo endereço → módulo, lado e posição de pega
    grpEst.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    enderecos.forEach((e) => {
      if (e.cat === 'alto_45') e.modulo = blocos[e.zona];
      else if (e.cat === 'baixo') e.modulo = zonas[e.zona];
      if (!e.tote) return;
      e.tote.getWorldPosition(wp);
      if (e.cat !== 'baixo') { e.lado = 'alto'; e.pega = { x: wp.x, z: CFG.zOperAlto, rot: Math.PI }; }
      else if (e.predio === 15) { e.lado = 'dir'; e.pega = { x: x015, z: CFG.zFaces - 0.42, rot: 0 }; }
      else if (esq.includes(e.predio)) { e.lado = 'esq'; e.pega = { x: 0.25, z: wp.z, rot: Math.PI / 2 }; }
      else { e.lado = 'dir'; e.pega = { x: -0.25, z: wp.z, rot: -Math.PI / 2 }; }
      e.guia = guias[(e.cat === 'baixo' ? 'baixo-' : 'alto-') + e.predio];
    });

    construirConcentrador(topA, topB, CFG.zCorr + CFG.compBaixo);
    construirB2();
    construirSinalBaixo();
    atualizarInfra();
    aplicarVisibilidade();
  }

  // ---------------- esteiras dentro do alto giro + transferência
  function construirEsteiras() {
    const g = new THREE.Group();
    grpEst.add(g);
    const [x0, x1] = faixaX, L = x1 - x0, cx = (x0 + x1) / 2;
    const transportador = (z, h, W, pernas) => {
      [-1, 1].forEach((s) => {
        const lat = caixaMesh(L, 0.09, 0.035, M.esteira);
        lat.position.set(cx, h - 0.02, z + s * (W / 2 + 0.02));
        g.add(lat);
      });
      const base = caixaMesh(L, 0.03, W, M.esteira);
      base.position.set(cx, h - 0.08, z);
      g.add(base);
      const rol = [], pr = [];
      for (let x = x0; x <= x1; x += 0.085) rol.push(matriz(x, h - 0.012, z, Math.PI / 2, 0, 0, 1, 1, 1));
      g.add(instanciado(new THREE.CylinderGeometry(0.022, 0.022, W, 10), M.rolete, rol, false));
      if (pernas) {
        for (let x = x0; x <= x1; x += 1.5) [-1, 1].forEach((s) => pr.push(matriz(x, (h - 0.08) / 2, z + s * (W / 2), 0, 0, 0, 0.045, h - 0.08, 0.045)));
        g.add(instanciado(BOX1, M.esteira, pr, true));
      }
    };
    transportador(CFG.zSep, CFG.altSep, CFG.largSep, true);
    transportador(CFG.zTransp, CFG.altTransp, CFG.largTransp, false);
    const xt = transf.x;
    const zA = CFG.zTransp + CFG.largTransp / 2, zB = CFG.zSep - CFG.largSep / 2;
    const ponte = caixaMesh(0.6, 0.03, zB - zA + 0.1, mat('#2E8B57', { roughness: 0.5 }));
    ponte.position.set(xt, CFG.altSep - 0.03, (zA + zB) / 2);
    g.add(ponte);
    const dir = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, CFG.largSep - 0.04, 16), mat('#F2A33A', { emissive: '#3a2400' }));
    dir.rotation.x = Math.PI / 2;
    dir.position.set(xt, CFG.altSep + 0.01, CFG.zSep);
    g.add(dir);
    const st = transf.b;
    const alc = st === transf.p0 ? `esquerda: ${pad(st, 2)} · direita: ${pad(st + 1, 2)} e ${pad(st + 2, 2)}` : `esquerda: ${pad(st - 1, 2)} e ${pad(st, 2)} · direita: ${pad(st + 1, 2)} e ${pad(st + 2, 2)}`;
    const sp = sprite([`Transferência ${pad(st, 2)}|${pad(st + 1, 2)} · rolete direcionador`, alc], 1.7, { fundo: 'rgba(46,139,87,0.92)' });
    sp.position.set(xt, 3.25, CFG.zSep);
    g.add(sp);
    const e1 = sprite(['Separação (frente, aberta) · transporte (por dentro do alto giro)', '≈ 20 cm entre elas · transporte entre o andar 3 e o andar 4'], 2.1, { fundo: 'rgba(46,58,79,0.88)' });
    e1.position.set(x0 + 2.6, 3.25, CFG.zSep);
    g.add(e1);
  }

  // concentrador atrás da estação: no fundo do alto giro, do outro lado das esteiras (acesso pela parte de trás)
  function construirConcentrador(topA, topB, zFim) {
    const zBack = CFG.zAltoFace - CFG.profAlto;
    const xc = 0.7, zc = zBack - 0.13;
    const g = new THREE.Group();
    g.position.set(xc, 1.45, zc);
    g.rotation.y = Math.PI;
    grpEst.add(g);
    g.add(caixaMesh(0.36, 0.46, 0.2, M.gabinete));
    const grade = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), mat('#39424e', { roughness: 0.4 }));
    grade.position.set(0.07, -0.1, 0.101);
    g.add(grade);
    for (let i = 0; i < 5; i++) {
      const fenda = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.004), mat('#39424e'));
      fenda.position.set(-0.08, 0.08 - i * 0.03, 0.101);
      g.add(fenda);
    }
    const leds = [];
    ['#2ecc71', '#2ecc71', '#F2A33A'].forEach((c, i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshBasicMaterial({ color: c }));
      l.position.set(-0.11 + i * 0.05, 0.17, 0.102);
      g.add(l);
      leds.push(l);
    });
    const pl = placa(`CONCENTRADOR EST ${S.est}`, 0.32, 0.05, { escala: 0.6 });
    pl.position.set(0, -0.2, 0.102);
    g.add(pl);
    const lb = sprite(['Concentrador (atrás da estação)', 'Ethernet · 2× RS-485 · 12 V · cooler'], 1.15);
    lb.position.set(0, 0.62, 0.35);
    g.add(lb);
    g.userData.leds = leds;
    grpEst.userData.concentrador = g;

    const { cabosA, cabosB } = grpCabos.userData;
    const yT = topA + 0.62, zA = CFG.zAltoFace + 0.06, yA = topA + 0.02;
    const xa = CFG.compAlto / 2;
    // barramento 1: sobe pelo fundo do alto giro, passa por cima dele e corre na frente, descendo em cada prédio
    cabosA.add(cabo([[xc - 0.1, 1.68, zc + 0.05], [xc - 0.1, yA, zc + 0.05], [xc - 0.1, yA, zA], [-xa, yA, zA], [xa, yA, zA]], '#3A7BD5', 0.014));
    for (let p = 1; p <= 10; p++) {
      const x = (p - 5.5) * CFG.WA + 0.08;
      cabosA.add(cabo([[x, yA, zA], [x, CFG.baseAlto - 0.03, zA]], '#3A7BD5', 0.006));
    }
    const busA = sprite(['Barramento 1 · alto giro', 'Cat5e + RJ45 · RS-485 + 12 V'], 1.05, { fundo: 'rgba(58,123,213,0.92)' });
    busA.position.set(-xa + 0.4, topA + 0.95, zA - 0.3);
    cabosA.add(busA);
    // barramento 2: sobe atrás, cruza por cima do alto giro e das esteiras e desce pela eletrocalha sobre o corredor
    const calha = caixaMesh(0.2, 0.05, zFim - zc + 0.2, M.trilho);
    calha.position.set(0, yT + 0.03, (zc + zFim) / 2);
    cabosB.add(calha);
    cabosB.add(cabo([[xc + 0.1, 1.68, zc + 0.05], [xc + 0.1, yT, zc + 0.05], [0, yT, zc + 0.05], [0, yT, zFim]], '#E67E22', 0.014));
    const busB = sprite(['Barramento 2 · baixo giro', 'eletrocalha por cima das esteiras e do corredor'], 1.25, { fundo: 'rgba(230,126,34,0.92)' });
    busB.position.set(0, yT + 0.35, zFim - 0.6);
    cabosB.add(busB);
    cabosA.add(cabo([[xc, 1.68, zc - 0.05], [xc, yT + 0.6, zc - 0.05]], '#7F8C8D', 0.012));
    const rede = sprite(['Ethernet · VLAN PTL', 'switch → Serviço PTL (API + MQTT + Sybase)'], 1.15, { fundo: 'rgba(46,58,79,0.92)' });
    rede.position.set(xc, yT + 0.85, zc);
    cabosA.add(rede);
  }

  // ---------------- sinal luminoso de baixo giro: o operador vê, olhando para o alto giro, que a caixa tem itens atrás dele
  let sinalBG = null;
  // barra luminosa âmbar na frente do alto giro, entre a esteira de transporte e o andar 3 (altura dos olhos do operador)
  function construirSinalBaixo() {
    const g = new THREE.Group();
    g.position.set(0, 1.215, CFG.zAltoFace + 0.05);
    grpEst.add(g);
    g.add(caixaMesh(1.3, 0.07, 0.03, M.corpo));
    const luzMat = mat('#5a3a08', { emissive: '#000000', roughness: 0.25 });
    [-1, 1].forEach((sd) => {
      const barra = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.038, 0.012), luzMat);
      barra.position.set(sd * 0.39, 0, 0.018);
      g.add(barra);
    });
    const pl = placa('↶ BAIXO GIRO', 0.3, 0.05, { fundo: '#1B2638', escala: 0.66 });
    pl.position.set(0, 0, 0.017);
    g.add(pl);
    sinalBG = { g, luzMat, aceso: false };
  }
  const pendBaixo = () => (atual && ['SEPARANDO', 'ALERTA'].includes(estado) ? atual.itens.filter((i) => i.status === 'pendente' && i.e.cat === 'baixo').length : 0);
  function atualizarSinal() {
    if (!sinalBG) return;
    const v = pendBaixo() > 0;
    if (v === sinalBG.aceso) return;
    sinalBG.aceso = v;
    log('EVT', `Sinal de baixo giro ${v ? 'aceso: a caixa tem itens no corredor' : 'apagado: baixo giro concluído'}`);
    emitir('sinal', { aceso: v });
  }

  // ---------------- B2: leitor fixo sob a posição de pega + painel LCD + botão FECHAR (na frente do alto giro)
  let b2 = null;
  function construirB2() {
    const g = new THREE.Group();
    grpEst.add(g);
    const leitor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.3), mat('#20262f', { emissive: '#000000' }));
    leitor.position.set(CFG.xPega, CFG.altSep + 0.004, CFG.zSep);
    g.add(leitor);
    const tc = texCanvas(512, 160);
    const lcd = new THREE.Group();
    const xp = CFG.xPega - 0.8, zp = CFG.zSep + CFG.largSep / 2 + 0.08;
    const poste = caixaMesh(0.05, 1.25, 0.05, M.montante);
    poste.position.set(xp, 0.62, zp);
    g.add(poste);
    lcd.position.set(xp, 1.3, zp + 0.03);
    lcd.rotation.x = -0.3;
    g.add(lcd);
    lcd.add(caixaMesh(0.36, 0.17, 0.04, M.corpo));
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), new THREE.MeshBasicMaterial({ map: tc.t }));
    tela.position.set(0, 0.02, 0.021);
    lcd.add(tela);
    const botao = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 24), mat('#c0392b', { emissive: '#3a0905' }));
    botao.rotation.x = Math.PI / 2;
    botao.position.set(0.12, -0.055, 0.03);
    lcd.add(botao);
    const rot = placa('FECHAR', 0.08, 0.022, { fundo: '#1d2129', escala: 0.7 });
    rot.position.set(0.02, -0.055, 0.021);
    lcd.add(rot);
    botao.userData.acao = () => leitura('leitor fixo');
    clicaveis.push(botao);
    b2 = { g, leitor, tc, botao, leituraT: 0 };
    g.visible = S.modo === 'B2';
    desenharLCD();
  }

  // ======================================================================= CENÁRIO FIXO: piso
  (function cenario() {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), M.piso);
    piso.rotation.x = -Math.PI / 2;
    piso.position.z = 6;
    piso.receiveShadow = true;
    scene.add(piso);
    [CFG.zAltoFace + 0.1, CFG.zFaces - 0.1].forEach((z) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.05), M.amarelo);
      f.rotation.x = -Math.PI / 2;
      f.position.set(0, 0.004, z);
      scene.add(f);
    });
  })();

  // ======================================================================= OPERADOR
  const oper = { x: 0.35, z: CFG.zOperAlto, caminho: [], resolve: null, rot: Math.PI, anim: null, animT: 0, passo: 0 };
  const avatar = new THREE.Group();
  scene.add(avatar);
  (function montarAvatar() {
    const pele = mat('#d9a679'), calca = mat('#16181c'), camisa = mat('#2E9E4F'), sapato = mat('#0b0b0d');
    const mkPerna = (s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.09, 0.86, 0);
      const m = caixaMesh(0.12, 0.84, 0.14, calca);
      m.position.y = -0.42;
      p.add(m);
      const pe = caixaMesh(0.12, 0.06, 0.22, sapato);
      pe.position.set(0, -0.84, 0.04);
      p.add(pe);
      avatar.add(p);
      return p;
    };
    avatar.userData.pernas = [mkPerna(-1), mkPerna(1)];
    const tronco = caixaMesh(0.4, 0.6, 0.24, camisa);
    tronco.position.y = 1.18;
    avatar.add(tronco);
    const gola = caixaMesh(0.16, 0.04, 0.2, mat('#1d6b35'));
    gola.position.y = 1.48;
    avatar.add(gola);
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), pele);
    cabeca.position.y = 1.62;
    cabeca.castShadow = true;
    avatar.add(cabeca);
    const cabelo = new THREE.Mesh(new THREE.SphereGeometry(0.124, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), mat('#2b1d14'));
    cabelo.position.y = 1.64;
    avatar.add(cabelo);
    const mkBraco = (s) => {
      const b = new THREE.Group();
      b.position.set(s * 0.26, 1.44, 0);
      const m = caixaMesh(0.1, 0.58, 0.1, camisa);
      m.position.y = -0.29;
      b.add(m);
      const mao = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), pele);
      mao.position.y = -0.6;
      b.add(mao);
      avatar.add(b);
      return b;
    };
    const bd = mkBraco(1), be = mkBraco(-1);
    avatar.userData.bracos = [be, bd];
    const coletor = caixaMesh(0.07, 0.17, 0.035, mat('#111'));
    coletor.position.set(0, -0.62, 0.06);
    coletor.rotation.x = -0.6;
    bd.add(coletor);
    const pulseira = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), mat('#7B4FA0'));
    pulseira.rotation.x = Math.PI / 2;
    pulseira.position.y = -0.5;
    be.add(pulseira);
    avatar.userData.coletor = coletor;
    avatar.userData.pulseira = pulseira;
  })();
  // caminho que respeita o corredor (entra e sai pela boca do corredor)
  const dentro = (p) => p.z > CFG.zFaces - 0.1;
  function rota(de, para) {
    const boca = { x: 0, z: CFG.zFaces - 0.45 };
    const pts = [];
    if (dentro(de) && !dentro(para)) pts.push({ x: 0, z: de.z }, boca);
    else if (!dentro(de) && dentro(para)) pts.push(boca, { x: 0, z: para.z });
    else if (dentro(de) && dentro(para)) pts.push({ x: 0, z: de.z }, { x: 0, z: para.z });
    pts.push({ x: para.x, z: para.z });
    return pts;
  }
  function distRota(de, para) {
    let d = 0, p = de;
    rota(de, para).forEach((q) => { d += Math.hypot(q.x - p.x, q.z - p.z); p = q; });
    return d;
  }

  // ======================================================================= BACIAS
  const yT = CFG.altTransp + CFG.bacia.a / 2 + 0.01, yS = CFG.altSep + CFG.bacia.a / 2 + 0.01;
  const xFila = () => Math.sign(transf.x || -1) * CFG.distFila;
  // esteira de transporte → transferência → rolete direcionador → esteira de separação até a estação
  const rotaEntrada = (xAlvo) => [[transf.x, yT, CFG.zTransp], [transf.x, yS, CFG.zSep], [xAlvo, yS, CFG.zSep]];
  // operador empurra a bacia de volta para a esteira de transporte de onde ela estiver
  const rotaSaida = (c) => [[c.g.position.x, yT, CFG.zTransp], [faixaX[1] + 1, yT, CFG.zTransp]];
  function gerarItens() {
    const n = Math.max(1, Math.min(enderecos.length, Math.round(S.itens * (0.6 + Math.random() * 0.8))));
    const altos = enderecos.filter((e) => e.cat !== 'baixo'), baixos = enderecos.filter((e) => e.cat === 'baixo');
    const usados = new Set(), itens = [];
    const qtd = () => { const r = Math.random(); return r < 0.45 ? 1 : r < 0.7 ? 2 : r < 0.82 ? 3 : r < 0.94 ? 4 + Math.floor(Math.random() * 3) : 7 + Math.floor(Math.random() * 6); };
    let guarda = 0;
    while (itens.length < n && guarda++ < 2000) {
      const lista = Math.random() < 0.62 ? altos : baixos;
      const e = lista[Math.floor(Math.random() * lista.length)];
      if (usados.has(e.end)) continue;
      usados.add(e.end);
      itens.push({ e, qtd: qtd(), status: 'pendente' });
    }
    return itens;
  }
  function novaCaixa(xIni) {
    const id = 'CX' + pad(++seqCaixa, 6);
    const { c, a, l } = CFG.bacia;
    const g = new THREE.Group();
    g.add(caixaMesh(c, a, l, mat(CFG.bacia.cor, { roughness: 0.55 })));
    const borda = caixaMesh(c + 0.02, 0.03, l + 0.02, mat(CFG.bacia.borda));
    borda.position.y = a / 2;
    g.add(borda);
    const tc = texCanvas(256, 128);
    const { ctx } = tc;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#000';
    for (let x = 16, k = 0; x < 240; k++) { const w = 1 + ((seqCaixa * 7 + k * 13) % 4); ctx.fillRect(x, 12, w, 66); x += w + 1 + ((k * 5) % 3); }
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(id, 128, 108);
    [1, -1].forEach((sd) => {
      const et = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: tc.t }));
      et.position.set(0, 0, sd * (l / 2 + 0.002));
      if (sd < 0) et.rotation.y = Math.PI;
      g.add(et);
    });
    const tag = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), mat('#7B4FA0'));
    tag.position.set(c / 2 - 0.08, -0.07, l / 2 + 0.002);
    g.add(tag);
    g.userData.tag = tag;
    tag.visible = S.modo !== 'A';
    g.position.set(xIni, yT, CFG.zTransp);
    scene.add(g);
    const cx = { id, g, rota: [], vel: CFG.velEsteira, aoChegar: null, papel: 'fila', itens: gerarItens(), t0: 0, tag: 'E0' + pad((seqCaixa * 2654435761) % 0xffffff, 6).toUpperCase() };
    caixasCena.push(cx);
    return cx;
  }
  function mover(c, pontos, vel, aoChegar) { c.rota = pontos.map((p) => new THREE.Vector3(...p)); c.vel = vel; c.aoChegar = aoChegar || null; }
  function logTransferencia(c) {
    log('BHT', `Bacia ${c.id} desviada na transferência ${pad(transf.b, 2)}|${pad(transf.b + 1, 2)} → rolete para a ${transf.lado} → estação ${S.est}`);
  }
  function reiniciarCaixas() {
    caixasCena.forEach((c) => scene.remove(c.g));
    caixasCena.length = 0;
    atual = novaCaixa(Math.min(transf.x - 2, faixaX[0] + 2));
    atual.papel = 'atual';
    mover(atual, rotaEntrada(CFG.xPega), CFG.velEsteira, () => caixaChegou(atual));
    logTransferencia(atual);
    fila = novaCaixa(faixaX[0] - 1);
    mover(fila, rotaEntrada(xFila()), CFG.velEsteira);
    estado = 'AGUARDANDO';
  }
  function caixaChegou(c) {
    if (c !== atual || estado !== 'AGUARDANDO') return;
    estado = 'NA_POSICAO';
    log('BHT', `Bacia ${c.id} na posição de separação da estação ${S.est} (${c.itens.length} itens nesta estação)`);
    if (S.modo === 'B2') esperar(0.8).then(() => { if (estado === 'NA_POSICAO' && S.modo === 'B2' && atual === c) leitura('leitor fixo'); });
    atualizarUI();
  }

  // ======================================================================= REGRAS DO SERVIÇO PTL
  const ordemRota = (a, b) => a.e.ordem - b.e.ordem || a.e.predio - b.e.predio || a.e.andar - b.e.andar;
  function pendentes() { return atual ? atual.itens.filter((i) => i.status === 'pendente').length : 0; }

  function leitura(origem) {
    const ori = origem || (S.modo === 'A' ? 'coletor' : S.modo === 'B1' ? 'pulseira' : 'leitor fixo');
    if (estado === 'AGUARDANDO' || estado === 'FECHADA') { log('API', `Leitura (${ori}) sem bacia na posição — ignorada`); return; }
    if (ori !== 'coletor') {
      log('RFID', `${ori === 'pulseira' ? 'Pulseira' : 'Leitor fixo'} leu tag ${atual.tag} → bacia ${atual.id}`);
      if (b2 && ori === 'leitor fixo') b2.leituraT = 0.6;
    }
    log('API', `POST /v1/estacoes/${S.est}/leituras {caixa:"${atual.id}", origem:"${ori}"}`);
    if (estado === 'NA_POSICAO' && !S.redeOk) {
      log('API', `503 → estação ${S.est} sem comunicação com o concentrador`, 'ERRO');
      emitir('recusada', { caixa: atual.id, origem: ori });
      return;
    }
    if (estado === 'NA_POSICAO') return abrirCaixa(ori);
    if (estado === 'SEPARANDO') {
      const p = pendentes();
      if (p > 0) {
        estado = 'ALERTA';
        log('API', `409 → ${p} item(ns) pendente(s). Nova leitura fecha com pendência`, 'ERRO');
        emitir('alerta', { caixa: atual.id, origem: ori, pendentes: p });
        atualizarUI();
        return;
      }
    }
    if (estado === 'ALERTA') return fecharCaixa(true, ori);
    if (estado === 'PRONTA') return fecharCaixa(false, ori);
  }

  function abrirCaixa(ori) {
    estado = 'SEPARANDO';
    atual.t0 = simT;
    const its = atual.itens;
    log('SYB', `SELECT itens da caixa ${atual.id} (view do pedido) → ${its.length} itens · INSERT ptl_caixa_sessao`);
    const q = its.filter((i) => i.e.cat === 'alto_0a3');
    const grupos = {};
    its.filter((i) => i.e.cat !== 'alto_0a3').forEach((i) => { (grupos[i.e.modulo.id] = grupos[i.e.modulo.id] || []).push(i); });
    q.forEach((i) => { i.e.modulo.fila = [i]; i.e.modulo.item = i; desenhar(i.e.modulo); });
    Object.values(grupos).forEach((lst) => {
      lst.sort(ordemRota);
      const m = lst[0].e.modulo;
      m.fila = lst;
      m.item = lst[0];
      desenhar(m);
    });
    const blocos = Object.keys(grupos).filter((k) => k.startsWith('AG')).length, zonas = Object.keys(grupos).filter((k) => k.startsWith('BG')).length;
    log('MQTT', `ptl/est${S.est}/cmd SEPARAR caixa=${atual.id} itens=${its.length} (Q:${q.length} · andares 4-5:${blocos} · zonas:${zonas})`);
    log('EVT', `ptl/est${S.est}/evt ACK ${q.length + blocos + zonas} display(s) aceso(s)`);
    const displays = modulos.filter((m) => m.item).map((m) => Object.assign(dispDe(m), { end: rotEnd(m.item.e), qtd: m.item.qtd, fila: m.fila.length, falha: m.falha }));
    emitir('abrir', { caixa: atual.id, origem: ori || 'coletor', total: its.length, displays, sinalBG: its.some((i) => i.e.cat === 'baixo'),
      itens: its.map((i) => ({ end: rotEnd(i.e), qtd: i.qtd, cd: i.e.end })) });
    atualizarDestaques();
    atualizarUI();
  }

  function confirmar(m, quem) {
    if (!m.item || m.falha || (estado !== 'SEPARANDO' && estado !== 'ALERTA')) return;
    const it = m.item;
    it.status = 'ok';
    m.press = 0.18;
    m.fila.shift();
    m.item = m.fila[0] || null;
    K.itens++;
    log('EVT', `ptl/est${S.est}/evt BTN ${rotEnd(it.e)} qtd=${it.qtd}${quem === 'operador' ? '' : ' (clique)'}`);
    if (m.tipo === 'EQ' && !m.item) { m.flash = 0.7; log('EVT', `ptl/est${S.est}/evt ZONA_FIM ${m.nome || m.id}`); }
    if (m.tipo === 'Q') m.flash = 0.5;
    desenhar(m);
    const concluiu = pendentes() === 0;
    if (concluiu) {
      estado = 'PRONTA';
      log('EVT', `ptl/est${S.est}/evt CONCLUIDA caixa=${atual.id} · aguardando leitura de fechamento`);
    }
    emitir('botao', Object.assign(dispDe(m), { caixa: atual.id, end: rotEnd(it.e), qtd: it.qtd, cd: it.e.end,
      proximo: m.item ? { end: rotEnd(m.item.e), qtd: m.item.qtd } : null, zonaFim: m.tipo === 'EQ' && !m.item,
      concluida: concluiu, ok: atual.itens.length - pendentes(), total: atual.itens.length }));
    atualizarDestaques();
    atualizarUI();
  }

  function fecharCaixa(comPendencia, ori) {
    const p = pendentes();
    const dur = simT - atual.t0;
    emitir('fechar', { caixa: atual.id, origem: ori || 'coletor', pendentes: comPendencia ? p : 0, tempo: fmtT(dur),
      apagar: modulos.filter((m) => m.item && !m.falha).map((m) => dispDe(m)) });
    modulos.forEach((m) => { if (m.fila.length) { m.fila = []; m.item = null; desenhar(m); } });
    if (comPendencia && p) {
      K.pendencias += p;
      log('MQTT', `ptl/est${S.est}/cmd CANCELAR restantes (${p})`);
      log('SYB', `UPDATE ptl_caixa_item status='PENDENTE' (${p}) → vai para a conferência`, 'ERRO');
    }
    log('SYB', `UPDATE ptl_caixa_sessao status='FECHADA' tempo=${fmtT(dur)}`);
    log('BHT', `Bacia ${atual.id} empurrada de volta à esteira de transporte → segue para a próxima estação do pedido`);
    K.caixas++;
    K.tempoTotal += dur;
    atual.duracao = dur;
    atual.pend = p;
    estado = 'FECHADA';
    fechadaAte = simT + 1.6;
    const saindo = atual;
    saindo.papel = 'saindo';
    mover(saindo, rotaSaida(saindo), CFG.velEmpurre, () => { scene.remove(saindo.g); caixasCena.splice(caixasCena.indexOf(saindo), 1); });
    atualizarDestaques();
    atualizarUI();
    esperar(0.8).then(() => {
      atual = fila;
      atual.papel = 'atual';
      const resto = atual.rota.map((v) => [v.x, v.y, v.z]);
      if (resto.length) resto[resto.length - 1][0] = CFG.xPega; else resto.push([CFG.xPega, yS, CFG.zSep]);
      const alvo = atual;
      mover(alvo, resto, CFG.velEsteira, () => caixaChegou(alvo));
      logTransferencia(alvo);
      fila = novaCaixa(faixaX[0] - 1);
      mover(fila, rotaEntrada(xFila()), CFG.velEsteira);
      estado = 'AGUARDANDO';
      atualizarUI();
    });
  }

  function cancelarCaixa() {
    if (!atual || !['SEPARANDO', 'ALERTA', 'PRONTA'].includes(estado)) return;
    log('API', `POST /v1/estacoes/${S.est}/cancelar {caixa:"${atual.id}"}`);
    log('MQTT', `ptl/est${S.est}/cmd CANCELAR caixa=${atual.id}`);
    emitir('cancelar', { caixa: atual.id, apagar: modulos.filter((m) => m.item && !m.falha).map((m) => dispDe(m)) });
    modulos.forEach((m) => { m.fila = []; m.item = null; desenhar(m); });
    atual.itens.forEach((i) => { i.status = 'pendente'; });
    estado = 'NA_POSICAO';
    atualizarDestaques();
    atualizarUI();
  }

  // ======================================================================= DIAGNÓSTICO E CADASTRO DE LED
  // O que dá para detectar sem hardware extra: módulo sem resposta no RS-485, display do módulo Q sem ACK no nó
  // (TM1637 desconectado) e botão travado. Segmento queimado aparece no teste visual 8888 do início do turno.
  const hex2 = (n) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');
  let noSerial = {};
  const endsDoModulo = (m) => enderecos.filter((e) => e.modulo === m);
  function infoModulo(m) {
    const d = dispDe(m), ends = endsDoModulo(m), Q = m.tipo === 'Q';
    return {
      chave: Q ? 'Q:' + m.end.end : 'EQ:' + m.id,
      tipo: Q ? 'Q' : 'E+Q', barramento: m.lado === 'alto' ? 1 : 2, rs485: hex2(d.addr), porta: Q ? d.pos + 1 : null,
      serial: Q ? noSerial[m.end.predio] : m.serial,
      modulo: Q ? `nó ${hex2(d.addr)} · porta ${d.pos + 1}` : `E+Q ${hex2(d.addr)}`,
      local: Q ? `Alto giro · prédio ${pad(m.end.predio, 3)} · andar ${m.end.andar}` : (m.nome || m.id),
      status: m.falha ? 'falha' : m.cad ? 'cadastro' : 'ok', falha: m.falha ? m.falhaMsg : null,
      enderecos: ends.map((e) => fmtEnd(e.end)), cds: ends.map((e) => e.end),
    };
  }
  const registro = () => modulos.map(infoModulo);
  const moduloPorEnd = (cd) => { const e = enderecos.find((x) => x.end === cd || fmtEnd(x.end) === cd); return e ? e.modulo : modulos.find((m) => m.id === cd); };
  const TIPOS_FALHA = {
    display: (m) => `display não responde (sem ACK na porta ${dispDe(m).pos + 1} do nó ${hex2(dispDe(m).addr)})`,
    resposta: (m) => `sem resposta no barramento ${m.lado === 'alto' ? 1 : 2} (RS-485 ${hex2(dispDe(m).addr)}, 3 tentativas)`,
    botao: () => 'botão travado (pressionado há mais de 10 s)',
  };
  // marca visual no 3D: moldura pulsando + etiqueta flutuante
  function marcarModulo(m) {
    if (!m.halo) {
      m.halo = new THREE.Mesh(new THREE.BoxGeometry(m.W + 0.06, m.H + 0.06, 0.07), new THREE.MeshBasicMaterial({ color: '#ff2d2d', transparent: true, opacity: 0.35, depthWrite: false }));
      m.g.add(m.halo);
    }
    if (m.aviso) { m.g.remove(m.aviso); m.aviso.material.map.dispose(); m.aviso.material.dispose(); m.aviso = null; }
    m.halo.visible = m.falha || m.cad;
    m.halo.material.color.set(m.cad ? '#F2A33A' : '#ff2d2d');
    if (!m.falha && !m.cad) return;
    const inf = infoModulo(m);
    const end = inf.enderecos.length > 1 ? `${inf.enderecos[0]} +${inf.enderecos.length - 1}` : inf.enderecos[0] || '';
    m.aviso = sprite(m.cad ? ['CADASTRO · aperte o botão', `${end} · ${inf.modulo}`] : ['FALHA · ' + end, inf.modulo], 0.62,
      { fundo: m.cad ? 'rgba(214,137,16,0.95)' : 'rgba(192,57,43,0.95)' });
    m.aviso.position.set(0, m.H / 2 + 0.11, 0.05);
    m.g.add(m.aviso);
  }
  function simularFalha(tipo) {
    const livres = modulos.filter((m) => !m.falha && !m.cad);
    const cand = livres.filter((m) => m.item);
    const lista = cand.length ? cand : livres;
    const m = lista[Math.floor(Math.random() * lista.length)];
    if (!m) return;
    const valido = (t) => t === 'botao' || (t === 'display' && m.tipo === 'Q') || (t === 'resposta' && m.tipo !== 'Q');
    const t = valido(tipo) ? tipo : m.tipo === 'Q' ? (Math.random() < 0.7 ? 'display' : 'botao') : (Math.random() < 0.7 ? 'resposta' : 'botao');
    m.falha = true;
    m.falhaT = simT;
    m.falhaTipo = t;
    m.falhaMsg = TIPOS_FALHA[t](m);
    K.falhas++;
    desenhar(m);
    marcarModulo(m);
    const inf = infoModulo(m);
    log('EVT', `ptl/est${S.est}/evt FALHA_MODULO ${inf.modulo} · ${inf.enderecos.length > 1 ? inf.enderecos.length + ' endereços (' + inf.local + ')' : inf.enderecos[0]} · ${m.falhaMsg}`, 'ERRO');
    log('SYB', `INSERT ptl_evento_falha (estacao, cd_endereco, modulo, tipo) → painel de controle avisado`);
    emitir('falha', Object.assign(dispDe(m), { item: m.item ? { end: rotEnd(m.item.e), qtd: m.item.qtd } : null, diag: inf, tipoFalha: t, mensagem: m.falhaMsg }));
    emitir('registro', { lista: registro() });
    atualizarDestaques();
    atualizarUI();
  }
  // cadastro por tela + botão: o técnico escolhe o endereço, o módulo novo pisca "CAd" e ele aperta o botão para confirmar
  let emCadastro = null;
  function iniciarCadastro(m, origem) {
    if (!m) return;
    if (emCadastro && emCadastro !== m) cancelarCadastro();
    const eraFalha = m.falha;
    m.falha = false;
    m.cad = true;
    m.cadT = 0;
    m.cadPisca = true;
    emCadastro = m;
    const inf = infoModulo(m);
    log('API', `POST /v1/estacoes/${S.est}/cadastro {endereco:"${inf.enderecos[0]}"}${origem ? ' · ' + origem : ''}`);
    if (m.tipo === 'Q') log('MQTT', `ptl/est${S.est}/cmd CONFIG CADASTRO no=${inf.rs485} porta=${inf.porta} → o nó acha o display novo e mostra "CAd"`);
    else log('MQTT', `ptl/est${S.est}/cmd CONFIG CADASTRO barramento=${inf.barramento} → módulo novo responde no endereço de fábrica 0xF0 e mostra "-CAd-"`);
    log('API', `Aguardando o técnico apertar o botão do módulo novo (${inf.local})`);
    desenhar(m);
    marcarModulo(m);
    emitir('cadastro_modo', Object.assign(dispDe(m), { diag: inf, eraFalha }));
    emitir('registro', { lista: registro() });
    atualizarUI();
  }
  function confirmarCadastro(m) {
    if (!m || !m.cad) return;
    m.cad = false;
    emCadastro = null;
    m.press = 0.18;
    const antigo = m.tipo === 'Q' ? null : m.serial;
    if (m.tipo !== 'Q') m.serial = serialNovo();
    const inf = infoModulo(m);
    if (m.tipo === 'Q') log('EVT', `ptl/est${S.est}/evt CADASTRO_OK ${inf.modulo} → ${inf.enderecos[0]} (botão do módulo novo)`);
    else log('EVT', `ptl/est${S.est}/evt CADASTRO_OK serial ${m.serial} (antes ${antigo}) · DEF_ENDERECO 0xF0 → ${inf.rs485} · ${inf.enderecos.length} endereço(s)`);
    log('SYB', `UPDATE ptl_mapa_led SET serial, dt_cadastro, usuario WHERE estacao='${S.est}' AND cd_endereco IN (${inf.cds.length} endereço(s))`);
    desenhar(m);
    marcarModulo(m);
    emitir('cadastro_ok', Object.assign(dispDe(m), { diag: inf, serialAntigo: antigo, item: m.item ? { end: rotEnd(m.item.e), qtd: m.item.qtd } : null }));
    emitir('registro', { lista: registro() });
    atualizarDestaques();
    atualizarUI();
  }
  function cancelarCadastro() {
    const m = emCadastro;
    if (!m) return;
    m.cad = false;
    emCadastro = null;
    log('API', `DELETE /v1/estacoes/${S.est}/cadastro → cadastro cancelado`);
    desenhar(m);
    marcarModulo(m);
    emitir('cadastro_cancelado', { diag: infoModulo(m) });
    emitir('registro', { lista: registro() });
    atualizarUI();
  }
  function identificar(m) {
    if (!m || m.falha) return;
    m.ident = 3;
    desenhar(m);
    const inf = infoModulo(m);
    log('MQTT', `ptl/est${S.est}/cmd CONFIG IDENTIFICAR ${inf.modulo} → display mostra 888 por 3 s`);
    emitir('identificar', Object.assign(dispDe(m), { diag: inf }));
  }
  const vLoc = new THREE.Vector3(), vDir = new THREE.Vector3();
  function localizar(m) {
    if (!m) return;
    if (S.cam === 'operador') { S.cam = 'geral'; controls.enabled = true; }
    if (CAMS[S.cam] && CAMS[S.cam].ocultar) { S.cam = 'geral'; aplicarVisibilidade(); }
    m.g.getWorldPosition(vLoc);
    m.g.getWorldDirection(vDir);
    // módulos dos andares 4-5 ficam por baixo da esteira de separação: a câmera desce para olhar por baixo dela
    const baixoEsteira = m.lado === 'alto' && vLoc.y < CFG.altSep;
    const pos = vLoc.clone().add(vDir.clone().multiplyScalar(baixoEsteira ? 1.45 : 1.15)).add(new THREE.Vector3(0, baixoEsteira ? -0.12 : 0.25, 0));
    camAnim = { de: { p: camera.position.clone(), t: controls.target.clone() }, para: { p: pos, t: vLoc.clone() }, k: 0 };
  }
  // operador automático: troca o módulo e faz o cadastro sozinho
  function trocarModulo(m) {
    if (!m.falha) return;
    iniciarCadastro(m, 'troca pelo técnico');
    esperar(1.5).then(() => confirmarCadastro(m));
  }

  // ======================================================================= DESTAQUES (caixa do endereço na demo)
  let acesos = [];
  function atualizarDestaques() {
    atualizarSinal();
    enderecos.forEach((e) => { if (e.toteMat) e.toteMat.emissive.set('#000000'); });

    acesos = [];
    modulos.forEach((m) => {
      if (!m.item) return;
      acesos.push(m.item.e);

    });
  }

  // ======================================================================= TEMPO SIMULADO E OPERADOR AUTOMÁTICO
  const esperas = [];
  function esperar(s) { return new Promise((r) => esperas.push({ t: simT + s, r })); }
  function andarAte(x, z) {
    return new Promise((r) => {
      if (oper.resolve) oper.resolve();
      oper.caminho = rota(oper, { x, z });
      oper.resolve = r;
    });
  }
  const posCaixa = () => ({ x: CFG.xPega + 0.35, z: CFG.zOperAlto });

  function proximoAlvo() {
    let melhor = null, dMin = 1e9;
    modulos.forEach((m) => {
      if (!m.item || m.falha) return;
      const d = distRota(oper, m.item.e.pega);
      if (d < dMin) { dMin = d; melhor = m.item; }
    });
    return melhor;
  }

  async function cicloAuto(token) {
    const ativo = () => S.auto && token === autoToken;
    let carregando = 0;
    while (ativo()) {
      if (estado === 'NA_POSICAO') {
        const pc = posCaixa();
        await andarAte(pc.x, pc.z);
        if (!ativo()) break;
        oper.rot = Math.PI;
        if (S.modo === 'B2') { await esperar(0.4); continue; }
        oper.anim = 'leitura'; oper.animT = 0.7;
        await esperar(0.7);
        if (ativo() && estado === 'NA_POSICAO') leitura();
        continue;
      }
      if (estado === 'SEPARANDO' || estado === 'ALERTA') {
        const alvo = proximoAlvo();
        if (!alvo) {
          if (carregando) { const pc = posCaixa(); await andarAte(pc.x, pc.z); await esperar(CFG.tempoDeposito); carregando = 0; continue; }
          const falho = modulos.find((m) => m.falha && m.item);
          if (falho && simT - falho.falhaT > 6) trocarModulo(falho);
          await esperar(0.4);
          continue;
        }
        const p = alvo.e.pega;
        if (carregando >= 3 || (carregando > 0 && distRota(oper, p) > 4)) {
          const pc = posCaixa();
          await andarAte(pc.x, pc.z);
          oper.rot = Math.PI; oper.anim = 'pega'; oper.animT = CFG.tempoDeposito;
          await esperar(CFG.tempoDeposito);
          carregando = 0;
          continue;
        }
        oper.olhar = alvo.e;
        await andarAte(p.x, p.z);
        if (!ativo()) break;
        oper.rot = p.rot;
        const tp = CFG.tempoPega + alvo.qtd * CFG.tempoPorUnidade;
        oper.anim = 'pega'; oper.animT = tp;
        await esperar(tp);
        if (!ativo()) break;
        if (alvo.e.modulo.item === alvo && !alvo.e.modulo.falha) { confirmar(alvo.e.modulo, 'operador'); carregando++; }
        oper.olhar = null;
        continue;
      }
      if (estado === 'PRONTA') {
        const pc = posCaixa();
        await andarAte(pc.x, pc.z);
        if (!ativo()) break;
        oper.rot = Math.PI;
        if (carregando) { oper.anim = 'pega'; oper.animT = CFG.tempoDeposito; await esperar(CFG.tempoDeposito); carregando = 0; }
        oper.anim = 'leitura'; oper.animT = 0.6;
        await esperar(0.6);
        if (ativo() && estado === 'PRONTA') {
          leitura();
          oper.anim = 'pega'; oper.animT = 1.0;           // empurra a bacia de volta à esteira de transporte
          await esperar(1.0);
        }
        continue;
      }
      await esperar(0.3);
    }
  }
  function ligarAuto(v) {
    S.auto = v;
    autoToken++;
    if (v) cicloAuto(autoToken);
  }

  // ======================================================================= INTERFACE
  const LOGMAX = 220;
  function log(tag, msg, classe) {
    const el = $('#log');
    const d = document.createElement('div');
    const rot = { API: 'API', MQTT: 'MQTT', EVT: 'MQTT', SYB: 'SYBASE', BHT: 'BHT', RFID: 'RFID' }[tag] || tag;
    d.innerHTML = `<span class="t">${relogio()}</span> <span class="tag ${classe || tag}">${rot}</span> ${msg.replace(/</g, '&lt;')}`;
    el.prepend(d);
    while (el.children.length > LOGMAX) el.lastChild.remove();
  }

  function contagem() {
    const ativos = modulos.filter((m) => m.item);
    return {
      alto: ativos.filter((m) => m.lado === 'alto').reduce((s, m) => s + m.fila.length, 0),
      baixo: ativos.filter((m) => m.lado === 'baixo').reduce((s, m) => s + m.fila.length, 0),
      zonas: ativos.filter((m) => m.lado === 'baixo').map((m) => m.nome.replace('Zona ', '')).join(', '),
    };
  }
  function telaColetor() {
    const est = S.est, n = atual ? atual.itens.length : 0, ok = n - pendentes();
    const ct = contagem();
    if (estado === 'FECHADA' || simT < fechadaAte) {
      const c = caixasCena.find((x) => x.papel === 'saindo');
      return { cor: '#16A085', tit: 'Bacia fechada', corpo: `<div class="grande">✓</div><div class="media">${c ? c.id : ''}</div><div class="p">Tempo na estação ${c ? fmtT(c.duracao) : ''}${c && c.pend ? ` · ${c.pend} pendência(s) p/ conferência` : ''}</div>`, rod: 'Empurre a bacia de volta à esteira' };
    }
    if (estado === 'AGUARDANDO') return { cor: '#2F5597', tit: `PTL · Estação ${est}`, corpo: '<div class="media">Aguardando bacia</div><div class="p">A próxima bacia está vindo pela esteira de separação</div>', rod: 'Leitura abre a bacia' };
    if (estado === 'NA_POSICAO') return { cor: '#2F5597', tit: `PTL · Estação ${est}`, corpo: `<div class="media">Bacia na posição</div><div class="p">${S.modo === 'A' ? 'Aponte para a etiqueta e aperte o gatilho' : S.modo === 'B1' ? 'Aproxime a pulseira da tag da bacia' : 'Leitor fixo lendo a tag…'}</div>`, rod: 'Leitura abre a bacia' };
    if (estado === 'SEPARANDO') return { cor: '#2E8B57', tit: `Bacia ${atual.id}`, corpo: `<div class="p">Separando</div><div class="grande">${ok} / ${n}</div><div class="progresso"><i style="width:${(100 * ok) / n}%"></i></div><div class="lista"><div><span>Alto giro</span><b>${ct.alto}</b></div><div><span>Baixo giro</span><b>${ct.baixo}</b></div><div><span>Zonas ativas</span><b>${ct.zonas || '—'}</b></div></div>`, rod: 'Nova leitura fecha a bacia' };
    if (estado === 'PRONTA') return { cor: '#2E8B57', tit: 'Estação concluída', corpo: `<div class="grande">${n} / ${n}</div><div class="media">Todos os LEDs apagados</div><div class="p">Leia a etiqueta de novo para fechar</div>`, rod: 'Gatilho fecha a bacia' };
    if (estado === 'ALERTA') return { cor: '#C0392B', tit: 'Atenção', corpo: `<div class="media" style="color:#C0392B">Bacia com itens pendentes</div><div class="grande">${n - ok}</div><div class="p">itens não confirmados. Continue separando ou leia de novo para fechar mesmo assim.</div>`, rod: 'Pendência vai para a conferência' };
    return { cor: '#2F5597', tit: '', corpo: '', rod: '' };
  }
  function linhasLCD() {
    const n = atual ? atual.itens.length : 0, ok = n - pendentes();
    const id = atual ? atual.id : '';
    if (estado === 'FECHADA' || simT < fechadaAte) { const c = caixasCena.find((x) => x.papel === 'saindo'); return ['BACIA FECHADA', c ? c.id : '', 'TEMPO ' + (c ? fmtT(c.duracao) : ''), 'EMPURRE P/ ESTEIRA']; }
    if (estado === 'AGUARDANDO') return [`PTL EST ${S.est}   B2 RFID`, 'AGUARDANDO BACIA', '', ''];
    if (estado === 'NA_POSICAO') return ['BACIA NA POSICAO', 'LENDO TAG...', '', ''];
    if (estado === 'SEPARANDO') { const ct = contagem(); return [`${id}  ${pad(ok, 2)}/${pad(n, 2)}`, `ZONAS: ${ct.zonas.replace(/, /g, ' ') || '-'}`, `ALTO ${ct.alto}  BAIXO ${ct.baixo}`, 'FECHAR=NOVA LEITURA']; }
    if (estado === 'PRONTA') return [`${id}  ${n}/${n}`, 'TODOS CONFIRMADOS', 'APERTE FECHAR', ''];
    if (estado === 'ALERTA') return [`ATENCAO: ${n - ok} PENDENTE`, 'FECHAR DE NOVO P/', 'CONFIRMAR PENDENCIA', ''];
    return ['', '', '', ''];
  }
  function desenharLCD() {
    if (!b2) return;
    const { ctx, c, t } = b2.tc;
    const gr = ctx.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, '#2456e0'); gr.addColorStop(1, '#1a46c4');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#EAF2FF';
    ctx.font = '600 30px monospace';
    ctx.textBaseline = 'top';
    linhasLCD().forEach((l, i) => ctx.fillText(l.slice(0, 20), 14, 8 + i * 37));
    t.needsUpdate = true;
  }

  function renderDispositivo() {
    const el = $('#dispositivo');
    if (S.modo === 'A') {
      const t = telaColetor();
      el.innerHTML = `<div class="celular"><div class="marcaCel">COLETOR · APP PTL (A1)</div><div class="tela"><div class="barra" style="background:${t.cor}">${t.tit}</div><div class="corpo">${t.corpo}</div><div class="rodape">${t.rod}</div></div></div>`;
      $('#btnLeitura').textContent = 'Gatilho (ler etiqueta)';
    } else if (S.modo === 'B2') {
      el.innerHTML = `<div class="lcd"><div class="vidro">${linhasLCD().map((l) => l.slice(0, 20).padEnd(20, ' ')).join('\n')}</div><div class="rot">Painel da estação · LCD 20×4 + botão FECHAR · leitor NFC sob a bacia</div></div>`;
      $('#btnLeitura').textContent = 'FECHAR (nova leitura)';
    } else {
      const t = telaColetor();
      const n = atual ? atual.itens.length : 0, ok = n - pendentes();
      const txt = estado === 'SEPARANDO' ? `<span>${atual.id}</span><b>${ok}/${n}</b><span>itens</span>` : estado === 'PRONTA' ? '<b>OK</b><span>aproxime para fechar</span>' : estado === 'ALERTA' ? `<b style="color:#ff6b5e">${n - ok}</b><span>pendentes</span>` : `<span>${t.tit}</span>`;
      el.innerHTML = `<div class="relogioPulso"><div class="oled">${txt}</div></div>`;
      $('#btnLeitura').textContent = 'Aproximar pulseira da tag';
    }
    desenharLCD();
  }

  function atualizarInfra() {
    const info = DADOS[S.est].info;
    const nQ = modulos.filter((m) => m.tipo === 'Q').length, nEQ = modulos.filter((m) => m.tipo === 'EQ').length;
    const falhas = modulos.filter((m) => m.falha).length;
    $('#infra').innerHTML = `<b>Estação ${S.est}</b> · ${info.segmento} · ${info.total} endereços<br>` +
      `Concentrador (atrás da estação) <span class="${falhas ? '' : 'ok'}">${falhas ? '⚠ ' + falhas + ' módulo(s) com falha' : '● online'}</span> · 12 V · 2 barramentos<br>` +
      `${nQ} módulos Q · ${nEQ} módulos E+Q · ${info.nos_coluna} nós de coluna`;
  }

  function atualizarUI() {
    const ch = $('#chipEstado');
    const nome = { AGUARDANDO: 'AGUARDANDO', NA_POSICAO: 'BACIA NA POSIÇÃO', SEPARANDO: 'SEPARANDO', PRONTA: 'PRONTA P/ FECHAR', ALERTA: 'PENDÊNCIA', FECHADA: 'FECHADA' }[estado];
    ch.textContent = nome;
    ch.className = 'chip ' + estado;
    $('#kCaixas').textContent = K.caixas;
    $('#kItens').textContent = K.itens;
    const med = K.caixas ? K.tempoTotal / K.caixas : 0;
    $('#kTempo').textContent = K.caixas ? fmtT(med) : '–';
    $('#kHora').textContent = K.caixas ? Math.round(3600 / med) : '–';
    $('#kAcesos').textContent = modulos.filter((m) => m.item && !m.falha).length;
    $('#kPend').textContent = K.pendencias;
    const al = $('#alertas');
    al.innerHTML = '';
    modulos.filter((m) => m.falha || m.cad).forEach((m) => {
      const inf = infoModulo(m);
      const d = document.createElement('div');
      d.className = 'alerta' + (m.cad ? ' cad' : '');
      const ends = inf.enderecos.length > 1 ? `${inf.enderecos.length} endereços (${inf.local})` : `endereço <b>${inf.enderecos[0]}</b>`;
      d.innerHTML = m.cad
        ? `<div><b>CADASTRO</b> · ${ends} · ${inf.modulo}<br>O módulo novo está piscando <b>CAd</b>: aperte o botão dele para confirmar.</div>`
        : `<div><b>FALHA</b> · ${ends}<br>${inf.modulo} · ${m.falhaMsg}</div>`;
      const linhaB = document.createElement('div');
      linhaB.className = 'acoesAlerta';
      const bt = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; linhaB.appendChild(b); };
      bt('Localizar', () => localizar(m));
      if (m.cad) { bt('Apertar botão do módulo novo', () => confirmarCadastro(m)); bt('Cancelar', cancelarCadastro); }
      else bt('Trocar e cadastrar', () => iniciarCadastro(m, 'painel da estação'));
      d.appendChild(linhaB);
      al.appendChild(d);
    });
    $('#btnCancelar').style.visibility = ['SEPARANDO', 'ALERTA', 'PRONTA'].includes(estado) ? 'visible' : 'hidden';
    atualizarInfra();
    renderDispositivo();
  }

  // ---------------- controles
  function segmentado(sel, fn) {
    document.querySelectorAll(sel + ' button').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll(sel + ' button').forEach((x) => x.classList.toggle('on', x === b));
      fn(b.dataset.v);
    }));
  }
  segmentado('#selEstacao', (v) => {
    S.est = v;
    autoToken++;
    esperas.length = 0;
    construirEstacao();
    zerarKPIs();
    $('#log').innerHTML = '';
    reiniciarCaixas();
    log('API', `PUT /v1/estacoes/${v}/mapa → ${DADOS[v].info.total} endereços carregados de wms_endereco`);
    emitir('estacao', mapaEstacao());
    Object.assign(oper, posCaixa(), { caminho: [], rot: Math.PI });
    if (S.auto) ligarAuto(true);
    aplicarCamera(S.cam, true);
    atualizarUI();
  });
  segmentado('#selModo', (v) => {
    S.modo = v;
    if (b2) b2.g.visible = v === 'B2';
    caixasCena.forEach((c) => { c.g.userData.tag.visible = v !== 'A'; });
    log('API', `Modo de identificação: ${v === 'A' ? 'A · coletor (código de barras)' : v === 'B2' ? 'B2 · RFID leitor fixo' : 'B1 · RFID pulseira'}`);
    emitir('modo', {});
    if (v === 'B2' && estado === 'NA_POSICAO') esperar(0.8).then(() => { if (estado === 'NA_POSICAO' && S.modo === 'B2') leitura('leitor fixo'); });
    atualizarUI();
  });
  segmentado('#selCam', (v) => aplicarCamera(v));
  segmentado('#selVel', (v) => { S.vel = +v; emitir('vel', { vel: S.vel }); });
  $('#btnLeitura').addEventListener('click', () => leitura());
  $('#btnCancelar').addEventListener('click', cancelarCaixa);
  $('#btnFalha').addEventListener('click', simularFalha);
  $('#btnZerar').addEventListener('click', () => { zerarKPIs(); atualizarUI(); });
  $('#btnLimparLog').addEventListener('click', () => { $('#log').innerHTML = ''; });
  $('#optAuto').addEventListener('change', (e) => ligarAuto(e.target.checked));
  $('#optItens').addEventListener('input', (e) => { S.itens = +e.target.value; $('#valItens').textContent = S.itens; });
  $('#optDestaque').addEventListener('change', (e) => { S.destaque = e.target.checked; atualizarDestaques(); });
  $('#optCabos').addEventListener('change', (e) => { S.cabos = e.target.checked; aplicarVisibilidade(); });
  $('#btnAjuda').addEventListener('click', () => $('#ajuda').classList.remove('oculto'));
  $('#btnFecharAjuda').addEventListener('click', () => $('#ajuda').classList.add('oculto'));
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT') return;
    e.preventDefault();
    if (tag === 'BUTTON') document.activeElement.blur();
    leitura();
  });
  function zerarKPIs() { Object.keys(K).forEach((k) => { K[k] = 0; }); }

  // ---------------- clique nos módulos
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downXY = null;
  function alvoMouse(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const vis = clicaveis.filter((o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
    const hit = ray.intersectObjects(vis, false)[0];
    return hit ? hit.object : null;
  }
  renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 6) return;
    const o = alvoMouse(e);
    if (!o) return;
    if (o.userData.acao) o.userData.acao();
    else if (o.userData.mod) {
      const m = o.userData.mod;
      if (m.cad) { confirmarCadastro(m); return; }
      if (m.falha) { log('EVT', `Botão do módulo ${m.nome || m.id} sem resposta (falha)`, 'ERRO'); return; }
      if (!m.item) { m.press = 0.12; return; }
      confirmar(m, 'clique');
    }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const o = alvoMouse(e);
    renderer.domElement.style.cursor = o && (o.userData.acao || (o.userData.mod && (o.userData.mod.item || o.userData.mod.cad))) ? 'pointer' : 'default';
  });

  // ---------------- câmera
  const CAMS = {
    geral: { p: [1.15, 3.3, 4.9], t: [-0.1, 1.0, -0.75] },
    planta: { planta: true },
    alto: { p: [0.3, 1.75, 3.6], t: [0, 1.15, -0.7], ocultar: 'baixo' },
    concentrador: { p: [2.4, 2.2, -4.7], t: [0.5, 1.45, -2.2] },
    baixo: { p: [0, 2.2, 0.75], t: [0, 1.1, 9.0] },
    operador: { seguir: true },
    visao: { seguir: true, olhos: true },
  };
  let camAnim = null;
  function aplicarVisibilidade() {
    const c = CAMS[S.cam] || {};
    if (grpAlto) grpAlto.visible = c.ocultar !== 'alto';
    if (grpBaixo) grpBaixo.visible = c.ocultar !== 'baixo';
    if (grpCabos) { grpCabos.userData.cabosA.visible = S.cabos; grpCabos.userData.cabosB.visible = S.cabos; }
  }
  function aplicarCamera(v, imediato) {
    S.cam = v;
    const c = CAMS[v];
    aplicarVisibilidade();
    controls.enabled = !c.seguir;
    if (c.seguir) { camAnim = null; return; }
    let to;
    if (c.planta) {
      const xm = (faixaX[0] + faixaX[1]) / 2, zm = 0.6, alt = Math.max(10, (faixaX[1] - faixaX[0]) * 0.72);
      to = { p: new THREE.Vector3(xm, alt, zm + 0.05), t: new THREE.Vector3(xm, 0, zm) };
    } else to = { p: new THREE.Vector3(...c.p), t: new THREE.Vector3(...c.t) };
    if (imediato) { camera.position.copy(to.p); controls.target.copy(to.t); camAnim = null; return; }
    camAnim = { de: { p: camera.position.clone(), t: controls.target.clone() }, para: to, k: 0 };
  }

  // ======================================================================= LOOP
  const relogioEl = $('#relogio');
  let tAnt = performance.now(), uiT = 0;
  const vF = new THREE.Vector3(), vT = new THREE.Vector3();
  function loop(now) {
    requestAnimationFrame(loop);
    const dtReal = Math.min(0.1, (now - tAnt) / 1000);
    tAnt = now;
    const dt = dtReal * S.vel;
    simT += dt;

    for (let i = esperas.length - 1; i >= 0; i--) if (esperas[i].t <= simT) { const e = esperas.splice(i, 1)[0]; e.r(); }

    // bacias
    caixasCena.slice().forEach((c) => {
      let passo = c.vel * dt;
      while (c.rota.length && passo > 0) {
        const alvo = c.rota[0], pos = c.g.position;
        const d = pos.distanceTo(alvo);
        if (d <= passo) { pos.copy(alvo); c.rota.shift(); passo -= d; } else { pos.add(alvo.clone().sub(pos).multiplyScalar(passo / d)); passo = 0; }
      }
      if (!c.rota.length && c.aoChegar) { const f = c.aoChegar; c.aoChegar = null; f(); }
    });

    // operador
    if (oper.caminho.length) {
      let passo = CFG.velOperador * dt;
      while (oper.caminho.length && passo > 0) {
        const q = oper.caminho[0], dx = q.x - oper.x, dz = q.z - oper.z, d = Math.hypot(dx, dz);
        if (d > 1e-4) avatar.rotation.y = Math.atan2(dx, dz);
        if (d <= passo) { oper.x = q.x; oper.z = q.z; oper.caminho.shift(); passo -= d; } else { oper.x += (dx / d) * passo; oper.z += (dz / d) * passo; passo = 0; }
      }
      oper.passo += dt * 7.5;
      if (!oper.caminho.length) { const r = oper.resolve; oper.resolve = null; if (r) r(); }
    } else {
      const diff = ((oper.rot - avatar.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      avatar.rotation.y += diff * Math.min(1, dt * 8);
    }
    const andando = oper.caminho.length > 0;
    avatar.position.set(oper.x, 0, oper.z);
    const sw = andando ? Math.sin(oper.passo) * 0.5 : 0;
    avatar.userData.pernas[0].rotation.x = sw;
    avatar.userData.pernas[1].rotation.x = -sw;
    oper.animT = Math.max(0, oper.animT - dt);
    const [be, bd] = avatar.userData.bracos;
    const alvoBraco = oper.animT > 0 ? (oper.anim === 'leitura' ? -1.25 : -1.9 + Math.sin(simT * 6) * 0.15) : -sw * 0.6;
    bd.rotation.x += (alvoBraco - bd.rotation.x) * Math.min(1, dt * 10);
    be.rotation.x += ((oper.animT > 0 && oper.anim === 'pega' ? -1.7 : sw * 0.6) - be.rotation.x) * Math.min(1, dt * 10);
    avatar.userData.coletor.visible = S.modo === 'A';
    avatar.userData.pulseira.visible = S.modo === 'B1';

    // módulos, destaques e LEDs
    const pulso = 0.55 + 0.45 * Math.sin(now / 160);
    modulos.forEach((m) => {
      if (m.flash > 0) { m.flash -= dt; if (m.flash <= 0) desenhar(m); }
      if (m.press > 0) { m.press -= dtReal; m.btn.position.z = 0.016; } else m.btn.position.z = 0.024;
      if (m.falha) m.btnMat.emissive.setRGB(pulso > 0.5 ? 0.9 : 0.15, 0.05, 0.03);
      if (m.cad) { m.cadT += dtReal; const pisca = Math.floor(m.cadT / 0.35) % 2 === 0; if (pisca !== m.cadPisca) { m.cadPisca = pisca; desenhar(m); } }
      if (m.ident > 0) { m.ident -= dtReal; if (m.ident <= 0) { m.ident = 0; desenhar(m); } }
      if (m.halo && m.halo.visible) m.halo.material.opacity = 0.18 + 0.32 * pulso;
    });
    acesos.forEach((e) => {
      if (!e.toteMat) return;
      if (S.destaque && !(e.modulo && e.modulo.falha)) e.toteMat.emissive.setRGB(1.0 * pulso, 0.6 * pulso, 0.05);
      else e.toteMat.emissive.setRGB(0, 0, 0);
    });
    if (b2) { b2.leituraT = Math.max(0, b2.leituraT - dt); b2.leitor.material.emissive.set(b2.leituraT > 0 ? '#3b82f6' : '#000000'); }
    if (sinalBG) {
      if (sinalBG.aceso) { sinalBG.luzMat.color.set('#ffb52e'); sinalBG.luzMat.emissive.setRGB(1.0 * pulso, 0.55 * pulso, 0.02); }
      else { sinalBG.luzMat.color.set('#5a3a08'); sinalBG.luzMat.emissive.set('#000000'); }
    }
    const conc = grpEst.userData.concentrador;
    if (conc) {
      conc.userData.leds[1].visible = Math.sin(now / 90) > -0.2;
      conc.userData.leds[2].material.color.set(modulos.some((m) => m.falha) ? (pulso > 0.5 ? '#ff2d2d' : '#3a0000') : '#F2A33A');
    }
    if (simT - ultimoHeartbeat > 120) {
      ultimoHeartbeat = simT;
      log('EVT', `ptl/est${S.est}/evt HEARTBEAT concentrador ok · 2 barramentos · ${modulos.filter((m) => m.falha).length} falha(s)`);
      emitir('heartbeat', { falhas: modulos.filter((m) => m.falha).length });
    }

    // câmera
    if (camAnim) {
      camAnim.k = Math.min(1, camAnim.k + dtReal * 1.6);
      const k = camAnim.k < 0.5 ? 2 * camAnim.k * camAnim.k : 1 - Math.pow(-2 * camAnim.k + 2, 2) / 2;
      camera.position.lerpVectors(camAnim.de.p, camAnim.para.p, k);
      controls.target.lerpVectors(camAnim.de.t, camAnim.para.t, k);
      if (camAnim.k >= 1) camAnim = null;
    }
    avatar.visible = !CAMS[S.cam].olhos;
    if (CAMS[S.cam].olhos) {
      // visão do operador: câmera na altura dos olhos, olhando para onde ele está virado (ou para o item que vai pegar)
      const ang = avatar.rotation.y;
      vF.set(oper.x - Math.sin(ang) * 0.3, 1.66, oper.z - Math.cos(ang) * 0.3);   // um pouco atrás dos olhos, para dar contexto
      const alvoE = oper.olhar;
      if (alvoE && alvoE.tote && !oper.caminho.length) { alvoE.tote.getWorldPosition(vT); vT.y = Math.max(vT.y, 0.7); }
      else vT.set(oper.x + Math.sin(ang) * 2.5, 1.2, oper.z + Math.cos(ang) * 2.5);
      if (camera.fov !== 72) { camera.fov = 72; camera.updateProjectionMatrix(); }
      camera.position.lerp(vF, Math.min(1, dtReal * 6));
      controls.target.lerp(vT, Math.min(1, dtReal * 4));
      camera.lookAt(controls.target);
    } else if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
    if (CAMS[S.cam].olhos) { /* já tratado */ } else if (CAMS[S.cam].seguir) {
      const ang = avatar.rotation.y;
      vF.set(oper.x - Math.sin(ang) * 1.5, 1.95, oper.z - Math.cos(ang) * 1.5);
      vT.set(oper.x + Math.sin(ang) * 1.6, 1.25, oper.z + Math.cos(ang) * 1.6);
      camera.position.lerp(vF, Math.min(1, dtReal * 3));
      controls.target.lerp(vT, Math.min(1, dtReal * 3));
      camera.lookAt(controls.target);
    } else controls.update();

    uiT += dtReal;
    if (uiT > 0.25) {
      uiT = 0;
      relogioEl.textContent = relogio();
      renderDispositivo();
      $('#kAcesos').textContent = modulos.filter((m) => m.item && !m.falha).length;
    }
    renderer.render(scene, camera);
  }

  function ajustarTopo() {
    const h = $('#topo').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--topoH', h + 'px');
  }
  ajustarTopo();
  window.addEventListener('resize', () => {
    ajustarTopo();
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ======================================================================= INÍCIO
  const params = new URLSearchParams(location.search);
  if (params.get('itens')) { S.itens = Math.max(1, Math.min(30, +params.get('itens') || 8)); $('#optItens').value = S.itens; $('#valItens').textContent = S.itens; }
  construirEstacao();
  reiniciarCaixas();
  log('API', `PUT /v1/estacoes/${S.est}/mapa → ${DADOS[S.est].info.total} endereços carregados de wms_endereco`);
  log('EVT', `ptl/est${S.est}/status ONLINE (retained) · concentrador 12 V`);
  aplicarCamera('geral', true);
  atualizarUI();
  if (params.has('auto')) { $('#optAuto').checked = true; ligarAuto(true); }
  if (params.has('semajuda') || window.parent !== window) $('#ajuda').classList.add('oculto');
  if (params.get('cam')) { const b = document.querySelector(`#selCam button[data-v="${params.get('cam')}"]`); if (b) b.click(); }
  if (params.get('vel')) { const b = document.querySelector(`#selVel button[data-v="${params.get('vel')}"]`); if (b) b.click(); }
  requestAnimationFrame(loop);

  function mapaEstacao() {
    const disp = {};
    modulos.forEach((m) => {
      const d = dispDe(m);
      if (d.tipo === 'Q') { const k = 'N' + d.addr; disp[k] = disp[k] || { tipo: 'NO', addr: d.addr, pred: d.addr, andares: [] }; disp[k].andares.push(d.pos); }
      else disp['E' + d.addr] = { tipo: 'EQ', addr: d.addr, id: d.id, nome: m.nome || d.id };
    });
    return { segmento: DADOS[S.est].info.segmento, total: DADOS[S.est].info.total, dispositivos: Object.values(disp), registro: registro() };
  }
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (!d.ptlPai) return;
    if (d.tipo === 'rede') { S.redeOk = !!d.ligado; log('EVT', `Cabo de rede do concentrador ${d.ligado ? 'religado' : 'desligado'}${d.ligado ? '' : ' · displays seguem funcionando, confirmações ficam na fila'}`, d.ligado ? undefined : 'ERRO'); }
    if (d.tipo === 'compacto') document.body.classList.toggle('compacto', !!d.valor);
    if (d.tipo === 'pedirMapa') emitir('estacao', mapaEstacao());
    if (d.tipo === 'gatilho') leitura();
    if (d.tipo === 'falhar') { const antes = new Set(modulos.filter((m) => m.falha)); simularFalha(d.falha); localizar(modulos.find((m) => m.falha && !antes.has(m))); }
    if (d.tipo === 'cad_iniciar') { const m = moduloPorEnd(d.cd); iniciarCadastro(m, 'interface de controle'); localizar(m); }
    if (d.tipo === 'cad_apertar' && emCadastro) confirmarCadastro(emCadastro);
    if (d.tipo === 'cad_cancelar') cancelarCadastro();
    if (d.tipo === 'identificar') identificar(moduloPorEnd(d.cd));
    if (d.tipo === 'localizar') localizar(moduloPorEnd(d.cd));
    if (d.tipo === 'pedirRegistro') emitir('registro', { lista: registro() });
    if (d.tipo === 'pip') document.body.classList.toggle('pip', !!d.valor);
    if (d.tipo === 'apertar') {
      const m = modulos.find((x) => { const k = dispDe(x); return k.addr === d.addr && (k.tipo === 'EQ' || k.pos === d.pos); });
      if (m && m.item && !m.falha) confirmar(m, 'clique');
    }
  });
  if (EMBUTIDO) { document.body.classList.add('embutido'); emitir('estacao', mapaEstacao()); }

  window.PTL = { renderer, scene, camera, controls, enderecos: () => enderecos, S, K, CFG, estado: () => estado, leitura, confirmar, modulos: () => modulos, simularFalha, aplicarCamera,
    iniciarCadastro, confirmarCadastro, cancelarCadastro, identificar, localizar, registro, moduloPorEnd, fmtEnd };
})();
