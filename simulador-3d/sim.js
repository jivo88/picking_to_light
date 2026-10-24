/* Simulador 3D — estação de flow rack com pick-to-light
 * Layout conforme a operação (desenho e fotos):
 *   esteira de transporte e esteira de separação lado a lado (≈ 20 cm entre elas);
 *   transferência a cada 4 estações com rolete direcionador (2 estações à esquerda, 2 à direita);
 *   operador entre a esteira de separação e o alto giro, que fica atrás dele;
 *   passagem no meio do alto giro para o corredor do baixo giro.
 *   Prateleiras alinhadas, andar 0 em cima; a caixa do endereço varia pelo tipo (A, B, C, F, N).
 * Regras de funcionamento iguais às do documento técnico (Arquitetura A e B).
 * Medidas ficam em CFG e são premissas até chegarem as medidas reais. */
(function () {
  'use strict';
  const DADOS = window.PTL_DADOS;
  const $ = (s) => document.querySelector(s);

  // ======================================================================= CONFIGURAÇÃO
  const CFG = {
    // alto giro: atrás do operador, de frente para as esteiras, dividido pela passagem do corredor
    WA: 0.44, baseAlto: 0.3, alturaAlto: 1.98, niveisAlto: 6, profAlto: 1.15,
    // baixo giro: corredor perpendicular às esteiras
    WB: 0.6, baseBaixo: 0.25, alturaBaixo: 2.04, niveisBaixo: 8, profBaixo: 2.2,
    larguraCorredor: 1.5,
    predioVirada: 32,            // prédios < 32 no lado esquerdo do corredor; 015 e >= 32 no direito
    tilt: 0.1,
    zTransp: -1.55, largTransp: 0.55, altTransp: 0.8,   // esteira de transporte
    zSep: -0.8, largSep: 0.55, altSep: 0.75,             // esteira de separação (≈ 20 cm da de transporte)
    zAltoFace: 0.7,
    zOperAlto: 0.3, zOperSep: -0.22,
    xPega: 0.0, distFila: 1.45,
    velEsteira: 1.8, velEmpurre: 0.9, velOperador: 1.3,
    tempoPega: 1.6, tempoPorUnidade: 0.25, tempoDeposito: 0.5,
    bacia: { c: 0.6, a: 0.3, l: 0.4, cor: '#2E9E4F', borda: '#1d6b35' },   // bacia retornável verde, tamanho único
    // caixa do endereço por tipo: fração da largura e da altura do vão
    caixaTipo: { A: [0.9, 0.78], B: [0.8, 0.68], C: [0.72, 0.6], F: [0.58, 0.48], N: [0.86, 0.72] },
    segmentos: { Medicamento: [3, 22], Perfumaria: [26, 45] },   // estações de ponta de cada esteira
  };
  CFG.passo = 2 * CFG.profBaixo + CFG.larguraCorredor;          // distância entre estações
  CFG.meioAlto = (CFG.passo - CFG.larguraCorredor) / 2;        // largura de cada metade do alto giro
  CFG.zFaces = CFG.zAltoFace + CFG.profAlto + 0.15;            // início das faces do baixo giro

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
  const S = { est: '05', modo: 'A', itens: 8, vel: 1, auto: false, guia: true, destaque: true, cabos: true, cam: 'geral' };
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
  camera.position.set(-5.6, 6.4, -6.2);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0.4, 0.7, 1.8);
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
  const rotEnd = (e) => `P${pad(e.predio, 3)} A${e.andar}`;
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
  function seg7(ctx, txt, x, y, dw, dh, on, off) {
    const t = dw * 0.22, gp = t * 0.14;
    ctx.save();
    ctx.transform(1, 0, -0.1, 1, 0.1 * (y + dh / 2), 0);
    for (let i = 0; i < txt.length; i++) {
      const segs = SEG[txt[i]] !== undefined ? SEG[txt[i]] : '';
      const ox = x + i * dw * 1.42;
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

  function criarModulo(tipo, pai, x, y, z, rotX, id, lado) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.x = rotX || 0;
    pai.add(g);
    const Q = tipo === 'Q';
    const W = Q ? 0.2 : 0.52, H = Q ? 0.066 : 0.1;
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.036), M.corpo);
    corpo.castShadow = true;
    g.add(corpo);
    const tc = Q ? texCanvas(220, 110) : texCanvas(545, 110);
    const dispW = Q ? 0.118 : 0.36;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(dispW, (dispW * tc.c.height) / tc.c.width), new THREE.MeshBasicMaterial({ map: tc.t }));
    disp.position.set(Q ? -0.03 : -0.06, 0, 0.0185);
    g.add(disp);
    const btnMat = mat('#1f5f3a', { roughness: 0.35, emissive: '#000000' });
    const r = Q ? 0.021 : 0.03;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.018, 24), btnMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(W / 2 - (Q ? 0.033 : 0.046), 0, 0.024);
    g.add(btn);
    const m = { tipo, id, lado, g, tc, btn, btnMat, fila: [], item: null, falha: false, flash: 0, press: 0 };
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
      const txt = m.falha ? '   ' : it ? String(it.qtd).padStart(3, ' ') : m.flash > 0 ? '---' : '   ';
      seg7(ctx, txt, 44, 20, 34, 70, '#ff3b30', '#170808');
    } else {
      const end = m.falha ? '        ' : it ? rotEnd(it.e).padEnd(8, ' ') : m.flash > 0 ? '--------' : '        ';
      const q = m.falha ? '   ' : it ? String(it.qtd).padStart(3, ' ') : m.flash > 0 ? '---' : '   ';
      seg7(ctx, end, 26, 20, 30, 70, '#ff3b30', '#170808');
      seg7(ctx, q, 26 + 8 * 30 * 1.42 + 34, 20, 30, 70, '#39ff6a', '#071509');
      ctx.fillStyle = '#5B6675';
      ctx.font = '600 13px Arial';
      ctx.fillText('ENDEREÇO', 30, 104);
      ctx.fillText('QTD', 26 + 8 * 30 * 1.42 + 38, 104);
    }
    t.needsUpdate = true;
    const aceso = !m.falha && !!m.item;
    m.btnMat.color.set(aceso ? '#2ecc71' : m.falha ? '#8e1b12' : '#1d4b31');
    m.btnMat.emissive.set(aceso ? '#1fbf5a' : '#000000');
  }

  // ======================================================================= RACK (frente local +z, prédios ao longo de x local)
  // colunas: [{x, w, predio, ends:{andar: endereço}}]; o: {base, altura, niveis, prof, cinza, lado}
  // Prateleiras alinhadas: todos os prédios têm os mesmos níveis; andar 0 em cima.
  function construirRack(colunas, o) {
    const g = new THREE.Group();
    const top = o.base + o.altura, h = o.altura / o.niveis;
    const hM = top + 0.5;
    const cinza = !!o.cinza;
    const bordas = new Set();
    colunas.forEach((c) => { bordas.add(Math.round((c.x - c.w / 2) * 1000) / 1000); bordas.add(Math.round((c.x + c.w / 2) * 1000) / 1000); });
    const mont = [], vigas = [], trilhos = [], reservas = [], caixas = [], etiquetas = [];
    const rotPorAndar = ROT_ANDAR.map(() => []), prodPorMat = PRODUTOS.map(() => []);
    bordas.forEach((bx) => {
      mont.push(matriz(bx, hM / 2, -0.02, 0, 0, 0, 0.05, hM, 0.04));
      mont.push(matriz(bx, hM / 2, -o.prof, 0, 0, 0, 0.05, hM, 0.04));
    });
    const profs = [];
    for (let zz = -0.6; zz > -o.prof + 0.2; zz -= 0.42) profs.push(zz);
    const r = aleat(o.seed || 7);
    colunas.forEach((c) => {
      for (let i = 0; i <= o.niveis; i++) {
        const y = top - i * h;
        vigas.push(matriz(c.x, y - 0.02, 0, 0, 0, 0, c.w, 0.05, 0.035));
        vigas.push(matriz(c.x, y - 0.02 + o.prof * Math.tan(CFG.tilt), -o.prof, 0, 0, 0, c.w, 0.05, 0.035));
      }
      for (let a = 0; a < o.niveis; a++) {
        const yb = top - (a + 1) * h;
        trilhos.push(matriz(c.x, yb + (o.prof / 2) * Math.tan(CFG.tilt), -o.prof / 2, CFG.tilt, 0, 0, c.w, 0.012, o.prof));
        const e = cinza ? null : c.ends[a];
        const tipo = cinza ? (r() < 0.25 ? null : 'ABCF'[Math.floor(r() * 4)]) : e && e.dim;
        if (!tipo) continue;
        const [fw, fh] = CFG.caixaTipo[tipo] || [0.75, 0.6];
        const wt = c.w * fw, ht = h * fh, dt = 0.38;
        const yc = (zz) => yb + 0.012 + ht / 2 - zz * Math.tan(CFG.tilt);
        profs.forEach((zz) => reservas.push(matriz(c.x, yc(zz), zz, CFG.tilt, 0, 0, wt, ht, dt)));
        if (cinza) { caixas.push(matriz(c.x, yc(-0.2), -0.2, CFG.tilt, 0, 0, wt, ht, dt)); continue; }
        const tm = M.caixaPapelao.clone();
        const caixa = new THREE.Mesh(BOX1, tm);
        caixa.scale.set(wt, ht, dt);
        caixa.position.set(c.x, yc(-0.2), -0.2);
        caixa.rotation.x = CFG.tilt;
        g.add(caixa);
        const off = ht / 2 + 0.02;
        prodPorMat[(e.predio * 7 + e.andar * 3) % PRODUTOS.length].push(matriz(c.x, yc(-0.2) + off * Math.cos(CFG.tilt) - 0.03, -0.2 + off * Math.sin(CFG.tilt), CFG.tilt, 0, 0, wt * 0.8, 0.05, dt * 0.6));
        etiquetas.push(matriz(c.x, yc(-0.2) - ht * 0.15, -0.2 + dt / 2 + 0.003, CFG.tilt, 0, 0, Math.min(0.14, wt * 0.6), Math.min(0.05, ht * 0.3), 1));
        e.tote = caixa;
        e.toteMat = tm;
        rotPorAndar[Math.min(7, a)].push(matriz(c.x - c.w / 2 + 0.05, yb - 0.022, 0.024));
        if (e.cat === 'alto_0a3') e.modulo = criarModulo('Q', g, c.x, yb - 0.036, 0.04, 0, rotEnd(e), 'alto');
      }
      if (!cinza) {
        const lb = placa(pad(c.predio, 3), Math.min(0.2, c.w - 0.06), 0.065, { fundo: '#ffffff', cor: '#1B2638' });
        lb.position.set(c.x, top + 0.1, 0.03);
        g.add(lb);
        const gm = mat('#3a2a10', { emissive: '#000000', roughness: 0.4 });
        const led = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.16, c.w - 0.1), 0.022, 0.02), gm);
        led.position.set(c.x, top + 0.005, 0.035);
        g.add(led);
        guias[o.lado + '-' + c.predio] = gm;
      }
    });
    g.add(instanciado(BOX1, cinza ? M.cinzaEstr : M.montante, mont, true));
    g.add(instanciado(BOX1, cinza ? M.cinzaViga : M.longarina, vigas, !cinza));
    g.add(instanciado(BOX1, M.trilho, trilhos, false));
    g.add(instanciado(BOX1, cinza ? M.cinzaTote : M.caixaPapelao, reservas, false));
    if (cinza) g.add(instanciado(BOX1, M.cinzaTote, caixas, false));
    else {
      g.add(instanciado(new THREE.PlaneGeometry(1, 1), M.etiqueta, etiquetas, false));
      rotPorAndar.forEach((ms, a) => { if (ms.length) g.add(instanciado(GEO_ROT, ROT_ANDAR[a], ms, false)); });
      prodPorMat.forEach((ms, k) => { if (ms.length) g.add(instanciado(BOX1, PRODUTOS[k], ms, false)); });
    }
    const xs = colunas.map((c) => c.x);
    g.userData = { top, h, xmin: Math.min(...xs) - colunas[0].w / 2, xmax: Math.max(...xs) + colunas[0].w / 2 };
    const header = caixaMesh(g.userData.xmax - g.userData.xmin + 0.06, 0.05, 0.05, cinza ? M.cinzaEstr : M.montante);
    header.position.set((g.userData.xmin + g.userData.xmax) / 2, top + 0.48, -0.01);
    g.add(header);
    return g;
  }
  // posiciona um rack cuja frente olha para `normal` ('+z', '-z', '+x', '-x')
  function posicionar(g, x, z, normal) {
    g.position.set(x, 0, z);
    g.rotation.y = { '+z': 0, '-z': Math.PI, '-x': -Math.PI / 2, '+x': Math.PI / 2 }[normal];
  }
  const colunasVazias = (xs, W) => xs.map((x) => ({ x, w: W, predio: 0, ends: {} }));

  // metades do alto giro de uma estação com centro em xc; local x = -mundo x (frente para -z)
  function altoGiro(xc, porPredio, cinza, seed) {
    const W = CFG.WA, hc = CFG.larguraCorredor / 2;
    const xMundo = (p) => (p <= 5 ? xc - hc - CFG.meioAlto + (p - 0.5) * W : xc + hc + (p - 5.5) * W);
    const opt = { base: CFG.baseAlto, altura: CFG.alturaAlto, niveis: CFG.niveisAlto, prof: CFG.profAlto, lado: 'alto', cinza, seed };
    return [[1, 5], [6, 10]].map(([p1, p2]) => {
      const cols = [];
      for (let p = p1; p <= p2; p++) {
        const ends = {};
        if (!cinza) (porPredio[p] || []).forEach((e) => { ends[e.andar] = e; });
        cols.push({ x: -xMundo(p), w: W, predio: p, ends });
      }
      const g = construirRack(cols, { ...opt, seed: (seed || 1) + p1 });
      posicionar(g, 0, CFG.zAltoFace, '-z');
      g.userData.xMundo = xMundo;
      return g;
    });
  }
  // lado do corredor: prédios em ordem a partir da entrada; normal '-x' = lado esquerdo (+x), '+x' = lado direito (-x)
  function ladoCorredor(xFace, normal, predios, porPredio, cinza, seed, n) {
    const sgn = normal === '-x' ? 1 : -1;
    const cols = (cinza ? Array.from({ length: n }, (_, i) => i) : predios).map((p, i) => {
      const ends = {};
      if (!cinza) porPredio[p].forEach((e) => { ends[e.andar] = e; });
      return { x: sgn * (i + 0.5) * CFG.WB, w: CFG.WB, predio: cinza ? 0 : p, ends };
    });
    const g = construirRack(cols, { base: CFG.baseBaixo, altura: CFG.alturaBaixo, niveis: CFG.niveisBaixo, prof: CFG.profBaixo, lado: 'baixo', cinza, seed });
    posicionar(g, xFace, CFG.zFaces, normal);
    return g;
  }

  // ======================================================================= ESTAÇÃO
  let transf = null, faixaX = [-12, 12];
  function construirEstacao() {
    limpar(grpEst);
    clicaveis.length = 0;
    modulos = [];
    guias = {};
    const info = DADOS[S.est].info;
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

    // ---------------- ALTO GIRO da estação (001–005 | passagem | 006–010)
    const [altoE, altoD] = altoGiro(0, porPredio, false);
    grpAlto.add(altoE, altoD);
    const topA = altoE.userData.top, hA = altoE.userData.h;
    const xm = altoE.userData.xMundo;
    // 4 displays E+Q nos andares 4 e 5 (1 por andar em cada lado), na longarina do andar
    const blocos = {};
    [['AG-E', altoE, 1, 5, 'esq.'], ['AG-D', altoD, 6, 10, 'dir.']].forEach(([id, rk, p1, p2, nome]) => {
      const cxL = -(xm(p1) + xm(p2)) / 2;
      [4, 5].forEach((a) => {
        const yb = topA - (a + 1) * hA;
        const m = criarModulo('EQ', rk, cxL, yb - 0.05, 0.05, 0, id + a, 'alto');
        m.nome = `Alto giro ${nome} A${a}`;
        blocos[id + a] = m;
      });
      const pl = placa(`ALTO GIRO · EST ${S.est} · P${pad(p1, 3)}–P${pad(p2, 3)}`, CFG.meioAlto - 0.05, 0.1, { escala: 0.5 });
      pl.position.set(cxL, topA + 0.32, 0.02);
      rk.add(pl);
      for (let p = p1; p <= p2; p++) {
        const no = caixaMesh(0.1, 0.07, 0.1, M.corpo);
        no.position.set(-xm(p) + 0.12, topA + 0.08, -0.22);
        rk.add(no);
      }
    });
    const portal = placa(`ESTAÇÃO ${S.est} · CORREDOR DO BAIXO GIRO`, CFG.larguraCorredor - 0.1, 0.13, { fundo: '#2F5597', escala: 0.45 });
    portal.position.set(0, topA + 0.46, CFG.zAltoFace - 0.02);
    portal.rotation.y = Math.PI;
    grpAlto.add(portal);
    const viga = caixaMesh(CFG.larguraCorredor + 0.1, 0.06, 0.06, M.montante);
    viga.position.set(0, topA + 0.46, CFG.zAltoFace + 0.02);
    grpAlto.add(viga);

    // ---------------- BAIXO GIRO (corredor)
    const baixos = enderecos.filter((e) => e.cat === 'baixo');
    const pb = [...new Set(baixos.map((e) => e.predio))].filter((p) => p !== 15);
    const esq = pb.filter((p) => p < CFG.predioVirada).sort((a, b) => a - b);
    const dir = (porPredio[15] ? [15] : []).concat(pb.filter((p) => p >= CFG.predioVirada).sort((a, b) => b - a));
    const nMax = Math.max(esq.length, dir.length);
    const rackE = ladoCorredor(hc, '-x', esq, porPredio, false);
    const rackW = ladoCorredor(-hc, '+x', dir, porPredio, false);
    grpBaixo.add(rackE, rackW);
    const topB = rackE.userData.top;
    const sinalE = placa(`BAIXO GIRO · LADO ESQUERDO · P${pad(esq[0], 3)}–P${pad(esq[esq.length - 1], 3)}`, Math.min(esq.length * CFG.WB, 5), 0.16, { escala: 0.5 });
    sinalE.position.set((esq.length * CFG.WB) / 2, topB + 0.66, -0.01);
    rackE.add(sinalE);
    const sinalW = placa(`LADO DIREITO · P015, P${pad(dir[1] || 0, 3)} → P${pad(dir[dir.length - 1], 3)}`, Math.min(dir.length * CFG.WB, 5), 0.16, { escala: 0.5 });
    sinalW.position.set(-(dir.length * CFG.WB) / 2, topB + 0.66, -0.01);
    rackW.add(sinalW);
    const zonasIds = [...new Set(baixos.map((e) => e.zona))].sort();
    const zonas = {};
    zonasIds.forEach((z, k) => {
      const ps = [...new Set(baixos.filter((e) => e.zona === z).map((e) => e.predio))];
      const nE = ps.filter((p) => esq.includes(p)).length, nW = ps.filter((p) => dir.includes(p) && p !== 15).length;
      const ladoE = nE >= nW;
      const rack = ladoE ? rackE : rackW;
      const lista = ladoE ? esq : dir;
      const idx = ps.filter((p) => lista.includes(p)).map((p) => lista.indexOf(p));
      const sgn = ladoE ? 1 : -1;
      const i1 = Math.min(...idx), i2 = Math.max(...idx);
      const x1 = sgn * i1 * CFG.WB, x2 = sgn * (i2 + 1) * CFG.WB, cx = (x1 + x2) / 2, larg = Math.abs(x2 - x1);
      const cor = CORES_ZONA[k % CORES_ZONA.length];
      const nomes = ps.slice().sort((a, b) => a - b).filter((p) => p !== 15);
      const txt = `ZONA ${k + 1} · ${ps.includes(15) ? 'P015 + ' : ''}P${pad(nomes[0], 3)}–P${pad(nomes[nomes.length - 1], 3)}`;
      const pl = placa(txt, larg - 0.06, 0.07, { fundo: cor, escala: 0.5 });
      pl.position.set(cx, topB + 0.2, 0.03);
      rack.add(pl);
      zonas[z] = criarModulo('EQ', rack, cx, topB + 0.4, 0.06, 0.32, z, 'baixo');
      zonas[z].cor = cor;
      zonas[z].nome = `Zona ${k + 1}`;
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(larg - 0.04, 0.2), mat(cor, { transparent: true, opacity: 0.55 }));
      faixa.rotation.x = -Math.PI / 2;
      faixa.position.set(cx, 0.006, 0.13);
      rack.add(faixa);
      if (ps.includes(15)) {
        const f15 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.WB - 0.04, 0.2), mat(cor, { transparent: true, opacity: 0.55 }));
        f15.rotation.x = -Math.PI / 2;
        f15.position.set(-0.5 * CFG.WB, 0.006, 0.13);
        rackW.add(f15);
      }
    });

    // ---------------- estações vizinhas (cinza)
    for (let s = sMin; s <= sMax; s++) {
      if (s === est) continue;
      const xc = (s - est) * CFG.passo;
      altoGiro(xc, {}, true, s * 3).forEach((g) => { g.position.x = 0; g.children.forEach(() => {}); grpAlto.add(g); });
      grpBaixo.add(ladoCorredor(xc + hc, '-x', null, null, true, s * 5 + 1, nMax));
      grpBaixo.add(ladoCorredor(xc - hc, '+x', null, null, true, s * 5 + 2, nMax));
      const pl = placa(`ESTAÇÃO ${pad(s, 2)}`, 1.4, 0.13, { fundo: '#7f8995', escala: 0.55 });
      pl.position.set(xc, CFG.baseAlto + CFG.alturaAlto + 0.46, CFG.zAltoFace - 0.03);
      pl.rotation.y = Math.PI;
      grpAlto.add(pl);
      const t = textoPiso(`ESTAÇÃO ${pad(s, 2)}`, 2.4, 0.42, 'rgba(91,102,117,0.55)');
      t.position.set(xc, 0.008, 0.25);
      grpEst.add(t);
    }
    const tP = textoPiso(`ESTAÇÃO ${S.est}`, 2.4, 0.42, 'rgba(27,38,56,0.8)');
    tP.position.set(-1.6, 0.008, 0.3);
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
      if (e.cat !== 'baixo') { e.lado = 'alto'; e.pega = { x: wp.x, z: CFG.zOperAlto, rot: 0 }; }
      else if (esq.includes(e.predio)) { e.lado = 'esq'; e.pega = { x: 0.3, z: wp.z, rot: Math.PI / 2 }; }
      else { e.lado = 'dir'; e.pega = { x: -0.3, z: wp.z, rot: -Math.PI / 2 }; }
      e.guia = guias[(e.cat === 'baixo' ? 'baixo-' : 'alto-') + e.predio];
    });

    construirConcentrador(topA, topB, CFG.zFaces + nMax * CFG.WB);
    construirB2();
    atualizarInfra();
    aplicarVisibilidade();
  }

  // ---------------- esteira de transporte, esteira de separação e transferência
  function construirEsteiras() {
    const g = new THREE.Group();
    grpEst.add(g);
    const [x0, x1] = faixaX, L = x1 - x0, cx = (x0 + x1) / 2;
    const transportador = (z, h, W) => {
      [-1, 1].forEach((s) => {
        const lat = caixaMesh(L, 0.09, 0.035, M.esteira);
        lat.position.set(cx, h - 0.02, z + s * (W / 2 + 0.02));
        g.add(lat);
      });
      const pernas = [], rol = [];
      for (let x = x0; x <= x1; x += 1.6) [-1, 1].forEach((s) => pernas.push(matriz(x, (h - 0.05) / 2, z + s * (W / 2), 0, 0, 0, 0.05, h - 0.05, 0.05)));
      g.add(instanciado(BOX1, M.esteira, pernas, true));
      for (let x = x0; x <= x1; x += 0.085) rol.push(matriz(x, h - 0.012, z, Math.PI / 2, 0, 0, 1, 1, 1));
      g.add(instanciado(new THREE.CylinderGeometry(0.022, 0.022, W, 10), M.rolete, rol, false));
    };
    transportador(CFG.zTransp, CFG.altTransp, CFG.largTransp);
    transportador(CFG.zSep, CFG.altSep, CFG.largSep);
    // transferência: ponte de roletes entre as esteiras + rolete direcionador na separação
    const xt = transf.x;
    const zA = CFG.zTransp + CFG.largTransp / 2, zB = CFG.zSep - CFG.largSep / 2;
    const ponte = caixaMesh(0.6, 0.03, zB - zA + 0.1, mat('#2E8B57', { roughness: 0.5 }));
    ponte.position.set(xt, CFG.altSep - 0.03, (zA + zB) / 2);
    g.add(ponte);
    const dir = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, CFG.largSep - 0.04, 16), mat('#F2A33A', { emissive: '#3a2400' }));
    dir.rotation.x = Math.PI / 2;
    dir.position.set(xt, CFG.altSep + 0.01, CFG.zSep);
    g.add(dir);
    grpEst.userData.direcionador = dir;
    const st = transf.b;
    const alc = st === transf.p0 ? `esquerda: ${pad(st, 2)} · direita: ${pad(st + 1, 2)} e ${pad(st + 2, 2)}` : `esquerda: ${pad(st - 1, 2)} e ${pad(st, 2)} · direita: ${pad(st + 1, 2)} e ${pad(st + 2, 2)}`;
    const sp = sprite([`Transferência ${pad(st, 2)}|${pad(st + 1, 2)} · rolete direcionador`, alc], 1.7, { fundo: 'rgba(46,139,87,0.92)' });
    sp.position.set(xt, 1.6, (zA + zB) / 2);
    g.add(sp);
    const e1 = sprite(['Esteira de transporte →', 'controlada pelo BHT'], 1.4, { fundo: 'rgba(46,58,79,0.88)' });
    e1.position.set(x0 + 2.2, CFG.altTransp + 0.5, CFG.zTransp - 0.25);
    g.add(e1);
    const e2 = sprite(['Esteira de separação', 'bacia aguarda e é separada aqui'], 1.4, { fundo: 'rgba(46,58,79,0.88)' });
    e2.position.set(-CFG.distFila - 1.3, 1.25, CFG.zSep + 0.1);
    g.add(e2);
  }

  function construirConcentrador(topA, topB, zFim) {
    const xc = CFG.larguraCorredor / 2 + CFG.meioAlto - 0.22, zc = 0.3;
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
    const lb = sprite(['Concentrador', 'Ethernet · 2× RS-485 · 12 V · cooler'], 1.0);
    lb.position.set(0, 0.55, 0);
    g.add(lb);
    g.userData.leds = leds;
    grpEst.userData.concentrador = g;
    const poste = caixaMesh(0.06, 2.9, 0.06, M.montante);
    poste.position.set(xc, 1.45, zc + 0.13);
    grpEst.add(poste);

    const { cabosA, cabosB } = grpCabos.userData;
    const yT = 3.0, zA = CFG.zAltoFace + 0.06;
    const hc = CFG.larguraCorredor / 2, xa = hc + CFG.meioAlto;
    cabosA.add(cabo([[xc - 0.1, 1.68, zc + 0.05], [xc - 0.1, yT, zc + 0.05], [xc - 0.1, yT, zA], [xa, topA + 0.02, zA], [-xa, topA + 0.02, zA]], '#3A7BD5', 0.014));
    for (let p = 1; p <= 10; p++) {
      const x = p <= 5 ? -hc - CFG.meioAlto + (p - 0.5) * CFG.WA + 0.15 : hc + (p - 5.5) * CFG.WA + 0.15;
      cabosA.add(cabo([[x, topA + 0.02, zA], [x, CFG.baseAlto - 0.03, zA]], '#3A7BD5', 0.006));
    }
    const busA = sprite(['Barramento alto giro', 'Cat5e + RJ45 · RS-485 + 12 V'], 1.1, { fundo: 'rgba(58,123,213,0.92)' });
    busA.position.set(-xa + 0.5, topA + 0.75, zA);
    cabosA.add(busA);
    const calha = caixaMesh(0.2, 0.05, zFim - zA + 0.2, M.trilho);
    calha.position.set(0, yT + 0.03, (zA + zFim) / 2);
    cabosB.add(calha);
    cabosB.add(cabo([[xc + 0.1, 1.68, zc + 0.05], [xc + 0.1, yT, zc + 0.05], [0, yT, zc + 0.05], [0, yT, zFim]], '#E67E22', 0.014));
    const busB = sprite(['Barramento baixo giro', 'Cat5e + RJ45 · eletrocalha sobre o corredor'], 1.2, { fundo: 'rgba(230,126,34,0.92)' });
    busB.position.set(0, yT + 0.35, zFim - 0.6);
    cabosB.add(busB);
    cabosA.add(cabo([[xc, 1.68, zc + 0.05], [xc, 3.75, zc + 0.05]], '#7F8C8D', 0.012));
    const rede = sprite(['Ethernet · VLAN PTL', 'switch → Serviço PTL (API + MQTT + Sybase)'], 1.15, { fundo: 'rgba(46,58,79,0.92)' });
    rede.position.set(xc, 4.0, zc);
    cabosA.add(rede);
  }

  // ---------------- B2: leitor fixo na esteira de separação + painel LCD + botão FECHAR
  let b2 = null;
  function construirB2() {
    const g = new THREE.Group();
    grpEst.add(g);
    const leitor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.3), mat('#20262f', { emissive: '#000000' }));
    leitor.position.set(CFG.xPega, CFG.altSep + 0.004, CFG.zSep);
    g.add(leitor);
    const xp = CFG.xPega - 0.75, zp = CFG.zOperSep + 0.05;
    const poste = caixaMesh(0.05, 1.3, 0.05, M.montante);
    poste.position.set(xp, 0.65, zp);
    g.add(poste);
    const tc = texCanvas(512, 160);
    const lcd = new THREE.Group();
    lcd.position.set(xp, 1.36, zp - 0.03);
    lcd.rotation.set(-0.35, Math.PI, 0, 'YXZ');
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
    [-0.45, CFG.zAltoFace - 0.08].forEach((z) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.05), M.amarelo);
      f.rotation.x = -Math.PI / 2;
      f.position.set(0, 0.004, z);
      scene.add(f);
    });
  })();

  // ======================================================================= OPERADOR
  const oper = { x: 0.35, z: CFG.zOperSep, caminho: [], resolve: null, rot: Math.PI, anim: null, animT: 0, passo: 0 };
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
  const dentro = (p) => p.z > CFG.zAltoFace - 0.1;
  function rota(de, para) {
    const boca = { x: 0, z: CFG.zOperAlto + 0.05 };
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
    if (estado === 'NA_POSICAO') return abrirCaixa();
    if (estado === 'SEPARANDO') {
      const p = pendentes();
      if (p > 0) {
        estado = 'ALERTA';
        log('API', `409 → ${p} item(ns) pendente(s). Nova leitura fecha com pendência`, 'ERRO');
        atualizarUI();
        return;
      }
    }
    if (estado === 'ALERTA') return fecharCaixa(true);
    if (estado === 'PRONTA') return fecharCaixa(false);
  }

  function abrirCaixa() {
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
    if (pendentes() === 0) {
      estado = 'PRONTA';
      log('EVT', `ptl/est${S.est}/evt CONCLUIDA caixa=${atual.id} · aguardando leitura de fechamento`);
    }
    atualizarDestaques();
    atualizarUI();
  }

  function fecharCaixa(comPendencia) {
    const p = pendentes();
    const dur = simT - atual.t0;
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
    modulos.forEach((m) => { m.fila = []; m.item = null; desenhar(m); });
    atual.itens.forEach((i) => { i.status = 'pendente'; });
    estado = 'NA_POSICAO';
    atualizarDestaques();
    atualizarUI();
  }

  function simularFalha() {
    const cand = modulos.filter((m) => !m.falha && m.item);
    const lista = cand.length ? cand : modulos.filter((m) => !m.falha && m.tipo === 'Q');
    const m = lista[Math.floor(Math.random() * lista.length)];
    if (!m) return;
    m.falha = true;
    m.falhaT = simT;
    K.falhas++;
    desenhar(m);
    log('EVT', `ptl/est${S.est}/evt FALHA_MODULO ${m.tipo === 'Q' ? 'Q ' + m.id : 'E+Q ' + (m.nome || m.id)} sem resposta no barramento`, 'ERRO');
    atualizarDestaques();
    atualizarUI();
  }
  function trocarModulo(m) {
    if (!m.falha) return;
    m.falha = false;
    desenhar(m);
    log('EVT', `Módulo ${m.nome || m.id} trocado (conector RJ45) → CONFIG reenviado, display restaurado`);
    atualizarDestaques();
    atualizarUI();
  }

  // ======================================================================= DESTAQUES (tote e LED guia)
  let acesos = [];
  function atualizarDestaques() {
    enderecos.forEach((e) => { if (e.toteMat) e.toteMat.emissive.set('#000000'); });
    Object.values(guias).forEach((g) => { g.emissive.set('#000000'); g.color.set('#3a2a10'); });
    acesos = [];
    modulos.forEach((m) => {
      if (!m.item) return;
      acesos.push(m.item.e);
      if (S.guia && m.tipo === 'EQ' && !m.falha && m.item.e.guia) { m.item.e.guia.color.set('#F2A33A'); m.item.e.guia.emissive.set('#F2A33A'); }
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
  const posCaixa = () => ({ x: CFG.xPega + 0.35, z: CFG.zOperSep });

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
        await andarAte(p.x, p.z);
        if (!ativo()) break;
        oper.rot = p.rot;
        const tp = CFG.tempoPega + alvo.qtd * CFG.tempoPorUnidade;
        oper.anim = 'pega'; oper.animT = tp;
        await esperar(tp);
        if (!ativo()) break;
        if (alvo.e.modulo.item === alvo && !alvo.e.modulo.falha) { confirmar(alvo.e.modulo, 'operador'); carregando++; }
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
      `Concentrador <span class="${falhas ? '' : 'ok'}">${falhas ? '⚠ ' + falhas + ' módulo(s) sem resposta' : '● online'}</span> · 12 V · 2 barramentos<br>` +
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
    modulos.filter((m) => m.falha).forEach((m) => {
      const d = document.createElement('div');
      d.className = 'alerta';
      d.innerHTML = `<div><b>FALHA_MODULO</b> · ${m.tipo === 'Q' ? 'módulo Q ' + m.id : 'módulo E+Q ' + (m.nome || m.id)} sem resposta. Troca: soltar o RJ45, encaixar o módulo reserva.</div>`;
      const b = document.createElement('button');
      b.textContent = 'Trocar módulo';
      b.onclick = () => trocarModulo(m);
      d.appendChild(b);
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
    if (v === 'B2' && estado === 'NA_POSICAO') esperar(0.8).then(() => { if (estado === 'NA_POSICAO' && S.modo === 'B2') leitura('leitor fixo'); });
    atualizarUI();
  });
  segmentado('#selCam', (v) => aplicarCamera(v));
  segmentado('#selVel', (v) => { S.vel = +v; });
  $('#btnLeitura').addEventListener('click', () => leitura());
  $('#btnCancelar').addEventListener('click', cancelarCaixa);
  $('#btnFalha').addEventListener('click', simularFalha);
  $('#btnZerar').addEventListener('click', () => { zerarKPIs(); atualizarUI(); });
  $('#btnLimparLog').addEventListener('click', () => { $('#log').innerHTML = ''; });
  $('#optAuto').addEventListener('change', (e) => ligarAuto(e.target.checked));
  $('#optItens').addEventListener('input', (e) => { S.itens = +e.target.value; $('#valItens').textContent = S.itens; });
  $('#optGuia').addEventListener('change', (e) => { S.guia = e.target.checked; atualizarDestaques(); });
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
      if (m.falha) { log('EVT', `Botão do módulo ${m.nome || m.id} sem resposta (falha)`, 'ERRO'); return; }
      if (!m.item) { m.press = 0.12; return; }
      confirmar(m, 'clique');
    }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const o = alvoMouse(e);
    renderer.domElement.style.cursor = o && (o.userData.acao || (o.userData.mod && o.userData.mod.item)) ? 'pointer' : 'default';
  });

  // ---------------- câmera
  const CAMS = {
    geral: { p: [-5.6, 6.4, -6.2], t: [0.4, 0.7, 1.8] },
    planta: { planta: true },
    alto: { p: [0.2, 2.5, -3.8], t: [0, 1.15, 1.0] },
    baixo: { p: [0, 2.2, 0.85], t: [0, 1.1, 9.0] },
    operador: { seguir: true },
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
      const xm = (faixaX[0] + faixaX[1]) / 2, zm = 3.6, alt = Math.max(20, (faixaX[1] - faixaX[0]) * 0.75);
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
    });
    acesos.forEach((e) => {
      if (!e.toteMat) return;
      if (S.destaque && !(e.modulo && e.modulo.falha)) e.toteMat.emissive.setRGB(1.0 * pulso, 0.6 * pulso, 0.05);
      else e.toteMat.emissive.setRGB(0, 0, 0);
    });
    if (b2) { b2.leituraT = Math.max(0, b2.leituraT - dt); b2.leitor.material.emissive.set(b2.leituraT > 0 ? '#3b82f6' : '#000000'); }
    const conc = grpEst.userData.concentrador;
    if (conc) {
      conc.userData.leds[1].visible = Math.sin(now / 90) > -0.2;
      conc.userData.leds[2].material.color.set(modulos.some((m) => m.falha) ? (pulso > 0.5 ? '#ff2d2d' : '#3a0000') : '#F2A33A');
    }
    if (simT - ultimoHeartbeat > 120) {
      ultimoHeartbeat = simT;
      log('EVT', `ptl/est${S.est}/evt HEARTBEAT concentrador ok · 2 barramentos · ${modulos.filter((m) => m.falha).length} falha(s)`);
    }

    // câmera
    if (camAnim) {
      camAnim.k = Math.min(1, camAnim.k + dtReal * 1.6);
      const k = camAnim.k < 0.5 ? 2 * camAnim.k * camAnim.k : 1 - Math.pow(-2 * camAnim.k + 2, 2) / 2;
      camera.position.lerpVectors(camAnim.de.p, camAnim.para.p, k);
      controls.target.lerpVectors(camAnim.de.t, camAnim.para.t, k);
      if (camAnim.k >= 1) camAnim = null;
    }
    if (CAMS[S.cam].seguir) {
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
  if (params.has('semajuda')) $('#ajuda').classList.add('oculto');
  if (params.get('cam')) { const b = document.querySelector(`#selCam button[data-v="${params.get('cam')}"]`); if (b) b.click(); }
  if (params.get('vel')) { const b = document.querySelector(`#selVel button[data-v="${params.get('vel')}"]`); if (b) b.click(); }
  requestAnimationFrame(loop);

  window.PTL = { renderer, scene, camera, controls, enderecos: () => enderecos, S, K, CFG, estado: () => estado, leitura, confirmar, modulos: () => modulos, simularFalha, aplicarCamera };
})();
