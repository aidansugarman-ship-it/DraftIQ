import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Yahoo Fantasy OAuth — Public Client (PKCE) flow.
 * Lets users sign in with Yahoo and grants DraftIQ read access to their fantasy leagues across NFL/NBA/MLB/NHL.
 */

const CLIENT_ID = process.env.EXPO_PUBLIC_YAHOO_CLIENT_ID ?? '';
const TOKEN_KEY = 'draftiq.yahoo.tokens';

interface YahooTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;  // epoch ms
}

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://api.login.yahoo.com/oauth2/request_auth',
  tokenEndpoint:         'https://api.login.yahoo.com/oauth2/get_token',
};

export function useYahooAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'draftiq',
    path:   'oauth-callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:     CLIENT_ID,
      // Yahoo Fantasy doesn't use traditional scopes — the permissions you granted on the dev portal
      // (Fantasy Sports Read) apply automatically.
      scopes:       ['openid'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE:      true,
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code || !request?.codeVerifier) return;

    (async () => {
      try {
        const body = new URLSearchParams({
          client_id:     CLIENT_ID,
          grant_type:    'authorization_code',
          code:          response.params.code,
          redirect_uri:  redirectUri,
          code_verifier: request.codeVerifier,
        }).toString();

        const res = await fetch(discovery.tokenEndpoint!, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const data = await res.json();
        if (!data.access_token) {
          console.error('[yahooAuth] Token exchange failed:', data);
          return;
        }
        const tokens: YahooTokens = {
          accessToken:  data.access_token,
          refreshToken: data.refresh_token,
          expiresAt:    Date.now() + (data.expires_in ?? 3600) * 1000,
        };
        await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
      } catch (e) {
        console.error('[yahooAuth] Token exchange error:', e);
      }
    })();
  }, [response, request, redirectUri]);

  return {
    isReady:   !!request,
    promptAsync,
  };
}

/** Load stored Yahoo tokens, refreshing if expired. Returns null if not logged in. */
export async function getYahooAccessToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const tokens: YahooTokens = JSON.parse(raw);

    // If still valid (5min buffer), return as-is
    if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) return tokens.accessToken;

    // Otherwise refresh
    const body = new URLSearchParams({
      client_id:     CLIENT_ID,
      grant_type:    'refresh_token',
      refresh_token: tokens.refreshToken,
      redirect_uri:  AuthSession.makeRedirectUri({ scheme: 'draftiq', path: 'oauth-callback' }),
    }).toString();

    const res = await fetch(discovery.tokenEndpoint!, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    if (!data.access_token) return null;

    const refreshed: YahooTokens = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt:    Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(refreshed));
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function isYahooConnected(): Promise<boolean> {
  return !!(await getYahooAccessToken());
}

export async function disconnectYahoo(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
