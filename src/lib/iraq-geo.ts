export const IRAQ_PROVINCES: Record<string, {
  num: string; name: string;
  districts: Record<string, { num: string; name: string }>
}> = {
  baghdad: { num: '01', name: 'بغداد', districts: {
    karkh: { num: '01', name: 'الكرخ' },
    rasafa: { num: '02', name: 'الرصافة' },
    kadhimiya: { num: '03', name: 'الكاظمية' },
    adhamiya: { num: '04', name: 'الأعظمية' },
    krada: { num: '05', name: 'الكرادة' },
    mansour: { num: '06', name: 'المنصور' },
    dora: { num: '07', name: 'الدورة' },
    sadr: { num: '08', name: 'مدينة الصدر' },
    shaab: { num: '09', name: 'الشعب' },
  }},
  basra: { num: '02', name: 'البصرة', districts: {
    markaz: { num: '01', name: 'مركز البصرة' },
    zubair: { num: '02', name: 'الزبير' },
    abul_khaseeb: { num: '03', name: 'أبو الخصيب' },
    qurna: { num: '04', name: 'القرنة' },
    midaina: { num: '05', name: 'المدينة' },
  }},
  nineveh: { num: '03', name: 'نينوى', districts: {
    mosul: { num: '01', name: 'الموصل' },
    tal_afar: { num: '02', name: 'تلعفر' },
    sinjar: { num: '03', name: 'سنجار' },
    hamdaniya: { num: '04', name: 'الحمدانية' },
    baashiqa: { num: '05', name: 'بعشيقة' },
  }},
  erbil: { num: '04', name: 'أربيل', districts: {
    markaz: { num: '01', name: 'مركز أربيل' },
    koisnjaq: { num: '02', name: 'كويسنجق' },
    shaqlawa: { num: '03', name: 'شقلاوة' },
  }},
  sulaymaniyah: { num: '05', name: 'السليمانية', districts: {
    markaz: { num: '01', name: 'مركز السليمانية' },
    halabja: { num: '02', name: 'حلبجة' },
    penjwin: { num: '03', name: 'پنجوين' },
  }},
  kirkuk: { num: '06', name: 'كركوك', districts: {
    markaz: { num: '01', name: 'مركز كركوك' },
    hawija: { num: '02', name: 'الحويجة' },
    dibis: { num: '03', name: 'دبس' },
  }},
  diyala: { num: '07', name: 'ديالى', districts: {
    baquba: { num: '01', name: 'بعقوبة' },
    khanaqin: { num: '02', name: 'خانقين' },
    mandali: { num: '03', name: 'مندلي' },
  }},
  anbar: { num: '08', name: 'الأنبار', districts: {
    ramadi: { num: '01', name: 'الرمادي' },
    falluja: { num: '02', name: 'الفلوجة' },
    hit: { num: '03', name: 'هيت' },
    haditha: { num: '04', name: 'حديثة' },
  }},
  saladin: { num: '09', name: 'صلاح الدين', districts: {
    tikrit: { num: '01', name: 'تكريت' },
    baiji: { num: '02', name: 'بيجي' },
    samarra: { num: '03', name: 'سامراء' },
    sharqat: { num: '04', name: 'الشرقاط' },
  }},
  najaf: { num: '10', name: 'النجف', districts: {
    markaz: { num: '01', name: 'مركز النجف' },
    kufa: { num: '02', name: 'الكوفة' },
    abbasiya: { num: '03', name: 'العباسية' },
  }},
  karbala: { num: '11', name: 'كربلاء', districts: {
    markaz: { num: '01', name: 'مركز كربلاء' },
    hindiya: { num: '02', name: 'الهندية' },
  }},
  babylon: { num: '12', name: 'بابل', districts: {
    hilla: { num: '01', name: 'الحلة' },
    musayyib: { num: '02', name: 'المسيب' },
    hashimiya: { num: '03', name: 'الهاشمية' },
    mahawil: { num: '04', name: 'المحاويل' },
  }},
  wasit: { num: '13', name: 'واسط', districts: {
    kut: { num: '01', name: 'الكوت' },
    numaniya: { num: '02', name: 'النعمانية' },
    suwaira: { num: '03', name: 'الصويرة' },
  }},
  dhi_qar: { num: '14', name: 'ذي قار', districts: {
    nasiriya: { num: '01', name: 'الناصرية' },
    suq_shuyukh: { num: '02', name: 'سوق الشيوخ' },
    rifai: { num: '03', name: 'الرفاعي' },
  }},
  maysan: { num: '15', name: 'ميسان', districts: {
    amara: { num: '01', name: 'العمارة' },
    qalat_salih: { num: '02', name: 'قلعة صالح' },
    ali_gharbi: { num: '03', name: 'علي الغربي' },
  }},
  muthanna: { num: '16', name: 'المثنى', districts: {
    samawa: { num: '01', name: 'السماوة' },
    rumaitha: { num: '02', name: 'الرميثة' },
  }},
  qadisiyah: { num: '17', name: 'القادسية', districts: {
    diwaniya: { num: '01', name: 'الديوانية' },
    afak: { num: '02', name: 'عفك' },
    shamiya: { num: '03', name: 'الشامية' },
  }},
  dohuk: { num: '18', name: 'دهوك', districts: {
    markaz: { num: '01', name: 'مركز دهوك' },
    zakho: { num: '02', name: 'زاخو' },
    amadiya: { num: '03', name: 'العمادية' },
  }},
}

export function getProvinceOptions() {
  return Object.entries(IRAQ_PROVINCES).map(([key, val]) => ({
    key, num: val.num, name: val.name,
  })).sort((a, b) => a.num.localeCompare(b.num))
}

export function getDistrictOptions(provinceKey: string) {
  const province = IRAQ_PROVINCES[provinceKey]
  if (!province) return []
  return Object.entries(province.districts).map(([key, val]) => ({
    key, num: val.num, name: val.name,
  })).sort((a, b) => a.num.localeCompare(b.num))
}

export function generateSubscriberCode(provinceKey: string, districtKey: string, seq: number): string {
  const province = IRAQ_PROVINCES[provinceKey]
  const district = province?.districts[districtKey]
  if (!province || !district) return `00-00-${seq.toString().padStart(4, '0')}`
  return `${province.num}-${district.num}-${seq.toString().padStart(4, '0')}`
}

export function getLocationName(provinceKey: string | null, districtKey: string | null): string {
  if (!provinceKey) return ''
  const province = IRAQ_PROVINCES[provinceKey]
  if (!province) return ''
  if (!districtKey) return province.name
  const district = province.districts[districtKey]
  return district ? `${province.name} — ${district.name}` : province.name
}
