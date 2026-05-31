import { z } from "zod";

/** Mirrors StudentProfile in lib/profile.ts */
export const studentProfileSchema = z.object({
  grade: z.enum(["middle", "early-hs", "late-hs", "undergrad", "recent-grad"]),
  country: z.enum([
    "Bangladesh",
    "India",
    "Pakistan",
    "Nepal",
    "Other South Asia",
    "Other",
  ]),
  degree: z.enum(["undergrad", "masters", "phd", "undecided"]),
  gpa: z.number().min(0).max(4),
  ecs: z.array(
    z.enum([
      "Olympiads",
      "Research",
      "Leadership",
      "Community",
      "Sports/Arts",
      "Internships",
    ]),
  ),
  targetTier: z.enum(["elite", "top50", "top200", "regional"]),
  testPercentile: z.number().min(0).max(100).optional(),
  ecCount: z.number().min(0).max(10).optional(),
  research: z.number().min(0).max(10).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "parent", "partner"]).optional(),
});

export const roadmapBodySchema = z.object({
  profile: studentProfileSchema,
});

export const milestonePatchSchema = z.object({
  milestoneId: z.string().min(1),
  status: z.enum(["pending", "in-progress", "done"]).optional(),
  deadline: z.string().optional(),
});

export const checkoutSchema = z.object({
  tier: z.enum(["pro", "elite"]),
});

export const linkInviteSchema = z.object({
  viewerEmail: z.string().email(),
  relationship: z.enum(["parent", "partner"]),
});

export const linkAcceptSchema = z.object({
  token: z.string().min(1),
});

export const benchmarkBodySchema = z.object({
  profile: studentProfileSchema,
});

export const accountUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export const adminUserUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["student", "parent", "partner", "admin"]).optional(),
  plan: z.enum(["free", "pro", "elite"]).optional(),
});
