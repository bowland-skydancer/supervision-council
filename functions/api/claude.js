// Cloudflare Pages Function: proxy to the Anthropic Messages API.
// File location is significant: functions/api/claude.js maps to the path /api/claude.
//
// The ANTHROPIC_API_KEY environment variable must be set in the Cloudflare Pages
// project settings (Settings > Environment variables) and marked as Encrypted.

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return jsonError(405, "Method not allowed. Use POST.");
  }

  if (!env.ANTHROPIC_API_KEY) {
    return jsonError(
      500,
      "Server is missing ANTHROPIC_API_KEY. Set it in Cloudflare Pages > Settings > Environment variables."
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonError(400, "Request body must be valid JSON.");
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        ...corsHeaders(),
      },
    });
  } catch (err) {
    return jsonError(502, "Upstream request to Anthropic failed: " + (err && err.message ? err.message : String(err)));
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
    },
  });
}
