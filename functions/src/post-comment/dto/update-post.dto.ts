import Joi = require("joi");

export const updatePostDTO = Joi.object({
  communityID: Joi.string().required(),
  postID: Joi.string().required(),
  title: Joi.string().required(),
  content: Joi.string().required(),
  downloadImage: Joi.array().items(Joi.string()),
});