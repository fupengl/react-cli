import joi from 'joi'
import type Joi from 'joi'
import exit from './exit.js'

type SchemaType = Joi.ObjectSchema

export function createSchema(
  fn: (j: typeof Joi) => Joi.ObjectSchema
): Joi.ObjectSchema {
  let schema = fn(joi)
  if (typeof schema === 'object' && typeof schema.validate !== 'function') {
    schema = joi.object(schema)
  }

  return schema
}

export function validate(
  obj: any,
  schema: Joi.ObjectSchema,
  cb: (errMsg: Error | string) => void
): void {
  const { error } = schema.validate(obj)
  if (error) {
    cb(error.details[0].message)

    if (process.env.REACT_CLI_TEST) {
      throw error
    } else {
      exit(1)
    }
  }
}

export function validateSync(obj: any, schema: Joi.ObjectSchema): void {
  const { error } = schema.validate(obj)
  if (error) {
    throw error
  }
}

export type { SchemaType }
