// Shared spec of GitHub Actions secrets each mobile build workflow needs.
// Imported by both the admin API routes and the admin UI page.

export type WorkflowId = 'ios-testflight.yml' | 'android-play-internal.yml';

export interface WorkflowSecretSpec {
  label: string;
  required: string[];
  optional: string[];
}

export const REQUIRED_SECRETS: Record<WorkflowId, WorkflowSecretSpec> = {
  'ios-testflight.yml': {
    label: 'iOS — TestFlight',
    required: [
      'IOS_TEAM_ID',
      'IOS_BUNDLE_ID',
      'IOS_SIGNING_IDENTITY',
      'IOS_CERTIFICATE_BASE64',
      'IOS_CERTIFICATE_PASSWORD',
      'IOS_KEYCHAIN_PASSWORD',
      'IOS_PROVISIONING_PROFILE_BASE64',
      'APP_STORE_CONNECT_API_KEY_ID',
      'APP_STORE_CONNECT_API_ISSUER_ID',
      'APP_STORE_CONNECT_API_KEY_BASE64',
    ],
    optional: ['IOS_APS_ENVIRONMENT'],
  },
  'android-play-internal.yml': {
    label: 'Android — Play Internal',
    required: [
      'ANDROID_PACKAGE_NAME',
      'ANDROID_KEYSTORE_BASE64',
      'ANDROID_KEY_ALIAS',
      'ANDROID_KEYSTORE_PASSWORD',
      'ANDROID_KEY_PASSWORD',
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
    ],
    optional: ['ANDROID_EXPECTED_SHA1'],
  },
};

export interface SecretSource {
  /** Short human description of what the value is. */
  description: string;
  /** Where to obtain the value (provider + UI path). */
  where: string;
  /** Optional deep link to the provider page. */
  url?: string;
  /** Optional CLI / format hint for generating the value. */
  hint?: string;
}

export const SECRET_SOURCES: Record<string, SecretSource> = {
  // ---------- iOS ----------
  IOS_TEAM_ID: {
    description: 'Apple Developer Team ID (10-char).',
    where: 'Apple Developer → Membership',
    url: 'https://developer.apple.com/account#MembershipDetailsCard',
  },
  IOS_BUNDLE_ID: {
    description: 'App bundle identifier, e.g. com.example.app.',
    where: 'App Store Connect → My Apps → App → General → Bundle ID',
    url: 'https://appstoreconnect.apple.com/apps',
  },
  IOS_SIGNING_IDENTITY: {
    description: 'Distribution signing identity name (e.g. "Apple Distribution: Acme Inc (TEAMID)").',
    where: 'Keychain Access → My Certificates (matches the distribution cert).',
    hint: 'security find-identity -v -p codesigning',
  },
  IOS_CERTIFICATE_BASE64: {
    description: 'Distribution .p12 certificate, base64-encoded.',
    where: 'Apple Developer → Certificates → Apple Distribution → export .p12 from Keychain.',
    url: 'https://developer.apple.com/account/resources/certificates/list',
    hint: 'base64 -i dist.p12 | pbcopy',
  },
  IOS_CERTIFICATE_PASSWORD: {
    description: 'Password used when exporting the .p12.',
    where: 'Chosen at .p12 export time in Keychain Access.',
  },
  IOS_KEYCHAIN_PASSWORD: {
    description: 'Arbitrary password used to create the CI keychain.',
    where: 'Generate any strong random string; only used inside CI.',
    hint: 'openssl rand -base64 24',
  },
  IOS_PROVISIONING_PROFILE_BASE64: {
    description: 'App Store provisioning profile (.mobileprovision), base64-encoded.',
    where: 'Apple Developer → Profiles → App Store profile for this bundle ID.',
    url: 'https://developer.apple.com/account/resources/profiles/list',
    hint: 'base64 -i profile.mobileprovision | pbcopy',
  },
  APP_STORE_CONNECT_API_KEY_ID: {
    description: 'App Store Connect API key ID (10-char).',
    where: 'App Store Connect → Users and Access → Integrations → App Store Connect API.',
    url: 'https://appstoreconnect.apple.com/access/integrations/api',
  },
  APP_STORE_CONNECT_API_ISSUER_ID: {
    description: 'API issuer ID (UUID) for App Store Connect API.',
    where: 'Same page as the Key ID (top of the Integrations table).',
    url: 'https://appstoreconnect.apple.com/access/integrations/api',
  },
  APP_STORE_CONNECT_API_KEY_BASE64: {
    description: '.p8 private key for the API key, base64-encoded.',
    where: 'Downloaded once when creating the API key in App Store Connect.',
    hint: 'base64 -i AuthKey_XXXX.p8 | pbcopy',
  },
  IOS_APS_ENVIRONMENT: {
    description: 'Push entitlement value: "development" or "production".',
    where: 'Set only if the app uses Apple Push Notifications.',
  },

  // ---------- Android ----------
  ANDROID_PACKAGE_NAME: {
    description: 'Android applicationId, e.g. com.example.app.',
    where: 'Play Console → app → Dashboard (App details) or android/app/build.gradle.',
    url: 'https://play.google.com/console',
  },
  ANDROID_KEYSTORE_BASE64: {
    description: 'Upload keystore (.jks/.keystore), base64-encoded.',
    where: 'Generated locally with keytool; matches the key registered with Play App Signing.',
    hint: 'base64 -i upload-keystore.jks | pbcopy',
  },
  ANDROID_KEY_ALIAS: {
    description: 'Alias of the signing key inside the keystore.',
    where: 'Chosen when running keytool -genkeypair (e.g. "upload").',
    hint: 'keytool -list -v -keystore upload-keystore.jks',
  },
  ANDROID_KEYSTORE_PASSWORD: {
    description: 'Password protecting the keystore file.',
    where: 'Set when the keystore was created with keytool.',
  },
  ANDROID_KEY_PASSWORD: {
    description: 'Password for the specific key alias (often same as keystore password).',
    where: 'Set when the key alias was created with keytool.',
  },
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: {
    description: 'Service account JSON with Play Developer API access.',
    where: 'Google Cloud Console → IAM → Service Accounts → Keys (JSON). Grant access in Play Console → Users and permissions.',
    url: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
  },
  ANDROID_EXPECTED_SHA1: {
    description: 'Expected SHA1 of the signing certificate (verification only).',
    where: 'Play Console → app → Setup → App signing → Upload key certificate.',
    hint: 'keytool -list -v -keystore upload-keystore.jks | grep SHA1',
  },
};

export async function fetchRepoSecretNames(repo: string, pat: string): Promise<Set<string>> {
  const names = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/secrets?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub secrets API ${res.status}: ${text}`);
    }
    const data: { total_count: number; secrets: Array<{ name: string }> } = await res.json();
    for (const s of data.secrets) names.add(s.name);
    if (data.secrets.length < 100) break;
    page += 1;
  }
  return names;
}

export interface SecretGroupStatus {
  workflow: WorkflowId;
  label: string;
  requiredPresent: string[];
  requiredMissing: string[];
  optionalPresent: string[];
  optionalMissing: string[];
  ok: boolean;
}

export function diffSecrets(configured: Set<string>): SecretGroupStatus[] {
  return (Object.keys(REQUIRED_SECRETS) as WorkflowId[]).map((workflow) => {
    const spec = REQUIRED_SECRETS[workflow];
    const requiredMissing = spec.required.filter((n) => !configured.has(n));
    const requiredPresent = spec.required.filter((n) => configured.has(n));
    const optionalPresent = spec.optional.filter((n) => configured.has(n));
    const optionalMissing = spec.optional.filter((n) => !configured.has(n));
    return {
      workflow,
      label: spec.label,
      requiredPresent,
      requiredMissing,
      optionalPresent,
      optionalMissing,
      ok: requiredMissing.length === 0,
    };
  });
}
