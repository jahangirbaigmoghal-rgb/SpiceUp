import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    restaurantName: z.string().min(1).max(200).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      postcode: z.string().optional(),
    }).optional(),
    openingHours: z.record(z.string(), z.any()).optional(),
    deliverySettings: z.object({
      enabled: z.boolean().optional(),
      minimumOrderPence: z.number().int().min(0).optional(),
      defaultDeliveryFeePence: z.number().int().min(0).optional(),
    }).passthrough().optional(),
    taxSettings: z.object({
      defaultVatRate: z.number().min(0).max(100).optional(),
      showPricesIncVat: z.boolean().optional(),
    }).passthrough().optional(),
    printerSettings: z.object({
      enabled: z.boolean().optional(),
      host: z.string().optional(),
      port: z.number().int().optional(),
    }).passthrough().optional(),
  }).passthrough(),
});
