import cron from 'node-cron'
import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'
import { BookingStatus, PaymentStatus, ScheduleStatus } from '~/constants/enums'

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

const completeExpiredBookings = async () => {
  await databaseServices.bookings.updateMany(
    {
      status: BookingStatus.Confirmed,
      'tour_snapshot.return_date': { $lt: new Date() }
    },
    {
      $set: {
        status: BookingStatus.Completed,
        updated_at: new Date()
      }
    }
  )
}

const updateExpiredSchedules = async () => {
  // Schedule đã qua departure_date → chuyển sang Expired
  await databaseServices.schedules.updateMany(
    {
      departure_date: { $lt: new Date() },
      status: { $in: [ScheduleStatus.Available, ScheduleStatus.Full] }
    },
    {
      $set: {
        status: ScheduleStatus.Expired,
        updated_at: new Date()
      }
    }
  )
}

cron.schedule('0 0 * * *', updateExpiredSchedules) // chạy mỗi ngày 00:00

// Chạy mỗi ngày lúc 00:00
cron.schedule('0 0 * * *', completeExpiredBookings)

// chạy mỗi 5 phút
const bookingExpiryJob = cron.schedule('*/5 * * * *', cancelExpiredBookings)

export default bookingExpiryJob
