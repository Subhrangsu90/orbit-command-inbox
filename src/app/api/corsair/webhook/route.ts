import { handleCorsairWebhook } from "../_lib/handleWebhook";

export async function POST(request: Request) {
  return handleCorsairWebhook(request);
}
