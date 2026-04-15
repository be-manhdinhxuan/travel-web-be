import { Filter, ObjectId } from 'mongodb'
import { CreateScheduleReqBody, GetSchedulesQuery, UpdateScheduleReqBody } from '~/models/requests/Schedule.requests'
import Schedule from '~/models/schemas/Schedule.schema'
import databaseServices from './database.services'
import { ScheduleStatus, UserRole } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'

class SchedulesService {
  async createSchedule(tour_id: string, payload: CreateScheduleReqBody) {
    const schedule = new Schedule({
      tour_id: new ObjectId(tour_id),
      departure_date: new Date(payload.departure_date),
      return_date: new Date(payload.return_date),
      price_adult: payload.price_adult,
      price_child: payload.price_child,
      price_baby: payload.price_baby,
      total_slots: payload.total_slots,
      note: payload.note
    })

    const result = await databaseServices.schedules.insertOne(schedule)

    return {
      schedule: { ...schedule, _id: result.insertedId }
    }
  }

  async getSchedules(tour_id: string, query: GetSchedulesQuery, role: UserRole) {
    const { departure_date, num_people } = query

    const filter: Filter<Schedule> = {
      tour_id: new ObjectId(tour_id)
    }

    // admin xem được tất cả status, user/guest chỉ xem available
    if (role !== UserRole.Admin) {
      filter.status = { $in: [ScheduleStatus.Available, ScheduleStatus.Full] }
      filter.departure_date = { $gte: new Date() }
    }

    if (departure_date) {
      filter.departure_date = { $gte: new Date(departure_date) }
    }

    if (num_people) {
      filter.available_slots = { $gte: Number(num_people) }
    }

    const schedules = await databaseServices.schedules
      .find(filter)
      .sort({ departure_date: 1 }) // sắp xếp theo ngày gần nhất
      .toArray()

    return { schedules }
  }

  async updateSchedule(id: string, payload: UpdateScheduleReqBody) {
    const scheduleId = new ObjectId(id)
    const now = new Date()

    const schedule = await databaseServices.schedules.findOne({
      _id: scheduleId
    })

    if (!schedule) {
      throw new ErrorWithStatus({
        message: 'Schedule not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    // ====================== 1. CHẶN SCHEDULE KHÔNG HỢP LỆ ======================
    if (schedule.status === ScheduleStatus.Expired || schedule.status === ScheduleStatus.Cancelled) {
      throw new ErrorWithStatus({
        message: 'Cannot update expired or cancelled schedule',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // ====================== 2. XỬ LÝ DATE ======================
    let newDeparture = schedule.departure_date
    let newReturn = schedule.return_date

    if (payload.departure_date) {
      newDeparture = new Date(payload.departure_date)
    }

    if (payload.return_date) {
      newReturn = new Date(payload.return_date)
    }

    // validate date logic
    if (newDeparture >= newReturn) {
      throw new ErrorWithStatus({
        message: 'Departure date must be before return date',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // không cho sửa về quá khứ
    if (newDeparture < now) {
      throw new ErrorWithStatus({
        message: 'Departure date cannot be in the past',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // ====================== 3. XỬ LÝ SLOTS ======================
    const updateData: Partial<Schedule> = {
      ...payload,
      departure_date: newDeparture,
      return_date: newReturn,
      updated_at: now
    }

    if (payload.total_slots !== undefined) {
      const booked = schedule.total_slots - schedule.available_slots

      if (payload.total_slots < booked) {
        throw new ErrorWithStatus({
          message: MESSAGES.TOTAL_SLOTS_CANNOT_BE_LESS_THAN_BOOKED,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      updateData.available_slots = payload.total_slots - booked
    }

    // ====================== 4. AUTO UPDATE STATUS ======================
    if (newDeparture < now) {
      updateData.status = ScheduleStatus.Expired
    }

    // ====================== 5. UPDATE ======================
    const updatedSchedule = await databaseServices.schedules.findOneAndUpdate(
      { _id: scheduleId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return { schedule: updatedSchedule }
  }

  async deleteSchedule(id: string) {
    const bookingCount = await databaseServices.bookings.countDocuments({
      schedule_id: new ObjectId(id)
    })

    if (bookingCount > 0) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_HAS_BOOKINGS,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await databaseServices.schedules.deleteOne({ _id: new ObjectId(id) })
  }
}

const schedulesService = new SchedulesService()

export default schedulesService
