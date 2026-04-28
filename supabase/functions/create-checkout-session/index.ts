import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CheckoutRequest = {
  orderId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  vendorId?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173";

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CheckoutRequest;
    if (!body?.orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, payment_status, payment_method")
      .eq("id", body.orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(order.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unitAmount = Math.round(amount * 100);
    const successUrl = `${frontendUrl}/payment-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/payment-cancel?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;

    const formData = new URLSearchParams();
    formData.append("mode", "payment");
    formData.append("success_url", successUrl);
    formData.append("cancel_url", cancelUrl);
    formData.append("line_items[0][quantity]", "1");
    formData.append("line_items[0][price_data][currency]", "inr");
    formData.append("line_items[0][price_data][unit_amount]", String(unitAmount));
    formData.append("line_items[0][price_data][product_data][name]", `PocketShop Order ${order.id.slice(0, 8)}`);
    formData.append("metadata[orderId]", order.id);
    if (body.vendorId) {
      formData.append("metadata[vendorId]", body.vendorId);
      formData.append("payment_intent_data[metadata][vendorId]", body.vendorId);
    }
    formData.append("payment_intent_data[metadata][orderId]", order.id);
    if (body.customerName) {
      formData.append("customer_creation", "always");
      formData.append("payment_intent_data[description]", `Order for ${body.customerName}`);
    }
    if (body.customerEmail && body.customerEmail.trim().length > 0) {
      formData.append("customer_email", body.customerEmail.trim());
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const stripeJson = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({
          error: stripeJson?.error?.message ?? "Failed to create Stripe checkout session",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const checkoutSessionId = stripeJson.id as string;

    await supabase
      .from("orders")
      .update({
        payment_status: "unpaid",
        payment_method: "card",
      })
      .eq("id", order.id);

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (existingPayment?.id) {
      await supabase
        .from("payments")
        .update({
          payment_method: "card",
          payment_status: "pending",
          transaction_id: checkoutSessionId,
        })
        .eq("id", existingPayment.id);
    } else {
      await supabase.from("payments").insert({
        order_id: order.id,
        amount,
        payment_method: "card",
        payment_status: "pending",
        transaction_id: checkoutSessionId,
      });
    }

    return new Response(
      JSON.stringify({
        url: stripeJson.url,
        sessionId: checkoutSessionId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

