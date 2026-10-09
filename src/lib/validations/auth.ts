import { z } from "zod";
import { emailField } from "./common";

export const credentialsSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: emailField,
    // Length beats character-class rules: NIST dropped composition requirements
    // because they push people towards predictable substitutions.
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(200, "That password is too long"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
