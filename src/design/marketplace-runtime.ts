import * as Crypto from 'expo-crypto';
import { ThemeMarketplaceClient } from '../../theme-sdk/marketplace.ts';
import type { ThemePackage, ThemeRegistry, ThemeRegistryEntry } from '../../theme-sdk/types.ts';
import { APP_VERSION } from './constants.ts';

const REQUEST_TIMEOUT_MS = 12_000;

async function fetchMarketplaceResource(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Theme marketplace request timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const client = new ThemeMarketplaceClient(
  fetchMarketplaceResource,
  (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  APP_VERSION
);

export function loadThemeRegistry(url: string): Promise<ThemeRegistry> {
  return client.loadRegistry(url);
}

export function downloadMarketplaceTheme(entry: ThemeRegistryEntry, registryUrl: string): Promise<ThemePackage> {
  return client.download(entry, registryUrl);
}
