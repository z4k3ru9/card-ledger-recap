import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BankBlock, CashRow } from './types'
import { formatCurrency, formatDateLabel, formatMonthLabel } from './format'

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

export function generateRecapPdf({ month, banks, cashRows }: GeneratePdfArgs) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Monthly Credit Card Usage Recap', PAGE_MARGIN, 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(formatMonthLabel(month), PAGE_MARGIN, 66)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-GB', {
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
    const body =
      bank.transactions.length > 0
        ? bank.transactions.map((row, index) => [
            String(index + 1),
            formatDateLabel(row.date),
            row.description || '-',
            formatCurrency(row.amount),
          ])
        : [['-', '-', 'No transactions recorded', '-']]

    autoTable(doc, {
      startY: cursorY + 24,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['No', 'Date', 'Item', 'Amount']],
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
  doc.text('Cash', PAGE_MARGIN, cursorY + 16)

  const deposits = cashRows
    .filter((r) => r.type === 'deposit')
    .reduce((sum, r) => sum + r.amount, 0)
  const debits = cashRows
    .filter((r) => r.type === 'debit')
    .reduce((sum, r) => sum + r.amount, 0)
  const net = cashNet(cashRows)

  const cashBody =
    cashRows.length > 0
      ? cashRows.map((row, index) => [
          String(index + 1),
          formatDateLabel(row.date),
          row.type === 'deposit' ? 'Deposit' : 'Debit',
          row.description || '-',
          formatCurrency(row.amount),
        ])
      : [['-', '-', '-', 'No cash transactions recorded', '-']]

  autoTable(doc, {
    startY: cursorY + 24,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['No', 'Date', 'Type', 'Item', 'Amount']],
    body: cashBody,
    foot: [
      ['', '', '', 'Deposit total', formatCurrency(deposits)],
      ['', '', '', 'Debit total', formatCurrency(debits)],
      ['', '', '', 'Net cash', formatCurrency(net)],
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
  doc.text('Summary', PAGE_MARGIN, cursorY + 16)

  autoTable(doc, {
    startY: cursorY + 24,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Source', 'Amount']],
    body: [
      ...banks.map((b) => [b.bankName, formatCurrency(bankSubtotal(b))]),
      ['Cash (net)', formatCurrency(net)],
    ],
    foot: [['Grand Total', formatCurrency(grandTotal)]],
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

  doc.save(`credit-card-recap-${month}.pdf`)
}
