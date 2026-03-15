import { ObjectId } from 'mongodb'
import { CreateScheduleReqBody } from '~/models/requests/Schedule.requests'
import Schedule from '~/models/schemas/Schedule.schema'
import databaseServices from './database.services'

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
}

const schedulesService = new SchedulesService()

export default schedulesService
