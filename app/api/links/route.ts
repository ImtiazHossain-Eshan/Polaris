import { ok, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { linkInviteSchema } from "@/lib/validation/schemas";
import { createLink, getLinksForStudent } from "@/lib/db/collections";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const user = await requireSession();
  const links = await getLinksForStudent(user.id);
  return ok({ links });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireSession();
  const { viewerEmail, relationship } = linkInviteSchema.parse(
    await parseJson(req),
  );
  const link = await createLink(
    user.id,
    user.name ?? undefined,
    viewerEmail,
    relationship,
  );
  return ok({ link, inviteToken: link.inviteToken }, 201);
});
