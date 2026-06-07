/**
 * Netlify Edge Function: Dynamic SEO & OG Metadata Injection
 * Intercepts requests for dynamic detail pages and fetches meta tags from Supabase
 * before serving the HTML.
 */

export default async (request, context) => {
  const url = new URL(request.url);
  const slug = url.pathname.split("/").pop();

  // Process the request normally first to get the static HTML page content
  const response = await context.next();
  if (response.status !== 200) return response;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();

  // Define target routes
  const isSystem = url.pathname.startsWith("/system");
  const isCurrent = url.pathname.startsWith("/current");

  if (!slug || (!isSystem && !isCurrent)) return new Response(html, response);

  const SUPABASE_URL = "https://vojwdyubksoozhyvnbfu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvandkeXVia3Nvb3poeXZuYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU1OTcsImV4cCI6MjA5NDAxMTU5N30.8uUc1skFlGTViyaIx_JVrEwYDO6uKg6DNvaD5BfYuW0";

  let title = "";
  let description = "";
  let image = "";

  try {
    if (isSystem) {
      const restUrl = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${slug}&select=title,description,main_image`;
      const res = await fetch(restUrl, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          title = data[0].title;
          description = data[0].description || "";
          image = data[0].main_image || "";
        }
      }
    } else if (isCurrent) {
      const restUrl = `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&select=title,excerpt,featured_image`;
      const res = await fetch(restUrl, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          title = data[0].title;
          description = data[0].excerpt || "";
          image = data[0].featured_image || "";
        }
      }
    }
  } catch (error) {
    console.error("[Edge Function Metadata Error]:", error);
  }

  // Inject fetched meta tags if we found a valid database entry
  if (title) {
    const cleanDesc = description
      .replace(/[#*`>]/g, "") // remove MD symbols
      .replace(/"/g, "&quot;")
      .substring(0, 160)
      .trim();

    // Standardize title
    const formattedTitle = `${title} — CREST Studio`;

    // Regex replacement for Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${formattedTitle}</title>`);

    // Helper to replace or insert meta tags in the <head>
    const replaceOrInsertMeta = (nameAttr, valueAttr, content) => {
      const regex = new RegExp(`<meta\\s+${nameAttr}="(${valueAttr})"[^>]*content=".*?"[^>]*\\/?>`, "gi");
      if (regex.test(html)) {
        html = html.replace(regex, `<meta ${nameAttr}="${valueAttr}" content="${content}" />`);
      } else {
        // Inject right before the closing </head>
        html = html.replace("</head>", `  <meta ${nameAttr}="${valueAttr}" content="${content}" />\n</head>`);
      }
    };

    // Update standard description
    replaceOrInsertMeta("name", "description", cleanDesc);

    // Update Open Graph tags
    replaceOrInsertMeta("property", "og:title", formattedTitle);
    replaceOrInsertMeta("property", "og:description", cleanDesc);
    if (image) {
      replaceOrInsertMeta("property", "og:image", image);
    }
  }

  return new Response(html, {
    headers: response.headers
  });
};
