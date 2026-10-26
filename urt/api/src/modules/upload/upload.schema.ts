import { z } from 'zod';

export const uploadKeySchema = z.string().regex(/^(img|doc)_[a-f0-9]{16}$/, 'Invalid file key');
export const uploadParamsSchema = z.object({ params: z.object({ key: uploadKeySchema }) });
