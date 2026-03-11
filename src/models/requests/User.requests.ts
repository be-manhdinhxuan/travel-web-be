import { ParamsDictionary } from 'express-serve-static-core'

export interface UpdateMeReqBody {
  full_name?: string
  date_of_birth?: string
  phone?: string
  address?: string
}

export interface ChangePasswordReqBody {
  password: string
  new_password: string
  new_confirm_password: string
}

export interface ToggleWishlistReqParams extends ParamsDictionary {
  tour_id: string
}

export interface GetUsersReqQuery {
  page?: string
  limit?: string
  keyword?: string
  role?: string
  status?: string
}

export interface GetUserDetailReqParams extends ParamsDictionary {
  user_id: string
}
