import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import { CreateCategoryReqBody, GetDetailCategoryReqParams } from '~/models/requests/Category.request'
import categoriesService from '~/services/category.services'

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
  const category = await categoriesService.getDetailCategory(id as string)
  return res.json({
    message: MESSAGES.GET_DETAIL_CATEGORY_SUCCESS,
    result: { category }
  })
}


export const createCategoryController = async (req: Request<any, any, CreateCategoryReqBody>, res: Response) => {
  const file = req.file
  const body = req.body

  const result = await categoriesService.createCategory(body, file)

  return res.status(201).json({
    message: MESSAGES.CREATE_CATEGORY_SUCCESS,
    result
  })
}
