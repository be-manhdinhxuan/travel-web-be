import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { createMomoPaymentUrl } from './momo.sevices'
import Payment from '~/models/schemas/Payment.schema'
import { BookingStatus, PaymentProvider, PaymentStatus } from '~/constants/enums'
import crypto from 'crypto'

class PaymentsService {
  async createMomoPayment(booking_id: string, user_id: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(booking_id)
    })

    // tạo order_id unique
    const order_id = `${booking_id}-${Date.now()}`
    const order_info = `Thanh toán ${booking!.tour_snapshot.tour_name} - Mã đặt tour: ${booking!.booking_code}`

    // gọi MoMo API tạo URL thanh toán
    const momoResponse = await createMomoPaymentUrl(order_id, booking!.final_price, order_info)
    console.log('momoResponse:', JSON.stringify(momoResponse))

    // lưu payment vào DB
    const payment = new Payment({
      booking_id: new ObjectId(booking_id),
      user_id: new ObjectId(user_id),
      provider: PaymentProvider.Momo,
      provider_order_id: order_id,
      amount: booking!.final_price,
      raw_response: momoResponse
    })

    await databaseServices.payments.insertOne(payment)

    return {
      pay_url: momoResponse.payUrl,
      order_id
    }
  }

  async handleMomoIpn(payload: Record<string, any>) {
    const {
      orderId,
      resultCode,
      transId,
      amount,
      signature,
      orderInfo,
      requestId,
      extraData,
      partnerCode,
      responseTime,
      message
    } = payload

    // 1. Xác thực chữ ký
    const rawSignature =
      `accessKey=${process.env.MOMO_ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${payload.orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payload.payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`

    const expectedSignature = crypto
      .createHmac('sha256', process.env.MOMO_SECRET_KEY as string)
      .update(rawSignature)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.log('MoMo IPN: chữ ký không hợp lệ')
      return
    }

    // 2. Kiểm tra idempotent — tránh xử lý 2 lần
    const existingPayment = await databaseServices.payments.findOne({
      provider_order_id: orderId
    })

    if (!existingPayment || existingPayment.status !== PaymentStatus.Pending) {
      console.log('MoMo IPN: payment không tồn tại hoặc đã xử lý')
      return
    }

    // 3. Xử lý theo resultCode
    if (resultCode === 0) {
      // thanh toán thành công
      await databaseServices.payments.updateOne(
        { provider_order_id: orderId },
        {
          $set: {
            status: PaymentStatus.Success,
            transaction_id: transId.toString(),
            raw_response: payload,
            paid_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      await databaseServices.bookings.updateOne(
        { _id: existingPayment.booking_id },
        {
          $set: {
            status: BookingStatus.Confirmed,
            updated_at: new Date()
          }
        }
      )

      // cập nhật used_count coupon nếu có
      const booking = await databaseServices.bookings.findOne({
        _id: existingPayment.booking_id
      })

      if (booking?.coupon_id) {
        await databaseServices.coupons.updateOne(
          { _id: booking.coupon_id },
          {
            $inc: { used_count: 1 },
            $push: { used_by: booking.user_id }
          }
        )
      }
    } else {
      // thanh toán thất bại
      await databaseServices.payments.updateOne(
        { provider_order_id: orderId },
        {
          $set: {
            status: PaymentStatus.Failed,
            raw_response: payload,
            updated_at: new Date()
          }
        }
      )
    }
  }
}

const paymentsService = new PaymentsService()

export default paymentsService
