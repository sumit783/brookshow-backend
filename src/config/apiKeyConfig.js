import { ENV } from "./env.js";

export const VALID_API_KEYS = [
  ENV.API_KEY,             // main key from .env
  ENV.MOBILE_API_KEY,      // optional secondary key
  ENV.ADMIN_API_KEY,       // optional admin key
].filter(Boolean); // remove undefined ones
