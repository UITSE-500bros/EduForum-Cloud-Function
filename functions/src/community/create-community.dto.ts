import Joi = require("joi");

export const createCommunityDTO = Joi.object({
  communityID: Joi.string().required(),
  name: Joi.string().required(),
  department: Joi.string().required(),
  description: Joi.string().required(),
  adminList: Joi.array().items(Joi.string()).required(),
  profilePicture: Joi.string().required(),
  visibility: Joi.string(),
  waitForApproval: Joi.boolean(),
});