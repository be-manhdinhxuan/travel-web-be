import { ObjectId } from 'mongodb'
import { ScheduleStatus } from '~/constants/enums'

interface ScheduleType {
  _id?: ObjectId
  tour_id: ObjectId
  departure_date: Date
  return_date: Date
  price_adult: number
  price_child: number
  price_baby: number
  total_slots: number
  available_slots?: number
  status?: ScheduleStatus
  note?: string
  created_at?: Date
  updated_at?: Date
}

export default class Schedule {
  _id?: ObjectId
  tour_id: ObjectId
  departure_date: Date
  return_date: Date
  price_adult: number
  price_child: number
  price_baby: number
  total_slots: number
  available_slots: number
  status: ScheduleStatus
  note: string
  created_at: Date
  updated_at: Date
  constructor(schedule: ScheduleType) {
    const date = new Date()
    this._id = schedule._id
    this.tour_id = schedule.tour_id
    this.departure_date = schedule.departure_date
    this.return_date = schedule.return_date
    this.price_adult = schedule.price_adult
    this.price_child = schedule.price_child
    this.price_baby = schedule.price_baby
    this.total_slots = schedule.total_slots
    this.available_slots = schedule.available_slots || schedule.total_slots
    this.status = schedule.status || ScheduleStatus.Available
    this.note = schedule.note || ''
    this.created_at = schedule.created_at || date
    this.updated_at = schedule.updated_at || date
  }
}
