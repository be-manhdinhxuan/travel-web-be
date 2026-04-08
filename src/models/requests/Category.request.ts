import { ParamsDictionary } from 'express-serve-static-core'
export interface CreateCategoryReqBody {
  name: string
  description?: string
}

export interface GetDetailCategoryReqParams extends ParamsDictionary {
  id: string
}

export interface UpdateCategoryReqParams extends ParamsDictionary {
  id: string
}

export interface UpdateCategoryReqBody {
  name?: string
  description?: string
}
export interface ToggleCategoryReqBody {
  is_active: boolean
}
