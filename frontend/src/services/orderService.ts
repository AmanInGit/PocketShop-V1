/**
 * Order Service
 * 
 * Creates orders directly in the database.
 * This is a fallback when Edge Functions are not available.
 * 
 * When Edge Functions are deployed, they should handle:
 * - Stock validation
 * - Order number generation
 * - Payment processing
 * - Notifications
 * 
 * This service provides a simpler direct database insertion for development/testing.
 */

import { supabase } from '@/lib/supabaseClient';
import { logAuditEntry } from '@/services/auditService';
import { toE164Phone } from '@/features/common/utils/phone';

export interface CreateOrderPayload {
  vendorId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  paymentMethod?: 'cash' | 'upi' | 'wallet' | 'card' | null;
  notes?: string | null;
  customerId?: string | null;
  /** Discount amount in ₹ (from vendor offers) */
  discountAmount?: number;
  /** Table code: "3", "N-T1", or "PICKUP" for walk-in */
  tableCode?: string | null;
  /** Stable table identity from QR slug */
  tableSlug?: string | null;
}

export interface CreateOrderResponse {
  success: boolean;
  order?: any;
  error?: string;
}

function isDeferredPaymentMethod(method?: CreateOrderPayload['paymentMethod']): boolean {
  return method === 'card';
}

function shouldCreateImmediatePaymentRecord(method?: CreateOrderPayload['paymentMethod']): boolean {
  return method === 'cash';
}

/**
 * Fetch products to calculate total and validate items
 */
async function fetchProducts(productIds: string[]): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, vendor_id')
    .in('id', productIds);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const productsMap: Record<string, any> = {};
  data?.forEach(product => {
    productsMap[product.id] = product;
  });

  return productsMap;
}

/**
 * Generate order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create order directly in database
 * 
 * This function:
 * 1. Validates products exist and are available
 * 2. Calculates total amount
 * 3. Checks stock (optional, can be disabled for development)
 * 4. Creates order with items as JSONB
 * 5. Triggers will automatically:
 *    - Create payment record (if COD)
 *    - Send notifications
 *    - Update timestamps
 */
export async function createOrderDirect(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  try {
    const { vendorId, items, customerName, customerPhone, customerEmail, paymentMethod, notes, customerId, discountAmount, tableCode, tableSlug } = payload;
    const customerPhoneE164 = toE164Phone(customerPhone);

    // Validate inputs
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required' };
    }

    if (!items || items.length === 0) {
      return { success: false, error: 'Order must have at least one item' };
    }

    if (!customerName || !customerPhoneE164) {
      return { success: false, error: 'Customer name and phone are required' };
    }

    // Fetch products to validate and calculate total
    const productIds = items.map(item => item.productId);
    const products = await fetchProducts(productIds);

    // Validate all products exist and belong to vendor
    for (const item of items) {
      const product = products[item.productId];
      if (!product) {
        return { success: false, error: `Product ${item.productId} not found` };
      }
      if (product.vendor_id !== vendorId) {
        return { success: false, error: `Product ${item.productId} does not belong to vendor` };
      }
      if (!product.stock_quantity || product.stock_quantity < item.quantity) {
        // Warn but don't fail (for development)
        console.warn(`Insufficient stock for product ${item.productId}. Requested: ${item.quantity}, Available: ${product.stock_quantity || 0}`);
      }
    }

    // Build items array with product details
    const orderItems = items.map(item => {
      const product = products[item.productId];
      return {
        product_id: item.productId,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
        subtotal: product.price * item.quantity,
      };
    });

    // Calculate total amount
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = Math.max(0, subtotal - (discountAmount ?? 0));

    // Determine payment status
    // For COD (cash), payment_status should be 'unpaid'
    // For other methods, it depends on the payment flow
    const paymentStatus = paymentMethod === 'cash' ? 'unpaid' : 
                         paymentMethod === 'card' ? 'unpaid' : 
                         'unpaid'; // Default to unpaid, will be updated by payment processing

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Try to create guest session if customer is not authenticated
    // NOTE: Guest session is optional - orders can be created without it
    // We store customer info directly in orders table (customer_name, customer_phone)
    let guestSessionId: string | null = null;
    if (!customerId) {
      // Try to create a guest session for unauthenticated customers
      // If this fails, we'll still try to create the order (guest session is optional)
      try {
        const sessionToken = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        const { data: guestSession, error: guestError } = await supabase
          .from('guest_sessions')
          .insert({
            session_token: sessionToken,
            customer_name: customerName,
            mobile_number: customerPhoneE164,
            email: customerEmail || null,
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .select('id')
          .single();

        if (guestError) {
          console.warn('Failed to create guest session (non-critical):', guestError);
          // Don't fail order creation if guest session fails
          // Guest session is optional - we store customer info in orders table directly
          guestSessionId = null;
        } else if (guestSession?.id) {
          guestSessionId = guestSession.id;
          console.log('Guest session created successfully:', guestSessionId);
        }
      } catch (guestErr: any) {
        console.warn('Error creating guest session (non-critical):', guestErr);
        // Don't fail order creation - guest session is optional
        guestSessionId = null;
      }
    }

    // Note: We no longer require customer_id OR guest_session_id
    // Orders can be created with just customer_name and customer_phone
    // This makes guest checkout more reliable

    // Create order in database
    // The trigger will automatically create payment record if payment_method is 'cash'
    console.log('Creating order with data:', {
      vendor_id: vendorId,
      customer_id: customerId || null,
      guest_session_id: guestSessionId,
      items_count: orderItems.length,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      order_number: orderNumber,
    });

    const deferOrderActivation = isDeferredPaymentMethod(paymentMethod);
    const shouldUseTableQueueInsert = !!tableCode && tableCode !== 'PICKUP' && !deferOrderActivation;
    let order: any = null;
    let orderError: any = null;

    if (shouldUseTableQueueInsert) {
      const { data: rpcOrder, error: rpcError } = await supabase.rpc('create_table_order_with_queue', {
        p_vendor_id: vendorId,
        p_customer_id: customerId || null,
        p_guest_session_id: guestSessionId,
        p_items: orderItems,
        p_total_amount: totalAmount,
        p_status: 'pending',
        p_payment_status: paymentStatus,
        p_payment_method: paymentMethod || null,
        p_customer_name: customerName,
        p_customer_phone: customerPhoneE164,
        p_customer_email: customerEmail || null,
        p_order_number: orderNumber,
        p_notes: notes || null,
        p_table_code: tableCode,
        p_table_slug: tableSlug || null,
      });

      if (!rpcError && rpcOrder) {
        order = rpcOrder;
      } else {
        // Keep this non-fatal so environments without migration still work.
        console.warn('Queue insert RPC unavailable, using direct insert fallback:', rpcError?.message);
      }
    }

    if (!order) {
      const directInsert = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          customer_id: customerId || null,
          guest_session_id: guestSessionId,
          items: orderItems,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: paymentStatus,
          payment_method: paymentMethod || null,
          customer_name: customerName,
          customer_phone: customerPhoneE164,
          customer_email: customerEmail || null,
          order_number: orderNumber,
          notes: notes || null,
          table_code: tableCode || null,
          table_slug: tableSlug || null,
          kitchen_state: shouldUseTableQueueInsert ? 'active' : null,
          activated_at: shouldUseTableQueueInsert ? new Date().toISOString() : null,
          is_followup: false,
        })
        .select()
        .single();

      order = directInsert.data;
      orderError = directInsert.error;
    }

    if (orderError) {
      console.error('Error creating order:', orderError);
      console.error('Order error details:', {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
      });
      
      // Provide more helpful error messages
      let errorMessage = `Failed to create order: ${orderError.message}`;
      if (orderError.code === '23505') {
        errorMessage = 'Order number already exists. Please try again.';
      } else if (orderError.code === '42501') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (orderError.code === '23503') {
        errorMessage = 'Invalid vendor or customer. Please refresh and try again.';
      } else if (orderError.message?.includes('violates row-level security')) {
        errorMessage = 'Unable to create order due to security restrictions. Please log in or try again.';
      }
      
      return { 
        success: false, 
        error: errorMessage,
      };
    }

    if (!order) {
      console.error('Order creation returned no data');
      return {
        success: false,
        error: 'Order creation failed. No order data returned.',
      };
    }

    console.log('Order created successfully:', order.id);

    await logAuditEntry({
      entityTable: 'orders',
      entityId: order.id,
      actionType: 'ORDER_CREATED',
      stateBefore: null,
      stateAfter: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        created_at: order.created_at,
      },
    });

    // Ensure a payment record exists for methods we currently support.
    // Card payments are created from the checkout-session function to keep Stripe as the source of truth.
    const method = paymentMethod || 'cash';
    if (shouldCreateImmediatePaymentRecord(method)) {
      try {
        const { data: existing } = await supabase
          .from('payments')
          .select('id, payment_status')
          .eq('order_id', order.id)
          .maybeSingle();

        if (!existing) {
          const { error: payErr } = await supabase.from('payments').insert({
            order_id: order.id,
            amount: totalAmount,
            payment_method: method,
            payment_status: 'pending',
          });

          if (payErr) {
            console.warn('Failed to create payment record (non-critical):', payErr);
          }
        }
      } catch (payEx: any) {
        console.warn('Error ensuring payment record (non-critical):', payEx);
      }
    }

    // Reserve stock only for orders that are immediately actionable.
    // Card orders wait for the Stripe webhook so failed/abandoned payments do not consume inventory.
    if (!deferOrderActivation) {
      try {
        for (const item of items) {
          const product = products[item.productId];
          if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
            await supabase.rpc('atomic_stock_update', {
              _product_id: item.productId,
              _quantity_change: -item.quantity,
            });
          }
        }
      } catch (stockError) {
        // Log but don't fail - stock update can be handled separately
        console.warn('Failed to update stock:', stockError);
      }
    }

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
      },
    };
  } catch (error: any) {
    console.error('Error in createOrderDirect:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order',
    };
  }
}

/**
 * Create order with Edge Function fallback
 * 
 * Tries Edge Function first, falls back to direct database insertion
 */
export async function createOrder(
  payload: CreateOrderPayload,
  options: { useEdgeFunction?: boolean } = {}
): Promise<CreateOrderResponse> {
  const { useEdgeFunction = true } = options;

  // Try Edge Function first if enabled
  if (useEdgeFunction) {
    try {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: payload,
      });

      if (!error && data?.success) {
        return data;
      }

      // If Edge Function fails, log and fall back to direct insertion
      console.warn('Edge Function failed, falling back to direct database insertion:', error?.message || data?.error);
    } catch (error: any) {
      // Edge Function doesn't exist or network error - fall back to direct insertion
      console.warn('Edge Function not available, using direct database insertion:', error.message);
    }
  }

  // Fall back to direct database insertion
  return createOrderDirect(payload);
}

