import { ObjectId } from 'mongodb'
import databaseServices from './database.services'
import { createMomoPaymentUrl } from './momo.sevices'
import Payment from '~/models/schemas/Payment.schema'
import { PaymentProvider } from '~/constants/enums'

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
}

const paymentsService = new PaymentsService()

export default paymentsService
