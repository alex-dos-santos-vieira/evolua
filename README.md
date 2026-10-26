# Evolua

App pessoal (PWA) de **treino, dieta, medidas e diagnóstico corporal**, feito para o celular. Funciona offline e guarda os dados no próprio aparelho.

## O que o app faz

- **Hoje**: calorias e macros do dia, treinos da semana, peso/IMC/cintura e dados do relógio.
- **Treino**: escolha qualquer treino (A, B, C ou D) em qualquer dia. Cada série tem carga e repetições; ao marcar a série, o **cronômetro de descanso** começa sozinho com o tempo do exercício (vibra e apita no fim). Ao concluir, o dia ganha um **check no calendário**. Dá para editar exercícios, séries, repetições e descanso.
- **Dieta**: registre o que comeu por refeição, em gramas ou porções (colher, concha, unidade, fatia…). O app soma calorias, proteína, carboidrato e gordura e compara com a sua meta. Busca na tabela embutida (alimentos brasileiros), **na internet** (Open Food Facts), **por código de barras** (câmera no Android/Chrome) ou cadastre pelo rótulo.
- **Medidas**: registre as medidas com a data que quiser e veja o **diagnóstico**: IMC, risco pela cintura, relação cintura/altura, % de gordura (RFM e Marinha dos EUA), massa magra, TMB (3 equações), GET, meta de calorias e macros, comparação com a avaliação anterior e simetria.
- **Relógio**: registre passos, sono, caminhadas e corridas com a data do relógio (Fitcloud Pro), com imagem opcional.
- **Backup**: exporte e importe um arquivo `.json` com tudo.

## Publicar no GitHub Pages (5 minutos, sem programar)

1. Entre em <https://github.com> e crie uma conta (se ainda não tiver).
2. Clique em **New repository**. Nome: `evolua`. Marque **Public**. Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Descompacte o `evolua.zip` no computador e **arraste todo o conteúdo da pasta** (index.html, sw.js, manifest.webmanifest, .nojekyll e as pastas css, js e icons) para a página. Clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em *Branch*, escolha `main` e `/ (root)` e clique em **Save**.
6. Em 1 a 2 minutos o endereço aparece no topo da página: `https://SEU-USUARIO.github.io/evolua/`.

### Instalar no celular

- **Android (Chrome)**: abra o endereço → menu ⋮ → **Instalar app** (ou Adicionar à tela inicial).
- **iPhone (Safari)**: abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**.

Depois de instalado, o app abre em tela cheia e funciona sem internet (a internet só é usada para buscar alimentos industrializados).

## Atualizar o app

Envie os arquivos alterados para o repositório. Para os celulares pegarem a nova versão logo, aumente o número em `sw.js` (`evolua-v1` → `evolua-v2`).

## Seus dados

Ficam no armazenamento do navegador do celular (IndexedDB), não vão para nenhum servidor. **Faça backup** em Mais → Backup de vez em quando: se o app for desinstalado ou os dados do navegador forem apagados, os registros somem.

## Estrutura

```
index.html            tela base e navegação
css/app.css           visual (claro e escuro)
js/db.js              banco local, dados iniciais e backup
js/calc.js            fórmulas de diagnóstico
js/foods.js           tabela de alimentos
js/ui.js              componentes (gráficos, folhas, avisos)
js/app.js             telas do app
sw.js                 funcionamento offline
manifest.webmanifest  instalação no celular
```

## Referências

OMS (IMC e cintura) · Woolcott & Bergman 2018 (RFM) · Hodgdon & Beckett (Marinha dos EUA) · Gallagher et al. 2000 (faixas de gordura) · Mifflin-St Jeor 1990 · Roza & Shizgal 1984 · Morton et al. 2018 (proteína) · Schoenfeld et al. 2017 (volume) · ACSM (aeróbico) · Tabela TACO/UNICAMP · Open Food Facts.

As estimativas não substituem avaliação de médico e nutricionista.
