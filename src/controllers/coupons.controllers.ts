import { Request, Response } from "express"
import { CreateCouponReqBody } from "~/models/requests/Coupon.requests"
import { ParamsDictionary } from "express-serve-static-core"
import { MESSAGES } from "~/constants/messages"
import couponsService from "~/services/coupons.services"

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