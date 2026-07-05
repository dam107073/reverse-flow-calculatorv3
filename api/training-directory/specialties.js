export const config = {
  runtime: "edge"
};

function getEnv(name) {
  if (typeof Deno !== "undefined" && Deno.env) {
    return Deno.env.get(name);
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  return "";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Training Directory backend is not configured." }, 500);
  }

  const query = "select=id,slug,display_name,sort_order&is_active=eq.true&order=sort_order.asc,display_name.asc";
  const response = await fetch(`${supabaseUrl}/rest/v1/training_listing_specialties?${query}`, {
    headers: {
      "apikey": serviceRoleKey,
      "authorization": `Bearer ${serviceRoleKey}`,
      "accept": "application/json"
    }
  });

  if (!response.ok) {
    return jsonResponse({ error: "Unable to load Training Directory specialties." }, 502);
  }

  const rows = await response.json();
  return jsonResponse({
    specialties: rows.map(row => ({
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      sortOrder: row.sort_order
    }))
  });
}
