import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { calcTotaisFinanceiros } from "@/lib/finance";

const PINK = [236, 72, 153] as const; // pink-500
const ROSE = [251, 113, 133] as const; // rose-400
const DARK = [30, 30, 30] as const;
const GRAY = [120, 120, 120] as const;
const WHITE = [255, 255, 255] as const;

const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number) => (v || 0).toLocaleString("pt-BR");

function addHeader(doc: jsPDF, title: string) {
  const w = doc.internal.pageSize.getWidth();
  // Pink gradient header bar
  doc.setFillColor(...PINK);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(...ROSE);
  doc.rect(w / 2, 0, w / 2, 28, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Dra. Fernanda Sarelli", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Painel de Suplentes — Aparecida de Goiânia", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 14, 16, { align: "right" });

  // Date
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, w - 14, 34, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 8, { align: "right" });
    doc.text("Dra. Fernanda Sarelli — Pré-candidata Dep. Estadual GO 2026", 14, h - 8);
  }
}

export function exportSuplentePDF(s: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "FICHA POLÍTICA");

  let y = 42;

  // Nome grande
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(s.nome || "", 14, y);
  y += 8;

  // Região
  if (s.regiao_atuacao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Regiao: ${s.regiao_atuacao}`, 14, y);
    y += 6;
  }

  // Separator
  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(14, y, w - 14, y);
  y += 8;

  // Info grid
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

  // Base política
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

  // Financial table
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

  // Assinatura (se existir)
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  if (s.assinatura) {
    let sigY = finalY + 12;
    // Check if we need a new page
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
    } catch (e) {
      // fallback if image fails
    }
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
    addHeader(doc, `FICHA POLITICA ${index + 1}/${list.length}`);

    let y = 42;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(s.nome || "", 14, y);
    y += 8;

    if (s.regiao_atuacao) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`Regiao: ${s.regiao_atuacao}`, 14, y);
      y += 6;
    }

    doc.setDrawColor(...PINK);
    doc.setLineWidth(0.5);
    doc.line(14, y, w - 14, y);
    y += 8;

    const infoData = [
      ["Telefone", s.telefone || "-"],
      ["Cargo Disputado", s.cargo_disputado || "-"],
      ["Ano Eleicao", String(s.ano_eleicao || "-")],
      ["Partido", s.partido || "-"],
      ["Situacao", s.situacao || "-"],
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
      doc.text("BASE POLITICA", 14, y);
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
      head: [["Item", "Calculo", "Subtotal"]],
      body: [
        ["Retirada Mensal", `${fmt(s.retirada_mensal_valor || 0)} x ${s.retirada_mensal_meses || 0} meses`, fmt(retirada)],
        ["Plotagem", `${fmtN(s.plotagem_qtd || 0)} x ${fmt(s.plotagem_valor_unit || 0)}`, fmt(plotagem)],
        ["Liderancas na Campanha", `${fmtN(s.liderancas_qtd || 0)} x ${fmt(s.liderancas_valor_unit || 0)}`, fmt(liderancas)],
        ["Fiscais no Dia da Eleicao", `${fmtN(s.fiscais_qtd || 0)} x ${fmt(s.fiscais_valor_unit || 0)}`, fmt(fiscais)],
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

export function exportAllPDF(list: any[]) {
  const doc = new jsPDF("l", "mm", "a4"); // landscape
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, "RELATÓRIO GERAL");

  const totalVotos = list.reduce((a, s) => a + (s.total_votos || 0), 0);
  const totalExpect = list.reduce((a, s) => a + (s.expectativa_votos || 0), 0);
  const totalPessoas = list.reduce((a, s) => a + (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0), 0);
  const totalCampanha = list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0);

  // Summary cards
  let y = 38;
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
    doc.roundedRect(x, y, cardW, 16, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PINK);
    doc.text(val, x + cardW / 2, y + 7, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, x + cardW / 2, y + 13, { align: "center" });
  });

  y += 22;

  // Table
  autoTable(doc, {
    startY: y,
    head: [["#", "Nome", "Região", "Partido", "Votos", "Expect.", "Lideranças", "Fiscais", "Pessoas", "Total (R$)"]],
    body: list.map((s, i) => [
      String(i + 1),
      s.nome || "",
      s.regiao_atuacao || "",
      s.partido || "",
      fmtN(s.total_votos || 0),
      fmtN(s.expectativa_votos || 0),
      fmtN(s.liderancas_qtd || 0),
      fmtN(s.fiscais_qtd || 0),
      fmtN((s.liderancas_qtd || 0) + (s.fiscais_qtd || 0)),
      fmt(calcTotaisFinanceiros(s).totalFinal),
    ]),
    foot: [["", "TOTAL", "", "", fmtN(totalVotos), fmtN(totalExpect), "", "", fmtN(totalPessoas), fmt(totalCampanha)]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [...PINK], textColor: [...WHITE], fontStyle: "bold", fontSize: 7, halign: "center" },
    bodyStyles: { fontSize: 7, textColor: [...DARK] },
    footStyles: { fillColor: [252, 231, 243], textColor: [...PINK], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 40 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    theme: "grid",
    styles: { cellPadding: 2 },
  });

  addFooter(doc);
  doc.save("Relatorio_Suplentes_Completo.pdf");
}

export function exportExcel(list: any[]) {
  const data = list.map((s, i) => ({
    "#": i + 1,
    "Nome": s.nome,
    "Região": s.regiao_atuacao || "",
    "Telefone": s.telefone || "",
    "Cargo": s.cargo_disputado || "",
    "Partido": s.partido || "",
    "Situação": s.situacao || "",
    "Votos Eleição Passada": s.total_votos || 0,
    "Expectativa Votos": s.expectativa_votos || 0,
    "Retirada Mensal (R$)": s.retirada_mensal_valor || 0,
    "Meses": s.retirada_mensal_meses || 0,
    "Plotagem Qtd": s.plotagem_qtd || 0,
    "Plotagem Unit. (R$)": s.plotagem_valor_unit || 0,
    "Lideranças Qtd": s.liderancas_qtd || 0,
    "Lideranças Unit. (R$)": s.liderancas_valor_unit || 0,
    "Fiscais Qtd": s.fiscais_qtd || 0,
    "Fiscais Unit. (R$)": s.fiscais_valor_unit || 0,
    "Total Pessoas": (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0),
    "Total Campanha (R$)": calcTotaisFinanceiros(s).totalFinal,
  }));

  // Add TOTAL row
  data.push({
    "#": "",
    "Nome": "TOTAL",
    "Região": "",
    "Telefone": "",
    "Cargo": "",
    "Partido": "",
    "Situação": "",
    "Votos Eleição Passada": list.reduce((a, s) => a + (s.total_votos || 0), 0),
    "Expectativa Votos": list.reduce((a, s) => a + (s.expectativa_votos || 0), 0),
    "Retirada Mensal (R$)": "",
    "Meses": "",
    "Plotagem Qtd": list.reduce((a, s) => a + (s.plotagem_qtd || 0), 0),
    "Plotagem Unit. (R$)": "",
    "Lideranças Qtd": list.reduce((a, s) => a + (s.liderancas_qtd || 0), 0),
    "Lideranças Unit. (R$)": "",
    "Fiscais Qtd": list.reduce((a, s) => a + (s.fiscais_qtd || 0), 0),
    "Fiscais Unit. (R$)": "",
    "Total Pessoas": list.reduce((a, s) => a + (s.liderancas_qtd || 0) + (s.fiscais_qtd || 0), 0),
    "Total Campanha (R$)": list.reduce((a, s) => a + calcTotaisFinanceiros(s).totalFinal, 0),
  } as any);

  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws["!cols"] = [
    { wch: 4 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Suplentes");
  XLSX.writeFile(wb, "Planilha_Suplentes.xlsx");
}