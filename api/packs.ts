import { handlePacks } from '../server/http.js';

export function GET(): Response {
  return handlePacks();
}
