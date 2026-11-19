/**
 * Firebase Client Initialization & Provider Setup
 * Refines docs/12-EXTENSION-SPEC.md §6 and ADR-018.
 *
 * Responsibilities:
 * - Load web config from environment or tester override (in storage.local)
 * - Configure App Check (debug token provider if token configured)
 * - Provide FirebaseAiLogicPort instance or fallback
 */

import { FirebaseAiPort, FirebaseAiConfig } from '../../ai/firebase';
import { ChromeStorageArea, MemoryStorageArea } from '../../core/storage';

export async function getFirebaseAiPort(): Promise<FirebaseAiPort | null> {
  const storage = typeof chrome !== 'undefined' && chrome.storage
    ? new ChromeStorageArea('local')
    : new MemoryStorageArea();

  // 1. Check for tester config override in storage.local
  const configOverrideStr = await storage.get<string>('firebase_config_override');
  const appCheckDebugToken = await storage.get<string>('app_check_debug_token');
  const modelOverride = await storage.get<string>('cloud_model_override');

  let config: FirebaseAiConfig | null = null;

  if (configOverrideStr) {
    try {
      config = JSON.parse(configOverrideStr) as FirebaseAiConfig;
    } catch {
      // Invalid override JSON
    }
  }

  // 2. Fallback to build-time environment variables
  if (!config && import.meta.env?.VITE_FIREBASE_API_KEY && import.meta.env?.VITE_FIREBASE_PROJECT_ID) {
    config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  }

  if (!config) {
    // No Firebase configuration available; app remains on-device/rules-only
    return null;
  }

  if (modelOverride) {
    config.cloudModel = modelOverride;
  }

  // 3. Configure App Check Debug Token if present
  if (appCheckDebugToken) {
    // Set before App Check init per doc 12 §6
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
  }

  try {
    return new FirebaseAiPort(config);
  } catch {
    return null;
  }
}
