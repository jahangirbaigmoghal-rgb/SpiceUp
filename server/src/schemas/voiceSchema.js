import { z } from 'zod';

export const validateVoiceZoneSchema = z.object({
  body: z.object({
    postcode: z.string().min(3, 'Postcode is required').max(10),
  }),
});

export const placeVoiceOrderSchema = z.object({
  body: z.object({
    customer_name: z.string().min(1).max(100).optional(),
    customer_phone: z.string().min(5, 'Phone number is required').max(20),
    order_type: z.enum(['collection', 'delivery', 'takeaway', 'dine-in']),
    delivery_postcode: z.string().max(10).optional(),
    delivery_address: z.string().max(500).optional(),
    items: z.array(z.object({
      menu_item_id: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
      variation_id: z.string().optional(),
      modifiers: z.array(z.object({
        groupId: z.string().optional(),
        groupName: z.string().optional(),
        optionId: z.string().optional(),
        optionName: z.string().optional(),
        labelId: z.string().optional(),
        selectedLabelId: z.string().optional(),
        labelName: z.string().optional(),
      })).optional(),
    })).min(1, 'At least one item required'),
    notes: z.string().max(500).optional(),
  }).passthrough(),
});

export const modifyVoiceOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      menu_item_id: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
      variation_id: z.string().optional(),
      modifiers: z.array(z.object({
        groupId: z.string().optional(),
        groupName: z.string().optional(),
        optionId: z.string().optional(),
        optionName: z.string().optional(),
        labelId: z.string().optional(),
        selectedLabelId: z.string().optional(),
        labelName: z.string().optional(),
      })).optional(),
    })).min(1, 'At least one item required'),
    notes: z.string().max(500).optional(),
  }).passthrough(),
  params: z.object({
    reference: z.string().min(1),
  }),
});

export const cancelVoiceOrderSchema = z.object({
  params: z.object({
    reference: z.string().min(1),
  }),
});

export const sendPaymentLinkSchema = z.object({
  body: z.object({
    order_reference: z.string().min(1, 'Order reference is required'),
    phone_number: z.string().min(5).max(20).optional(),
  }).passthrough(),
});

export const sendVoiceBillSmsSchema = z.object({
  body: z.object({
    order_reference: z.string().min(1, 'Order reference is required'),
  }).passthrough(),
});

export const calculateVoicePriceSchema = z.object({
  body: z.object({
    order_type: z.enum(['collection', 'delivery', 'takeaway', 'dine-in']),
    delivery_postcode: z.string().max(10).optional(),
    items: z.array(z.object({
      menu_item_id: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
      variation_id: z.string().optional(),
      modifiers: z.array(z.object({
        groupId: z.string().optional(),
        groupName: z.string().optional(),
        optionId: z.string().optional(),
        optionName: z.string().optional(),
        labelId: z.string().optional(),
        selectedLabelId: z.string().optional(),
        labelName: z.string().optional(),
      })).optional(),
    })).min(1, 'At least one item required'),
  }).passthrough(),
});


