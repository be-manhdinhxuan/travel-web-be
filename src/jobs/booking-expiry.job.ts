import cron from 'node-cron'
import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'
import { BookingStatus, ScheduleStatus } from '~/constants/enums'

const cancelExpiredBookings = async () => {
  const now = new Date()

  const expiredBookings = await databaseServices.bookings
    .find({
      status: BookingStatus.Pending,
      created_at: { $lt: now }
    })
    .toArray()

  if (!expiredBookings.length) return

  for (const booking of expiredBookings) {
    const totalPassengers = booking.passengers.adults + booking.passengers.children + booking.passengers.babies

    const updatedBooking = await databaseServices.bookings.findOneAndUpdate(
      {
        _id: booking._id,
        status: BookingStatus.Pending
      },
      {
        $set: {
          status: BookingStatus.Cancelled,
          cancelled_reason: 'Hết thời gian thanh toán',
          updated_at: new Date()
        }
      },
      {
        returnDocument: 'before'
      }
    )

    if (!updatedBooking) continue

    await databaseServices.schedules.updateOne(
      { _id: booking.schedule_id },
      {
        $inc: { available_slots: totalPassengers }
      }
    )

    console.log('[CRON] Cancel booking:', booking._id)
  }
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
