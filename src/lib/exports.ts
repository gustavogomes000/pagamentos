import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { calcTotaisFinanceiros } from "@/lib/finance";
import { getMesInicioComHistorico } from "@/lib/paymentEligibility";
import { MESES_LABEL, MES_INICIO_SUP, MES_INICIO_LID, MES_INICIO_ADM, MES_FIM } from "@/components/dashboard/types";

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
  doc.text("Pré-candidata Dep. Estadual GO 2026 — Goiânia", 14, 21);

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
    doc.text("ASSINATURA DO SUPLENTE", 14, sigY);
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

export function exportAllPDF(list: any[], filters?: ExportFilters, municipiosMap?: Record<string, string>) {
  const doc = new jsPDF("l", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "RELATÓRIO GERAL", filters);

  const totalVotos = list.reduce((a, s) => a + (s.total_votos || 0), 0);
  const totalExpect = list.reduce((a, s) => a + (s.expectativa_votos || 0), 0);
  const totalCampanha = list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0);

  let y = getStartY(filters);

  // Summary cards (sem "Pessoas de Campo")
  const cards = [
    [`${list.length}`, "Suplentes"],
    [fmtN(totalVotos), "Votos"],
    [fmtN(totalExpect), "Expectativa"],
    [fmt(totalCampanha), "Total Campanhas"],
  ];

  const cardW = (w - 28 - 3 * 4) / 4;
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

  // Group by city if municipiosMap provided
  const groups = groupByCity(list, municipiosMap);

  groups.forEach((group, gIdx) => {
    if (gIdx > 0) {
      y += 6;
      // Check if we need a new page
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 20;
      }
    }

    if (groups.length > 1) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PINK);
      doc.text(`>> ${group.cidade}`, 14, y);
      y += 5;
    }

    autoTable(doc, {
      startY: y,
      head: [["#", "Nome", "Região", "Partido", "Situação", "Votos", "Expect.", "Total (R$)"]],
      body: group.items.map((s: any, i: number) => [
        String(i + 1),
        s.nome || "",
        s.regiao_atuacao || "",
        s.partido || "",
        s.situacao || "",
        fmtN(s.total_votos || 0),
        fmtN(s.expectativa_votos || 0),
        fmt(calcTotaisFinanceiros(s).totalFinal),
      ]),
      foot: groups.length > 1 ? [[
        "", `Subtotal ${group.cidade}`, "", "", "",
        fmtN(group.items.reduce((a: number, s: any) => a + (s.total_votos || 0), 0)),
        fmtN(group.items.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0)),
        fmt(group.items.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0)),
      ]] : [[
        "", "TOTAL", "", "", "",
        fmtN(totalVotos), fmtN(totalExpect), fmt(totalCampanha),
      ]],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 7, halign: "center" },
      bodyStyles: { fontSize: 7, textColor: [...DARK] },
      footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 42 },
        4: { cellWidth: 20 },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
      },
      theme: "grid",
      styles: { cellPadding: 2 },
    });

    y = (doc as any).lastAutoTable?.finalY || y + 20;
  });

  // Grand total if multiple cities
  if (groups.length > 1) {
    y += 4;
    if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text(`TOTAL GERAL: ${list.length} suplentes — ${fmtN(totalVotos)} votos — ${fmt(totalCampanha)}`, 14, y);
  }

  addFooter(doc);

  const filterParts: string[] = [];
  if (filters?.regiao) filterParts.push(filters.regiao);
  if (filters?.partido) filterParts.push(filters.partido);
  const suffix = filterParts.length ? `_${filterParts.join("_").replace(/\s+/g, "_")}` : "";
  doc.save(`Relatorio_Suplentes${suffix}.pdf`);
}

// ─── Helper: agrupar por cidade ──────────────────────────────────────────────

function groupByCity(list: any[], municipiosMap?: Record<string, string>) {
  if (!municipiosMap || Object.keys(municipiosMap).length === 0) {
    return [{ cidade: "Todos", items: list }];
  }
  const map = new Map<string, any[]>();
  list.forEach(s => {
    const nome = (s.municipio_id && municipiosMap[s.municipio_id]) || "Sem cidade";
    if (!map.has(nome)) map.set(nome, []);
    map.get(nome)!.push(s);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([cidade, items]) => ({ cidade, items }));
}

export function exportExcel(list: any[], filters?: ExportFilters, municipiosMap?: Record<string, string>) {
  const wb = XLSX.utils.book_new();
  const now = `${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;
  const filterLabel = getFilterLabel(filters);

  // ── Totalizadores ──
  const totalVotos = list.reduce((a, s) => a + (s.total_votos || 0), 0);
  const totalExpect = list.reduce((a, s) => a + (s.expectativa_votos || 0), 0);
  const totalCampanha = list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalRetirada = list.reduce((a, s) => a + (s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0), 0);
  const totalPlotagem = list.reduce((a, s) => a + (s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0), 0);
  const totalLiderancas = list.reduce((a, s) => a + (s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0), 0);
  const totalFiscais = list.reduce((a, s) => a + (s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0), 0);

  // ── Cabeçalho e Resumo ──
  const rows: any[][] = [
    ["DRA. FERNANDA SARELLI — PAINEL DE SUPLENTES"],
    [`Pré-candidata Dep. Estadual GO 2026 — Goiânia`],
    [`Gerado em ${now}`],
    filterLabel ? [`Filtros: ${filterLabel}`] : [],
    [],
    ["RESUMO EXECUTIVO"],
    ["Total de Suplentes", list.length, "", "Total Votos", totalVotos, "", "Total Expect.", totalExpect],
    ["Total Retiradas", totalRetirada, "", "Total Plotagem", totalPlotagem, "", "Total Campanhas", totalCampanha],
    ["Total Lideranças", totalLiderancas, "", "Total Fiscais", totalFiscais],
    [],
  ];

  const groups = groupByCity(list, municipiosMap);
  const headers = [
    "#", "Nome", "Cidade", "Nome de Urna", "Base Política", "Região", "Telefone", "Cargo", "Partido", "Situação",
    "Votos", "Expectativa", "Retirada (R$)", "Meses", "Retirada Total",
    "Plotagem Qtd", "Plotagem Unit.", "Plotagem Total",
    "Lideranças Qtd", "Lideranças Unit.", "Lideranças Total",
    "Fiscais Qtd", "Fiscais Unit.", "Fiscais Total",
    "TOTAL CAMPANHA (R$)"
  ];

  rows.push(["DADOS DETALHADOS"]);
  rows.push(headers);

  let globalIdx = 0;
  groups.forEach(group => {
    if (groups.length > 1) {
      rows.push([`── ${group.cidade} (${group.items.length} suplentes) ──`]);
    }
    group.items.forEach((s: any) => {
      globalIdx++;
      const t = calcTotaisFinanceiros(s);
      rows.push([
        globalIdx,
        s.nome || "",
        group.cidade,
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
        t.totalFinal,
      ]);
    });
    if (groups.length > 1) {
      const subVotos = group.items.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
      const subCamp = group.items.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
      rows.push(["", `Subtotal ${group.cidade}`, "", "", "", "", "", "", "", "", subVotos, "", "", "", "", "", "", "", "", "", "", "", "", "", subCamp]);
    }
  });

  // ── Linha TOTAL ──
  rows.push([
    "", "TOTAL GERAL", "", "", "", "", "", "", "", "",
    totalVotos, totalExpect,
    "", "", totalRetirada,
    "", "", totalPlotagem,
    "", "", totalLiderancas,
    "", "", totalFiscais,
    totalCampanha,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Larguras
  ws["!cols"] = [
    { wch: 4 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 6 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 16 },
  ];

  const lastCol = 24;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: lastCol } },
  ];

  // Formatos BRL
  const brlCols = [12, 14, 16, 17, 19, 20, 22, 23, 24];
  for (let r = 12; r < rows.length; r++) {
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
    ["Pré-candidata Dep. Estadual GO 2026 — Goiânia"],
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

// ─── RELATÓRIO DE AUDITORIA COMPLETO (PDF) ──────────────────────────────────

export type AuditExportData = {
  suplentes: any[];
  liderancas: any[];
  administrativo: any[];
  pagamentos: any[];
  municipiosMap: Record<string, string>;
};

export function exportAuditPDF(data: AuditExportData) {
  const { suplentes, liderancas, administrativo, pagamentos, municipiosMap } = data;
  const doc = new jsPDF("l", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();
  const MESES_RANGE = Array.from({ length: MES_FIM - 2 }, (_, i) => i + 3); // Mar–Set

  addHeader(doc, "RELATÓRIO DE AUDITORIA");

  let y = 44;

  // ── RESUMO GERAL ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("1. RESUMO GERAL", 14, y);
  y += 5;

  const totalSupRetirada = suplentes.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
  const totalSupCampanha = suplentes.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalLidContrato = liderancas.reduce((a: number, l: any) => {
    const inicio = getMesInicioComHistorico({ tipo: "lideranca", pessoaId: l.id, createdAt: l.created_at, mesInicioGlobal: MES_INICIO_LID, pagamentos, categoria: "retirada" });
    const ateMes = Math.min(l.retirada_ate_mes || MES_FIM, MES_FIM);
    return a + (l.retirada_mensal_valor || 0) * Math.max(0, ateMes - inicio + 1);
  }, 0);
  const totalAdmContrato = administrativo.reduce((a: number, ad: any) => {
    const inicio = getMesInicioComHistorico({ tipo: "admin", pessoaId: ad.id, createdAt: ad.created_at, mesInicioGlobal: MES_INICIO_ADM, pagamentos, categoria: "salario" });
    const ateMes = Math.min(ad.contrato_ate_mes || MES_FIM, MES_FIM);
    return a + (ad.valor_contrato || 0) * Math.max(0, ateMes - inicio + 1);
  }, 0);
  const orcamentoTotal = totalSupCampanha + totalLidContrato + totalAdmContrato;
  const totalPago = pagamentos.filter(p => p.ano === 2026).reduce((a: number, p: any) => a + (p.valor || 0), 0);

  autoTable(doc, {
    startY: y,
    head: [["Categoria", "Qtd", "Orçamento Período", "Pago", "Saldo"]],
    body: [
      ["Suplentes", String(suplentes.length), fmt(totalSupCampanha), fmt(pagamentos.filter(p => p.ano === 2026 && p.suplente_id).reduce((a: number, p: any) => a + (p.valor || 0), 0)), fmt(totalSupCampanha - pagamentos.filter(p => p.ano === 2026 && p.suplente_id).reduce((a: number, p: any) => a + (p.valor || 0), 0))],
      ["Lideranças", String(liderancas.length), fmt(totalLidContrato), fmt(pagamentos.filter(p => p.ano === 2026 && p.lideranca_id).reduce((a: number, p: any) => a + (p.valor || 0), 0)), fmt(totalLidContrato - pagamentos.filter(p => p.ano === 2026 && p.lideranca_id).reduce((a: number, p: any) => a + (p.valor || 0), 0))],
      ["Administrativo", String(administrativo.length), fmt(totalAdmContrato), fmt(pagamentos.filter(p => p.ano === 2026 && p.admin_id).reduce((a: number, p: any) => a + (p.valor || 0), 0)), fmt(totalAdmContrato - pagamentos.filter(p => p.ano === 2026 && p.admin_id).reduce((a: number, p: any) => a + (p.valor || 0), 0))],
    ],
    foot: [["TOTAL", String(suplentes.length + liderancas.length + administrativo.length), fmt(orcamentoTotal), fmt(totalPago), fmt(orcamentoTotal - totalPago)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 7 },
    theme: "grid",
    styles: { cellPadding: 2 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable?.finalY + 8 || y + 30;

  // ── 2. SUPLENTES — FLUXO MENSAL POR CIDADE ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("2. SUPLENTES — RETIRADA MENSAL POR CIDADE E PESSOA", 14, y);
  y += 5;

  const cidadesIds = [...new Set(suplentes.map((s: any) => s.municipio_id).filter(Boolean))];
  cidadesIds.sort((a, b) => (municipiosMap[a] || "").localeCompare(municipiosMap[b] || ""));

  cidadesIds.forEach(cidadeId => {
    const nomeCidade = municipiosMap[cidadeId] || "Sem cidade";
    const supsCidade = suplentes.filter((s: any) => s.municipio_id === cidadeId);
    if (!supsCidade.length) return;

    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`>> ${nomeCidade} (${supsCidade.length} suplentes)`, 14, y);
    y += 4;

    const mesHeaders = MESES_RANGE.map(m => MESES_LABEL[m]);
    const head = [["#", "Nome", "Mensal (R$)", "Meses", ...mesHeaders, "Total Retirada", "Total Campanha"]];

    const body = supsCidade.map((s: any, i: number) => {
      const inicio = getMesInicioComHistorico({ tipo: "suplente", pessoaId: s.id, createdAt: s.created_at, mesInicioGlobal: MES_INICIO_SUP, pagamentos, categoria: "retirada" });
      const numMeses = s.retirada_mensal_meses || 0;
      const mesFim = inicio + numMeses - 1;
      const valorMensal = s.retirada_mensal_valor || 0;

      const mesesCols = MESES_RANGE.map(m => {
        if (m >= inicio && m <= mesFim) {
          const pago = pagamentos.filter(p => p.ano === 2026 && p.suplente_id === s.id && p.mes === m && p.categoria === "retirada").reduce((a: number, p: any) => a + (p.valor || 0), 0);
          return pago > 0 ? `${fmt(valorMensal)}\n✓ ${fmt(pago)}` : fmt(valorMensal);
        }
        return "—";
      });

      const t = calcTotaisFinanceiros(s);
      return [String(i + 1), s.nome || "", fmt(valorMensal), String(numMeses), ...mesesCols, fmt(t.retirada), fmt(t.totalFinal)];
    });

    // Subtotais da cidade
    const subMeses = MESES_RANGE.map(m => {
      const previsto = supsCidade.reduce((a: number, s: any) => {
        const inicio = getMesInicioComHistorico({ tipo: "suplente", pessoaId: s.id, createdAt: s.created_at, mesInicioGlobal: MES_INICIO_SUP, pagamentos, categoria: "retirada" });
        const numMeses = s.retirada_mensal_meses || 0;
        const mesFim = inicio + numMeses - 1;
        return (m >= inicio && m <= mesFim) ? a + (s.retirada_mensal_valor || 0) : a;
      }, 0);
      return fmt(previsto);
    });
    const subRetirada = fmt(supsCidade.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0));
    const subCampanha = fmt(supsCidade.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0));

    autoTable(doc, {
      startY: y,
      head,
      body,
      foot: [["", `SUBTOTAL ${nomeCidade.toUpperCase()}`, "", "", ...subMeses, subRetirada, subCampanha]],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 5.5, halign: "center" },
      bodyStyles: { fontSize: 5.5, textColor: [...DARK] },
      footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 5.5 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: "center", cellWidth: 6 },
        1: { cellWidth: 30 },
        2: { halign: "right", cellWidth: 16 },
        3: { halign: "center", cellWidth: 8 },
      },
      theme: "grid",
      styles: { cellPadding: 1.5, overflow: "linebreak" },
    });

    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  });

  // ── 3. LIDERANÇAS — FLUXO MENSAL POR CIDADE ──
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("3. LIDERANÇAS — RETIRADA MENSAL POR CIDADE E PESSOA", 14, y);
  y += 5;

  const cidadesLid = [...new Set(liderancas.map((l: any) => l.municipio_id).filter(Boolean))];
  cidadesLid.sort((a, b) => (municipiosMap[a] || "").localeCompare(municipiosMap[b] || ""));

  cidadesLid.forEach(cidadeId => {
    const nomeCidade = municipiosMap[cidadeId] || "Sem cidade";
    const lidCidade = liderancas.filter((l: any) => l.municipio_id === cidadeId);
    if (!lidCidade.length) return;

    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`>> ${nomeCidade} (${lidCidade.length} lideranças)`, 14, y);
    y += 4;

    const mesHeaders = MESES_RANGE.map(m => MESES_LABEL[m]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Nome", "Setor", "Mensal (R$)", ...mesHeaders, "Total Contrato"]],
      body: lidCidade.map((l: any, i: number) => {
        const inicio = getMesInicioComHistorico({ tipo: "lideranca", pessoaId: l.id, createdAt: l.created_at, mesInicioGlobal: MES_INICIO_LID, pagamentos, categoria: "retirada" });
        const ateMes = Math.min(l.retirada_ate_mes || MES_FIM, MES_FIM);
        const valorMensal = l.retirada_mensal_valor || 0;
        const mesesCols = MESES_RANGE.map(m => {
          if (m >= inicio && m <= ateMes) {
            const pago = pagamentos.filter(p => p.ano === 2026 && p.lideranca_id === l.id && p.mes === m && p.categoria === "retirada").reduce((a: number, p: any) => a + (p.valor || 0), 0);
            return pago > 0 ? `${fmt(valorMensal)}\n✓ ${fmt(pago)}` : fmt(valorMensal);
          }
          return "—";
        });
        const totalContrato = valorMensal * Math.max(0, ateMes - inicio + 1);
        return [String(i + 1), l.nome || "", l.regiao || "", fmt(valorMensal), ...mesesCols, fmt(totalContrato)];
      }),
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [147, 51, 234], textColor: [...WHITE], fontStyle: "bold", fontSize: 5.5, halign: "center" },
      bodyStyles: { fontSize: 5.5, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: "grid",
      styles: { cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: { 0: { halign: "center", cellWidth: 6 }, 1: { cellWidth: 28 }, 2: { cellWidth: 20 } },
    });

    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  });

  // ── 4. ADMINISTRATIVO — FLUXO MENSAL POR CIDADE ──
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("4. ADMINISTRATIVO — SALÁRIO MENSAL POR CIDADE E PESSOA", 14, y);
  y += 5;

  const cidadesAdm = [...new Set(administrativo.map((a: any) => a.municipio_id).filter(Boolean))];
  cidadesAdm.sort((a, b) => (municipiosMap[a] || "").localeCompare(municipiosMap[b] || ""));

  cidadesAdm.forEach(cidadeId => {
    const nomeCidade = municipiosMap[cidadeId] || "Sem cidade";
    const admCidade = administrativo.filter((a: any) => a.municipio_id === cidadeId);
    if (!admCidade.length) return;

    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`>> ${nomeCidade} (${admCidade.length} administrativos)`, 14, y);
    y += 4;

    const mesHeaders = MESES_RANGE.map(m => MESES_LABEL[m]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Nome", "Mensal (R$)", ...mesHeaders, "Total Contrato"]],
      body: admCidade.map((ad: any, i: number) => {
        const inicio = getMesInicioComHistorico({ tipo: "admin", pessoaId: ad.id, createdAt: ad.created_at, mesInicioGlobal: MES_INICIO_ADM, pagamentos, categoria: "salario" });
        const ateMes = Math.min(ad.contrato_ate_mes || MES_FIM, MES_FIM);
        const valorMensal = ad.valor_contrato || 0;
        const mesesCols = MESES_RANGE.map(m => {
          if (m >= inicio && m <= ateMes) {
            const pago = pagamentos.filter(p => p.ano === 2026 && p.admin_id === ad.id && p.mes === m && p.categoria === "salario").reduce((a: number, p: any) => a + (p.valor || 0), 0);
            return pago > 0 ? `${fmt(valorMensal)}\n✓ ${fmt(pago)}` : fmt(valorMensal);
          }
          return "—";
        });
        const totalContrato = valorMensal * Math.max(0, ateMes - inicio + 1);
        return [String(i + 1), ad.nome || "", fmt(valorMensal), ...mesesCols, fmt(totalContrato)];
      }),
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [59, 130, 246], textColor: [...WHITE], fontStyle: "bold", fontSize: 5.5, halign: "center" },
      bodyStyles: { fontSize: 5.5, textColor: [...DARK] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: "grid",
      styles: { cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: { 0: { halign: "center", cellWidth: 6 }, 1: { cellWidth: 30 } },
    });

    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  });

  // ── 5. TODOS OS PAGAMENTOS REALIZADOS ──
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINK);
  doc.text("5. REGISTRO DE PAGAMENTOS REALIZADOS", 14, y);
  y += 5;

  const pag2026 = pagamentos.filter(p => p.ano === 2026).sort((a, b) => a.mes - b.mes || a.categoria.localeCompare(b.categoria));

  // Build name lookup
  const nomeMap = new Map<string, string>();
  suplentes.forEach((s: any) => nomeMap.set(s.id, s.nome));
  liderancas.forEach((l: any) => nomeMap.set(l.id, l.nome));
  administrativo.forEach((a: any) => nomeMap.set(a.id, a.nome));

  if (pag2026.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Mês", "Categoria", "Tipo", "Pessoa", "Cidade", "Valor (R$)", "Observação"]],
      body: pag2026.map((p: any, i: number) => {
        const pessoaId = p.suplente_id || p.lideranca_id || p.admin_id || "";
        const nome = nomeMap.get(pessoaId) || "—";
        const tipo = p.tipo_pessoa === "suplente" ? "Suplente" : p.tipo_pessoa === "lideranca" ? "Liderança" : p.tipo_pessoa === "admin" ? "Admin" : p.tipo_pessoa || "—";
        // Find city
        let cidade = "—";
        if (p.suplente_id) {
          const s = suplentes.find((s: any) => s.id === p.suplente_id);
          if (s?.municipio_id) cidade = municipiosMap[s.municipio_id] || "—";
        } else if (p.lideranca_id) {
          const l = liderancas.find((l: any) => l.id === p.lideranca_id);
          if (l?.municipio_id) cidade = municipiosMap[l.municipio_id] || "—";
        } else if (p.admin_id) {
          const a = administrativo.find((a: any) => a.id === p.admin_id);
          if (a?.municipio_id) cidade = municipiosMap[a.municipio_id] || "—";
        }
        return [String(i + 1), MESES_LABEL[p.mes] || String(p.mes), p.categoria || "", tipo, nome, cidade, fmt(p.valor || 0), p.observacao || ""];
      }),
      foot: [["", "", "", "", "", "TOTAL PAGO", fmt(totalPago), ""]],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [30, 30, 30], textColor: [...WHITE], fontStyle: "bold", fontSize: 6 },
      bodyStyles: { fontSize: 6, textColor: [...DARK] },
      footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 6 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      theme: "grid",
      styles: { cellPadding: 1.5 },
      columnStyles: { 0: { halign: "center", cellWidth: 7 }, 6: { halign: "right" } },
    });
  }

  addFooter(doc);
  doc.save(`Auditoria_Completa_${new Date().toISOString().slice(0, 10)}.pdf`);
}
