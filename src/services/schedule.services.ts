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
    const { departure_date, return_date, ...rest } = payload

    const updateData: Partial<Schedule> = {
      ...rest,
      ...(departure_date && { departure_date: new Date(departure_date) }),
      ...(return_date && { return_date: new Date(return_date) }),
      updated_at: new Date()
    }

    // không cho giảm total_slots xuống dưới số đã đặt
    if (payload.total_slots) {
      const schedule = await databaseServices.schedules.findOne({
        _id: new ObjectId(id)
      })
      const booked = schedule!.total_slots - schedule!.available_slots
      if (payload.total_slots < booked) {
        throw new ErrorWithStatus({
          message: MESSAGES.TOTAL_SLOTS_CANNOT_BE_LESS_THAN_BOOKED,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      updateData.available_slots = payload.total_slots - booked
    }

    const updatedSchedule = await databaseServices.schedules.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return { schedule: updatedSchedule }
  }
}

const schedulesService = new SchedulesService()

export default schedulesService
