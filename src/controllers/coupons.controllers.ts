import { Request, Response } from 'express'
import { CreateCouponReqBody, GetCouponsQuery, UpdateCouponReqBody } from '~/models/requests/Coupon.requests'
import { ParamsDictionary } from 'express-serve-static-core'
import { MESSAGES } from '~/constants/messages'
import couponsService from '~/services/coupons.services'

export const createCouponController = async (
  req: Request<ParamsDictionary, any, CreateCouponReqBody>,
  res: Response
) => {
  const result = await couponsService.createCoupon(req.body)
  return res.status(201).json({
    message: MESSAGES.CREATE_COUPON_SUCCESS,
    result
  })
}

export const getCouponsController = async (
  req: Request<ParamsDictionary, any, any, GetCouponsQuery>,
  res: Response
) => {
  const result = await couponsService.getCoupons(req.query)
  return res.json({
    message: MESSAGES.GET_COUPONS_SUCCESS,
    result
  })
}

export const updateCouponController = async (
  req: Request<ParamsDictionary, any, UpdateCouponReqBody>,
  res: Response
) => {
  const { id } = req.params
  const result = await couponsService.updateCoupon(id as string, req.body)
  return res.json({
    message: MESSAGES.UPDATE_COUPON_SUCCESS,
    result
  })
}
