import { handlePacks } from '../server/http.ts';

export function GET(): Response {
  return handlePacks();
}
