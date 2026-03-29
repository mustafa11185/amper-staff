const ARABIC_MONTHS = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export interface ReceiptData {
  subscriber_name: string
  serial_number: string
  billing_month: number
  billing_year: number
  billing_month_arabic: string
  amount: number
  payment_method: 'cash' | 'furatpay'
  collector_name: string
  branch_name: string
  branch_phone: string
  thank_you: string
}

export function getArabicMonth(month: number): string {
  return ARABIC_MONTHS[month] || ''
}

export function formatReceiptText(data: ReceiptData): string {
  const line = '================================'
  const payLabel = data.payment_method === 'cash' ? 'نقدي' : 'ماستركارد'
  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return [
    line,
    data.branch_name,
    data.branch_phone,
    line,
    `المشترك: ${data.subscriber_name}`,
    `الرقم: ${data.serial_number}`,
    `الشهر المستحق: ${data.billing_month} — ${data.billing_month_arabic} ${data.billing_year}`,
    `المبلغ: ${data.amount.toLocaleString('en')} د.ع`,
    `الدفع: ${payLabel}`,
    `التاريخ: ${today}`,
    `الجابي: ${data.collector_name}`,
    line,
    data.thank_you,
    line,
  ].join('\n')
}

export function formatWhatsAppReceipt(data: ReceiptData): string {
  return [
    '🧾 إيصال دفع',
    `المشترك: ${data.subscriber_name}`,
    `الشهر: ${data.billing_month} — ${data.billing_month_arabic}`,
    `المبلغ: ${data.amount.toLocaleString('en')} د.ع`,
    `${data.branch_name} ⚡`,
  ].join('\n')
}

// ── Printer type detection & management ──

export type PrinterType = 'sunmi' | 'bluetooth' | 'none'

export function detectPrinterType(): PrinterType {
  if (typeof window !== 'undefined' && (window as any).SunmiPrinter) {
    return 'sunmi'
  }
  return getSavedPrinterType()
}

export function getSavedPrinterType(): PrinterType {
  if (typeof window === 'undefined') return 'none'
  return (localStorage.getItem('printer_type') as PrinterType) || 'none'
}

export function savePrinterType(type: PrinterType) {
  localStorage.setItem('printer_type', type)
}

export function getSavedBluetoothDevice(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bt_printer_device')
}

// ── SCENARIO 1: Sunmi built-in printer ──

export function printSunmi(data: ReceiptData) {
  const printer = (window as any).SunmiPrinter
  if (!printer) return false

  const text = formatReceiptText(data)
  printer.printerText(text)
  printer.cutPaper()
  return true
}

// ── SCENARIO 2: Bluetooth printer ──

let btDevice: BluetoothDevice | null = null
let btCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

const BT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const BT_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

export async function connectBluetoothPrinter(): Promise<string> {
  if (!navigator.bluetooth) {
    throw new Error('المتصفح لا يدعم البلوتوث')
  }

  btDevice = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BT_SERVICE_UUID] }],
    optionalServices: [BT_SERVICE_UUID],
  })

  if (!btDevice.gatt) throw new Error('فشل الاتصال بالجهاز')

  const server = await btDevice.gatt.connect()
  const service = await server.getPrimaryService(BT_SERVICE_UUID)
  btCharacteristic = await service.getCharacteristic(BT_CHAR_UUID)

  const deviceName = btDevice.name || 'طابعة بلوتوث'
  localStorage.setItem('bt_printer_device', deviceName)
  savePrinterType('bluetooth')

  return deviceName
}

export async function reconnectBluetooth(): Promise<boolean> {
  if (!btDevice?.gatt) return false
  try {
    const server = await btDevice.gatt.connect()
    const service = await server.getPrimaryService(BT_SERVICE_UUID)
    btCharacteristic = await service.getCharacteristic(BT_CHAR_UUID)
    return true
  } catch {
    return false
  }
}

export async function printBluetooth(data: ReceiptData): Promise<boolean> {
  if (!btCharacteristic) {
    const reconnected = await reconnectBluetooth()
    if (!reconnected) return false
  }

  const text = formatReceiptText(data)
  const encoder = new TextEncoder()
  const encoded = encoder.encode(text + '\n\n\n')

  // Send in chunks of 20 bytes (BLE limit)
  const chunkSize = 20
  for (let i = 0; i < encoded.length; i += chunkSize) {
    const chunk = encoded.slice(i, i + chunkSize)
    await btCharacteristic!.writeValue(chunk)
  }

  return true
}

// ── SCENARIO 3: Browser print / no printer ──

export function printBrowser(data: ReceiptData) {
  const payLabel = data.payment_method === 'cash' ? 'نقدي' : 'ماستركارد'
  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const html = `
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>إيصال</title>
      <style>
        @media print { body { margin: 0; } @page { size: 80mm auto; margin: 4mm; } }
        body { font-family: 'Tajawal', sans-serif; font-size: 13px; text-align: center; max-width: 300px; margin: 0 auto; padding: 10px; }
        .line { border-top: 1px dashed #333; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; text-align: right; }
        .label { color: #666; }
        .value { font-weight: bold; }
        h2 { margin: 4px 0; }
        .amount { font-size: 22px; font-weight: bold; margin: 8px 0; }
        .thanks { margin-top: 8px; font-size: 11px; color: #666; }
      </style>
    </head>
    <body>
      <h2>${data.branch_name}</h2>
      <p style="font-size:11px;color:#666">${data.branch_phone}</p>
      <div class="line"></div>
      <div class="row"><span class="label">المشترك</span><span class="value">${data.subscriber_name}</span></div>
      <div class="row"><span class="label">الرقم</span><span class="value">${data.serial_number}</span></div>
      <div class="row"><span class="label">الشهر المستحق</span><span class="value">${data.billing_month} — ${data.billing_month_arabic} ${data.billing_year}</span></div>
      <div class="line"></div>
      <div class="amount">${data.amount.toLocaleString('en')} د.ع</div>
      <div class="line"></div>
      <div class="row"><span class="label">الدفع</span><span class="value">${payLabel}</span></div>
      <div class="row"><span class="label">التاريخ</span><span class="value">${today}</span></div>
      <div class="row"><span class="label">الجابي</span><span class="value">${data.collector_name}</span></div>
      <div class="line"></div>
      <p class="thanks">${data.thank_you}</p>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=350,height=500')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }
}

// ── Universal print function ──

export async function printReceipt(data: ReceiptData): Promise<boolean> {
  const type = detectPrinterType()

  if (type === 'sunmi') {
    return printSunmi(data)
  }

  if (type === 'bluetooth') {
    try {
      return await printBluetooth(data)
    } catch {
      // Fallback to browser print if BT fails
      printBrowser(data)
      return true
    }
  }

  // No printer — browser print
  printBrowser(data)
  return true
}
