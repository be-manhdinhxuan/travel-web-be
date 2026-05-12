import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { createMomoPaymentUrl } from './momo.sevices'
import Payment from '~/models/schemas/Payment.schema'
import { BookingStatus, PaymentProvider, PaymentStatus } from '~/constants/enums'
import crypto from 'crypto'
import { createVnpayPaymentUrl } from './vnpay.services'
import emailService from './email.services'
import { nowVNDate } from '~/utils/time'
class PaymentsService {
  async createMomoPayment(booking_id: string, user_id: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(booking_id)
    })

    // check booking hợp lệ
    if (!booking || booking.status !== BookingStatus.Pending) {
      throw new Error('Booking is not available for payment')
    }

    // tránh duplicate payment
    await databaseServices.payments.updateMany(
      {
        booking_id: new ObjectId(booking_id),
        status: PaymentStatus.Pending
      },
      {
        $set: {
          status: PaymentStatus.Failed,
          updated_at: nowVNDate()
        }
      }
    )

    // tạo order_id unique
    const order_id = `${booking_id}-${Date.now()}`
    const order_info = `Thanh toán ${booking!.tour_snapshot.tour_name} - Mã đặt tour: ${booking!.booking_code}`

    // gọi MoMo API tạo URL thanh toán
    const momoResponse = await createMomoPaymentUrl(order_id, booking!.final_price, order_info)

    // lưu payment vào DB
    const payment = new Payment({
      booking_id: new ObjectId(booking_id),
      user_id: new ObjectId(user_id),
      provider: PaymentProvider.Momo,
      provider_order_id: order_id,
      amount: booking!.final_price,
      status: PaymentStatus.Pending,
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
      return { resultCode: 0, message: 'OK' }
    }

    // 2. Kiểm tra idempotent — tránh xử lý 2 lần
    const existingPayment = await databaseServices.payments.findOne({
      provider_order_id: orderId
    })

    if (!existingPayment || existingPayment.status !== PaymentStatus.Pending) {
      console.log('MoMo IPN: payment không tồn tại hoặc đã xử lý')
      return { resultCode: 0, message: 'OK' }
    }

    // 3. Xử lý theo resultCode
    if (resultCode === 0) {
      // LẤY BOOKING TRƯỚC
      const booking = await databaseServices.bookings.findOne({
        _id: existingPayment.booking_id
      })

      if (!booking) {
        console.log('Booking not found')
        return { resultCode: 0, message: 'OK' }
      }

      if (booking.status !== BookingStatus.Pending) {
        console.log('Booking is not pending (maybe expired)')

        // vẫn update payment để lưu log
        await databaseServices.payments.updateOne(
          { provider_order_id: orderId },
          {
            $set: {
              status: PaymentStatus.Success,
              transaction_id: transId.toString(),
              raw_response: payload,
              paid_at: nowVNDate(),
              updated_at: nowVNDate(),
              note: 'Paid after booking expired'
            }
          }
        )

        return { resultCode: 0, message: 'OK' } // DỪNG, KHÔNG confirm booking
      }

      // OPTIONAL: check amount (nên có)
      if (Number(amount) !== existingPayment.amount) {
        console.log('Invalid amount')
        return { resultCode: 0, message: 'OK' }
      }

      // OK → CONFIRM
      await databaseServices.payments.updateOne(
        { provider_order_id: orderId },
        {
          $set: {
            status: PaymentStatus.Success,
            transaction_id: transId.toString(),
            raw_response: payload,
            paid_at: nowVNDate(),
            updated_at: nowVNDate()
          }
        }
      )

      await databaseServices.bookings.updateOne(
        { _id: existingPayment.booking_id },
        {
          $set: {
            status: BookingStatus.Confirmed,
            updated_at: nowVNDate()
          }
        }
      )

      // GỬI EMAIL
      emailService.sendBookingSuccessEmail(booking.contact_info.email, booking).catch((error) => {
        console.error('Send booking email failed:', error)
      })

      // cập nhật coupon
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
            updated_at: nowVNDate()
          }
        }
      )
    }
    return { resultCode: 0, message: 'OK' }
  }

  async createVnpayPayment(booking_id: string, user_id: string, ip_addr: string) {
    const booking = await databaseServices.bookings.findOne({
      _id: new ObjectId(booking_id)
    })

    if (!booking || booking.status !== BookingStatus.Pending) {
      throw new Error('Booking is not available for payment')
    }

    await databaseServices.payments.updateMany(
      {
        booking_id: new ObjectId(booking_id),
        status: PaymentStatus.Pending
      },
      {
        $set: {
          status: PaymentStatus.Failed,
          updated_at: nowVNDate()
        }
      }
    )

    const order_id = `${booking_id}-${Date.now()}`
    const order_info = `Thanh toan ${booking!.tour_snapshot.tour_name} - Ma dat tour: ${booking!.booking_code}`
    // lưu ý: VNPay không nhận tiếng Việt có dấu trong orderInfo

    const pay_url = createVnpayPaymentUrl(order_id, booking!.final_price, order_info, ip_addr)

    // lưu payment vào DB
    const payment = new Payment({
      booking_id: new ObjectId(booking_id),
      user_id: new ObjectId(user_id),
      provider: PaymentProvider.VNPay,
      provider_order_id: order_id,
      amount: booking!.final_price,
      status: PaymentStatus.Pending
    })

    await databaseServices.payments.insertOne(payment)

    return { pay_url }
  }

  async handleVnpayIpn(vnpParams: Record<string, string>) {
    // 1. Lấy secure hash ra khỏi params
    const secureHash = vnpParams['vnp_SecureHash']
    const params = { ...vnpParams }
    delete params['vnp_SecureHash']
    delete params['vnp_SecureHashType']

    // 2. Xác thực chữ ký
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc: Record<string, string>, key) => {
        acc[key] = params[key]
        return acc
      }, {})

    const signData = new URLSearchParams(sortedParams).toString()

    const expectedHash = crypto
      .createHmac('sha512', process.env.VNPAY_HASH_SECRET as string)
      .update(signData)
      .digest('hex')

    if (secureHash !== expectedHash) {
      return { RspCode: '97', Message: 'Invalid signature' }
    }

    // 3. Tìm payment theo order_id
    const orderId = vnpParams['vnp_TxnRef']
    const existingPayment = await databaseServices.payments.findOne({
      provider_order_id: orderId
    })

    if (!existingPayment) {
      return { RspCode: '01', Message: 'Order not found' }
    }

    // 4. Kiểm tra idempotent
    if (existingPayment.status !== PaymentStatus.Pending) {
      return { RspCode: '02', Message: 'Order already confirmed' }
    }

    // 5. Kiểm tra số tiền
    const vnpAmount = Number(vnpParams['vnp_Amount']) / 100 // VNPay nhân 100
    if (vnpAmount !== existingPayment.amount) {
      return { RspCode: '04', Message: 'Invalid amount' }
    }

    // 6. Xử lý theo responseCode
    const responseCode = vnpParams['vnp_ResponseCode']

    if (responseCode === '00') {
      const booking = await databaseServices.bookings.findOne({
        _id: existingPayment.booking_id
      })

      if (!booking) {
        return { RspCode: '01', Message: 'Booking not found' }
      }

      // 🔥 FIX QUAN TRỌNG
      if (booking.status !== BookingStatus.Pending) {
        await databaseServices.payments.updateOne(
          { provider_order_id: orderId },
          {
            $set: {
              status: PaymentStatus.Success,
              transaction_id: vnpParams['vnp_TransactionNo'],
              raw_response: vnpParams,
              paid_at: nowVNDate(),
              updated_at: nowVNDate(),
              note: 'Paid after booking expired'
            }
          }
        )

        return { RspCode: '00', Message: 'OK' }
      }

      // ✅ CONFIRM
      await databaseServices.payments.updateOne(
        { provider_order_id: orderId },
        {
          $set: {
            status: PaymentStatus.Success,
            transaction_id: vnpParams['vnp_TransactionNo'],
            raw_response: vnpParams,
            paid_at: nowVNDate(),
            updated_at: nowVNDate()
          }
        }
      )

      await databaseServices.bookings.updateOne(
        { _id: existingPayment.booking_id },
        {
          $set: {
            status: BookingStatus.Confirmed,
            updated_at: nowVNDate()
          }
        }
      )

      emailService.sendBookingSuccessEmail(booking.contact_info.email, booking).catch((error) => {
        console.error('Send booking email failed:', error)
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
            raw_response: vnpParams,
            updated_at: nowVNDate()
          }
        }
      )
    }

    // 7. Trả về đúng format VNPay yêu cầu
    return { RspCode: '00', Message: 'Confirm Success' }
  }
}

const paymentsService = new PaymentsService()

export default paymentsService
