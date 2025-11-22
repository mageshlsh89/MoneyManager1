// src/utils/validate.js
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true, removeAdditional: true })
addFormats(ajv)

export const transactionSchema = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    merchant: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    category: { type: 'string', enum: ['Food', 'Grocery', 'Travel', 'Leisure', 'Investment', 'Salary', 'Transfer', 'Bills', 'Other'] },
    notes: { type: 'string' }
  },
  required: ['date', 'merchant', 'amount', 'currency', 'category'],
  additionalProperties: false
}

export const transactionsArraySchema = {
  type: 'array',
  items: transactionSchema,
  minItems: 1
}

export const validateTransactions = (arr) => {
  const validate = ajv.compile(transactionsArraySchema)
  const valid = validate(arr)
  return { valid, errors: validate.errors }
}
