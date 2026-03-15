import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { Token } from 'nodemailer/lib/xoauth2'
import { UserRole } from '~/constants/enums'
import { MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/Auth.requests'
import {
  CreateCategoryReqBody,
  GetDetailCategoryReqParams,
  UpdateCategoryReqBody,
  UpdateCategoryReqParams
} from '~/models/requests/Category.request'
import categoriesService from '~/services/categories.services'

export const getCategoriesController = async (req: Request, res: Response) => {
  const result = await categoriesService.getCategories()
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
  const file = req.file

  const result = await categoriesService.updateCategory(id, body, file)

  return res.json({
    message: MESSAGES.UPDATE_CATEGORY_SUCCESS,
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
