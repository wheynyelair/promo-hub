## Plano de implementação

Pedido grande com 3 blocos. Antes de codar, preciso alinhar pontos críticos que afetam banco de dados e segurança.

---

### Bloco 1 — Usuários / Filiais

**1.1 Novos campos em `branch_settings`**
- Migração: adicionar `gestor_nome text`, `gestor_telefone text`, `suporte_contato text`.
- Atualizar `BranchSettingsSection` em `src/routes/_app/usuarios.tsx` com os 3 campos + toast de sucesso (já existe parcialmente para `manager_name/manager_phone` — vou unificar; mantenho colunas antigas por compatibilidade, mas formulário passa a usar os novos nomes).

**1.2 Editar Login/Senha por filial**
- Adicionar ação "Editar credenciais" no card de cada usuário (modal): permite alterar email (login) e senha via `manage-users` edge function (estender ações `update_email` + reaproveitar `reset_password`).
- Toast de sucesso após salvar.

**1.3 Isolamento estrito por filial (CODFILIAL)**
- Hoje o RLS já filtra por `branch = current_branch() OR current_branch() = ANY(branches)`. Isso permite ver lâminas marcadas com a filial do usuário.
- "Isolamento estrito" exigiria remover o array `branches` multi-filial. Preciso confirmar: **isso quebra lâminas hoje compartilhadas entre 2 filiais**.

⚠️ **Pergunta 1**: O array `branches` (lâmina/oferta marcada para várias filiais) deve continuar funcionando, ou força-se 1 lâmina = 1 filial? Recomendo manter `branches[]` — já é isolado: usuário de filial02 nunca vê dado de filial01 a menos que ela esteja explicitamente em `branches`. Se for isso, **nada a mudar** no RLS, só documento.

---

### Bloco 2 — Base Mãe + Promoções Avulsas

**2.1 Nova tabela `price_base` (Tabela Mãe)**
```
codfilial, codprod, ean, descricao, departamento, linha, marca, secao,
ptabela numeric, preco_final numeric, updated_at, updated_by
PK: (codfilial, codprod)
```
- RLS: admin gerencia; filial lê só sua linha.

**2.2 `ImportOffersDialog.tsx` com Tabs**
- Aba A "Base Geral": faz upsert em `price_base` (substitui linhas existentes do mesmo codfilial+codprod).
- Aba B "Promoção Avulsa": fluxo atual em `text_offers` (mantido).

**2.3 Galeria — agrupamento por EAN/CODPROD**
- Em `galeria.tsx` aba Ofertas Texto: agrupar `text_offers` por `ean ?? codprod`, render 1 card por grupo.
- Cada card recebe `offers: TextOffer[]` + `baseRow?: PriceBase`.

**2.4 `TextOfferCard.tsx` — Accordion com tabela comparativa**
- Tabela: Promoção | PTABELA | Desconto% | PRECO_FINAL.
- Linha de menor `preco_final` destacada em verde + ícone.
- Seletor interno (radio) escolhe linha "ativa"; botão COPIAR DADOS usa essa seleção.

---

### Bloco 3 — PDF Catálogo Inteligente

**3.1 `src/lib/pdf.ts`**
- Nova função `generateCatalogPdf(offers, baseRows, filters, branding)`.
- Agrupar por EAN/codprod; calcular `bestOffer = min(preco_final)`; desconto = (ptabela - preco_final) / ptabela.
- Layout: 1 bloco por produto, `rowPageBreak: 'avoid'` no autoTable para evitar quebra no meio.
- Cabeçalho com logo (`branding_settings.logo_url`) + data/hora + chips de filtros aplicados.
- Mini-tabela secundária se >2 promoções.
- Aceita os filtros atuais da galeria como parâmetro.

---

### Pontos que preciso confirmar antes de codar

⚠️ **Pergunta 2**: A planilha da Base Mãe é **uma por filial** (cada filial sobe a sua) ou **uma global** com coluna CODFILIAL multi-loja no mesmo arquivo? Faz diferença no UX do upload.

⚠️ **Pergunta 3**: Login da filial hoje é email auto-gerado (`filial01@dam.local`) compartilhado pelos representantes daquela filial, certo? "Cada filial com credenciais únicas" = manter assim (1 login/filial) ou criar 1 login por representante? Vou assumir **manter 1 login por filial** + permitir admin trocar email/senha desse login.

⚠️ **Pergunta 4**: Para a Base Mãe, qual o formato esperado do arquivo? Mesmo XLSX/CSV do `ImportOffersDialog` atual? Confirmando colunas: `CODFILIAL, CODPROD, EAN, DESCRICAO, DEPARTAMENTO, LINHA, MARCA, SECAO, PTABELA, PRECO_FINAL`.

---

### Tamanho estimado

- 1 migração (price_base + colunas em branch_settings)
- ~6 arquivos editados: `usuarios.tsx`, `ImportOffersDialog.tsx`, `galeria.tsx`, `TextOfferCard.tsx`, `pdf.ts`, `text-offers.ts` (novo hook `usePriceBase`)
- 1 edge function estendida: `manage-users` (action `update_email`)
- ~900–1200 linhas no total

Quer que eu siga com os defaults que sugeri (manter `branches[]`, 1 login por filial, mesmo formato XLSX, Base Mãe global com CODFILIAL no arquivo) ou prefere ajustar alguma resposta antes?
