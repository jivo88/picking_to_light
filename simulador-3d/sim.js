/* Simulador 3D — estação de flow rack com pick-to-light
 * Regras iguais às do documento técnico (Arquitetura A e B).
 * Medidas e disposição física ficam em CFG e podem ser ajustadas quando chegarem as fotos. */
(function () {
  'use strict';
  const DADOS = window.PTL_DADOS;
  const $ = (s) => document.querySelector(s);

  // ======================================================================= CONFIGURAÇÃO
  const CFG = {
    WA: 0.95, HA: 0.33, nAlto: 6,            // alto giro: largura do prédio, altura do andar, andares
    WB: 0.6, HB: 0.255, nBaixo: 8,           // baixo giro
    baseY: 0.3, prof: 1.15, tilt: 0.12,      // primeiro andar, profundidade do flow rack, inclinação
    zFrente: -1.2, zFundo: 1.4,              // face do rack da frente / do fundo
    zEsteira: -0.66, larguraEsteira: 0.52, alturaEsteira: 0.78,
    xParada: 0, xFila: -1.75, xInicio: -14, xFim: 14,
    velEsteira: 2.2, velOperador: 1.3,       // m/s
    zOperFrente: -0.12, zOperFundo: 0.92,    // onde o operador fica para pegar
    tempoPega: 1.6, tempoPorUnidade: 0.25, tempoDeposito: 0.5,
    xConcentrador: -5.2,
  };
  const CORES_ZONA = ['#2E8B57', '#2F5597', '#D68910', '#7B4FA0', '#C0392B', '#138D90', '#8E6C3A', '#D35400', '#5B6675'];
  const COR_SEG = { Medicamento: '#1F6FB5', Perfumaria: '#8E44AD' };

  // ======================================================================= ESTADO
  const S = { est: '05', modo: 'A', itens: 8, vel: 1, auto: false, guia: true, destaque: true, cabos: true, cam: 'geral' };
  const K = { caixas: 0, itens: 0, tempoTotal: 0, pendencias: 0, falhas: 0 };
  let simT = 0;
  let estado = 'AGUARDANDO';
  let atual = null;            // caixa na posição
  let fila = null;             // próxima caixa
  const caixasCena = [];
  let seqCaixa = 1200;
  let fechadaAte = 0;
  let autoToken = 0;
  let ultimoHeartbeat = 0;

  let modulos = [];            // {tipo:'Q'|'EQ', id, lado, fila:[], item, falha, ...}
  let enderecos = [];          // endereços da estação com posição e tote
  let guias = {};              // 'frente-3' / 'fundo-27' -> material
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
  scene.fog = new THREE.Fog('#dfe4ea', 24, 48);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(-10.8, 5.3, 0.35);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 0.6;
  controls.maxDistance = 32;

  scene.add(new THREE.HemisphereLight('#ffffff', '#8d96a0', 0.78));
  const sol = new THREE.DirectionalLight('#ffffff', 0.62);
  sol.position.set(-6, 11, 7);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -13, right: 13, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sol);
  const luz2 = new THREE.DirectionalLight('#ffffff', 0.25);
  luz2.position.set(5, 6, -8);
  scene.add(luz2);

  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o || {}));
  const M = {
    piso: mat('#C9CED5', { roughness: 0.95 }),
    montante: mat('#2F5597', { metalness: 0.3, roughness: 0.5 }),
    longarina: mat('#E8892B', { metalness: 0.2, roughness: 0.55 }),
    trilho: mat('#9AA4AE', { metalness: 0.5, roughness: 0.4 }),
    corpo: mat('#1d2129', { roughness: 0.5 }),
    tote: mat('#3E5C7E', { roughness: 0.6 }),
    rolete: mat('#B8C0C8', { metalness: 0.7, roughness: 0.3 }),
    esteira: mat('#4A5563', { metalness: 0.4, roughness: 0.5 }),
    amarelo: mat('#F4C430'),
    gabinete: mat('#CBD2DC', { metalness: 0.4, roughness: 0.45 }),
  };
  const PRODUTOS = ['#E74C3C', '#F5F5F5', '#3498DB', '#F1C40F', '#2ECC71', '#E67E22', '#9B59B6', '#ECF0F1', '#1ABC9C', '#FADBD8', '#D6EAF8'].map((c) => mat(c, { roughness: 0.6 }));

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
    ctx.textAlign = o.alinhar || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, o.alinhar === 'left' ? c.height * 0.3 : c.width / 2, c.height / 2 + 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tc.t, transparent: !!o.transparente }));
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
      ctx.fillStyle = i === 0 ? (o.cor || '#ffffff') : '#C9D3E0';
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
    for (let i = 0; i < pontos.length - 1; i++) {
      const a = new THREE.Vector3(...pontos[i]), b = new THREE.Vector3(...pontos[i + 1]);
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      const cil = new THREE.Mesh(new THREE.CylinderGeometry(raio || 0.012, raio || 0.012, len, 8), m);
      cil.position.copy(a).add(b).multiplyScalar(0.5);
      cil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(cil);
      const j = new THREE.Mesh(new THREE.SphereGeometry(raio || 0.012, 8, 6), m);
      j.position.copy(b);
      g.add(j);
    }
    return g;
  }
  const pad = (n, k) => String(n).padStart(k, '0');
  const fmtT = (s) => { s = Math.max(0, Math.round(s)); return `${pad(Math.floor(s / 60), 2)}:${pad(s % 60, 2)}`; };
  const relogio = () => { const s = 8 * 3600 + Math.floor(simT); return `${pad(Math.floor(s / 3600) % 24, 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}`; };
  const rotEnd = (e) => `P${pad(e.predio, 3)} A${e.andar}`;
  function limpar(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); if (!Object.values(M).includes(m) && !PRODUTOS.includes(m)) m.dispose(); });
      });
    }
  }

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
  let rackFrente, rackFundo, grpCabos;

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

  // ======================================================================= ESTAÇÃO (racks, módulos, cabos)
  function construirEstacao() {
    limpar(grpEst);
    clicaveis.length = 0;
    modulos = [];
    guias = {};
    const info = DADOS[S.est].info;
    enderecos = DADOS[S.est].enderecos.map((a) => ({ end: a[0], predio: a[1], andar: a[2], cat: a[3], zona: a[4], dim: a[5], ordem: a[6] }));
    const fdim = { A: 1, B: 0.9, C: 0.78, F: 0.66, N: 0.85 };

    // ---------------- FRENTE (alto giro)
    rackFrente = new THREE.Group();
    rackFrente.position.z = CFG.zFrente;
    grpEst.add(rackFrente);
    const WA = CFG.WA, HA = CFG.HA, nA = CFG.nAlto;
    const larguraA = 10 * WA, topA = CFG.baseY + nA * HA;
    const xA = (p) => (p - 5.5) * WA;
    construirEstrutura(rackFrente, larguraA, 10, WA, nA, HA, topA);
    for (let p = 1; p <= 10; p++) {
      const lb = placa(pad(p, 3), 0.2, 0.07, { fundo: '#ffffff', cor: '#1B2638' });
      lb.position.set(xA(p), topA + 0.1, 0.03);
      rackFrente.add(lb);
      const no = caixaMesh(0.13, 0.07, 0.1, M.corpo);
      no.position.set(xA(p) + 0.25, topA + 0.08, -0.22);
      rackFrente.add(no);
      const ledNo = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: '#2ecc71' }));
      ledNo.position.set(xA(p) + 0.25, topA + 0.08, -0.168);
      rackFrente.add(ledNo);
      guias['frente-' + p] = criarGuia(rackFrente, xA(p), topA + 0.005);
    }
    for (let a = 0; a < nA; a++) {
      const lb = placa('A' + a, 0.11, 0.07, { fundo: '#ffffff', cor: '#1B2638' });
      lb.position.set(-larguraA / 2 - 0.1, CFG.baseY + a * HA + 0.12, 0.03);
      rackFrente.add(lb);
    }
    const blocos = {};
    [['AG-E', 1, 5, 'BLOCO ESQUERDO'], ['AG-D', 6, 10, 'BLOCO DIREITO']].forEach(([id, p1, p2, nome]) => {
      const cx = (xA(p1) + xA(p2)) / 2;
      const pl = placa(`${nome} · ANDARES 4–5 · P${pad(p1, 3)}–P${pad(p2, 3)}`, 5 * WA - 0.08, 0.075, { fundo: '#2F5597', escala: 0.55 });
      pl.position.set(cx, topA + 0.21, 0.03);
      rackFrente.add(pl);
      blocos[id] = criarModulo('EQ', rackFrente, cx, topA + 0.42, 0.06, 0.32, id, 'frente');
    });
    const header = caixaMesh(larguraA + 0.1, 0.05, 0.05, M.montante);
    header.position.set(0, topA + 0.53, -0.01);
    rackFrente.add(header);
    const sinalF = placa(`FRENTE · ALTO GIRO · prédios 001–010 · ${info.alto_0a3} módulos Q + 2 blocos E+Q`, 4.6, 0.2, { fundo: '#1B2638', escala: 0.55 });
    sinalF.position.set(0, topA + 0.72, -0.01);
    rackFrente.add(sinalF);

    // ---------------- FUNDO (baixo giro)
    rackFundo = new THREE.Group();
    rackFundo.position.z = CFG.zFundo;
    rackFundo.rotation.y = Math.PI;
    grpEst.add(rackFundo);
    const prediosB = [...new Set(enderecos.filter((e) => e.cat === 'baixo').map((e) => e.predio))].sort((a, b) => a - b);
    const WB = CFG.WB, HB = CFG.HB, nB = CFG.nBaixo, gap = 0.25;
    const larguraB = prediosB.length * WB + gap, topB = CFG.baseY + nB * HB;
    const idxB = {};
    prediosB.forEach((p, i) => { idxB[p] = i; });
    const xB = (p) => -larguraB / 2 + (idxB[p] + 0.5) * WB + (idxB[p] > 0 ? gap : 0);   // x no mundo
    construirEstrutura(rackFundo, larguraB, prediosB.length, WB, nB, HB, topB, prediosB.map((p) => -xB(p)));
    prediosB.forEach((p) => {
      const lb = placa(pad(p, 3), 0.17, 0.065, { fundo: '#ffffff', cor: '#1B2638' });
      lb.position.set(-xB(p), topB + 0.1, 0.03);
      rackFundo.add(lb);
      guias['fundo-' + p] = criarGuia(rackFundo, -xB(p), topB + 0.005);
    });
    for (let a = 0; a < nB; a++) {
      const lb = placa('A' + a, 0.11, 0.065, { fundo: '#ffffff', cor: '#1B2638' });
      lb.position.set(larguraB / 2 + 0.1, CFG.baseY + a * HB + 0.1, 0.03);
      rackFundo.add(lb);
    }
    const zonasIds = [...new Set(enderecos.filter((e) => e.cat === 'baixo').map((e) => e.zona))].sort();
    const zonas = {};
    zonasIds.forEach((z, k) => {
      const ps = [...new Set(enderecos.filter((e) => e.zona === z).map((e) => e.predio))].sort((a, b) => a - b);
      const x1 = xB(ps[0]) - WB / 2, x2 = xB(ps[ps.length - 1]) + WB / 2, cx = (x1 + x2) / 2;
      const cor = CORES_ZONA[k % CORES_ZONA.length];
      const pl = placa(`ZONA ${k + 1} · P${pad(ps[0], 3)}–P${pad(ps[ps.length - 1], 3)}`, x2 - x1 - 0.06, 0.075, { fundo: cor, escala: 0.55 });
      pl.position.set(-cx, topB + 0.2, 0.03);
      rackFundo.add(pl);
      zonas[z] = criarModulo('EQ', rackFundo, -cx, topB + 0.42, 0.06, 0.32, z, 'fundo');
      zonas[z].cor = cor;
      zonas[z].nome = `Zona ${k + 1}`;
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1 - 0.04, 0.22), mat(cor, { transparent: true, opacity: 0.55 }));
      faixa.rotation.x = -Math.PI / 2;
      faixa.position.set(cx, 0.006, CFG.zFundo - 0.14);
      grpEst.add(faixa);
    });
    const headerB = caixaMesh(larguraB + 0.1, 0.05, 0.05, M.montante);
    headerB.position.set(0, topB + 0.53, -0.01);
    rackFundo.add(headerB);
    const pf = prediosB.filter((p) => p !== 15);
    const sinalB = placa(`FUNDO · BAIXO GIRO · prédio 015 e ${pad(pf[0], 3)}–${pad(pf[pf.length - 1], 3)} · ${zonasIds.length} zonas de 4 prédios`, 4.8, 0.2, { fundo: '#1B2638', escala: 0.55 });
    sinalB.position.set(0, topB + 0.72, -0.01);
    rackFundo.add(sinalB);

    // ---------------- totes e módulos por endereço
    const reservas = [], produtos = [];
    const geoProd = new THREE.BoxGeometry(1, 1, 1);
    enderecos.forEach((e, i) => {
      const frente = e.cat !== 'baixo';
      const rack = frente ? rackFrente : rackFundo;
      const W = frente ? WA : WB, H = frente ? HA : HB;
      const lx = frente ? xA(e.predio) : -xB(e.predio);
      const y0 = CFG.baseY + e.andar * H;
      const h = H * 0.62 * (fdim[e.dim] || 0.8), w = W * 0.84, d = 0.34;
      const tm = M.tote.clone();
      const tote = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tm);
      const zc = -0.2;
      tote.position.set(lx, y0 + 0.012 + h / 2 + -zc * Math.tan(CFG.tilt), zc);
      tote.rotation.x = CFG.tilt;
      tote.castShadow = true;
      rack.add(tote);
      const pm = PRODUTOS[(e.predio * 7 + e.andar * 3) % PRODUTOS.length];
      const prod = new THREE.Mesh(geoProd, pm);
      prod.scale.set(w * 0.8, 0.012, d * 0.8);
      prod.position.set(0, h / 2 + 0.006, 0);
      prod.rotation.set(0, 0, 0);
      tote.add(prod);
      [-0.58, -0.94].forEach((zz) => reservas.push({ rack, m: matriz(lx, y0 + 0.012 + h / 2 - zz * Math.tan(CFG.tilt), zz, CFG.tilt, 0, 0, w, h, d) }));
      e.tote = tote;
      e.toteMat = tm;
      e.lado = frente ? 'frente' : 'fundo';
      e.x = frente ? xA(e.predio) : xB(e.predio);
      if (e.cat === 'alto_0a3') e.modulo = criarModulo('Q', rackFrente, lx, y0 - 0.034, 0.045, 0, rotEnd(e), 'frente');
      else if (e.cat === 'alto_45') e.modulo = blocos[e.zona];
      else e.modulo = zonas[e.zona];
    });
    const geoTote = new THREE.BoxGeometry(1, 1, 1);
    [rackFrente, rackFundo].forEach((rack) => {
      const ms = reservas.filter((r) => r.rack === rack).map((r) => r.m);
      rack.add(instanciado(geoTote, M.tote, ms, false));
    });

    // ---------------- concentrador, cabos e rede
    construirConcentrador(topA, topB, larguraB);
    construirB2();
    atualizarInfra();
  }

  function criarGuia(rack, x, y) {
    const m = mat('#3a2a10', { emissive: '#000000', roughness: 0.4 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.02), m);
    led.position.set(x, y, 0.035);
    rack.add(led);
    return m;
  }

  function construirEstrutura(rack, largura, nPred, W, nAnd, H, top, xsLocais) {
    const xs = xsLocais || Array.from({ length: nPred }, (_, i) => -largura / 2 + (i + 0.5) * W);
    const bordas = [];
    xs.forEach((x) => { bordas.push(x - W / 2, x + W / 2); });
    const unicos = [...new Set(bordas.map((b) => Math.round(b * 1000) / 1000))].sort((a, b) => a - b);
    const alturaM = top + 0.56;
    const montantes = [];
    unicos.forEach((bx) => {
      montantes.push(matriz(bx, alturaM / 2, -0.02, 0, 0, 0, 0.045, alturaM, 0.045));
      montantes.push(matriz(bx, alturaM / 2, -CFG.prof, 0, 0, 0, 0.045, alturaM, 0.045));
    });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    rack.add(instanciado(geo, M.montante, montantes, true));
    const long = [], trilhos = [];
    const xmin = unicos[0], xmax = unicos[unicos.length - 1], L = xmax - xmin, cx = (xmin + xmax) / 2;
    for (let a = 0; a <= nAnd; a++) {
      const y = CFG.baseY + a * H;
      long.push(matriz(cx, y - 0.02, 0, 0, 0, 0, L, 0.045, 0.04));
      long.push(matriz(cx, y - 0.02 + CFG.prof * Math.tan(CFG.tilt), -CFG.prof, 0, 0, 0, L, 0.045, 0.04));
      if (a < nAnd) trilhos.push(matriz(cx, y + (CFG.prof / 2) * Math.tan(CFG.tilt), -CFG.prof / 2, CFG.tilt, 0, 0, L, 0.012, CFG.prof));
    }
    rack.add(instanciado(geo, M.longarina, long, true));
    rack.add(instanciado(geo, M.trilho, trilhos, false));
  }

  function construirConcentrador(topA, topB, larguraB) {
    const xc = CFG.xConcentrador;
    const g = new THREE.Group();
    g.position.set(xc, 1.45, CFG.zFrente - 0.15);
    grpEst.add(g);
    const corpo = caixaMesh(0.36, 0.46, 0.2, M.gabinete);
    g.add(corpo);
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
    const pl = placa(`CONCENTRADOR EST ${S.est}`, 0.32, 0.05, { fundo: '#1B2638', escala: 0.6 });
    pl.position.set(0, -0.2, 0.102);
    g.add(pl);
    const lb = sprite(['Concentrador', 'RP2040 + Ethernet · 2× RS-485 · 12 V · cooler'], 1.0);
    lb.position.set(0, 0.55, 0);
    g.add(lb);
    g.userData.leds = leds;
    grpEst.userData.concentrador = g;
    const poste = caixaMesh(0.06, 3.3, 0.06, M.montante);
    poste.position.set(xc, 1.65, CFG.zFrente - 0.3);
    grpEst.add(poste);

    grpCabos = new THREE.Group();
    grpEst.add(grpCabos);
    const cabosF = new THREE.Group(), cabosB = new THREE.Group();
    grpCabos.add(cabosF, cabosB);
    grpCabos.userData = { cabosF, cabosB };
    const zf = CFG.zFrente - 0.08, zb = CFG.zFundo + 0.08;
    const xA0 = -5 * CFG.WA, xA1 = 5 * CFG.WA;
    cabosF.add(cabo([[xc + 0.1, 1.68, zf - 0.07], [xc + 0.1, topA + 0.02, zf - 0.07], [xA0, topA + 0.02, zf], [xA1, topA + 0.02, zf]], '#3A7BD5', 0.014));
    for (let p = 1; p <= 10; p++) {
      const x = (p - 5.5) * CFG.WA;
      for (let a = 0; a < 4; a++) cabosF.add(cabo([[x + 0.12, topA + 0.02, zf], [x + 0.12, CFG.baseY + a * CFG.HA - 0.03, zf]], '#3A7BD5', 0.006));
    }
    grpCabos.add(cabo([[xc - 0.1, 1.22, zf - 0.07], [xc - 0.1, 0.03, zf - 0.07], [xc - 0.1, 0.03, zb], [xc - 0.1, topB + 0.47, zb]], '#E67E22', 0.014));
    cabosB.add(cabo([[-larguraB / 2, topB + 0.47, zb], [larguraB / 2, topB + 0.47, zb]], '#E67E22', 0.014));
    const canaleta = caixaMesh(0.16, 0.025, zb - zf + 0.1, M.amarelo);
    canaleta.position.set(xc - 0.1, 0.012, (zf + zb) / 2);
    grpCabos.add(canaleta);
    grpCabos.add(cabo([[xc, 1.68, zf - 0.07], [xc, 3.55, zf - 0.07]], '#7F8C8D', 0.012));
    const rede = sprite(['Ethernet · VLAN PTL', 'switch → Serviço PTL (API + MQTT + Sybase)'], 1.15, { fundo: 'rgba(46,58,79,0.92)' });
    rede.position.set(xc, 3.85, zf - 0.07);
    grpCabos.add(rede);
    const busF = sprite(['Barramento frente', 'Cat5e + RJ45 · RS-485 + 12 V'], 1.1, { fundo: 'rgba(58,123,213,0.92)' });
    busF.position.set(xA1 + 0.5, topA + 0.25, zf);
    cabosF.add(busF);
    const busB = sprite(['Barramento fundo', 'Cat5e + RJ45 · canaleta de piso'], 1.1, { fundo: 'rgba(230,126,34,0.92)' });
    busB.position.set(xc - 0.1, 0.45, (zf + zb) / 2 + 0.2);
    grpCabos.add(busB);
    grpCabos.visible = S.cabos;
  }

  // ---------------- B2: leitor fixo + painel LCD + botão FECHAR
  let b2 = null;
  function construirB2() {
    const g = new THREE.Group();
    grpEst.add(g);
    const leitor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.3), mat('#20262f', { emissive: '#000000' }));
    leitor.position.set(CFG.xParada, CFG.alturaEsteira + 0.004, CFG.zEsteira);
    g.add(leitor);
    const poste = caixaMesh(0.05, 1.3, 0.05, M.montante);
    poste.position.set(CFG.xParada + 0.55, 0.65, CFG.zEsteira + 0.3);
    g.add(poste);
    const tc = texCanvas(512, 160);
    const lcd = new THREE.Group();
    lcd.position.set(CFG.xParada + 0.55, 1.36, CFG.zEsteira + 0.33);
    lcd.rotation.x = -0.35;
    g.add(lcd);
    lcd.add(caixaMesh(0.36, 0.17, 0.04, M.corpo));
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), new THREE.MeshBasicMaterial({ map: tc.t }));
    tela.position.set(0, 0.02, 0.021);
    lcd.add(tela);
    const bm = mat('#c0392b', { emissive: '#3a0905' });
    const botao = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 24), bm);
    botao.rotation.x = Math.PI / 2;
    botao.position.set(0.12, -0.055, 0.03);
    lcd.add(botao);
    const rot = placa('FECHAR', 0.08, 0.022, { fundo: '#1d2129', cor: '#ffffff', escala: 0.7 });
    rot.position.set(0.02, -0.055, 0.021);
    lcd.add(rot);
    botao.userData.acao = () => leitura('leitor fixo');
    clicaveis.push(botao);
    b2 = { g, leitor, tc, botao, leituraT: 0 };
    g.visible = S.modo === 'B2';
    desenharLCD();
  }

  // ======================================================================= ESTEIRA, PISO, OPERADOR
  (function cenario() {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), M.piso);
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    scene.add(piso);
    [0.32, 1.22].forEach((z) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.06), M.amarelo);
      f.rotation.x = -Math.PI / 2;
      f.position.set(0, 0.004, z);
      scene.add(f);
    });
    const L = CFG.xFim - CFG.xInicio + 2, cx = (CFG.xFim + CFG.xInicio) / 2, zE = CFG.zEsteira, h = CFG.alturaEsteira, W = CFG.larguraEsteira;
    [-1, 1].forEach((s) => {
      const lat = caixaMesh(L, 0.09, 0.04, M.esteira);
      lat.position.set(cx, h - 0.02, zE + s * (W / 2 + 0.02));
      scene.add(lat);
    });
    const pernas = [];
    for (let x = CFG.xInicio; x <= CFG.xFim; x += 1.6) [-1, 1].forEach((s) => pernas.push(matriz(x, (h - 0.05) / 2, zE + s * (W / 2), 0, 0, 0, 0.05, h - 0.05, 0.05)));
    scene.add(instanciado(new THREE.BoxGeometry(1, 1, 1), M.esteira, pernas, true));
    const rol = [];
    for (let x = CFG.xInicio - 1; x <= CFG.xFim + 1; x += 0.085) rol.push(matriz(x, h - 0.012, zE, Math.PI / 2, 0, 0, 1, 1, 1));
    scene.add(instanciado(new THREE.CylinderGeometry(0.022, 0.022, W, 10), M.rolete, rol, false));
    const seta = sprite(['Esteira → (controlada pelo BHT)'], 1.5, { fundo: 'rgba(46,58,79,0.85)' });
    seta.position.set(-9, h + 0.4, zE);
    scene.add(seta);
  })();

  // operador
  const oper = { x: 0.4, z: CFG.zOperFrente, alvo: null, resolve: null, olhar: 'frente', anim: null, animT: 0, passo: 0 };
  const avatar = new THREE.Group();
  scene.add(avatar);
  (function montarAvatar() {
    const pele = mat('#d9a679'), calca = mat('#2E3A4F'), colete = mat('#F2A33A'), camisa = mat('#34495E');
    const mkPerna = (s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.09, 0.86, 0);
      const m = caixaMesh(0.12, 0.84, 0.14, calca);
      m.position.y = -0.42;
      p.add(m);
      const pe = caixaMesh(0.12, 0.06, 0.22, mat('#1b1f26'));
      pe.position.set(0, -0.84, 0.04);
      p.add(pe);
      avatar.add(p);
      return p;
    };
    avatar.userData.pernas = [mkPerna(-1), mkPerna(1)];
    const tronco = caixaMesh(0.4, 0.6, 0.24, camisa);
    tronco.position.y = 1.18;
    avatar.add(tronco);
    const vest = caixaMesh(0.42, 0.44, 0.26, colete);
    vest.position.y = 1.22;
    avatar.add(vest);
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), pele);
    cabeca.position.y = 1.62;
    cabeca.castShadow = true;
    avatar.add(cabeca);
    const bone = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2F5597'));
    bone.position.y = 1.65;
    avatar.add(bone);
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

  // ======================================================================= CAIXAS
  function gerarItens() {
    const media = S.itens;
    const n = Math.max(1, Math.min(enderecos.length, Math.round(media * (0.6 + Math.random() * 0.8))));
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
    const seg = DADOS[S.est].info.segmento;
    const id = 'CX' + pad(++seqCaixa, 6);
    const g = new THREE.Group();
    const corpo = caixaMesh(0.56, 0.3, 0.4, mat(COR_SEG[seg] || '#1F6FB5', { roughness: 0.55 }));
    g.add(corpo);
    const borda = caixaMesh(0.58, 0.03, 0.42, mat('#163a5f'));
    borda.position.y = 0.15;
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
    const et = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: tc.t }));
    et.position.set(0, 0, 0.202);
    g.add(et);
    const tag = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), mat('#7B4FA0'));
    tag.position.set(0.2, -0.07, 0.202);
    g.add(tag);
    g.userData.tag = tag;
    g.position.set(xIni, CFG.alturaEsteira + 0.15, CFG.zEsteira);
    scene.add(g);
    const cx = { id, g, x: xIni, alvoX: xIni, papel: 'fila', itens: gerarItens(), t0: 0, tag: 'E0' + pad((seqCaixa * 2654435761) % 0xffffff, 6).toUpperCase() };
    tag.visible = S.modo !== 'A';
    caixasCena.push(cx);
    return cx;
  }
  function reiniciarCaixas() {
    caixasCena.forEach((c) => { scene.remove(c.g); c.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
    caixasCena.length = 0;
    atual = novaCaixa(CFG.xInicio + 2);
    atual.papel = 'atual';
    atual.alvoX = CFG.xParada;
    fila = novaCaixa(CFG.xInicio);
    fila.alvoX = CFG.xFila;
    estado = 'AGUARDANDO';
  }
  function caixaChegou(c) {
    if (c.papel === 'atual' && estado === 'AGUARDANDO') {
      estado = 'NA_POSICAO';
      log('BHT', `Caixa ${c.id} parada na estação ${S.est} (${c.itens.length} itens nesta estação)`);
      if (S.modo === 'B2') esperar(0.8).then(() => { if (estado === 'NA_POSICAO' && S.modo === 'B2' && atual === c) leitura('leitor fixo'); });
      atualizarUI();
    }
    if (c.papel === 'saindo') {
      scene.remove(c.g);
      caixasCena.splice(caixasCena.indexOf(c), 1);
    }
  }

  // ======================================================================= REGRAS DO SERVIÇO PTL
  const ordemRota = (a, b) => a.e.ordem - b.e.ordem || a.e.predio - b.e.predio || a.e.andar - b.e.andar;
  function pendentes() { return atual ? atual.itens.filter((i) => i.status === 'pendente').length : 0; }

  function leitura(origem) {
    const ori = origem || (S.modo === 'A' ? 'coletor' : S.modo === 'B1' ? 'pulseira' : 'leitor fixo');
    if (estado === 'AGUARDANDO' || estado === 'FECHADA') { log('API', `Leitura (${ori}) sem caixa na posição — ignorada`); return; }
    if (ori !== 'coletor') {
      log('RFID', `${ori === 'pulseira' ? 'Pulseira' : 'Leitor fixo'} leu tag ${atual.tag} → caixa ${atual.id}`);
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
    log('MQTT', `ptl/est${S.est}/cmd SEPARAR caixa=${atual.id} itens=${its.length} (Q:${q.length} · blocos:${blocos} · zonas:${zonas})`);
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
    log('BHT', `Caixa ${atual.id} liberada para a próxima estação`);
    K.caixas++;
    K.tempoTotal += dur;
    atual.duracao = dur;
    atual.pend = p;
    estado = 'FECHADA';
    fechadaAte = simT + 1.6;
    const saindo = atual;
    saindo.papel = 'saindo';
    saindo.alvoX = CFG.xFim + 1;
    atualizarDestaques();
    atualizarUI();
    esperar(0.5).then(() => {
      atual = fila;
      atual.papel = 'atual';
      atual.alvoX = CFG.xParada;
      fila = novaCaixa(CFG.xInicio);
      fila.alvoX = CFG.xFila;
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
    enderecos.forEach((e) => { e.toteMat.emissive.set('#000000'); });
    Object.values(guias).forEach((g) => { g.emissive.set('#000000'); g.color.set('#3a2a10'); });
    acesos = [];
    modulos.forEach((m) => {
      if (!m.item) return;
      acesos.push(m.item.e);
      if (S.guia && m.tipo === 'EQ' && !m.falha) {
        const g = guias[(m.item.e.lado === 'frente' ? 'frente-' : 'fundo-') + m.item.e.predio];
        if (g) { g.color.set('#F2A33A'); g.emissive.set('#F2A33A'); }
      }
    });
  }

  // ======================================================================= TEMPO SIMULADO E OPERADOR AUTOMÁTICO
  const esperas = [];
  function esperar(s) { return new Promise((r) => esperas.push({ t: simT + s, r })); }
  function andarAte(x, z) {
    return new Promise((r) => {
      if (oper.resolve) oper.resolve();
      oper.alvo = { x, z };
      oper.resolve = r;
    });
  }
  const posCaixa = () => ({ x: CFG.xParada + 0.35, z: CFG.zOperFrente });
  const posPega = (e) => ({ x: e.x, z: e.lado === 'frente' ? CFG.zOperFrente : CFG.zOperFundo });

  function proximoAlvo() {
    let melhor = null, dMin = 1e9;
    modulos.forEach((m) => {
      if (!m.item || m.falha) return;
      const p = posPega(m.item.e);
      const d = Math.abs(p.x - oper.x) + Math.abs(p.z - oper.z) * 1.4;
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
        oper.olhar = 'frente';
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
        const p = posPega(alvo.e);
        if (carregando >= 3 || (carregando > 0 && Math.abs(p.x - oper.x) + Math.abs(p.z - oper.z) > 3.5)) {
          const pc = posCaixa();
          await andarAte(pc.x, pc.z);
          oper.olhar = 'frente'; oper.anim = 'pega'; oper.animT = CFG.tempoDeposito;
          await esperar(CFG.tempoDeposito);
          carregando = 0;
          continue;
        }
        await andarAte(p.x, p.z);
        if (!ativo()) break;
        oper.olhar = alvo.e.lado;
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
        oper.olhar = 'frente';
        if (carregando) { oper.anim = 'pega'; oper.animT = CFG.tempoDeposito; await esperar(CFG.tempoDeposito); carregando = 0; }
        oper.anim = 'leitura'; oper.animT = 0.6;
        await esperar(0.6);
        if (ativo() && estado === 'PRONTA') leitura();
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

  function telaColetor() {
    const est = S.est, n = atual ? atual.itens.length : 0, ok = n - pendentes();
    const ativos = modulos.filter((m) => m.item);
    const fr = ativos.filter((m) => m.lado === 'frente').reduce((s, m) => s + m.fila.length, 0);
    const fu = ativos.filter((m) => m.lado === 'fundo').reduce((s, m) => s + m.fila.length, 0);
    const zonasAtivas = ativos.filter((m) => m.lado === 'fundo').map((m) => m.nome.replace('Zona ', '')).join(', ') || '—';
    if (estado === 'FECHADA' || simT < fechadaAte) {
      const c = caixasCena.find((x) => x.papel === 'saindo');
      return { cor: '#16A085', tit: 'Caixa fechada', corpo: `<div class="grande">✓</div><div class="media">${c ? c.id : ''}</div><div class="p">Tempo na estação ${c ? fmtT(c.duracao) : ''}${c && c.pend ? ` · ${c.pend} pendência(s) p/ conferência` : ''}</div>`, rod: 'Aguardando a próxima caixa' };
    }
    if (estado === 'AGUARDANDO') return { cor: '#2F5597', tit: `PTL · Estação ${est}`, corpo: '<div class="media">Aguardando caixa</div><div class="p">A esteira está trazendo a próxima caixa</div>', rod: 'Leitura abre a caixa' };
    if (estado === 'NA_POSICAO') return { cor: '#2F5597', tit: `PTL · Estação ${est}`, corpo: `<div class="media">Caixa na posição</div><div class="p">${S.modo === 'A' ? 'Aponte para a etiqueta e aperte o gatilho' : S.modo === 'B1' ? 'Aproxime a pulseira da tag da caixa' : 'Leitor fixo lendo a tag…'}</div>`, rod: 'Leitura abre a caixa' };
    if (estado === 'SEPARANDO') return { cor: '#2E8B57', tit: `Caixa ${atual.id}`, corpo: `<div class="p">Separando</div><div class="grande">${ok} / ${n}</div><div class="progresso"><i style="width:${(100 * ok) / n}%"></i></div><div class="lista"><div><span>Frente (alto giro)</span><b>${fr}</b></div><div><span>Fundo (baixo giro)</span><b>${fu}</b></div><div><span>Zonas ativas</span><b>${zonasAtivas}</b></div></div>`, rod: 'Nova leitura fecha a caixa' };
    if (estado === 'PRONTA') return { cor: '#2E8B57', tit: 'Estação concluída', corpo: `<div class="grande">${n} / ${n}</div><div class="media">Todos os LEDs apagados</div><div class="p">Leia a etiqueta de novo para fechar</div>`, rod: 'Gatilho fecha a caixa' };
    if (estado === 'ALERTA') return { cor: '#C0392B', tit: 'Atenção', corpo: `<div class="media" style="color:#C0392B">Caixa com itens pendentes</div><div class="grande">${n - ok}</div><div class="p">itens não confirmados. Continue separando ou leia de novo para fechar mesmo assim.</div>`, rod: 'Pendência vai para a conferência' };
    return { cor: '#2F5597', tit: '', corpo: '', rod: '' };
  }
  function linhasLCD() {
    const n = atual ? atual.itens.length : 0, ok = n - pendentes();
    const id = atual ? atual.id : '';
    if (estado === 'FECHADA' || simT < fechadaAte) { const c = caixasCena.find((x) => x.papel === 'saindo'); return ['CAIXA FECHADA', c ? c.id : '', 'TEMPO ' + (c ? fmtT(c.duracao) : ''), '']; }
    if (estado === 'AGUARDANDO') return [`PTL EST ${S.est}   B2 RFID`, 'AGUARDANDO CAIXA', '', ''];
    if (estado === 'NA_POSICAO') return ['CAIXA NA POSICAO', 'LENDO TAG...', '', ''];
    if (estado === 'SEPARANDO') {
      const z = modulos.filter((m) => m.item && m.lado === 'fundo').map((m) => m.nome.replace('Zona ', '')).join(' ');
      return [`${id}  ${pad(ok, 2)}/${pad(n, 2)}`, `ZONAS: ${z || '-'}`, `FRENTE ${modulos.filter((m) => m.item && m.lado === 'frente').reduce((s, m) => s + m.fila.length, 0)}`, 'FECHAR=NOVA LEITURA'];
    }
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
      el.innerHTML = `<div class="lcd"><div class="vidro">${linhasLCD().map((l) => l.slice(0, 20).padEnd(20, ' ')).join('\n')}</div><div class="rot">Painel da estação · LCD 20×4 + botão FECHAR · leitor NFC sob a caixa</div></div>`;
      $('#btnLeitura').textContent = 'FECHAR (nova leitura)';
    } else {
      const t = telaColetor();
      const n = atual ? atual.itens.length : 0, ok = n - pendentes();
      const txt = estado === 'SEPARANDO' ? `<span>${atual.id}</span><b>${ok}/${n}</b><span>itens</span>` : estado === 'PRONTA' ? '<b>OK</b><span>aproxime para fechar</span>' : estado === 'ALERTA' ? `<b style="color:#ff6b5e">${n - ok}</b><span>pendentes</span>` : `<span>${t.tit}</span>`;
      el.innerHTML = `<div class="relogioPulso"><div class="oled">${txt}</div></div>`;
      $('#btnLeitura').textContent = 'Aproximar pulseira da tag';
    }
    $('#dicaTecla').style.visibility = 'visible';
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
    const nome = { AGUARDANDO: 'AGUARDANDO', NA_POSICAO: 'CAIXA NA POSIÇÃO', SEPARANDO: 'SEPARANDO', PRONTA: 'PRONTA P/ FECHAR', ALERTA: 'PENDÊNCIA', FECHADA: 'FECHADA' }[estado];
    ch.textContent = nome;
    ch.className = 'chip ' + estado;
    $('#kCaixas').textContent = K.caixas;
    $('#kItens').textContent = K.itens;
    const med = K.caixas ? K.tempoTotal / K.caixas : 0;
    $('#kTempo').textContent = K.caixas ? fmtT(med) : '–';
    $('#kHora').textContent = K.caixas ? Math.round(3600 / med) : '–';
    $('#kAcesos').textContent = modulos.filter((m) => m.item && !m.falha).length;
    $('#kPend').textContent = K.pendencias;
    const fal = modulos.filter((m) => m.falha);
    const al = $('#alertas');
    al.innerHTML = '';
    fal.forEach((m) => {
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
    construirEstacao();
    zerarKPIs();
    $('#log').innerHTML = '';
    reiniciarCaixas();
    log('API', `PUT /v1/estacoes/${v}/mapa → ${DADOS[v].info.total} endereços carregados de wms_endereco`);
    oper.x = 0.4; oper.z = CFG.zOperFrente; oper.alvo = null;
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
  $('#optCabos').addEventListener('change', (e) => { S.cabos = e.target.checked; if (grpCabos) grpCabos.visible = S.cabos; });
  $('#btnAjuda').addEventListener('click', () => $('#ajuda').classList.remove('oculto'));
  $('#btnFecharAjuda').addEventListener('click', () => $('#ajuda').classList.add('oculto'));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/INPUT|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); leitura(); }
    if (e.code === 'Space' && document.activeElement.tagName === 'BUTTON') { e.preventDefault(); document.activeElement.blur(); leitura(); }
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
    geral: { p: [-10.8, 5.3, 0.35], t: [-1.2, 1.0, 0.15] },
    frente: { p: [0.2, 2.5, 5.6], t: [0, 1.25, -1.3], ocultar: 'fundo' },
    fundo: { p: [0, 2.8, -8.6], t: [0, 1.2, 1.4], ocultar: 'frente' },
    operador: { seguir: true },
  };
  let camAnim = null;
  function aplicarCamera(v, imediato) {
    S.cam = v;
    const c = CAMS[v];
    if (rackFrente) rackFrente.visible = c.ocultar !== 'frente';
    if (rackFundo) rackFundo.visible = c.ocultar !== 'fundo';
    if (grpCabos) { grpCabos.userData.cabosF.visible = c.ocultar !== 'frente'; grpCabos.userData.cabosB.visible = c.ocultar !== 'fundo'; }
    grpEst.children.forEach((o) => { if (o.geometry && o.geometry.type === 'PlaneGeometry' && o.rotation.x === -Math.PI / 2) o.visible = c.ocultar !== 'fundo'; });
    controls.enabled = !c.seguir;
    if (c.seguir) { camAnim = null; return; }
    const to = { p: new THREE.Vector3(...c.p), t: new THREE.Vector3(...c.t) };
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

    // caixas na esteira
    caixasCena.slice().forEach((c) => {
      if (Math.abs(c.alvoX - c.x) > 1e-3) {
        const passo = Math.sign(c.alvoX - c.x) * Math.min(Math.abs(c.alvoX - c.x), CFG.velEsteira * dt);
        c.x += passo;
        c.g.position.x = c.x;
        if (Math.abs(c.alvoX - c.x) <= 1e-3) { c.x = c.alvoX; caixaChegou(c); }
      }
    });

    // operador
    if (oper.alvo) {
      const dx = oper.alvo.x - oper.x, dz = oper.alvo.z - oper.z, d = Math.hypot(dx, dz);
      const passo = CFG.velOperador * dt;
      if (d <= passo) {
        oper.x = oper.alvo.x; oper.z = oper.alvo.z; oper.alvo = null;
        const r = oper.resolve; oper.resolve = null; if (r) r();
      } else {
        oper.x += (dx / d) * passo; oper.z += (dz / d) * passo;
        avatar.rotation.y = Math.atan2(dx, dz);
        oper.passo += dt * 7.5;
      }
    }
    if (!oper.alvo) {
      const alvoRot = oper.olhar === 'frente' ? Math.PI : 0;
      let diff = ((alvoRot - avatar.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      avatar.rotation.y += diff * Math.min(1, dt * 8);
    }
    avatar.position.set(oper.x, 0, oper.z);
    const sw = oper.alvo ? Math.sin(oper.passo) * 0.5 : 0;
    avatar.userData.pernas[0].rotation.x = sw;
    avatar.userData.pernas[1].rotation.x = -sw;
    oper.animT = Math.max(0, oper.animT - dt);
    const [be, bd] = avatar.userData.bracos;
    const alvoBraco = oper.animT > 0 ? (oper.anim === 'leitura' ? -1.25 : -1.9 + Math.sin(simT * 6) * 0.15) : -sw * 0.6;
    bd.rotation.x += (alvoBraco - bd.rotation.x) * Math.min(1, dt * 10);
    be.rotation.x += ((oper.animT > 0 && oper.anim === 'pega' ? -1.7 : sw * 0.6) - be.rotation.x) * Math.min(1, dt * 10);
    avatar.userData.coletor.visible = S.modo === 'A';
    avatar.userData.pulseira.visible = S.modo === 'B1';

    // módulos: piscar falha, flash e botão pressionado
    const pulso = 0.55 + 0.45 * Math.sin(now / 160);
    modulos.forEach((m) => {
      if (m.flash > 0) { m.flash -= dt; if (m.flash <= 0) desenhar(m); }
      if (m.press > 0) { m.press -= dtReal; m.btn.position.z = 0.016; } else m.btn.position.z = 0.024;
      if (m.falha) m.btnMat.emissive.setRGB(pulso > 0.5 ? 0.9 : 0.15, 0.05, 0.03);
    });
    acesos.forEach((e) => {
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
      if (estado === 'FECHADA' && simT >= fechadaAte) { /* aguarda próxima caixa */ }
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
  window.addEventListener('resize', ajustarTopo);
  window.addEventListener('resize', () => {
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
  if (params.get('cam')) document.querySelector(`#selCam button[data-v="${params.get('cam')}"]`).click();
  if (params.get('vel')) document.querySelector(`#selVel button[data-v="${params.get('vel')}"]`).click();
  requestAnimationFrame(loop);

  // apoio a testes e capturas
  window.PTL = { camera, controls, enderecos: () => enderecos, S, K, estado: () => estado, leitura, confirmar, modulos: () => modulos, simularFalha, aplicarCamera };
})();
