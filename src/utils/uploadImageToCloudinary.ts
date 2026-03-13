import { v2 as cloudinary } from 'cloudinary'
import { UploadApiResponse } from 'cloudinary'
import streamifier from 'streamifier'

export const uploadImageToCloudinary = (buffer: Buffer, folder: string): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error)
      resolve(result as UploadApiResponse)
    })

    streamifier.createReadStream(buffer).pipe(stream)
  })
}
