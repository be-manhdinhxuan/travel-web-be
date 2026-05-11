import { Filter, ObjectId } from 'mongodb'
import { CreateScheduleReqBody, GetSchedulesQuery, UpdateScheduleReqBody } from '~/models/requests/Schedule.requests'
import Schedule from '~/models/schemas/Schedule.schema'
import databaseServices from './database.services'
import { BookingStatus, ScheduleStatus, UserRole } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import HTTP_STATUS from '~/constants/httpStatus'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { syncScheduleStatus } from '~/utils/schedule.helpers'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Ho_Chi_Minh'

class SchedulesService {
  async createSchedule(tour_id: string, payload: CreateScheduleReqBody) {
    const tour = await databaseServices.tours.findOne({
      _id: new ObjectId(tour_id)
    })

    if (!tour) {
      throw new ErrorWithStatus({
        message: MESSAGES.TOUR_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const departureDate = new Date(payload.departure_date)

    if (isNaN(departureDate.getTime())) {
      throw new ErrorWithStatus({
        message: 'Ngày khởi hành không hợp lệ',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const todayVN = dayjs().tz(TZ).startOf('day')

    const departureVN = dayjs(departureDate).tz(TZ).startOf('day')

    // Không cho tạo lịch hôm nay hoặc quá khứ
    if (departureVN.isSame(todayVN) || departureVN.isBefore(todayVN)) {
      throw new ErrorWithStatus({
        message: 'Ngày khởi hành phải sau ngày hiện tại',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // 🔥 tính return_date từ tour
    const returnDate = new Date(departureDate)
    returnDate.setDate(returnDate.getDate() + (tour.duration_days - 1))

    const existing = await databaseServices.schedules.findOne({
      tour_id: new ObjectId(tour_id),
      departure_date: departureDate
    })

    if (existing) {
      throw new ErrorWithStatus({
        message: 'Đã tồn tại lịch trình với ngày khởi hành này',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const schedule = new Schedule({
      tour_id: new ObjectId(tour_id),
      departure_date: departureDate,
      return_date: returnDate,
      price_adult: payload.price_adult,
      price_child: payload.price_child,
      price_baby: payload.price_baby,
      total_slots: payload.total_slots,
      note: payload.note
    })

    const result = await databaseServices.schedules.insertOne(schedule)

    return {
      schedule: {
        ...schedule,
        _id: result.insertedId
      }
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
      filter.departure_date = {
        $gte: dayjs().tz(TZ).startOf('day').toDate()
      }
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

    const tour = await databaseServices.tours.findOne({
      _id: schedule.tour_id
    })

    if (!tour) {
      throw new ErrorWithStatus({
        message: MESSAGES.TOUR_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if ([ScheduleStatus.Expired, ScheduleStatus.Cancelled].includes(schedule.status)) {
      throw new ErrorWithStatus({
        message: 'Cannot update expired or cancelled schedule',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const todayVN = dayjs().tz(TZ).startOf('day')
    const departureVN = dayjs(schedule.departure_date).tz(TZ).startOf('day')

    if (departureVN.isSame(todayVN) || departureVN.isBefore(todayVN)) {
      throw new ErrorWithStatus({
        message: 'Không thể chỉnh sửa lịch khởi hành đã bắt đầu',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    // ===== DATE =====
    const newDeparture = payload.departure_date ? new Date(payload.departure_date) : schedule.departure_date

    if (payload.departure_date) {
      if (newDeparture <= now) {
        throw new ErrorWithStatus({
          message: 'Departure date must be in the future',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }

      const existing = await databaseServices.schedules.findOne({
        _id: { $ne: scheduleId },
        tour_id: schedule.tour_id,
        departure_date: newDeparture
      })

      if (existing) {
        throw new ErrorWithStatus({
          message: 'Đã tồn tại lịch khởi hành cho ngày này',
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
    }

    const hasBooking = schedule.available_slots !== schedule.total_slots

    if (
      hasBooking &&
      payload.departure_date &&
      new Date(payload.departure_date).getTime() !== schedule.departure_date.getTime()
    ) {
      throw new ErrorWithStatus({
        message: 'Không thể thay đổi ngày khi đã có booking',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const newReturn = new Date(newDeparture)
    newReturn.setDate(newReturn.getDate() + (tour.duration_days - 1))

    // ===== UPDATE DATA =====
    const updateData: Partial<Schedule> = {
      ...payload,
      departure_date: newDeparture,
      return_date: newReturn,
      updated_at: now
    }

    // ===== SLOTS =====
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

    await databaseServices.schedules.findOneAndUpdate(
      { _id: scheduleId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    await syncScheduleStatus(scheduleId)

    const finalSchedule = await databaseServices.schedules.findOne({
      _id: scheduleId
    })

    return { schedule: finalSchedule }
  }

  async deleteSchedule(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new ErrorWithStatus({
        message: 'ID không hợp lệ',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const scheduleId = new ObjectId(id)

    const schedule = await databaseServices.schedules.findOne({
      _id: scheduleId
    })

    if (!schedule) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (schedule.status === ScheduleStatus.Cancelled) {
      throw new ErrorWithStatus({
        message: 'Schedule đã bị hủy',
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const hasBooking = await databaseServices.bookings.findOne({
      schedule_id: scheduleId,
      status: { $ne: BookingStatus.Cancelled }
    })

    if (hasBooking) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_HAS_BOOKINGS,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const result = await databaseServices.schedules.updateOne(
      {
        _id: scheduleId
      },
      {
        $set: { status: ScheduleStatus.Cancelled },
        $currentDate: { updated_at: true }
      }
    )

    if (result.matchedCount === 0) {
      throw new ErrorWithStatus({
        message: MESSAGES.SCHEDULE_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return {
      message: MESSAGES.DELETE_SCHEDULE_SUCCESS
    }
  }
}

const schedulesService = new SchedulesService()

export default schedulesService
