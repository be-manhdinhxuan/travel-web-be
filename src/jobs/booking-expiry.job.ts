import cron from 'node-cron'
import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'
import { BookingStatus, ScheduleStatus } from '~/constants/enums'
import emailService from '~/services/email.services'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { syncScheduleStatus } from '~/utils/schedule.helpers'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Ho_Chi_Minh'

const cancelExpiredBookings = async () => {
  // FIX TIMEZONE
  const experiedTime = dayjs().tz(TZ).subtract(30, 'minute').toDate()

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
          updated_at: dayjs().tz(TZ).toDate() // FIX
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

    await syncScheduleStatus(booking.schedule_id)

    console.log('[CRON] Cancel booking:', booking._id)
  }
}

const completeExpiredBookings = async () => {
  // FIX TIMEZONE
  await databaseServices.bookings.updateMany(
    {
      status: BookingStatus.Confirmed,
      'tour_snapshot.return_date': {
        $lt: dayjs().tz(TZ).toDate()
      }
    },
    {
      $set: {
        status: BookingStatus.Completed,
        updated_at: dayjs().tz(TZ).toDate() // FIX
      }
    }
  )
}

const updateExpiredSchedules = async () => {
  // FIX TIMEZONE
  await databaseServices.schedules.updateMany(
    {
      departure_date: { $lt: dayjs().tz(TZ).toDate() },
      status: { $in: [ScheduleStatus.Available, ScheduleStatus.Full] }
    },
    {
      $set: {
        status: ScheduleStatus.Expired,
        updated_at: dayjs().tz(TZ).toDate() // FIX
      }
    }
  )
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const sendTourReminders = async () => {
  const now = dayjs().tz(TZ)

  const todayStart = now.startOf('day').toDate()
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
            updated_at: dayjs().tz(TZ).toDate() // FIX
          }
        }
      )

      console.log('[CRON] Sent reminder:', booking._id)

      await sleep(1000)
    } catch (err) {
      console.error('Reminder email failed:', err)

      await sleep(3000)
    }
  }
}

// cron jobs
cron.schedule('0 0 * * *', updateExpiredSchedules)
cron.schedule('0 0 * * *', completeExpiredBookings)

const bookingExpiryJob = cron.schedule('*/5 * * * *', cancelExpiredBookings)

cron.schedule('0 * * * *', sendTourReminders)

export default bookingExpiryJob
