import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { MESSAGES } from '~/constants/messages'
import { ItineraryDayType } from '~/models/schemas/Tour.schema'
import databaseServices from '~/services/database.services'
import { validate } from '~/utils/validation'

export const createTourValidator = validate(
  checkSchema(
    {
      category_id: {
        notEmpty: {
          errorMessage: MESSAGES.CATEGORY_ID_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.CATEGORY_ID_MUST_BE_A_STRING
        },
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(MESSAGES.CATEGORY_ID_IS_INVALID)
            }
            const category = await databaseServices.categories.findOne({
              _id: new ObjectId(value),
              is_active: true
            })
            if (!category) {
              throw new Error(MESSAGES.CATEGORY_NOT_FOUND)
            }
            return true
          }
        }
      },
      name: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_NAME_MUST_BE_A_STRING
        },
        isLength: {
          options: { min: 5, max: 200 },
          errorMessage: MESSAGES.TOUR_NAME_LENGTH
        },
        trim: true
      },
      description: {
        optional: true,
        isString: {
          errorMessage: MESSAGES.TOUR_DESCRIPTION_MUST_BE_A_STRING
        },
        trim: true
      },
      highlights: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_HIGHLIGHTS_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      destination: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DESTINATION_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_DESTINATION_MUST_BE_A_STRING
        },
        trim: true
      },
      departure_city: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DEPARTURE_CITY_IS_REQUIRED
        },
        isString: {
          errorMessage: MESSAGES.TOUR_DEPARTURE_CITY_MUST_BE_A_STRING
        },
        trim: true
      },
      duration_days: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DURATION_DAYS_IS_REQUIRED
        },
        isInt: {
          options: { min: 1 },
          errorMessage: MESSAGES.TOUR_DURATION_DAYS_MUST_BE_A_POSITIVE_INTEGER
        },
        toInt: true
      },
      duration_nights: {
        notEmpty: {
          errorMessage: MESSAGES.TOUR_DURATION_NIGHTS_IS_REQUIRED
        },
        isInt: {
          options: { min: 0 },
          errorMessage: MESSAGES.TOUR_DURATION_NIGHTS_MUST_BE_A_NON_NEGATIVE_INTEGER
        },
        toInt: true
      },
      itinerary: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_ITINERARY_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: ItineraryDayType[]) => {
            for (const item of value) {
              if (typeof item.day !== 'number' || item.day < 1) {
                throw new Error(MESSAGES.TOUR_ITINERARY_DAY_IS_INVALID)
              }
              if (!item.title || typeof item.title !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_TITLE_IS_REQUIRED)
              }
              if (!item.description || typeof item.description !== 'string') {
                throw new Error(MESSAGES.TOUR_ITINERARY_DESCRIPTION_IS_REQUIRED)
              }
            }
            return true
          }
        }
      },
      includes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_INCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_INCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      excludes: {
        optional: true,
        customSanitizer: {
          options: (value: string) => {
            try {
              return typeof value === 'string' ? JSON.parse(value) : value
            } catch {
              return value
            }
          }
        },
        isArray: {
          errorMessage: MESSAGES.TOUR_EXCLUDES_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value: string[]) => {
            if (!value.every((item) => typeof item === 'string')) {
              throw new Error(MESSAGES.TOUR_EXCLUDES_MUST_BE_ARRAY_OF_STRING)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
