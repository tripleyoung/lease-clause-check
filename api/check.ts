import { handleCheck } from '../server/http.ts';

export async function POST(request: Request): Promise<Response> {
  return handleCheck(request);
}
