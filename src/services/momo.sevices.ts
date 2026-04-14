import axios from 'axios'
import crypto from 'crypto'

const { MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_ENDPOINT, MOMO_REDIRECT_URL, MOMO_IPN_URL } =
  process.env

export const createMomoPaymentUrl = async (order_id: string, amount: number, order_info: string) => {
  const requestId = order_id
  const requestType = 'payWithMethod'
  const extraData = ''
  const autoCapture = true
  const lang = 'vi'

  const rawSignature =
    `accessKey=${MOMO_ACCESS_KEY}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${MOMO_IPN_URL}` +
    `&orderId=${order_id}` +
    `&orderInfo=${order_info}` +
    `&partnerCode=${MOMO_PARTNER_CODE}` +
    `&redirectUrl=${MOMO_REDIRECT_URL}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`

  const signature = crypto
    .createHmac('sha256', MOMO_SECRET_KEY as string)
    .update(rawSignature)
    .digest('hex')

  const requestBody = {
    partnerCode: MOMO_PARTNER_CODE,
    accessKey: MOMO_ACCESS_KEY,
    requestId,
    amount,
    orderId: order_id,
    orderInfo: order_info,
    redirectUrl: MOMO_REDIRECT_URL,
    ipnUrl: MOMO_IPN_URL,
    extraData,
    requestType,
    autoCapture,
    lang,
    signature
  }

  const response = await axios.post(MOMO_ENDPOINT as string, requestBody)
  return response.data
}
