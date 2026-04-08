import slugify from 'slugify'
import { CreateCategoryReqBody, ToggleCategoryReqBody, UpdateCategoryReqBody } from '~/models/requests/Category.request'
import databaseServices from './database.services'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import { Filter, ObjectId } from 'mongodb'
import { create } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { MESSAGES } from '~/constants/messages'
import Category from '~/models/schemas/Category.schema'
import cloudinary, { getPublicIdFromUrl } from '~/utils/cloudinary'
import { generateUniqueCategorySlug } from '~/utils/generateCategorySlug'
import { TourStatus, UserRole } from '~/constants/enums'

class CategoriesService {
  async getCategories(role?: UserRole) {
    const query: any = {}

    if (role !== UserRole.Admin) {
      query.is_active = true
    }

    const categories = await databaseServices.categories
      .find(query, {
        projection: {
          name: 1,
          slug: 1,
          description: 1,
          thumbnail: 1,
          is_active: 1
        }
      })
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

    const slug = await generateUniqueCategorySlug(payload.name)

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
    const category = await databaseServices.categories.findOne({
      _id: new ObjectId(id)
    })

    const updateData: Partial<Category> = {}

    // update name + slug
    if (payload.name) {
      updateData.name = payload.name
      updateData.slug = await generateUniqueCategorySlug(payload.name)
    }

    // description
    if (payload.description !== undefined) {
      updateData.description = payload.description
    }

    // upload thumbnail mới
    if (file) {
      const upload = await uploadImageToCloudinary(file.buffer, 'categories')
      updateData.thumbnail = upload.secure_url

      // xóa ảnh cũ
      if (category?.thumbnail) {
        const publicId = getPublicIdFromUrl(category.thumbnail)
        if (publicId) {
          await cloudinary.uploader.destroy(publicId)
        }
      }
    }

    updateData.updated_at = new Date()

    const updatedCategory = await databaseServices.categories.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return {
      category: updatedCategory
    }
  }

  async updateCategoryImage(id: string, file: Express.Multer.File) {
    const objectId = new ObjectId(id)

    const category = await databaseServices.categories.findOne({
      _id: objectId
    })

    if (!category) {
      throw new ErrorWithStatus({
        message: MESSAGES.CATEGORY_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const upload = await uploadImageToCloudinary(file.buffer, 'categories')

    // xóa ảnh cũ
    if (category.thumbnail) {
      const publicId = getPublicIdFromUrl(category.thumbnail)
      if (publicId) {
        await cloudinary.uploader.destroy(publicId)
      }
    }

    const updatedCategory = await databaseServices.categories.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          thumbnail: upload.secure_url
        },
        $currentDate: { updated_at: true }
      },
      { returnDocument: 'after' }
    )

    return { category: updatedCategory }
  }

  async toggleCategory(id: string, payload: ToggleCategoryReqBody) {
    const category = await databaseServices.categories.findOne({
      _id: new ObjectId(id)
    })

    if (!category) {
      throw new ErrorWithStatus({
        message: MESSAGES.CATEGORY_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const updateData: Partial<Category> = {}

    // active status
    if (payload.is_active !== undefined) {
      if (payload.is_active === false) {
        const tourCount = await databaseServices.tours.countDocuments({
          category_id: new ObjectId(id),
          status: TourStatus.Active
        })
        if (tourCount > 0) {
          throw new ErrorWithStatus({
            message: MESSAGES.CATEGORY_HAS_ACTIVE_TOURS,
            status: HTTP_STATUS.BAD_REQUEST
          })
        }
      }
      updateData.is_active = payload.is_active
    }

    const updatedCategory = await databaseServices.categories.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData, $currentDate: { updated_at: true } },
      { returnDocument: 'after' }
    )

    return {
      category: updatedCategory
    }
  }

  async deleteCategory(id: string) {
    const tourCount = await databaseServices.tours.countDocuments({ category_id: new ObjectId(id) })
    if (tourCount > 0) {
      throw new ErrorWithStatus({
        message: MESSAGES.CATEGORY_HAS_TOURS,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }
    await databaseServices.categories.deleteOne({ _id: new ObjectId(id) })
  }
}

const categoriesService = new CategoriesService()

export default categoriesService
