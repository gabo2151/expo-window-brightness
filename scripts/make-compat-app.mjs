#!/usr/bin/env node
/**
 * Generates a throwaway Expo app pinned to a given SDK, installs this module
 * into it *from a packed tarball* (so we test exactly what npm ships, not the
 * working tree), and prebuilds the native project.
 *
 * The caller then runs `pod install` / `gradlew` against the result — that is
 * what actually proves an SDK is supported, as opposed to the symbol-level
 * check in check-expo-compat.mjs.
 *
 * Usage:
 *   node scripts/make-compat-app.mjs --sdk 57 --out /tmp/compat57 \
 *     [--platform ios|android|all] [--tarball path/to/pkg.tgz]
 *
 * Without --tarball the module is packed on the spot; CI passes the artifact
 * the build job already produced, so every platform tests the same bytes.
 *
 * Prints the generated app directory on the last stdout line.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(' ')}   (in ${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } });
}

function capture(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * The react / react-native that belong to an SDK, taken from Expo's own
 * template for it.
 *
 * `npx expo install react react-native` cannot be used here: on an SDK older
 * than the latest it resolved to the newest react-native published (0.87 into
 * an SDK 54 app) and then broke its own CLI part-way through the install. The
 * template is the version pairing Expo actually ships, and it is a plain
 * package.json.
 */
function templateVersions(sdkMajor) {
  const deps = JSON.parse(
    capture('npm', [
      'view',
      `expo-template-blank-typescript@sdk-${sdkMajor}`,
      'dependencies',
      '--json',
    ])
  );

  return ['expo', 'react', 'react-native'].map((name) => `${name}@${deps[name]}`);
}

const sdk = arg('sdk');
const out = resolve(arg('out', join(ROOT, '.compat-app')));
const platform = arg('platform', 'ios');

if (!sdk) {
  console.error('error: --sdk <major> is required');
  process.exit(2);
}

// ── 1. The module as a tarball, so the app installs the real npm artifact ────
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const providedTarball = arg('tarball');
let tarball;
if (providedTarball) {
  tarball = resolve(providedTarball);
  console.log(`\n=== Using provided tarball ===\n${tarball}`);
} else {
  console.log(`\n=== Packing module ===`);
  execFileSync('npm', ['pack', '--silent', '--pack-destination', out], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  tarball = join(
    out,
    readdirSync(out).find((f) => f.endsWith('.tgz'))
  );
}

// ── 2. Minimal app skeleton ──────────────────────────────────────────────────
const appDir = join(out, 'app');
mkdirSync(appDir, { recursive: true });

writeFileSync(
  join(appDir, 'package.json'),
  JSON.stringify(
    { name: `compat-sdk${sdk}`, version: '1.0.0', main: 'index.ts', private: true },
    null,
    2
  )
);

writeFileSync(
  join(appDir, 'app.json'),
  JSON.stringify(
    {
      expo: {
        name: `compat-sdk${sdk}`,
        slug: `compat-sdk${sdk}`,
        version: '1.0.0',
        newArchEnabled: true,
        ios: { bundleIdentifier: `dev.compat.sdk${sdk}` },
        android: { package: `dev.compat.sdk${sdk}` },
      },
    },
    null,
    2
  )
);

writeFileSync(
  join(appDir, 'index.ts'),
  `import { registerRootComponent } from 'expo';\nimport App from './App';\n\nregisterRootComponent(App);\n`
);

// Touch every exported symbol so a rename in the native module is a build error.
writeFileSync(
  join(appDir, 'App.tsx'),
  `import * as WindowBrightness from '@gabo2151/expo-window-brightness';
import { Button, Text, View } from 'react-native';

export default function App() {
  return (
    <View>
      <Text>{String(WindowBrightness.isAvailable())}</Text>
      <Button title="set" onPress={() => WindowBrightness.setBrightness(0.5)} />
      <Button title="get" onPress={() => WindowBrightness.getBrightness()} />
      <Button title="restore" onPress={() => WindowBrightness.restoreBrightness()} />
    </View>
  );
}
`
);

// ── 3. Install the SDK's own expo/react/react-native, plus this module ───────
console.log(`\n=== Installing Expo SDK ${sdk} ===`);
const versions = templateVersions(sdk);
console.log(versions.join('  '));

// One install, so npm resolves the whole graph at once instead of relaying a
// half-installed tree between commands.
run('npm', ['install', ...versions, tarball, '--no-audit', '--no-fund'], appDir);

// ── 4. Prebuild the native project ───────────────────────────────────────────
console.log(`\n=== Prebuilding (${platform}) ===`);
const platformArgs = platform === 'all' ? [] : ['--platform', platform];
run('npx', ['expo', 'prebuild', '--clean', '--no-install', ...platformArgs], appDir);

console.log(`\n=== Generated app ===`);
console.log(appDir);
