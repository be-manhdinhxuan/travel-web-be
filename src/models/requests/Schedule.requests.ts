export interface CreateScheduleReqBody {
  departure_date: string
  return_date: string
  price_adult: number
  price_child: number
  price_baby: number
  total_slots: number
  note?: string
}
