// Creates a Razorpay order server-side (needs the secret key, so this
// can never run in the browser). Called from checkout right before
// opening the Razorpay Checkout modal.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Payments are not configured yet (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const amount = Math.round(+body.amount * 100) // paise
    if (!amount || amount < 100) return res.status(400).json({ error: 'Invalid amount' })

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', receipt: body.receipt || undefined, payment_capture: 1 })
    })
    const data = await r.json()
    if (!r.ok) return res.status(502).json({ error: data.error?.description || 'Razorpay order creation failed' })

    res.status(200).json({ id: data.id, amount: data.amount, currency: data.currency, keyId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
