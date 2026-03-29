import { IRAQ_PROVINCES } from './iraq-geo'

const PROVINCE_CODES: Record<string, string> = {
  baghdad: 'BG', basra: 'BS', nineveh: 'MO',
  erbil: 'ER', sulaymaniyah: 'SL', kirkuk: 'KK',
  diyala: 'DY', anbar: 'AN', saladin: 'SD',
  najaf: 'NJ', karbala: 'KB', babylon: 'BB',
  wasit: 'WS', dhi_qar: 'DQ', maysan: 'MY',
  muthanna: 'MT', qadisiyah: 'QD', dohuk: 'DH',
}

export function getProvinceCode(key: string): string {
  return PROVINCE_CODES[key] ?? 'XX'
}

export function generatePrivacyCode(): string {
  return String(Math.floor(Math.random() * 900 + 100))
}

export function generateAccessCode(
  provinceKey: string,
  districtKey: string,
  subscriberSeq: number,
  privacyCode?: string
): string {
  const province = IRAQ_PROVINCES[provinceKey]
  const district = province?.districts?.[districtKey]

  const govCode = getProvinceCode(provinceKey)
  const distCode = district?.num ?? '00'
  const seq = subscriberSeq.toString().padStart(3, '0')
  const privacy = privacyCode ?? generatePrivacyCode()

  return `${govCode}-${distCode}-${seq}-${privacy}`
}

export function regeneratePrivacy(existingCode: string): string {
  const parts = existingCode.split('-')
  if (parts.length === 4) {
    return `${parts[0]}-${parts[1]}-${parts[2]}-${generatePrivacyCode()}`
  }
  // Fallback: full code with random privacy
  return `XX-00-000-${generatePrivacyCode()}`
}
