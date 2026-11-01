import { handleCheck } from '../server/http.js';

export async function POST(request: Request): Promise<Response> {
  return handleCheck(request);
}
