import Joi = require("joi");

export const approveAllUserDTO = Joi.object({
  communityID: Joi.string().required(),
  isApprove: Joi.boolean().required(),
});