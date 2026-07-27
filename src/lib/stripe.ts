import Stripe from 'stripe';
import { requireEnv } from './env';

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  }
  return client;
}
