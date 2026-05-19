# Salesforce Flow `[Order] TES Inteligente`

> Documentação extraída de [flow.md](../../flow.md) — Salesforce Flow XML, `apiVersion` 65.0, `status` Active.

## Resumo executivo

Automação Salesforce do tipo `AutoLaunchedFlow` que, em todo `Order` salvo (`RecordAfterSave`, `CreateAndUpdate`) com `tipoSaida__c` preenchido, determina automaticamente o código fiscal `idTes__c` (TES — Tipo de Entrada/Saída do Protheus) a partir de cinco dimensões: **empresa emissora** (`Empresa__r.idProtheus__c`), **UF da filial** (`Filial__r.BillingState`), **cadastro Suframa da filial** (`Filial__r.Suframa__c`), **presença de ICMS-ST** (derivada da UF) e **tipo de operação** (`tipoSaida__c`). Quando a combinação não tem TES configurada, o flow zera o `idTes__c` e registra um par de eventos `Timeline__c` (Pedido + Oportunidade) com mecanismo de deduplicação por título.

## Identificação do Flow

| Campo | Valor |
|---|---|
| Label | `[Order] TES Inteligente` |
| Tipo | `AutoLaunchedFlow` |
| Trigger | `RecordAfterSave` em `Order` (`CreateAndUpdate`) |
| Filtro de entrada | `Order.tipoSaida__c` não nulo |
| API version | 65.0 |
| Status | `Active` |
| Versão (descrição) | V8 — "Unificação dos logs e inclusão da timeline" (histórico: V2 log avançado, V3 valida log antes de deletar, V4 melhora negativa) |
| Canvas | `AUTO_LAYOUT_CANVAS` (coordenadas todas `0`) |

## Variáveis, constantes e fórmulas

- `varTES` (String) — rótulo do contexto que causou warning.
- `warnErroTES` (constante, String) — `"Erro no flow de TES"`.
- `warnErroTESDescr` (fórmula) — `{!varTES} & " não configurado(a)"`.
- `warnErroTESv2` (fórmula) — `"Erro no flow de TES [Pedido] #" & {!$Record.Id}` — chave de deduplicação dos eventos `Timeline__c`.

## Fluxo de alto nível

```
start (Order, RecordAfterSave, tipoSaida__c IsNull=false)
  └─► C_pia_4_de_Busca_Logs   (lookup Timeline__c por Titulo__c = warnErroTESv2)
        └─► Qual_empresa      (decisão sobre Empresa__r.idProtheus__c)
              ├─ 020101  RCS DF          → Tem_Suframa_DF
              ├─ 020102  RCS MG          → Tem_Suframa
              ├─ 020103  RCS RS          → Tem_Suframa2
              ├─ 020104  RCS ES          → Tem_Suframa3
              ├─ 010101  ROLLING PAPERS  → C_pia_5_de_Qual_Opera_o
              └─ default → Guarda_TES_Warning4  ("Empresa não registrada")
```

Cada ramo testa Suframa, operação e (quando aplicável) ICMS-ST e Cliente ES, terminando em `recordUpdate Atualizar_TES` (escreve `idTes__c`) ou em `assignment Guarda_TES_Warning` (rota de erro que converge em `C_pia_4_de_Existe_Log`).

## Ramo a ramo

### RCS DF (`idProtheus 020101`) — `Tem_Suframa_DF`

- **Com Suframa** → `operacao`
  - `opVenda` → `Atualizar_TES` → **502**
  - demais operações → `Guarda_TES_Warning2` ("Sem Definição") — Suframa em DF só está mapeada para venda.
- **Sem Suframa** → `Qual_Opera_o`
  - `opVenda` → `Tem_ICMS_ST` (MG/RS/MT/MS/CE)
    - Sim → `Atualizar_TES1` → **504**
    - Não → `Atualizar_TES2` → **501**
  - `opBonif` → `Atualizar_TES3` → **503**
  - `opBonifTrade` → `Atualizar_TES4` → **516**
  - `opBonifEventos` → warning "Bonificação de Eventos"
  - `opRemEventos` → `C_pia_12_de_Atualizar_TES` → **510**
  - default → `Guarda_TES_Warning1` ("Sem Definição")

### RCS MG (`020102`) — `Tem_Suframa`

- **Com Suframa** → warning **"MG sem Suframa configurada"** (regra de negócio: Suframa não deveria estar cadastrada em filial MG).
- **Sem Suframa** → `Qual`
  - `opVenda` → `C_pia_2_de_Tem_ICMS_ST` (MG/RS/MT/MS/CE)
    - Sim → `C_pia_1_de_C_pia_2_de_Atualizar_TES` → **504**
    - Não → `C_pia_2_de_Atualizar_TES` → **501**
  - `opBonif` → `C_pia_1_de_Atualizar_TES` → **503**
  - `opBonifTrade` → warning "Bonificação de Trade"
  - `opBonifEventos` → warning "Bonificação de Eventos"
  - default → warning "Sem Definição"

### RCS RS (`020103`) — `Tem_Suframa2`

- **Com Suframa** → warning **"RS sem Suframa configurada"** (mesma lógica de MG).
- **Sem Suframa** → `C_pia_1_de_Qual_Opera_o`
  - `opVenda` → `C_pia_1_de_Tem_ICMS_ST` (MG/MT/MS/CE — RS **não** entra, pois é a UF da própria filial)
    - Sim → `C_pia_5_de_Atualizar_TES` → **504**
    - Não → `C_pia_4_de_Atualizar_TES` → **501**
  - `opBonif` → `C_pia_3_de_Atualizar_TES` → **508**
  - `opBonifTrade` → warning "Bonificação de Trade"
  - `opBonifEventos` → warning "Bonificação de Eventos"
  - default → warning "Sem Definição"

### RCS ES (`020104`) — `Tem_Suframa3`

- **Com Suframa** → `C_pia_2_de_Qual_Opera_o`
  - `opVenda` → `C_pia_11_de_Atualizar_TES` → **522**
  - default → warning "Sem Definição"
- **Sem Suframa** → `C_pia_3_de_Qual_Opera_o`
  - `opVenda` → `C_pia_3_de_Tem_ICMS_ST` (MG/RS/MT/MS/CE)
    - Sim → `C_pia_7_de_Atualizar_TES` → **504**
    - Não → `Cliente_do_ES` (`Filial__r.BillingState = ES`)
      - Sim → `C_pia_6_de_Atualizar_TES` → **502**
      - Não → `C_pia_9_de_Atualizar_TES` → **501**
  - `opBonif` → `C_pia_2_de_Cliente_do_ES`
    - Sim (ES) → `C_pia_8_de_Atualizar_TES` → **503**
    - Não → `C_pia_10_de_Atualizar_TES` → **506**
  - `opBonifTrade` → warning "Bonificação de Trade"
  - `opBonifEventos` → warning "Bonificação de Eventos"
  - default → warning "Sem Definição"

> **Observação:** a decisão `Cliente_do_ES` lê `$Record.Filial__r.BillingState`, ou seja, avalia a **UF da filial**, não a do cliente, apesar do label "Cliente é do ES?". Pode ser bug ou label enganoso — confirmar com quem mantém o flow.

### ROLLING PAPERS (`010101`) — `C_pia_5_de_Qual_Opera_o`

- `opVenda` → `C_pia_14_de_Atualizar_TES` → **501**
- `opBonif` / `opBonifTrade` / `opBonifEventos` → caem direto em `C_pia_4_de_Existe_Log` (sem warning e sem TES — rota de limpeza)
- default → idem

## Catálogo consolidado de códigos TES emitidos

| `idTes__c` | Contexto |
|---:|---|
| **501** | Venda sem ICMS-ST (DF sem Suframa; MG; RS; ES sem Suframa com cliente não-ES); Rolling Papers venda |
| **502** | DF com Suframa venda; ES sem Suframa venda com cliente ES |
| **503** | DF sem Suframa bonif. de venda; MG bonif. de venda; ES com Suframa bonif. com cliente ES |
| **504** | Venda com ICMS-ST (MG/RS/MT/MS/CE) — ramos DF, MG, RS, ES |
| **506** | ES sem Suframa bonif. de venda sem cliente ES |
| **508** | RS sem Suframa bonif. de venda |
| **510** | DF sem Suframa Remessa de Eventos |
| **516** | DF sem Suframa Bonif. Trade |
| **522** | ES com Suframa venda |

## Operações reconhecidas (`tipoSaida__c`)

`opVenda`, `opBonif` (Bonificação de Venda), `opBonifTrade`, `opBonifEventos`, `opRemEventos` (Remessa de Eventos — só DF).

## Tratamento de warning / Timeline

Todos os ramos sem TES configurado convergem em `C_pia_4_de_Existe_Log`, que ramifica conforme a busca inicial (`C_pia_4_de_Busca_Logs`) encontrou ou não um `Timeline__c` com `Titulo__c = warnErroTESv2`:

- **Existe log** → `C_pia_5_de_Limpa_TES` (limpa `idTes__c`) → `Excluir_registros_1` (deleta WRN da Opportunity) → `C_pia_21_de_Registra_WRN_TL_OPP` (recria WRN Opp) → `Excluir_registros_2` (deleta WRN do Pedido) → `C_pia_18_de_Registra_WRN_TL_ORD` (recria WRN Pedido).
- **Não existe** → `C_pia_11_de_Limpa_TES` (limpa `idTes__c`) → `C_pia_11_de_Registra_WRN_TL_OPP` (cria WRN Opp) → `C_pia_10_de_Registra_WRN_TL_OPP` (cria WRN Pedido — apesar do sufixo `OPP` no nome).

Ambos os caminhos: zeram `idTes__c` e registram dois eventos `Timeline__c` (Objeto `Pedido` e `Oportunidade`; Tipo `Sistema`; Título `warnErroTESv2`; Descrição `warnErroTESDescr`). É o mecanismo de idempotência introduzido na V3+ — apaga warning anterior antes de recriar.

## Observações & inconsistências

1. **Forte duplicação**: ~17 assignments `Guarda_TES_Warning` idênticos exceto pelo valor de `varTES`; ~20 `recordUpdates Atualizar_TES` que só diferem no número. Nomes auto-gerados (`C_pia_X_de_Y` = "Cópia X de Y" com o `ó` perdido na serialização).
2. **MG/RS com Suframa cadastrada → warning** é regra deliberada (Suframa só vale nas UFs da Zona Franca; MG e RS não estão).
3. **Bonificação de Trade e Bonificação de Eventos só têm TES mapeada na empresa DF** — em MG/RS/ES sempre caem em warning, indicando parametrização incompleta dessas operações fora de DF.
4. **`Cliente_do_ES` testa `Filial__r.BillingState`**, não o cliente final. Provável label enganoso ou bug.
5. **Rolling Papers (010101)** só tem TES para venda; demais operações caem silenciosamente em limpeza + warning sem texto descritivo distinto.
6. **Empresas reconhecidas**: 020101 DF, 020102 MG, 020103 RS, 020104 ES, 010101 Rolling Papers. Qualquer outra cai em "Empresa não registrada".
7. **UFs com ICMS-ST** (conjunto referência): MG, RS, MT, MS, CE — composição varia por empresa (RS omite RS, MG omite MG, etc.).

## Referência cruzada no CRM

[supabase/functions/proxy-protheus-criar-pedido/index.ts:19](../../supabase/functions/proxy-protheus-criar-pedido/index.ts#L19) — TODO atual que cita "Mapeamento fiscal completo (CFOPs por UF, TES, natureza)". É o ponto natural onde esta regra precisaria ser portada quando o CRM assumir a responsabilidade de calcular TES (hoje delegada ao Salesforce).
