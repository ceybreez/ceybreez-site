/* Add the route block inside your existing Worker fetch router. */

/*
CREATE TABLE IF NOT EXISTS page_builder_projects (
  page_id TEXT PRIMARY KEY,
  project_json TEXT NOT NULL,
  html TEXT NOT NULL,
  css TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);
*/

async function handlePageBuilderPublish(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const allowed = new Set(['welcome','home','villas','apartments','homestays','tours','services','tour-details','contact']);
  if (!allowed.has(body.page)) {
    return new Response(JSON.stringify({ error: 'Invalid page' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await env.DB.prepare(`
    INSERT INTO page_builder_projects(page_id, project_json, html, css, status, updated_at, published_at)
    VALUES(?, ?, ?, ?, 'published', datetime('now'), datetime('now'))
    ON CONFLICT(page_id) DO UPDATE SET
      project_json=excluded.project_json,
      html=excluded.html,
      css=excluded.css,
      status='published',
      updated_at=datetime('now'),
      published_at=datetime('now')
  `).bind(body.page, JSON.stringify(body.project || {}), body.html || '', body.css || '').run();

  return new Response(JSON.stringify({ ok: true, page: body.page }), { headers: { 'Content-Type': 'application/json' } });
}

/* Router example:
if (url.pathname === '/api/admin/page-builder/publish' && request.method === 'POST') {
  return handlePageBuilderPublish(request, env);
}
*/
