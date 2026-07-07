import { z } from "zod";

// Account-field validation shared by first-run setup (admin account) and
// invite-code signup, so both flows enforce the same username/password rules.

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only");

export const accountSchema = z.object({
  username: usernameSchema,
  email: z.email("Enter a valid email"),
  displayName: z.string().min(1, "Display name is required").max(50),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Signup additionally requires the club's shared invite code.
export const signupSchema = accountSchema.extend({
  inviteCode: z.string().min(1, "Invite code is required"),
});
