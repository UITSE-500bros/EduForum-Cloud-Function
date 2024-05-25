import Joi = require("joi");
import { categoryDTO, creatorDTO } from "./nested.dto";

export const createPostDTO = Joi.object({
  postID: Joi.string().required(),
  communityID: Joi.string().required(),
  creator: creatorDTO.required(),
  title: Joi.string().required(),
  content: Joi.string().required(),
  downloadImage: Joi.array().items(Joi.string()),
  isAnonymous: Joi.boolean(),
  category: Joi.array().items(categoryDTO),
});
