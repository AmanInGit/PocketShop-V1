import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function decrementOrderStock(
  supabase: ReturnType<typeof createClient>,
  items: Array<{ product_id?: string; quantity?: number }> | null | undefined,
) {
  if (!Array.isArray(items)) return;

  for (const item of items) {
    if (!item?.product_id || !item?.quantity) continue;
    await supabase.rpc("atomic_stock_update", {
      _product_id: item.product_id,
      _quantity_change: -Number(item.quantity),
    });
  }
}

function parseStripeSignature(signatureHeader: string) {
  const pairs = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = pairs.find((part) => part.startsWith("t="));
  const v1Part = pairs.find((part) => part.startsWith("v1="));
  return {
    timestamp: timestampPart?.slice(2) ?? "",
    signature: v1Part?.slice(3) ?? "",
  };
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSignature = req.headers.get("stripe-signature");
    if (!stripeSignature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const { timestamp, signature } = parseStripeSignature(stripeSignature);
    if (!timestamp || !signature) {
      return new Response(JSON.stringify({ error: "Invalid stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = await hmacSha256(webhookSecret, signedPayload);
    if (!timingSafeEqual(expected, signature)) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data?: { object?: Record<string, unknown> };
    };
    const object = event.data?.object ?? {};
    const metadata = (object.metadata as Record<string, string> | undefined) ?? {};
    const orderId = metadata.orderId;
    const paymentIntentId = (object.payment_intent as string | undefined) ?? (object.id as string | undefined);
    const sessionId = object.id as string | undefined;

    if (!orderId) {
      return new Response(JSON.stringify({ received: true, skipped: true, reason: "No orderId metadata" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, total_amount, payment_status, items")
      .eq("id", orderId)
      .maybeSingle();

    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const alreadyPaid =
        String(orderRow?.payment_status ?? "").toLowerCase() === "paid" ||
        String(paymentRow?.payment_status ?? "").toLowerCase() === "completed";

      await supabase
        .from("orders")
        .update({
          status: "pending",
          payment_status: "paid",
          payment_method: "card",
          kitchen_state: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (!alreadyPaid) {
        await decrementOrderStock(
          supabase,
          (orderRow?.items as Array<{ product_id?: string; quantity?: number }> | null | undefined) ?? [],
        );
      }

      if (paymentRow?.id) {
        await supabase
          .from("payments")
          .update({
            payment_status: "completed",
            payment_method: "card",
            transaction_id: sessionId ?? paymentRow.id,
            stripe_payment_intent_id: paymentIntentId ?? null,
          })
          .eq("id", paymentRow.id);
      } else {
        await supabase.from("payments").insert({
          order_id: orderId,
          amount: Number(orderRow?.total_amount ?? 0),
          payment_method: "card",
          payment_status: "completed",
          transaction_id: sessionId ?? null,
          stripe_payment_intent_id: paymentIntentId ?? null,
        });
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "unpaid",
          payment_method: "card",
        })
        .eq("id", orderId);

      if (paymentRow?.id) {
        await supabase
          .from("payments")
          .update({
            payment_status: "failed",
            payment_method: "card",
            transaction_id: sessionId ?? paymentRow.id,
            stripe_payment_intent_id: paymentIntentId ?? null,
          })
          .eq("id", paymentRow.id);
      }
    }

    return new Response(JSON.stringify({ received: true, eventId: event.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

