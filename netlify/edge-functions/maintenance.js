/**
 * Netlify Edge Function: System Maintenance Mode Override
 * Intercepts requests for all public pages and redirects to a wait screen if active.
 */

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip static assets, CSS, JS, admin CPanel routes, and local file requests (like .png)
  if (
    path.startsWith("/admin") ||
    path.startsWith("/js/") ||
    path.startsWith("/css/") ||
    path.startsWith("/assets/") ||
    path.includes(".")
  ) {
    return context.next();
  }

  const SUPABASE_URL = "https://vojwdyubksoozhyvnbfu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvandkeXVia3Nvb3poeXZuYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU1OTcsImV4cCI6MjA5NDAxMTU5N30.8uUc1skFlGTViyaIx_JVrEwYDO6uKg6DNvaD5BfYuW0";

  try {
    const restUrl = `${SUPABASE_URL}/rest/v1/system_settings?select=maintenance_mode&id=eq.00000000-0000-0000-0000-000000000000`;
    const res = await fetch(restUrl, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].maintenance_mode === true) {
        return new Response(
          `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYSTEM UNDER OPTIMIZATION — CREST Studio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --c-bg: #000000;
            --c-text: #FFFFFF;
            --f-display: 'Barlow Condensed', sans-serif;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background-color: var(--c-bg);
            color: var(--c-text);
            font-family: var(--f-display);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            letter-spacing: 0.3em;
            text-transform: uppercase;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 1.5rem;
            font-weight: 300;
            margin-bottom: 0.5rem;
            animation: pulse 3s infinite ease-in-out;
        }
        p {
            font-size: 0.7rem;
            color: #555555;
            letter-spacing: 0.2em;
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>SYSTEM UNDER OPTIMIZATION</h1>
        <p>[ CREST STUDIO ]</p>
    </div>
</body>
</html>`,
          {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Retry-After": "3600"
            }
          }
        );
      }
    }
  } catch (err) {
    console.error("[Maintenance Edge Function Error]:", err);
  }

  return context.next();
};
