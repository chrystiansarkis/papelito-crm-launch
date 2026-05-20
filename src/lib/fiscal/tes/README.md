# TES — Tipo de Entrada/Saída (Protheus)

Módulo que decide o **código TES** que o Protheus precisa receber para cada pedido enviado pelo CRM. Porte do Salesforce Flow `[Order] TES Inteligente` V8 (especificação completa em [docs/integracoes/salesforce-flow-tes.md](../../../../docs/integracoes/salesforce-flow-tes.md)).

## TL;DR — "onde eu mexo?"

| Quero…                                          | Edito                                                      |
|-------------------------------------------------|------------------------------------------------------------|
| Adicionar/remover uma empresa emissora          | [dimensoes.ts](dimensoes.ts) → `PERFIL_FISCAL_POR_CGC` + `UFS_ICMS_ST_POR_CGC` |
| Adicionar/mudar um código TES                   | [regras.ts](regras.ts) → `REGRAS_TES`                       |
| Adicionar warning explícito (com texto próprio) | [regras.ts](regras.ts) → `WARNINGS_EXPLICITOS`              |
| Mudar UFs do conjunto ICMS-ST                   | [dimensoes.ts](dimensoes.ts) → `UFS_ICMS_ST_POR_CGC`        |
| Mudar a lógica de matching                      | [calcular.ts](calcular.ts) (raro — pense duas vezes)        |
| Ver os testes desta regra                       | [__tests__/](__tests__/)                                    |

**Toda mudança em regras/dimensões precisa de teste correspondente** em `__tests__/`. O teste `regras.integridade.test.ts` falha se houver regras duplicadas, códigos TES desconhecidos ou idProtheus duplicado.

## Identidade da empresa: CGC + idProtheus

Cada empresa emissora carrega dois identificadores. Os dois ficam armazenados no orçamento (`crm.orcamentos.empresa_cgc` e `crm.orcamentos.empresa_id_protheus`) para permitir tomada de decisão futura:

| Campo | Origem | Para que serve |
|---|---|---|
| **CGC** (14 dígitos) | `analytics.DIM_EMPRESA.CGC_EMP_NORMALIZADO` | Chave natural, alimenta o Select; chave de lookup em `PERFIL_FISCAL_POR_CGC`. |
| **idProtheus** (ex. `020101`) | `PERFIL_FISCAL_POR_CGC[cgc].idProtheus` | Formato esperado por integrações Protheus / Salesforce que ainda usam `empresa.filial`. |

A edge function lê o `empresa_cgc` do orçamento, calcula TES e injeta o `idProtheus` no payload Protheus. Se o orçamento ainda tem só o idProtheus (legado), a edge function deriva o CGC a partir dele.

## Como funciona

```ts
import { calcularTes, CGC_RCS_DF } from "@/lib/fiscal/tes";

const resultado = calcularTes({
  empresaCgc: CGC_RCS_DF,
  ufCliente: "MG",
  clienteTemSuframa: false,
  tipoSaida: "venda",
});

// resultado === { status: "ok", idTes: 504 }
// — venda com ICMS-ST (MG está no conjunto ICMS-ST da DF)
```

A função é **pura**: não toca em I/O, pode rodar em browser, Node, edge function Deno e testes.

## Dimensões de decisão

1. **`empresaCgc`** — CGC da empresa emissora (alimentado pelo dropdown que lê `analytics.DIM_EMPRESA`).
2. **`ufCliente`** — UF de entrega do cliente (`cliente_crm.entrega_uf`).
3. **`clienteTemSuframa`** — `true` quando `cliente_crm.inscricao_suframa` está preenchida.
4. **`tipoSaida`** — enum do banco (`crm.tipo_saida`): `venda | bonificacao_venda | bonificacao_trade | bonificacao_evento | remessa_evento`.

Derivações feitas dentro de `calcularTes`:
- **`ufClienteEmIcmsSt`** — UF do cliente pertence ao conjunto de UFs ICMS-ST da empresa emissora.
- **`ufClienteIgualUfFilial`** — UF do cliente é igual à UF da filial (para a regra "Cliente do ES").

## Resultado

```ts
type ResultadoTes =
  | { status: "ok";      idTes: number }       // segue para o Protheus
  | { status: "warning"; idTes: null; contexto: string };  // bloqueia e mostra ao vendedor
```

Quando `status === "warning"`, a edge function deve **retornar erro 422** ao frontend (sem enviar ao Protheus) e exibir `contexto` para o vendedor.

## Catálogo de códigos TES emitidos

| `idTes` | Contexto |
|--:|---|
| 501 | Venda sem ICMS-ST (DF sem Suframa; MG; RS; ES sem Suframa com cliente não-ES) |
| 502 | DF com Suframa venda; ES sem Suframa venda com cliente ES |
| 503 | DF bonif. de venda; MG bonif. de venda; ES bonif. com cliente ES |
| 504 | Venda com ICMS-ST (MG/RS/MT/MS/CE) — empresas DF, MG, RS, ES |
| 506 | ES bonif. de venda sem cliente ES |
| 508 | RS bonif. de venda |
| 510 | DF Remessa de Eventos |
| 516 | DF Bonif. Trade |
| 522 | ES com Suframa venda |

## Empresas emissoras configuradas

| CGC | idProtheus | Sigla | UF filial |
|---|---|---|---|
| 14536755000110 | 020101 | RCS_DF | DF |
| 14536755000209 | 020102 | RCS_MG | MG |
| 14536755000381 | 020103 | RCS_RS | RS |
| 14536755000462 | 020104 | RCS_ES | ES |

> Empresas existentes em `analytics.DIM_EMPRESA` que **não estão neste catálogo** (ex.: ROLLING PAPERS, ONE COMERCIO, PAPELITO ECO) são silenciosamente filtradas em [`listEmpresasEmissoras`](../../../features/pedidos/api/listEmpresasEmissoras.ts) — só aparecem no Select empresas presentes em `PERFIL_FISCAL_POR_CGC`. Equivalente ao ramo default "Empresa não registrada" do flow Salesforce original.

## Adicionando uma nova empresa emissora — passo a passo

1. Confirme o `CGC_EMP_NORMALIZADO` em `analytics.DIM_EMPRESA` (consulte via Supabase ou SQL editor).
2. Em [dimensoes.ts](dimensoes.ts):
   - Adicione constante `CGC_NOVA_EMPRESA = "..."`
   - Adicione entrada em `PERFIL_FISCAL_POR_CGC` com `sigla`, `nomeReferencia`, `uf`, `idProtheus`
   - Adicione entrada em `UFS_ICMS_ST_POR_CGC` (set de UFs com ICMS-ST, **excluindo a UF da própria filial**)
3. Em [regras.ts](regras.ts), adicione as regras dessa empresa (todas as combinações de `tipoSaida` que devem retornar TES).
4. Em [__tests__/calcular.success.test.ts](__tests__/calcular.success.test.ts), adicione um caso de teste para cada caminho.
5. Rode `npm run test` — o teste de integridade falha se a nova regra colide com outra, idProtheus duplicado etc.

## Adicionando uma nova regra TES

1. Identifique a combinação (empresa + tipoSaida + suframa? + icmsSt? + clienteES?).
2. Em [regras.ts](regras.ts), adicione uma linha em `REGRAS_TES`. Mantenha agrupado por empresa para facilitar leitura.
3. Adicione teste em [__tests__/calcular.success.test.ts](__tests__/calcular.success.test.ts).
4. Rode `npm run test`.

## Divergências intencionais do flow Salesforce original

| Original | Aqui | Motivo |
|---|---|---|
| Suframa lida de `Filial__r.Suframa__c` | Lida de `cliente_crm.inscricao_suframa` | Migration 20260519120000 documenta que Suframa é benefício do destinatário, não da filial. |
| `Cliente_do_ES` lê `Filial__r.BillingState` | Lê `cliente_crm.entrega_uf` | O label do flow ("Cliente é do ES?") sugere que o autor pretendia testar a UF do cliente — provável bug do original. |
| Mecanismo de Timeline (dedup por título) | Não há | Eventos Timeline são domínio Salesforce. O CRM trata warning retornando 422 — o frontend exibe ao vendedor. |
| Chave de empresa = idProtheus | Chave = CGC; idProtheus mantido como atributo | CGC é a chave natural no `DIM_EMPRESA` e o que o Protheus reconhece. idProtheus é mantido para integrações que ainda precisam dele. |
| Nomes `opVenda`, `opBonif`, etc. | `venda`, `bonificacao_venda`, etc. | Os nomes do enum `crm.tipo_saida` no Postgres já estão consolidados no resto do CRM. |

## Integração

### Fluxo end-to-end

```
vendedor escolhe empresa no form do orcamento
        |
        v
EmpresaEmissoraSelect (UI)  ──►  grava empresa_cgc + empresa_id_protheus no orçamento
        |
        v
salvarOrcamento  ──►  fn_salvar_orcamento (RPC)  ──►  crm.orcamentos
        |
        v
"Enviar ao Protheus"
        |
        v
proxy-protheus-criar-pedido (edge function)
   1. lê empresa_cgc do orçamento
   2. lê entrega_uf + inscricao_suframa do cliente
   3. calcularTes(...) por partição (venda/bonificação)
   4. ok      → POST Protheus com idTes + idProtheus
      warning → 422 ao frontend (sem chamar Protheus)
```

### Pontos de integração

- **Form do orçamento** [`OrcamentoForm.tsx`](../../../features/pedidos/components/OrcamentoForm.tsx) — campo "Empresa emissora" na seção Comercial. Obrigatório para sair do status `rascunho` (gate em [`schemas.orcamento.ts`](../../../features/pedidos/schemas.orcamento.ts) via `superRefine`).
- **Select** [`EmpresaEmissoraSelect.tsx`](../../../features/pedidos/components/EmpresaEmissoraSelect.tsx) — alimentado por [`listEmpresasEmissoras`](../../../features/pedidos/api/listEmpresasEmissoras.ts) (RPC `fn_listar_empresas_emissoras`). Mostra todas as empresas Protheus do `DIM_EMPRESA` e desabilita as sem perfil fiscal TES.
- **Persistência** — `crm.orcamentos.empresa_cgc` + `crm.orcamentos.empresa_id_protheus` (ambos congelados no momento da escolha, ver migrations abaixo).
- **Edge function** [`proxy-protheus-criar-pedido/index.ts`](../../../../supabase/functions/proxy-protheus-criar-pedido/index.ts) — chama `calcularTes()` antes de montar o payload e injeta `idTes` + `idProtheus` por item. Prioriza o `empresa_id_protheus` congelado no orçamento; cai em `getIdProtheusPorCgc(cgc)` se ausente (orçamentos legados).

### Migrations relacionadas

| Migration | O que faz |
|---|---|
| [`20260520120000_orcamento_empresa_emissora.sql`](../../../../supabase/migrations/20260520120000_orcamento_empresa_emissora.sql) | Adiciona `empresa_cgc` e `empresa_id_protheus` em `crm.orcamentos`. |
| [`20260520120100_fn_listar_empresas_emissoras.sql`](../../../../supabase/migrations/20260520120100_fn_listar_empresas_emissoras.sql) | RPC `fn_listar_empresas_emissoras` que expõe `analytics.DIM_EMPRESA` pelo PostgREST (alimenta o Select). |
| [`20260520120200_orcamento_empresa_no_payload.sql`](../../../../supabase/migrations/20260520120200_orcamento_empresa_no_payload.sql) | Estende `fn_salvar_orcamento` para aceitar e validar os dois campos no payload jsonb; atualiza `vw_orcamentos` para expô-los ao frontend. |
