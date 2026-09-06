import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BankBlock, CashRow } from './types'
import { formatCurrency, formatDateLabelID, formatMonthLabelID } from './format'
import { isRowEmpty } from './rows'

interface GeneratePdfArgs {
  month: string
  banks: BankBlock[]
  cashRows: CashRow[]
}

const PAGE_MARGIN = 40

function bankSubtotal(bank: BankBlock): number {
  return bank.transactions.reduce((sum, row) => sum + row.amount, 0)
}

function cashNet(cashRows: CashRow[]): number {
  return cashRows.reduce(
    (sum, row) => sum + (row.type === 'deposit' ? row.amount : -row.amount),
    0,
  )
}

export function recapPdfFilename(month: string): string {
  return `rekap-kartu-kredit-${month}.pdf`
}

// All wording in the exported PDF is in Bahasa Indonesia, regardless of
// the app UI's language. Returns the built document rather than saving
// it directly, so callers can choose to download it or (where the Web
// Share API supports sharing files) hand it straight to the share
// sheet instead.
export function buildRecapPdf({ month, banks, cashRows }: GeneratePdfArgs): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Rekap Bulanan Penggunaan Kartu Kredit', PAGE_MARGIN, 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(formatMonthLabelID(month), PAGE_MARGIN, 66)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(
    `Dibuat pada ${new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    pageWidth - PAGE_MARGIN,
    48,
    { align: 'right' },
  )
  doc.setTextColor(0)

  let cursorY = 84

  for (const bank of banks) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(bank.bankName, PAGE_MARGIN, cursorY + 16)

    const subtotal = bankSubtotal(bank)
    const filledTransactions = bank.transactions.filter(
      (row) => !isRowEmpty(row),
    )
    const body =
      filledTransactions.length > 0
        ? filledTransactions.map((row, index) => [
            String(index + 1),
            formatDateLabelID(row.date),
            row.description || '-',
            formatCurrency(row.amount),
          ])
        : [['-', '-', 'Tidak ada transaksi', '-']]

    autoTable(doc, {
      startY: cursorY + 24,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['No', 'Tanggal', 'Keterangan', 'Jumlah']],
      body,
      foot: [['', '', 'Subtotal', formatCurrency(subtotal)]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: 20,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        3: { cellWidth: 100, halign: 'right' },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 24
  }

  // Cash section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Kas', PAGE_MARGIN, cursorY + 16)

  const deposits = cashRows
    .filter((r) => r.type === 'deposit')
    .reduce((sum, r) => sum + r.amount, 0)
  const debits = cashRows
    .filter((r) => r.type === 'debit')
    .reduce((sum, r) => sum + r.amount, 0)
  const net = cashNet(cashRows)

  const filledCashRows = cashRows.filter((row) => !isRowEmpty(row))
  const cashBody =
    filledCashRows.length > 0
      ? filledCashRows.map((row, index) => [
          String(index + 1),
          formatDateLabelID(row.date),
          row.type === 'deposit' ? 'Setoran' : 'Debit',
          row.description || '-',
          formatCurrency(row.amount),
        ])
      : [['-', '-', '-', 'Tidak ada transaksi kas', '-']]

  autoTable(doc, {
    startY: cursorY + 24,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['No', 'Tanggal', 'Jenis', 'Keterangan', 'Jumlah']],
    body: cashBody,
    foot: [
      ['', '', '', 'Total Setoran', formatCurrency(deposits)],
      ['', '', '', 'Total Debit', formatCurrency(debits)],
      ['', '', '', 'Kas Bersih', formatCurrency(net)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: 20,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 70 },
      2: { cellWidth: 60 },
      4: { cellWidth: 100, halign: 'right' },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable.finalY + 24

  // Summary
  const grandTotal = banks.reduce((sum, b) => sum + bankSubtotal(b), 0) + net

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Ringkasan', PAGE_MARGIN, cursorY + 16)

  autoTable(doc, {
    startY: cursorY + 24,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Sumber', 'Jumlah']],
    body: [
      ...banks.map((b) => [b.bankName, formatCurrency(bankSubtotal(b))]),
      ['Kas (bersih)', formatCurrency(net)],
    ],
    foot: [['Total Keseluruhan', formatCurrency(grandTotal)]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: {
      fillColor: [219, 234, 254],
      textColor: 20,
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      1: { cellWidth: 120, halign: 'right' },
    },
  })

  return doc
}
