import { z } from 'zod';

/**
 * Express middleware to validate req.body, req.query, and req.params using Zod.
 * @param {z.ZodTypeAny} schema - Zod schema (usually z.object)
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return res.status(500).json({ error: 'Internal validation error' });
  }
};
