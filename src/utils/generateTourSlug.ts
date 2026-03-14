import slugify from 'slugify'
import databaseServices from '~/services/database.services'
import { ObjectId } from 'mongodb'

export const generateUniqueTourSlug = async (name: string, tourId?: string) => {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    locale: 'vi'
  })

  let slug = baseSlug
  let counter = 1

  while (true) {
    const exist = await databaseServices.tours.findOne({
      slug,
      ...(tourId && { _id: { $ne: new ObjectId(tourId) } })
    })

    if (!exist) break

    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
