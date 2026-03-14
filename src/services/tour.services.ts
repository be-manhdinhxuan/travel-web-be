import { ObjectId } from 'mongodb'
import { CreateTourReqBody } from '~/models/requests/Tour.requests'
import Tour from '~/models/schemas/Tour.schema'
import { generateUniqueSlug } from '~/utils/generateSlug'
import { uploadImageToCloudinary } from '~/utils/uploadImageToCloudinary'
import databaseServices from './database.services'

class ToursService {
  async createTour(payload: CreateTourReqBody, files: Express.Multer.File[]) {
    const images: string[] = []

    if (files?.length) {
      const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer, 'tours')))

      uploads.forEach((img: any) => images.push(img.secure_url))
    }

    const slug = await generateUniqueSlug(payload.name)

    const tour = new Tour({
      category_id: new ObjectId(payload.category_id),
      name: payload.name,
      slug,
      description: payload.description,
      highlights: payload.highlights,
      destination: payload.destination,
      departure_city: payload.departure_city,
      duration_days: Number(payload.duration_days),
      duration_nights: Number(payload.duration_nights),
      images,
      itinerary: payload.itinerary,
      includes: payload.includes,
      excludes: payload.excludes
    })

    const result = await databaseServices.tours.insertOne(tour)

    return {
      tour: {
        _id: result.insertedId,
        ...tour
      }
    }
  }
}

const toursService = new ToursService()

export default toursService
