import { type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orbit Command Inbox API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            background-color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        <script>
          Scalar.createApiReference('#app', {
            url: '/api/openapi.json',
          })
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
