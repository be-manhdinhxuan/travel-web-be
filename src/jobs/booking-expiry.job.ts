import cron from 'node-cron'
import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'
import { BookingStatus, ScheduleStatus } from '~/constants/enums'
import emailService from '~/services/email.services'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
const TZ = 'Asia/Ho_Chi_Minh'

const cancelExpiredBookings = async () => {
  const experiedTime = new Date(Date.now() - 30 * 60 * 1000) // 30 phút trước

  const expiredBookings = await databaseServices.bookings
    .find({
      status: BookingStatus.Pending,
      created_at: { $lt: experiedTime }
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

const sendTourReminders = async () => {
  const now = dayjs().tz(TZ)

  // hôm nay (00:00)
  const todayStart = now.startOf('day').toDate()

  // ngày +3 (23:59:59)
  const endDay = now.add(3, 'day').endOf('day').toDate()

  const bookings = await databaseServices.bookings
    .find({
      status: BookingStatus.Confirmed,
      reminder_sent: { $ne: true },
      'tour_snapshot.departure_date': {
        $gte: todayStart,
        $lte: endDay
      }
    })
    .toArray()

  for (const booking of bookings) {
    try {
      await emailService.sendTourReminderEmail(booking.contact_info.email, booking)

      await databaseServices.bookings.updateOne(
        { _id: booking._id },
        {
          $set: {
            reminder_sent: true,
            updated_at: new Date()
          }
        }
      )

      console.log('[CRON] Sent reminder:', booking._id)
    } catch (err) {
      console.error('Reminder email failed:', err)
    }
  }
}

cron.schedule('0 0 * * *', updateExpiredSchedules) // chạy mỗi ngày 00:00

// Chạy mỗi ngày lúc 00:00
cron.schedule('0 0 * * *', completeExpiredBookings)

// chạy mỗi 5 phút
const bookingExpiryJob = cron.schedule('*/5 * * * *', cancelExpiredBookings)

// Chạy mỗi giờ
cron.schedule('0 * * * *', sendTourReminders)

export default bookingExpiryJob
