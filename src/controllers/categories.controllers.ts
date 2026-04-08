import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/Auth.requests'
import {
  CreateCategoryReqBody,
  GetDetailCategoryReqParams,
  ToggleCategoryReqBody,
  UpdateCategoryReqBody
} from '~/models/requests/Category.request'
import categoriesService from '~/services/categories.services'

export const getCategoriesController = async (req: Request, res: Response) => {
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const result = await categoriesService.getCategories(role)
  return res.json({
    message: MESSAGES.GET_CATEGORIES_SUCCESS,
    result
  })
}

export const getDetailCategoryController = async (
  req: Request<ParamsDictionary, any, GetDetailCategoryReqParams>,
  res: Response
) => {
  const { id } = req.params
  const { role } = (req.decoded_authorization as TokenPayload) || {}
  const category = await categoriesService.getDetailCategory(id as string, role)
  return res.json({
    message: MESSAGES.GET_DETAIL_CATEGORY_SUCCESS,
    result: { category }
  })
}

export const createCategoryController = async (
  req: Request<ParamsDictionary, any, CreateCategoryReqBody>,
  res: Response
) => {
  const file = req.file
  const body = req.body

  const result = await categoriesService.createCategory(body, file)

  return res.status(201).json({
    message: MESSAGES.CREATE_CATEGORY_SUCCESS,
    result
  })
}

export const updateCategoryController = async (
  req: Request<{ id: string }, any, UpdateCategoryReqBody>,
  res: Response
) => {
  const { id } = req.params
  const body = req.body

  const result = await categoriesService.updateCategory(id, body)

  return res.json({
    message: MESSAGES.UPDATE_CATEGORY_SUCCESS,
    result
  })
}

export const updateCategoryImageController = async (req: Request<{ id: string }, any>, res: Response) => {
  const { id } = req.params
  const file = req.file

  if (!file) {
    throw new ErrorWithStatus({
      message: MESSAGES.THUMBNAIL_IS_REQUIRED,
      status: HTTP_STATUS.BAD_REQUEST
    })
  }

  const result = await categoriesService.updateCategoryImage(id, file)

  return res.json({
    message: MESSAGES.UPDATE_CATEGORY_IMAGE_SUCCESS,
    result
  })
}

export const toggleCategoryController = async (
  req: Request<{ id: string }, any, ToggleCategoryReqBody>,
  res: Response
) => {
  const { id } = req.params
  const body = req.body

  const result = await categoriesService.toggleCategory(id, body)

  return res.json({
    message: MESSAGES.TOGGLE_CATEGORY_SUCCESS,
    result
  })
}

export const deleteCategoryController = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params
  await categoriesService.deleteCategory(id)

  return res.json({
    message: MESSAGES.DELETE_CATEGORY_SUCCESS
  })
}
