import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { response, unauthorized } from "@/lib/http";
import { serializeNote } from "@/lib/notes";
import { noteInputSchema } from "@/lib/schemas";
import { broadcast } from "@/lib/events";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(request))) return unauthorized();
  const note = await db.note.findUnique({ where: { id: (await params).id } });
  return note ? response(serializeNote(note)) : response(null, { status: 404 });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(request))) return unauthorized();
  const parsed = noteInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ issues: parsed.error.flatten() }, { status: 400 });
  const { checklist_items, labels, ...input } = parsed.data; const id = (await params).id;
  const note = await db.note.update({ where: { id }, data: { ...input, ...(checklist_items && { checklistItems: JSON.stringify(checklist_items) }), ...(labels && { labels: JSON.stringify(labels) }), ...(input.trashed === false && { deletedAt: null }) } });
  broadcast("note-updated", id); return response(serializeNote(note));
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(request))) return unauthorized();
  const id = (await params).id; const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  if (permanent) { await db.note.delete({ where: { id } }); broadcast("note-deleted", id); return response({ id, permanent: true }); }
  const note = await db.note.update({ where: { id }, data: { trashed: true, archived: false, deletedAt: new Date() } });
  broadcast("note-deleted", id); return response(serializeNote(note));
}
