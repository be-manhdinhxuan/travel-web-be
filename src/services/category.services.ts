import slugify from 'slugify'
import { CreateCategoryReqBody } from '~/models/requests/Category.request'
import databaseServices from './database.services'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import { ObjectId } from 'mongodb'
import { create } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import Category from '~/models/schemas/Category.schema'

class CategoriesService {
  async createCategory(payload: CreateCategoryReqBody, file?: Express.Multer.File) {
    let thumbnail = ''

    if (file) {
      const uploadResult: any = await uploadImageToCloudinary(file.buffer, 'categories')
      thumbnail = uploadResult.secure_url
    }

    const slug = slugify(payload.name, {
      lower: true
    })

    const category = new Category({
      name: payload.name,
      slug,
      description: payload.description,
      thumbnail,
      is_active: true
    })

    const exist = await databaseServices.categories.findOne({ slug })

    if (exist) {
      throw new ErrorWithStatus({
        message: MESSAGES.CATEGORY_ALREADY_EXISTS,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const result = await databaseServices.categories.insertOne(category)

    return {
      category: {
        ...category,
        _id: result.insertedId
      }
    }
  }
}

const categoriesService = new CategoriesService()

export default categoriesService
