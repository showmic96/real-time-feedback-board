import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GuestbookRequest {
  message: string;
  author_name?: string;
  author_avatar?: string;
  is_anonymous: boolean;
  ip_address?: string;
  user_id?: string;
}

async function moderateContent(
  text: string,
  openaiApiKey: string
): Promise<{ isAppropriate: boolean; reason?: string }> {
  try {
    if (!text.trim()) {
      return { isAppropriate: false, reason: "Message cannot be empty" };
    }

    if (text.length > 500) {
      return {
        isAppropriate: false,
        reason: "Message is too long (max 500 characters)",
      };
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
      }),
    });

    if (!response.ok) {
      console.error(
        "OpenAI moderation API error:",
        response.status,
        response.statusText
      );
      // In case of API error, allow the message but log the error
      return { isAppropriate: true };
    }

    const data = await response.json();
    const result = data.results[0];

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      return {
        isAppropriate: false,
        reason: `Content violates guidelines: ${flaggedCategories.join(", ")}`,
      };
    }

    return { isAppropriate: true };
  } catch (error) {
    console.error("Moderation error:", error);
    // In case of error, allow the message but log the error
    return { isAppropriate: true };
  }
}

async function checkRateLimit(
  supabase: any,
  ipAddress: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("guestbook_entries")
    .select("id")
    .eq("ip_address", ipAddress)
    .eq("is_anonymous", true)
    .gte("created_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    return false; // Deny on error for safety
  }

  return data.length < 5;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OpenAI API key not configured",
          type: "configuration_error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create Supabase client with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: GuestbookRequest = await req.json();

    // Moderate content first
    const moderationResult = await moderateContent(
      requestData.message,
      openaiApiKey
    );

    if (!moderationResult.isAppropriate) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            moderationResult.reason || "Message violates content guidelines",
          type: "moderation_failed",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For anonymous users, check rate limiting
    if (requestData.is_anonymous && requestData.ip_address) {
      const canPost = await checkRateLimit(supabase, requestData.ip_address);
      if (!canPost) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Rate limit exceeded. Anonymous users can post 5 messages per hour.",
            type: "rate_limit_exceeded",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Insert the message
    const { data, error } = await supabase
      .from("guestbook_entries")
      .insert({
        message: requestData.message.trim(),
        author_name: requestData.author_name || null,
        author_avatar: requestData.author_avatar || null,
        is_anonymous: requestData.is_anonymous,
        ip_address: requestData.is_anonymous ? requestData.ip_address : null,
        user_id: requestData.user_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to save message",
          type: "database_error",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        type: "server_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
