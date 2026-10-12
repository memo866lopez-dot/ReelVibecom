// Verifica una sesión de checkout o una suscripción contra Stripe y devuelve la licencia.
// GET ?session_id=cs_...  -> tras el pago (redirect de Stripe)
// GET ?subscription_id=sub_... -> revalidación periódica (cada 24h desde la app)
// Env vars (Netlify): STRIPE_SECRET_KEY
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Billing not configured.' });
    let subscription;
    if (q.session_id) {
      const s = await stripe.checkout.sessions.retrieve(q.session_id, { expand: ['subscription'] });
      if (s.payment_status !== 'paid') return json(200, { licensed: false });
      subscription = s.subscription;
    } else if (q.subscription_id) {
      subscription = await stripe.subscriptions.retrieve(q.subscription_id);
    } else {
      return json(400, { error: 'missing session_id or subscription_id' });
    }
    if (typeof subscription === 'string') subscription = await stripe.subscriptions.retrieve(subscription);
    const active = subscription.status === 'active' || subscription.status === 'trialing';
    const exp = subscription.current_period_end * 1000;
    const interval = subscription.items && subscription.items.data[0] && subscription.items.data[0].price.recurring.interval;
    const plan = interval === 'year' ? 'yearly' : 'monthly';
    return json(200, {
      licensed: active && exp > Date.now(),
      plan,
      exp,
      status: subscription.status,
      subscription_id: subscription.id,
    });
  } catch (e) {
    return json(500, { error: 'verify failed' });
  }
};
