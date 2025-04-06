import { ZodSchema } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

export const zodPipe = (schema: ZodSchema) => new ZodValidationPipe(schema);
