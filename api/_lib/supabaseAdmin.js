// Server-side Supabase client using the SERVICE ROLE key — this bypasses
// RLS, so it must only ever run in /api (Vercel serverless), never ship to
// the browser bundle. Requires SUPABASE_SERVICE_ROLE_KEY to be set in
// Vercel project env vars (Settings → Environment Variables).
const { createClient } = require('@supabase/supabase-js')

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Verify the bearer token in the request belongs to a signed-in admin.
// Returns the admin's user id, or throws.
async function requireAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Not authenticated')
  const sbAdmin = supabaseAdmin()
  const { data: { user }, error } = await sbAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Not authenticated')
  const { data: adminRow } = await sbAdmin.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (!adminRow) throw new Error('Not an admin')
  return user.id
}

module.exports = { supabaseAdmin, requireAdmin }
