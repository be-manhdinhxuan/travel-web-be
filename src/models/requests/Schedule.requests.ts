export interface CreateScheduleReqBody {
  departure_date: string
  return_date: string
  price_adult: number
  price_child: number
  price_baby: number
  total_slots: number
  note?: string
}

export interface GetSchedulesQuery {
  departure_date?: string
  num_people?: number
}

export interface UpdateScheduleReqBody {
  departure_date?: string
  return_date?: string
  price_adult?: number
  price_child?: number
  price_baby?: number
  total_slots?: number
  status?: number
  note?: string
}
