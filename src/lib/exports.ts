import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { calcTotaisFinanceiros } from "@/lib/finance";

const PINK = [236, 72, 153] as const;
const ROSE = [251, 113, 133] as const;
const DARK = [30, 30, 30] as const;
const GRAY = [120, 120, 120] as const;
const WHITE = [255, 255, 255] as const;
const GOLD = [202, 138, 4] as const;

export type ExportFilters = {
  regiao?: string;
  partido?: string;
  situacao?: string;
  busca?: string;
};

const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number) => (v || 0).toLocaleString("pt-BR");

function getFilterLabel(filters?: ExportFilters): string {
  if (!filters) return "";
  const parts: string[] = [];
  if (filters.busca) parts.push(`Busca: "${filters.busca}"`);
  if (filters.regiao) parts.push(`Região: ${filters.regiao}`);
  if (filters.partido) parts.push(`Partido: ${filters.partido}`);
  if (filters.situacao) parts.push(`Situação: ${filters.situacao}`);
  return parts.length ? parts.join("  |  ") : "";
}

function addHeader(doc: jsPDF, title: string, filters?: ExportFilters) {
  const w = doc.internal.pageSize.getWidth();
  // Gradient header
  doc.setFillColor(...PINK);
  doc.rect(0, 0, w, 32, "F");
  doc.setFillColor(...ROSE);
  doc.rect(w * 0.4, 0, w * 0.6, 32, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Dra. Fernanda Sarelli", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pré-candidata Dep. Estadual GO 2026 — Aparecida de Goiânia", 14, 21);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 14, 13, { align: "right" });

  // Date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, w - 14, 21, { align: "right" });

  // Filters bar
  const filterLabel = getFilterLabel(filters);
  if (filterLabel) {
    doc.setFillColor(255, 251, 235);
    doc.rect(0, 32, w, 10, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(0, 32, w, 32);
    doc.line(0, 42, w, 42);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GOLD);
    doc.text("FILTROS APLICADOS:", 14, 38);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 80, 0);
    doc.text(filterLabel, 52, 38);
  }

  // Date below header
  const baseY = filterLabel ? 48 : 38;
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, w - 14, baseY, { align: "right" });
}

function getStartY(filters?: ExportFilters) {
  return getFilterLabel(filters) ? 52 : 44;
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    // Footer bar
    doc.setFillColor(250, 250, 250);
    doc.rect(0, h - 14, w, 14, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(0, h - 14, w, h - 14);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 6, { align: "right" });
    doc.setTextColor(...PINK);
    doc.setFont("helvetica", "bold");
    doc.text("Dra. Fernanda Sarelli", 14, h - 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(" — Pré-candidata Dep. Estadual GO 2026", 14 + doc.getTextWidth("Dra. Fernanda Sarelli") + 1, h - 6);
  }
}

export function exportSuplentePDF(s: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "FICHA POLÍTICA");

  let y = 44;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(s.nome || "", 14, y);
  y += 8;

  if (s.regiao_atuacao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Região: ${s.regiao_atuacao}`, 14, y);
    y += 6;
  }

  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(14, y, w - 14, y);
  y += 8;

  const infoData = [
    ["Telefone", s.telefone || "—"],
    ["Cargo Disputado", s.cargo_disputado || "—"],
    ["Ano Eleição", String(s.ano_eleicao || "—")],
    ["Partido", s.partido || "—"],
    ["Situação", s.situacao || "—"],
    ["Total de Votos", fmtN(s.total_votos || 0)],
    ["Expectativa de Votos", fmtN(s.expectativa_votos || 0)],
  ];

  doc.setFontSize(9);
  infoData.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(value, 80, y);
    y += 6;
  });

  y += 4;

  if (s.base_politica) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text("BASE POLÍTICA", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(s.base_politica, w - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 6;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("VALORES DA CAMPANHA", 14, y);
  y += 4;

  const { retirada, plotagem, liderancas, fiscais, totalFinal } = calcTotaisFinanceiros(s);

  autoTable(doc, {
    startY: y,
    head: [["Item", "Cálculo", "Subtotal"]],
    body: [
      ["Retirada Mensal", `${fmt(s.retirada_mensal_valor || 0)} x ${s.retirada_mensal_meses || 0} meses`, fmt(retirada)],
      ["Plotagem", `${fmtN(s.plotagem_qtd || 0)} x ${fmt(s.plotagem_valor_unit || 0)}`, fmt(plotagem)],
      ["Lideranças na Campanha", `${fmtN(s.liderancas_qtd || 0)} x ${fmt(s.liderancas_valor_unit || 0)}`, fmt(liderancas)],
      ["Fiscais no Dia da Eleição", `${fmtN(s.fiscais_qtd || 0)} x ${fmt(s.fiscais_valor_unit || 0)}`, fmt(fiscais)],
    ],
    foot: [["TOTAL CAMPANHA", "", fmt(totalFinal)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    theme: "grid",
    styles: { cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  if (s.assinatura) {
    let sigY = finalY + 12;
    const pageH = doc.internal.pageSize.getHeight();
    if (sigY + 40 > pageH - 20) {
      doc.addPage();
      sigY = 30;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text("ASSINATURA DO CANDIDATO", 14, sigY);
    sigY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, sigY + 28, w - 14, sigY + 28);
    try {
      doc.addImage(s.assinatura, "PNG", 14, sigY, 80, 26);
    } catch (e) {}
    sigY += 32;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(s.nome || "", 14, sigY);
  }

  addFooter(doc);
  doc.save(`Ficha_${(s.nome || "suplente").replace(/\s+/g, "_")}.pdf`);
}

export function exportFichasLotePDF(list: any[]) {
  if (!list.length) return;

  const doc = new jsPDF("p", "mm", "a4");
  list.forEach((s, index) => {
    if (index > 0) doc.addPage();

    const w = doc.internal.pageSize.getWidth();
    addHeader(doc, `FICHA ${index + 1}/${list.length}`);

    let y = 44;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(s.nome || "", 14, y);
    y += 8;

    if (s.regiao_atuacao) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`Região: ${s.regiao_atuacao}`, 14, y);
      y += 6;
    }

    doc.setDrawColor(...PINK);
    doc.setLineWidth(0.5);
    doc.line(14, y, w - 14, y);
    y += 8;

    const infoData = [
      ["Telefone", s.telefone || "—"],
      ["Cargo Disputado", s.cargo_disputado || "—"],
      ["Ano Eleição", String(s.ano_eleicao || "—")],
      ["Partido", s.partido || "—"],
      ["Situação", s.situacao || "—"],
      ["Total de Votos", fmtN(s.total_votos || 0)],
      ["Expectativa de Votos", fmtN(s.expectativa_votos || 0)],
    ];

    doc.setFontSize(9);
    infoData.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(value, 80, y);
      y += 6;
    });

    y += 4;
    if (s.base_politica) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PINK);
      doc.text("BASE POLÍTICA", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(s.base_politica, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 6;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text("VALORES DA CAMPANHA", 14, y);
    y += 4;

    const { retirada, plotagem, liderancas, fiscais, totalFinal } = calcTotaisFinanceiros(s);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Cálculo", "Subtotal"]],
      body: [
        ["Retirada Mensal", `${fmt(s.retirada_mensal_valor || 0)} x ${s.retirada_mensal_meses || 0} meses`, fmt(retirada)],
        ["Plotagem", `${fmtN(s.plotagem_qtd || 0)} x ${fmt(s.plotagem_valor_unit || 0)}`, fmt(plotagem)],
        ["Lideranças na Campanha", `${fmtN(s.liderancas_qtd || 0)} x ${fmt(s.liderancas_valor_unit || 0)}`, fmt(liderancas)],
        ["Fiscais no Dia da Eleição", `${fmtN(s.fiscais_qtd || 0)} x ${fmt(s.fiscais_valor_unit || 0)}`, fmt(fiscais)],
      ],
      foot: [["TOTAL CAMPANHA", "", fmt(totalFinal)]],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [...DARK] },
      footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: "grid",
      styles: { cellPadding: 3 },
    });
  });

  addFooter(doc);
  doc.save("Fichas_Suplentes_Lote.pdf");
}

export function exportAllPDF(list: any[], filters?: ExportFilters) {
  const doc = new jsPDF("l", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "RELATÓRIO GERAL", filters);

  const totalVotos = list.reduce((a, s) => a + (s.total_votos || 0), 0);
  const totalExpect = list.reduce((a, s) => a + (s.expectativa_votos || 0), 0);
  const totalPessoas = list.reduce((a, s) => a + (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0), 0);
  const totalCampanha = list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0);

  let y = getStartY(filters);

  // Summary cards
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);

  const cards = [
    [`${list.length}`, "Candidatos"],
    [fmtN(totalVotos), "Votos"],
    [fmtN(totalExpect), "Expectativa"],
    [fmtN(totalPessoas), "Pessoas de Campo"],
    [fmt(totalCampanha), "Total Campanhas"],
  ];

  const cardW = (w - 28 - 4 * 4) / 5;
  cards.forEach(([val, label], i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(252, 231, 243);
    doc.roundedRect(x, y, cardW, 18, 3, 3, "F");
    doc.setDrawColor(...PINK);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, 18, 3, 3, "S");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text(val, x + cardW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, x + cardW / 2, y + 14, { align: "center" });
  });

  y += 24;

  autoTable(doc, {
    startY: y,
    head: [["#", "Nome", "Região", "Partido", "Situação", "Votos", "Expect.", "Lideranças", "Fiscais", "Pessoas", "Total (R$)"]],
    body: list.map((s, i) => [
      String(i + 1),
      s.nome || "",
      s.regiao_atuacao || "",
      s.partido || "",
      s.situacao || "",
      fmtN(s.total_votos || 0),
      fmtN(s.expectativa_votos || 0),
      fmtN(s.liderancas_qtd || 0),
      fmtN(s.fiscais_qtd || 0),
      fmtN((s.liderancas_qtd || 0) + (s.fiscais_qtd || 0)),
      fmt(calcTotaisFinanceiros(s).totalFinal),
    ]),
    foot: [["", "TOTAL", "", "", "", fmtN(totalVotos), fmtN(totalExpect), "", "", fmtN(totalPessoas), fmt(totalCampanha)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 7, halign: "center" },
    bodyStyles: { fontSize: 7, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 38 },
      4: { cellWidth: 20 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
    },
    theme: "grid",
    styles: { cellPadding: 2 },
  });

  addFooter(doc);

  const filterParts: string[] = [];
  if (filters?.regiao) filterParts.push(filters.regiao);
  if (filters?.partido) filterParts.push(filters.partido);
  const suffix = filterParts.length ? `_${filterParts.join("_").replace(/\s+/g, "_")}` : "";
  doc.save(`Relatorio_Suplentes${suffix}.pdf`);
}

export function exportExcel(list: any[], filters?: ExportFilters) {
  const wb = XLSX.utils.book_new();
  const now = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;
  const filterLabel = getFilterLabel(filters);

  // ── Totalizadores ──
  const totalVotos = list.reduce((a, s) => a + (s.total_votos || 0), 0);
  const totalExpect = list.reduce((a, s) => a + (s.expectativa_votos || 0), 0);
  const totalPessoas = list.reduce((a, s) => a + (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0), 0);
  const totalCampanha = list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalRetirada = list.reduce((a, s) => a + (s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0), 0);
  const totalPlotagem = list.reduce((a, s) => a + (s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0), 0);
  const totalLiderancas = list.reduce((a, s) => a + (s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0), 0);
  const totalFiscais = list.reduce((a, s) => a + (s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0), 0);

  // ── Cabeçalho e Resumo ──
  const rows: any[][] = [
    ["DRA. FERNANDA SARELLI — PAINEL DE SUPLENTES"],
    [`Pré-candidata Dep. Estadual GO 2026 — Aparecida de Goiânia`],
    [`Gerado em ${now}`],
    filterLabel ? [`Filtros: ${filterLabel}`] : [],
    [],
    ["RESUMO EXECUTIVO"],
    ["Total de Candidatos", list.length, "", "Total Votos", totalVotos, "", "Total Expect.", totalExpect],
    ["Total Pessoas de Campo", totalPessoas, "", "Total Retiradas", totalRetirada, "", "Total Campanhas", totalCampanha],
    ["Total Plotagem", totalPlotagem, "", "Total Lideranças", totalLiderancas, "", "Total Fiscais", totalFiscais],
    [],
    ["DADOS DETALHADOS"],
    [
      "#", "Nome", "Nome de Urna", "Base Política", "Região", "Telefone", "Cargo", "Partido", "Situação",
      "Votos", "Expectativa", "Retirada (R$)", "Meses", "Retirada Total",
      "Plotagem Qtd", "Plotagem Unit.", "Plotagem Total",
      "Lideranças Qtd", "Lideranças Unit.", "Lideranças Total",
      "Fiscais Qtd", "Fiscais Unit.", "Fiscais Total",
      "Total Pessoas", "TOTAL CAMPANHA (R$)"
    ],
  ];

  // ── Dados ──
  list.forEach((s, i) => {
    const t = calcTotaisFinanceiros(s);
    rows.push([
      i + 1,
      s.nome || "",
      s.numero_urna || "",
      s.base_politica || "",
      s.regiao_atuacao || "",
      s.telefone || "",
      s.cargo_disputado || "",
      s.partido || "",
      s.situacao || "",
      s.total_votos || 0,
      s.expectativa_votos || 0,
      s.retirada_mensal_valor || 0,
      s.retirada_mensal_meses || 0,
      t.retirada,
      s.plotagem_qtd || 0,
      s.plotagem_valor_unit || 0,
      t.plotagem,
      s.liderancas_qtd || 0,
      s.liderancas_valor_unit || 0,
      t.liderancas,
      s.fiscais_qtd || 0,
      s.fiscais_valor_unit || 0,
      t.fiscais,
      (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0),
      t.totalFinal,
    ]);
  });

  // ── Linha TOTAL ──
  rows.push([
    "", "TOTAL GERAL", "", "", "", "", "", "", "",
    totalVotos, totalExpect,
    "", "", totalRetirada,
    "", "", totalPlotagem,
    "", "", totalLiderancas,
    "", "", totalFiscais,
    totalPessoas, totalCampanha,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Larguras
  ws["!cols"] = [
    { wch: 4 }, { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 6 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 16 },
  ];

  // Merges
  const lastCol = 22;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: lastCol } },
  ];

  // Formatos numéricos BRL nas colunas financeiras
  const dataStartRow = 12; // 0-indexed row where data starts
  const brlCols = [9, 11, 13, 14, 16, 17, 19, 20, 22]; // columns with R$ values
  for (let r = dataStartRow; r < rows.length; r++) {
    brlCols.forEach(c => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].z = '#,##0.00';
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, "Suplentes");

  const filterParts: string[] = [];
  if (filters?.regiao) filterParts.push(filters.regiao);
  if (filters?.partido) filterParts.push(filters.partido);
  const suffix = filterParts.length ? `_${filterParts.join("_").replace(/\s+/g, "_")}` : "";
  XLSX.writeFile(wb, `Planilha_Suplentes${suffix}.xlsx`);
}

// ─── EXCEL LIDERANÇAS ──────────────────────────────────────────────────────

export function exportLiderancasExcel(list: any[]) {
  const wb = XLSX.utils.book_new();
  const now = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;

  const totalMensal = list.reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);
  const totalContrato = list.reduce((a, l) => a + (l.retirada_mensal_valor || 0) * (l.retirada_ate_mes || 10), 0);

  const rows: any[][] = [
    ["DRA. FERNANDA SARELLI — PAINEL DE LIDERANÇAS"],
    ["Pré-candidata Dep. Estadual GO 2026 — Aparecida de Goiânia"],
    [`Gerado em ${now}`],
    [],
    ["RESUMO EXECUTIVO"],
    ["Total de Lideranças", list.length, "", "Total Mensal (R$)", totalMensal, "", "Total Contratos (R$)", totalContrato],
    [],
    ["DADOS DETALHADOS"],
    [
      "#", "Nome", "Região / Setor", "WhatsApp", "CPF",
      "Ligação Política", "Rede Social", "Chave PIX",
      "Retirada Mensal (R$)", "Meses", "Total Contrato (R$)"
    ],
  ];

  list.forEach((l, i) => {
    rows.push([
      i + 1,
      l.nome || "",
      l.regiao || "",
      l.whatsapp || "",
      l.cpf || "",
      l.ligacao_politica || "",
      l.rede_social || "",
      l.chave_pix || "",
      l.retirada_mensal_valor || 0,
      l.retirada_ate_mes || 10,
      (l.retirada_mensal_valor || 0) * (l.retirada_ate_mes || 10),
    ]);
  });

  // TOTAL
  rows.push([
    "", "TOTAL GERAL", "", "", "", "", "", "",
    totalMensal, "", totalContrato,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 4 }, { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 18 },
  ];

  const lastCol = 10;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: lastCol } },
  ];

  // Formatos BRL
  const dataStart = 9;
  for (let r = dataStart; r < rows.length; r++) {
    [8, 10].forEach(c => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].z = '#,##0.00';
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, "Lideranças");
  XLSX.writeFile(wb, "Planilha_Liderancas.xlsx");
}

// ─── LIDERANÇA PDF (Contrato) ──────────────────────────────────────────────

export function exportLiderancaPDF(l: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "CONTRATO DE LIDERANÇA");

  let y = 44;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(l.nome || "", 14, y);
  y += 8;

  if (l.regiao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Setor: ${l.regiao}`, 14, y);
    y += 6;
  }

  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(14, y, w - 14, y);
  y += 8;

  const infoData = [
    ["CPF", l.cpf || "—"],
    ["WhatsApp", l.whatsapp || "—"],
    ["Rede Social", l.rede_social || "—"],
    ["Ligação Política", l.ligacao_politica || "—"],
    ["Chave PIX", l.chave_pix || "—"],
  ];

  doc.setFontSize(9);
  infoData.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(value, 80, y);
    y += 6;
  });

  y += 6;

  // Financial
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("VALORES DO CONTRATO", 14, y);
  y += 4;

  const valorMensal = l.retirada_mensal_valor || 0;
  const ateMes = l.retirada_ate_mes || 10;
  const total = valorMensal * ateMes;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Detalhe", "Valor"]],
    body: [
      ["Retirada Mensal", `${fmt(valorMensal)} × ${ateMes} meses`, fmt(total)],
    ],
    foot: [["TOTAL DO CONTRATO", "", fmt(total)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 9 },
    theme: "grid",
    styles: { cellPadding: 3 },
  });

  // Assinatura
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  if (l.assinatura) {
    let sigY = finalY + 16;
    const pageH = doc.internal.pageSize.getHeight();
    if (sigY + 40 > pageH - 20) { doc.addPage(); sigY = 30; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text("ASSINATURA", 14, sigY);
    sigY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, sigY + 28, w - 14, sigY + 28);
    try { doc.addImage(l.assinatura, "PNG", 14, sigY, 80, 26); } catch (e) {}
    sigY += 32;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(l.nome || "", 14, sigY);
  }

  addFooter(doc);
  doc.save(`Contrato_Lideranca_${(l.nome || "lideranca").replace(/\s+/g, "_")}.pdf`);
}

// ─── ADMINISTRATIVO PDF (Contrato) ─────────────────────────────────────────

export function exportAdminPDF(a: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "CONTRATO ADMINISTRATIVO");

  let y = 44;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(a.nome || "", 14, y);
  y += 10;

  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(14, y, w - 14, y);
  y += 8;

  const infoData = [
    ["CPF", a.cpf || "—"],
    ["WhatsApp", a.whatsapp || "—"],
  ];

  doc.setFontSize(9);
  infoData.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(value, 80, y);
    y += 6;
  });

  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("VALORES DO CONTRATO", 14, y);
  y += 4;

  const valorMensal = a.valor_contrato || 0;
  const ateMes = a.contrato_ate_mes || 10;
  const total = valorMensal * ateMes;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Detalhe", "Valor"]],
    body: [
      ["Salário / Contrato Mensal", `${fmt(valorMensal)} × ${ateMes} meses`, fmt(total)],
    ],
    foot: [["TOTAL DO CONTRATO", "", fmt(total)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 9 },
    theme: "grid",
    styles: { cellPadding: 3 },
  });

  // Assinatura
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  if (a.assinatura) {
    let sigY = finalY + 16;
    const pageH = doc.internal.pageSize.getHeight();
    if (sigY + 40 > pageH - 20) { doc.addPage(); sigY = 30; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text("ASSINATURA", 14, sigY);
    sigY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, sigY + 28, w - 14, sigY + 28);
    try { doc.addImage(a.assinatura, "PNG", 14, sigY, 80, 26); } catch (e) {}
    sigY += 32;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(a.nome || "", 14, sigY);
  }

  addFooter(doc);
  doc.save(`Contrato_Admin_${(a.nome || "admin").replace(/\s+/g, "_")}.pdf`);
}
