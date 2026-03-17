import crypto from 'crypto'
import { config } from 'dotenv'

config()

const { VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_URL, VNPAY_RETURN_URL } = process.env

export const createVnpayPaymentUrl = (order_id: string, amount: number, order_info: string, ip_addr: string) => {
  const date = new Date()
  const createDate = date
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14) // YYYYMMDDHHmmss

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE as string,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: order_id,
    vnp_OrderInfo: order_info,
    vnp_OrderType: 'other',
    vnp_Amount: (amount * 100).toString(), // VNPay yêu cầu nhân 100
    vnp_ReturnUrl: VNPAY_RETURN_URL as string,
    vnp_IpAddr: ip_addr,
    vnp_CreateDate: createDate
  }

  // sort theo alphabet trước khi ký
  const sortedParams = Object.keys(vnpParams)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      acc[key] = vnpParams[key]
      return acc
    }, {})

  const signData = new URLSearchParams(sortedParams).toString()

  const signature = crypto
    .createHmac('sha512', VNPAY_HASH_SECRET as string)
    .update(signData)
    .digest('hex')

  sortedParams['vnp_SecureHash'] = signature

  const payUrl = `${VNPAY_URL}?${new URLSearchParams(sortedParams).toString()}`

  return payUrl
}
