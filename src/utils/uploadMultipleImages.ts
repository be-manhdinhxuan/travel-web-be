import { v2 as cloudinary } from 'cloudinary'
import { uploadImageToCloudinary } from './uploadImageToCloudinary'

export const uploadMultipleImages = async (files: Express.Multer.File[], folder: string) => {
  const uploads = files.map((file) => uploadImageToCloudinary(file.buffer, folder))

  const results = await Promise.all(uploads)

  return results.map((img: any) => img.secure_url)
}
