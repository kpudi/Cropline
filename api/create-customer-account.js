// Admin-only: create a login for a CSM-managed client (contracted
// business account). Uses the Supabase Admin Auth API (service role) to
// create the auth user directly with a temporary password, then links
// it to a `customers` row and (optionally) an existing `clients` row so
// they see their contracted rate card in the storefront.
const { supabaseAdmin, requireAdmin } = require('./_lib/supabaseAdmin')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    await requireAdmin(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { email, password, fullName, phone, businessName, clientId } = body
    if (!email || !password || !fullName) return res.status(400).json({ error: 'email, password and fullName are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const sb = supabaseAdmin()
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true
    })
    if (createErr) return res.status(400).json({ error: createErr.message })

    const uid = created.user.id
    const { error: custErr } = await sb.from('customers').insert({
      id: uid, full_name: fullName, phone: phone || '', email, business_name: businessName || '',
      type: 'csm', client_id: clientId || null, created_by: 'csm'
    })
    if (custErr) {
      await sb.auth.admin.deleteUser(uid).catch(() => {})
      return res.status(400).json({ error: custErr.message })
    }

    res.status(200).json({ ok: true, id: uid, email, password })
  } catch (e) {
    res.status(e.message === 'Not authenticated' || e.message === 'Not an admin' ? 403 : 500).json({ error: e.message })
  }
}
