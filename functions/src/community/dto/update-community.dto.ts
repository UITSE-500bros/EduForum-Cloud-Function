import Joi = require("joi");

export const UpdateCommunityDTO = Joi.object({
  communityID: Joi.string().required(),
  name: Joi.string(),
  department: Joi.string(),
  description: Joi.string(),
  profilePicture: Joi.string(),
  oldProfilePicture: Joi.string(),
  visibility: Joi.string(),
});