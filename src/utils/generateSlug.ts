import slugify from 'slugify'
import databaseServices from '~/services/database.services'

export const generateUniqueSlug = async (name: string) => {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true
  })

  let slug = baseSlug
  let counter = 1

  while (true) {
    const exist = await databaseServices.categories.findOne({ slug })

    if (!exist) break

    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
