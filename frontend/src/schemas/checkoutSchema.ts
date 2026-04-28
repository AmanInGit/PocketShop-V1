import { z } from 'zod';

export const checkoutFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must be less than 100 characters' })
    .refine((val) => {
      // More lenient validation - allow any characters except empty or just whitespace
      const trimmed = val.trim();
      return trimmed.length >= 2 && trimmed.length <= 100;
    }, { message: 'Please enter a valid name (2-100 characters)' }),
  
  phone: z
    .string()
    .trim()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .max(20, { message: 'Phone number must be less than 20 characters' })
    .refine((val) => {
      // More lenient validation - just check for digits
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    }, { message: 'Please enter a valid phone number (10-15 digits)' }),
  
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email must be less than 255 characters' })
    .optional()
    .or(z.literal('')),
  
  notes: z
    .string()
    .trim()
    .max(500, { message: 'Notes must be less than 500 characters' })
    .optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Validation helper for cart items
export const validateCartItems = (cartItems: any[]) => {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty');
  }

  if (cartItems.length > 50) {
    throw new Error('Maximum 50 items allowed per order');
  }

  // Validate each item
  for (const item of cartItems) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('Invalid product ID in cart');
    }

    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
      throw new Error('Invalid quantity in cart');
    }

    if (item.quantity > 1000) {
      throw new Error('Maximum quantity per item is 1000');
    }
  }

  return true;
};

