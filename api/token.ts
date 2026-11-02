import { handleToken } from '../server/http.js';

export async function POST(request: Request): Promise<Response> {
  return handleToken(request);
}
