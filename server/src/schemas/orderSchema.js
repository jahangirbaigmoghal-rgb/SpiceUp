import { z } from 'zod';

const modifierSchema = z.object({
  groupId: z.string().optional(),
  modifierGroupId: z.string().optional(),
  groupName: z.string().optional(),
  optionId: z.string().optional(),
  id: z.string().optional(),
  _id: z.string().optional(),
  optionName: z.string().optional(),
  name: z.string().optional(),
  pricePence: z.number().optional(),
  priceDeltaPence: z.number().optional(),
  labelId: z.string().optional(),
  labelName: z.string().optional(),
  kitchenText: z.string().optional(),
}).passthrough();

const orderItemSchema = z.object({
  menuItem: z.string().optional(),
  menuItemId: z.string().optional(),
  quantity: z.number().int().min(1),
  variationId: z.string().optional(),
  variation: z.any().optional(),
  itemNote: z.string().optional(),
  notes: z.string().optional(),
  modifiers: z.array(modifierSchema).optional(),
  isBundle: z.boolean().optional(),
  bundleId: z.string().optional(),
  bundleItems: z.array(z.any()).optional(),
}).passthrough();

export const createOrderSchema = z.object({
  body: z.object({
    orderType: z.enum(['delivery', 'collection', 'takeaway', 'dine-in']),
    customer: z.any().optional(),
    customerDetails: z.any().optional(),
    lines: z.array(orderItemSchema).optional(),
    items: z.array(orderItemSchema).optional(),
    paymentMethod: z.enum(['cash', 'card', 'stripe', 'payment_link', 'complimentary']).optional(),
    promoCode: z.string().optional(),
    notes: z.string().optional(),
    terminalId: z.string().optional(),
    voiceCallSid: z.string().optional(),
    deliveryFeePence: z.number().optional(),
    deliveryChargePence: z.number().optional(),
  }).passthrough(),
});
