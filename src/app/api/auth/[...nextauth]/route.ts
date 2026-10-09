import { handlers } from "@/auth";

// Auth.js owns /api/auth/* — sign-in, callback, CSRF, session and sign-out.
export const { GET, POST } = handlers;
