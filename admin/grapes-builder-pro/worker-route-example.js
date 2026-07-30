// Route contract only. Merge into the existing authenticated admin Worker router.
// Store payload patches in D1; a small public runtime script can apply them by selector.
// POST /api/admin/page-builder/live-publish
async function publishLiveBuilder(request, env) {
  const payload = await request.json();
  if (!payload?.page || !Array.isArray(payload?.patches)) {
    return Response.json({ error: 'Invalid builder payload' }, { status: 400 });
  }
  await env.DB.prepare(`
    INSERT INTO page_builder_live (page_id, payload_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(page_id) DO UPDATE SET payload_json=excluded.payload_json, updated_at=datetime('now')
  `).bind(payload.page, JSON.stringify(payload)).run();
  return Response.json({ ok: true, page: payload.page });
}
