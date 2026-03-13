import { Request, Response } from 'express'
import { MESSAGES } from '~/constants/messages'
import { CreateCategoryReqBody } from '~/models/requests/Category.request'
import categoriesService from '~/services/category.services'

export const createCategoryController = async (
  req: Request<any, any, CreateCategoryReqBody>,
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