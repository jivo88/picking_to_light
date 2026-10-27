// Copia o simulador em arquivo único (gerado por ferramentas/montar_offline.py) para dentro do app.
// Se o arquivo não existir, gera de novo a partir das pastas dos simuladores (precisa de Python 3).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.resolve(__dirname, '..');
const origem = path.join(raiz, 'projeto', 'entregaveis', 'Simulador_PTL.html');
const destino = path.join(__dirname, 'app', 'simulador.html');
const regerar = process.argv.includes('--regerar');

if (regerar || !fs.existsSync(origem)) {
  console.log('Gerando Simulador_PTL.html a partir dos simuladores...');
  const args = [path.join(raiz, 'ferramentas', 'montar_offline.py'), origem];
  const candidatos = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let ok = false;
  for (const py of candidatos) {
    try { execFileSync(py, args, { stdio: 'inherit', cwd: raiz }); ok = true; break; } catch (e) { /* tenta o próximo */ }
  }
  if (!ok) { console.error('Não achei o Python 3. Instale o Python ou use o Simulador_PTL.html que já está no repositório.'); process.exit(1); }
}
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.copyFileSync(origem, destino);
console.log('ok', destino, (fs.statSync(destino).size / 1024).toFixed(0) + ' KB');
