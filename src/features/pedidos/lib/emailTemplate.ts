// Mitigates: A03 (escape de HTML em todos os campos vindos do orcamento — sem
//            innerHTML; o template usa template strings com escape manual),
//            A05 (todos os campos sao string sanitizada por escapeHtml)
//
// Template HTML default para o email de envio de orcamento.
// O usuario pode editar o texto antes de enviar.
import type { Orcamento, OrcamentoItem } from "../types";
import { formatMoney, formatDate } from "@/lib/format";

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailTemplateInput = {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
};

export function buildAssuntoDefault(orcamento: Orcamento): string {
  const numero = orcamento.numero || "novo";
  return `Orcamento ${numero} - Papelito`;
}

export function buildHtmlDefault(input: EmailTemplateInput): string {
  const { orcamento, itens } = input;
  const cliente = escapeHtml(orcamento.cliente_nome || "Cliente");
  const numero = escapeHtml(orcamento.numero);
  const data = escapeHtml(formatDate(orcamento.created_at));
  const validade = escapeHtml(String(orcamento.validade_dias));
  const total = escapeHtml(formatMoney(orcamento.total));
  const subtotal = escapeHtml(formatMoney(orcamento.subtotal));
  const desconto = escapeHtml(formatMoney(orcamento.desconto));
  const condicao = escapeHtml(orcamento.condicao_pgto ?? "A combinar");
  const obs = escapeHtml(orcamento.observacao ?? "");

  const rows = itens
    .map((it, idx) => {
      const seq = idx + 1;
      return `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;">${seq}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;">${escapeHtml(it.produto_nome)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;text-align:right;">${escapeHtml(String(it.qtd))}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;text-align:right;">${escapeHtml(formatMoney(it.vlr_unit))}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;text-align:right;">${escapeHtml(formatMoney(it.vlr_desc))}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;text-align:right;font-weight:600;">${escapeHtml(formatMoney(it.vlr_liq))}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${numero}</title></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:24px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #eee;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #eee;">
          <div style="font-size:11px;letter-spacing:0.08em;color:#888;text-transform:uppercase;">Papelito</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px;">Orcamento ${numero}</div>
        </td></tr>
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-size:14px;">Olá, ${cliente},</p>
          <p style="margin:0 0 12px 0;font-size:13px;line-height:1.5;">
            Segue em anexo o orcamento <b>${numero}</b> emitido em ${data},
            com validade de <b>${validade} dias</b>. Condicao de pagamento:
            <b>${condicao}</b>.
          </p>
          ${obs ? `<p style="margin:0 0 12px 0;font-size:13px;line-height:1.5;color:#444;"><b>Observacao:</b> ${obs}</p>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse;">
            <thead>
              <tr style="background:#f7f7f7;">
                <th style="padding:6px 8px;text-align:left;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">#</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Produto</th>
                <th style="padding:6px 8px;text-align:right;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Qtd</th>
                <th style="padding:6px 8px;text-align:right;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Vlr unit</th>
                <th style="padding:6px 8px;text-align:right;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Desc</th>
                <th style="padding:6px 8px;text-align:right;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr>
              <td></td>
              <td align="right" style="font-size:12px;color:#555;">Subtotal</td>
              <td align="right" style="font-size:12px;color:#222;width:120px;">${subtotal}</td>
            </tr>
            <tr>
              <td></td>
              <td align="right" style="font-size:12px;color:#555;">Desconto</td>
              <td align="right" style="font-size:12px;color:#222;">${desconto}</td>
            </tr>
            <tr>
              <td></td>
              <td align="right" style="font-size:14px;font-weight:700;color:#111;">Total</td>
              <td align="right" style="font-size:14px;font-weight:700;color:#111;">${total}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0 0;font-size:12px;color:#888;line-height:1.5;">
            Pedido sujeito a aprovacao. Caso queira aprovar, basta responder este
            email confirmando.
          </p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;font-size:11px;color:#888;">
          Papelito — papelaria fumageira. Esta mensagem foi gerada via CRM.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
