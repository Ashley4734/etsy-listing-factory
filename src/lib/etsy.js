import crypto from 'node:crypto';

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkcePair() {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function buildEtsyAuthUrl({ clientId, redirectUri, scopes = ['listings_r', 'listings_w', 'shops_r'] }) {
  if (!clientId || !redirectUri) {
    throw new Error('ETSY_CLIENT_ID and ETSY_REDIRECT_URI are required.');
  }

  const { verifier, challenge } = createPkcePair();
  const state = base64Url(crypto.randomBytes(32));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  return {
    url: `https://www.etsy.com/oauth/connect?${params.toString()}`,
    verifier,
    state
  };
}

export function getEtsyImplementationStatus() {
  return {
    status: 'not-enabled-in-mvp',
    reason: 'This MVP exports Etsy-ready content first. Direct publishing should be added after OAuth storage, seller onboarding, taxonomy selection, digital file upload, listing image upload, and draft review safeguards are implemented.',
    nextSteps: [
      'Store Etsy OAuth PKCE verifier/state server-side per user.',
      'Exchange authorization code for access/refresh token.',
      'Let the seller select taxonomy_id and digital product files.',
      'Create a draft listing using listings_w scope.',
      'Upload listing images and digital files.',
      'Patch listing type to download and keep it in draft for seller review.'
    ]
  };
}
