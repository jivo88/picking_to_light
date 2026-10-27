# Simulador PTL como aplicativo (.exe)

Empacota o simulador unificado (estação 3D, comunicação, lado a lado, controle e operação completa) em um
aplicativo de desktop com [Electron](https://www.electronjs.org/). O Electron leva o próprio Chromium, então
o 3D funciona igual ao navegador e o `.exe` abre com duplo clique, sem internet e sem instalar nada.

## Sem Node no computador: o GitHub gera o .exe

1. Abra github.com/jivo88/picking_to_light, aba **Actions**, workflow **Gerar .exe do simulador**.
2. Clique em **Run workflow** (branch `main`) e espere uns 5 minutos.
3. Baixe o `.exe` na página **Releases** do repositório.

Quando o simulador mudar, rode o workflow de novo: o `.exe` da release é substituído. Para uma versão nova,
aumente `version` no `package.json`.

## O que precisa no computador (para gerar localmente)

- [Node.js](https://nodejs.org/) 18 ou mais novo (LTS).
- VS Code com o repositório aberto.
- Windows, para gerar o `.exe` do Windows.

## Passo a passo no VS Code

1. Abra a pasta do repositório (`picking_to_light`) no VS Code.
2. Menu **Terminal > Executar Tarefa...** (ou `Ctrl+Shift+P` e "Tasks: Run Task") e escolha:
   - **Simulador: instalar dependências**: só na primeira vez (baixa o Electron, uns 100 MB).
   - **Simulador: abrir (testar)**: abre o simulador em uma janela, para conferir.
   - **Simulador: gerar .exe**: gera `app-desktop/dist/Simulador_PTL_1.0.0.exe`. Também é a tarefa padrão
     de build: `Ctrl+Shift+B`.

Pelo terminal, o mesmo fica assim:

```bash
cd app-desktop
npm install        # primeira vez
npm start          # testar
npm run dist       # gerar o .exe portátil
```

O `.exe` é portátil: um arquivo só (cerca de 70 MB), que pode ser copiado para outra máquina ou enviado por
link. Por e-mail ele costuma ser grande demais ou bloqueado; para e-mail continue usando o
`projeto/entregaveis/Simulador_PTL.html`.

## Quando o simulador mudar

O app usa o `projeto/entregaveis/Simulador_PTL.html` (arquivo único, gerado por `ferramentas/montar_offline.py`).
Depois de alterar os simuladores, rode a tarefa **Simulador: atualizar HTML a partir dos simuladores**
(precisa de Python 3) e gere o `.exe` de novo.

## Atalhos dentro do app

- `F11`: tela cheia
- `Ctrl+R`: recarregar
- `F12`: ferramentas de desenvolvedor
- Teclas `1` a `5`: trocam as abas, como no navegador

## Observações

- O Windows SmartScreen pode avisar na primeira vez, porque o `.exe` não é assinado digitalmente. Clique em
  "Mais informações" e "Executar assim mesmo". Para distribuir na empresa, a TI pode assinar o executável.
- As pastas `node_modules/`, `dist/` e `app/` são geradas e ficam fora do git.
