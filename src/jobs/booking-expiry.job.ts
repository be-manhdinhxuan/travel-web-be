import cron from 'node-cron'
import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'
import { BookingStatus, PaymentStatus } from '~/constants/enums'

const cancelExpiredBookings = async () => {
  const expiredTime = new Date(Date.now() - 15 * 60 * 1000)

  const expiredBookings = await databaseServices.bookings
    .find({
      status: BookingStatus.Pending,
      created_at: { $lt: expiredTime }
    })
    .toArray()

  if (!expiredBookings.length) return

  for (const booking of expiredBookings) {
    const totalPassengers = booking.passengers.adults + booking.passengers.children + booking.passengers.babies

    // hoàn lại số chỗ
    await databaseServices.schedules.updateOne(
      { _id: booking.schedule_id },
      { $inc: { available_slots: totalPassengers } }
    )

    // hủy booking
    await databaseServices.bookings.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: BookingStatus.Cancelled,
          cancelled_reason: 'Hết thời gian thanh toán',
          updated_at: new Date()
        }
      }
    )

    // cập nhật payment status = Failed
    await databaseServices.payments.updateOne(
      {
        booking_id: booking._id,
        status: PaymentStatus.Pending
      },
      {
        $set: {
          status: PaymentStatus.Failed,
          updated_at: new Date()
        }
      }
    )
  }

  console.log(`Đã hủy ${expiredBookings.length} booking hết hạn`)
}

// chạy mỗi 5 phút
const bookingExpiryJob = cron.schedule('*/5 * * * *', cancelExpiredBookings)

export default bookingExpiryJob
