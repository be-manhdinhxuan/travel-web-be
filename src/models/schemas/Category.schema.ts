import { ObjectId } from 'mongodb'

interface CategoryType {
  _id?: ObjectId
  name: string
  slug: string
  description?: string
  thumbnail: string
  is_active: boolean
  created_at?: Date
  updated_at?: Date
}

export default class Category {
  _id?: ObjectId
  name: string
  slug: string
  description: string
  thumbnail: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  constructor(category: CategoryType) {
    const date = new Date()
    this._id = category._id
    this.name = category.name
    this.slug = category.slug
    this.description = category.description || ''
    this.thumbnail = category.thumbnail || ''
    this.is_active = category.is_active || true
    this.created_at = category.created_at || date
    this.updated_at = category.updated_at || date
  }
}
