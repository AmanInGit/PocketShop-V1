import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RecommendationSeverity = "info" | "warning" | "critical";
type RecommendationType =
  | "trending_dish"
  | "weak_revenue_today"
  | "low_stock"
  | "out_of_stock"
  | "data_note";

type RecommendationItem = {
  id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  facts: Record<string, string | number | boolean | null>;
  suggestedAction?: string;
};

type RequestBody = {
  vendor?: {
    businessName?: string | null;
  };
  items: RecommendationItem[];
};

type ResponseBody = {
  items: Array<{
    id: string;
    title: string;
    message: string;
    why?: string;
  }>;
  meta: {
    usedModel: string | null;
    fallback: boolean;
  };
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function deterministicCopy(item: RecommendationItem): {
  id: string;
  title: string;
  message: string;
  why?: string;
} {
  switch (item.type) {
    case "trending_dish": {
      const name = String(item.facts.dishName ?? "This dish");
      const qty = num(item.facts.quantitySold);
      return {
        id: item.id,
        title: item.title,
        message: `${name} is trending today. Consider featuring it prominently.`,
        why: `Sold ${qty} units in completed orders.`,
      };
    }
    case "weak_revenue_today": {
      const deltaPct = num(item.facts.deltaPct);
      const todayRevenue = num(item.facts.todayRevenue);
      const yesterdayRevenue = num(item.facts.yesterdayRevenue);
      return {
        id: item.id,
        title: item.title,
        message: `Revenue is down ${Math.abs(deltaPct).toFixed(
          1,
        )}% vs yesterday. Try a limited-time offer to recover sales.`,
        why: `Today: ₹${todayRevenue.toFixed(0)} • Yesterday: ₹${yesterdayRevenue.toFixed(
          0,
        )} (completed orders).`,
      };
    }
    case "out_of_stock": {
      const name = String(item.facts.productName ?? "This item");
      const stock = num(item.facts.stockQuantity);
      return {
        id: item.id,
        title: item.title,
        message: `${name} is out of stock. Restock or mark it unavailable.`,
        why: `Stock quantity is ${stock}.`,
      };
    }
    case "low_stock": {
      const name = String(item.facts.productName ?? "This item");
      const stock = num(item.facts.stockQuantity);
      const threshold = num(item.facts.lowStockThreshold);
      return {
        id: item.id,
        title: item.title,
        message: `${name} is running low. Plan a restock soon.`,
        why: `Stock ${stock} (threshold ${threshold}).`,
      };
    }
    default:
      return {
        id: item.id,
        title: item.title,
        message: "Recommendation generated from current data.",
      };
  }
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
    const body = (await req.json()) as RequestBody;
    const items = Array.isArray(body?.items) ? body.items : [];

    // If no key configured, return deterministic copy.
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      const resp: ResponseBody = {
        items: items.map(deterministicCopy),
        meta: { usedModel: null, fallback: true },
      };
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LLM phrasing — strict contract: do not invent numbers; only rephrase facts.
    const vendorName = body?.vendor?.businessName ?? null;
    const prompt = {
      role: "user",
      content: [
        `You are generating short business recommendations for a vendor dashboard.`,
        `IMPORTANT: You MUST NOT invent or change numbers. Only use the facts provided in each item.`,
        `Return JSON only. No markdown. No extra keys.`,
        vendorName ? `Vendor: ${vendorName}` : `Vendor: (unknown)`,
        `Schema: { items: [{ id, title, message, why? }] }`,
        `Items to rewrite (keep same id; keep factual accuracy):`,
        JSON.stringify(items),
      ].join("\n"),
    };

    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    const llmResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [prompt],
      }),
    });

    if (!llmResp.ok) {
      const fallback: ResponseBody = {
        items: items.map(deterministicCopy),
        meta: { usedModel: null, fallback: true },
      };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await llmResp.json();
    const content = json?.choices?.[0]?.message?.content;

    // Parse LLM JSON. If invalid, fallback.
    try {
      const parsed = JSON.parse(content);
      const outItems = Array.isArray(parsed?.items) ? parsed.items : null;
      if (!outItems) throw new Error("Invalid LLM payload");

      const resp: ResponseBody = {
        items: outItems,
        meta: { usedModel: model, fallback: false },
      };
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      const fallback: ResponseBody = {
        items: items.map(deterministicCopy),
        meta: { usedModel: null, fallback: true },
      };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

