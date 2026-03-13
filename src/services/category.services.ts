import slugify from 'slugify'
import { CreateCategoryReqBody, UpdateCategoryReqBody } from '~/models/requests/Category.request'
import databaseServices from './database.services'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import { Filter, ObjectId } from 'mongodb'
import { create } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import Category from '~/models/schemas/Category.schema'
import cloudinary from '~/utils/cloudinary'
import { generateUniqueSlug } from '~/utils/generateSlug'
import { UserRole } from '~/constants/enums'

class CategoriesService {
  async getCategories() {
    const categories = await databaseServices.categories
      .find(
        { is_active: true },
        {
          projection: {
            name: 1,
            slug: 1,
            thumbnail: 1
          }
        }
      )
      .sort({ created_at: -1 })
      .toArray()
    return {
      categories
    }
  }

  async getDetailCategory(id: string, role: UserRole) {
    const filter: Filter<Category> = { _id: new ObjectId(id) }
    if (role !== UserRole.Admin) {
      filter.is_active = true
    }
    const category = await databaseServices.categories.findOne(filter)

    if (!category) {
      throw new ErrorWithStatus({
        message: MESSAGES.CATEGORY_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return category
  }

  async createCategory(payload: CreateCategoryReqBody, file?: Express.Multer.File) {
    let thumbnail = ''

    if (file) {
      const uploadResult: any = await uploadImageToCloudinary(file.buffer, 'categories')
      thumbnail = uploadResult.secure_url
    }

    const slug = await generateUniqueSlug(payload.name)

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

  async updateCategory(id: string, payload: UpdateCategoryReqBody, file?: Express.Multer.File) {
    const category: any = await databaseServices.categories.findOne({
      _id: new ObjectId(id)
    })

    const updateData: Partial<Category> = {}

    // update name + slug
    if (payload.name) {
      updateData.name = payload.name
      updateData.slug = await generateUniqueSlug(payload.name)
    }

    // description
    if (payload.description !== undefined) {
      updateData.description = payload.description
    }

    // active status
    if (payload.is_active !== undefined) {
      updateData.is_active = payload.is_active === true
    }

    // upload thumbnail mới
    if (file) {
      const upload: any = await uploadImageToCloudinary(file.buffer, 'categories')

      updateData.thumbnail = upload.secure_url

      // xóa ảnh cũ
      if (category.thumbnail) {
        const publicId = category.thumbnail.split('/').slice(-2).join('/').split('.')[0]

        await cloudinary.uploader.destroy(publicId)
      }
    }

    updateData.updated_at = new Date()

    const updatedCategory = await databaseServices.categories.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      {
        returnDocument: 'after'
      }
    )

    return {
      category: updatedCategory
    }
  }
}

const categoriesService = new CategoriesService()

export default categoriesService
