export function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/[^0-9]/g, '')
  const intl = cleaned.startsWith('0') ? '964' + cleaned.slice(1) : cleaned
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
