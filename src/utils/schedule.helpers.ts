import { ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { ScheduleStatus } from '~/constants/enums'
import databaseServices from '~/services/database.services'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Ho_Chi_Minh'

export const syncScheduleStatus = async (schedule_id: ObjectId) => {
  const schedule = await databaseServices.schedules.findOne({
    _id: schedule_id
  })

  if (!schedule) return

  const todayVN = dayjs().tz(TZ).startOf('day')

  const departureVN = dayjs(schedule.departure_date).tz(TZ).startOf('day')

  const getNextStatus = (): ScheduleStatus => {
    // Quá ngày khởi hành
    if (departureVN.isBefore(todayVN)) {
      return ScheduleStatus.Expired
    }

    // Hết chỗ
    if (schedule.available_slots <= 0) {
      return ScheduleStatus.Full
    }

    // Còn chỗ
    return ScheduleStatus.Available
  }

  const nextStatus = getNextStatus()

  if (nextStatus === schedule.status) return

  await databaseServices.schedules.updateOne(
    { _id: schedule_id },
    {
      $set: {
        status: nextStatus,
        updated_at: new Date()
      }
    }
  )
}
