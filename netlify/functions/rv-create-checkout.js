// Crea una Stripe Checkout Session para la suscripción elegida.
// Env vars (Netlify): STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, SITE_URL
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const plan = (event.queryStringParameters && event.queryStringParameters.plan) || 'monthly';
    const price = plan === 'yearly' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    if (!process.env.STRIPE_SECRET_KEY || !price || !site) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Billing not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY and SITE_URL in Netlify environment variables.' }),
      };
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${site}/?rv_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/`,
      allow_promotion_codes: true,
      locale: 'auto',
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'checkout failed' }) };
  }
};
