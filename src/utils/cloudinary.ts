import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const getPublicIdFromUrl = (url: string) => {
  const parts = url.split('/')
  const fileName = parts.pop()
  const folder = parts.pop()

  if (!fileName || !folder) return null

  return `${folder}/${fileName.split('.')[0]}`
}

export default cloudinary
