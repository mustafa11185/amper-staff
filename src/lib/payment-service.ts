import crypto from 'crypto'

// FuratPay API endpoints — verify with FuratPay team
// Sandbox: https://sandbox.furatpay.com
// Production: https://api.furatpay.com

// APS (Arab Payment Services / Payfort) endpoints
// Sandbox: https://sbcheckout.payfort.com
// Production: https://checkout.payfort.com

export interface PaymentSettings {
  active_gateway: string
  furatpay_enabled?: boolean
  furatpay_merchant_id?: string | null
  furatpay_api_key?: string | null
  furatpay_secret_key?: string | null
  furatpay_is_sandbox?: boolean
  aps_enabled?: boolean
  aps_merchant_id?: string | null
  aps_access_code?: string | null
  aps_sha_request_phrase?: string | null
  aps_sha_response_phrase?: string | null
  aps_is_sandbox?: boolean
}

export interface PaymentData {
  invoice_id?: string | null
  subscriber_id: string
  subscriber_name: string
  subscriber_phone: string
  amount: number
  billing_month: number
  return_url: string
  callback_url: string
}

export interface PaymentResult {
  payment_url: string
  order_id: string
  gateway: 'furatpay' | 'aps'
}

export async function createPayment(settings: PaymentSettings, data: PaymentData): Promise<PaymentResult> {
  const orderId = data.invoice_id ? `AMPER-${data.invoice_id}` : `AMPER-PAY-${data.subscriber_id}-${Date.now()}`

  if (settings.active_gateway === 'furatpay') {
    if (!settings.furatpay_merchant_id || !settings.furatpay_api_key) {
      throw new Error('بيانات FuratPay غير مكتملة')
    }

    const apiBaseUrl = settings.furatpay_is_sandbox
      ? 'https://sandbox.furatpay.com'
      : 'https://api.furatpay.com'

    const response = await fetch(`${apiBaseUrl}/api/v1/payment/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.furatpay_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: settings.furatpay_merchant_id,
        amount: data.amount,
        currency: 'IQD',
        order_id: orderId,
        description: `فاتورة شهر ${data.billing_month} - ${data.subscriber_name}`,
        callback_url: data.callback_url,
        return_url: data.return_url,
        customer_name: data.subscriber_name,
        customer_phone: data.subscriber_phone,
      }),
    })

    const result = await response.json()
    if (!result.payment_url) {
      console.error('[payment-service] FuratPay no payment_url:', result)
      throw new Error('فشل إنشاء رابط الدفع من FuratPay')
    }

    return { payment_url: result.payment_url, order_id: result.order_id || orderId, gateway: 'furatpay' }
  }

  if (settings.active_gateway === 'aps') {
    if (!settings.aps_merchant_id || !settings.aps_access_code || !settings.aps_sha_request_phrase) {
      throw new Error('بيانات APS غير مكتملة')
    }

    const baseUrl = settings.aps_is_sandbox
      ? 'https://sbcheckout.payfort.com/FortAPI/paymentPage'
      : 'https://checkout.payfort.com/FortAPI/paymentPage'

    // APS amounts are in minor units (fils for IQD — 1 IQD = 1000 fils)
    const params: Record<string, string> = {
      command: 'PURCHASE',
      access_code: settings.aps_access_code,
      merchant_identifier: settings.aps_merchant_id,
      merchant_reference: orderId,
      amount: String(Math.round(data.amount * 1000)),
      currency: 'IQD',
      language: 'ar',
      customer_email: `sub_${data.subscriber_id}@amper.iq`,
      customer_name: data.subscriber_name,
      order_description: `فاتورة شهر ${data.billing_month} - ${data.subscriber_name}`,
      return_url: data.return_url,
    }

    // Build SHA-256 signature
    const sortedKeys = Object.keys(params).sort()
    const sigStr = settings.aps_sha_request_phrase +
      sortedKeys.map(k => `${k}=${params[k]}`).join('') +
      settings.aps_sha_request_phrase
    params.signature = crypto.createHash('sha256').update(sigStr).digest('hex')

    // APS uses form POST, so we build a redirect URL
    const queryString = new URLSearchParams(params).toString()

    return {
      payment_url: `${baseUrl}?${queryString}`,
      order_id: orderId,
      gateway: 'aps',
    }
  }

  throw new Error('لم يتم تفعيل بوابة دفع إلكتروني')
}

export function verifyApsSignature(params: Record<string, string>, shaPhrase: string): boolean {
  const signature = params.signature
  if (!signature) return false

  const filtered = { ...params }
  delete filtered.signature

  const sortedKeys = Object.keys(filtered).sort()
  const sigStr = shaPhrase +
    sortedKeys.map(k => `${k}=${filtered[k]}`).join('') +
    shaPhrase
  const computed = crypto.createHash('sha256').update(sigStr).digest('hex')

  return computed === signature
}
