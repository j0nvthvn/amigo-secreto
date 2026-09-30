import { z } from 'zod';

/** Validaciones de cliente que reflejan las reglas de negocio. La API vuelve a validar todo. */

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

/** R2 */
export const groupNameSchema = trimmed(1, 60);
export const placeSchema = z.string().trim().max(120);
export const budgetAmountSchema = z.number().int().min(0);
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const eventDateSchema = z.iso.date();

/** R8 */
export const memberNameSchema = trimmed(1, 40);

/** R24 */
export const wishlistItemSchema = z.object({
  text: trimmed(1, 200),
  url: z
    .string()
    .trim()
    .max(500)
    .regex(/^https?:\/\//i)
    .optional(),
});

/** R26 */
export const messageBodySchema = trimmed(1, 500);
