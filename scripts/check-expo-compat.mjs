#!/usr/bin/env node
/**
 * Checks whether the native APIs this module depends on still exist in the
 * `expo-modules-core` shipped with each supported Expo SDK.
 *
 * This is the cheap tier of compatibility checking: it does not compile
 * anything, it verifies that the exact symbols `ios/ExpoWindowBrightnessModule.swift`
 * and `android/.../ExpoWindowBrightnessModule.kt` reference are still present,
 * and that our iOS deployment target is not lower than core's. That is exactly
 * what the README means by "API-compatible, not built in CI".
 *
 * Also reports any Expo SDK major that has been released but is not listed in
 * SUPPORTED_SDKS, so the README table cannot silently go stale.
 *
 * Usage: node scripts/check-expo-compat.mjs [--json]
 * Exit code 0 = all good, 1 = drift detected.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Expo SDK majors this module claims to support, per the README table.
 *
 * 52 is out: `expo-module-gradle-plugin`, which `android/build.gradle` applies,
 * first shipped in expo-modules-core 2.5.0 (SDK 53). On SDK 52 the consuming
 * app fails with "Plugin [id: 'expo-module-gradle-plugin'] was not found".
 * iOS on 52 is fine, but a half-supported SDK is not worth documenting.
 */
const SUPPORTED_SDKS = [53, 54, 55, 56, 57];

/** Symbols the native code references. Keep in sync with the native sources. */
const REQUIRED_APIS = [
  {
    name: 'requireOptionalNativeModule (JS)',
    find: (pkg) =>
      fileContains(join(pkg, 'build/requireNativeModule.d.ts'), 'requireOptionalNativeModule'),
  },
  {
    name: 'Queues.MAIN (Kotlin)',
    find: (pkg) => grep(join(pkg, 'android/src/main/java'), /enum class Queues[\s\S]{0,200}?MAIN/),
  },
  {
    name: 'runOnQueue (Kotlin)',
    find: (pkg) => grep(join(pkg, 'android/src/main/java'), /fun\s+runOnQueue/),
  },
  {
    name: 'CodedException (Kotlin)',
    find: (pkg) =>
      existsSync(
        join(pkg, 'android/src/main/java/expo/modules/kotlin/exception/CodedException.kt')
      ),
  },
  {
    // What re-applies the override after an Activity recreation.
    name: 'OnActivityEntersForeground (Kotlin)',
    find: (pkg) => grep(join(pkg, 'android/src/main/java'), /fun\s+OnActivityEntersForeground/),
  },
  {
    // What hands the global iOS brightness back while the app is away.
    name: 'OnAppEntersBackground (Swift)',
    find: (pkg) => grepSwift(pkg, /func\s+OnAppEntersBackground/),
  },
  {
    name: 'OnAppEntersForeground (Swift)',
    find: (pkg) => grepSwift(pkg, /func\s+OnAppEntersForeground/),
  },
  {
    // Applied by android/build.gradle. Absent before core 2.5.0 (SDK 53), and
    // its absence is not a Kotlin symbol error — the consuming app just fails
    // to configure. This module claimed SDK 52 support for a year because
    // nothing checked it.
    name: 'expo-module-gradle-plugin (Gradle)',
    find: (pkg) => existsSync(join(pkg, 'expo-module-gradle-plugin')),
  },
];

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

/**
 * `npm view` prefixes every line with `pkg@version` as soon as the spec
 * matches more than one version, which is unparseable. Always ask for JSON.
 */
function npmView(spec, field) {
  const out = sh('npm', ['view', spec, field, '--json']);
  return out ? JSON.parse(out) : null;
}

/** Highest concrete version matching a spec. */
function resolveVersion(spec) {
  const v = npmView(spec, 'version');
  return Array.isArray(v) ? v[v.length - 1] : v;
}

function fileContains(path, needle) {
  return existsSync(path) && readFileSync(path, 'utf8').includes(needle);
}

/** Recursive regex search over a directory tree, limited to one extension. */
function grep(dir, re, ext = '.kt') {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(ext)) continue;
    if (re.test(readFileSync(join(entry.parentPath ?? entry.path, entry.name), 'utf8')))
      return true;
  }
  return false;
}

const grepSwift = (pkg, re) => grep(join(pkg, 'ios'), re, '.swift');

/** "15.1" -> [15, 1], for comparison. */
const parseVersion = (v) => v.split('.').map(Number);

function isAtLeast(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return true;
}

function iosTargetOf(podspecPath) {
  const m = readFileSync(podspecPath, 'utf8').match(/:ios\s*=>\s*'([\d.]+)'/);
  return m?.[1] ?? null;
}

/** Downloads a package tarball and returns the extracted directory. */
function fetchPackage(spec, into) {
  sh('npm', ['pack', spec, '--silent', '--pack-destination', into]);
  const tgz = readdirSync(into).find((f) => f.endsWith('.tgz'));
  sh('tar', ['xzf', join(into, tgz), '-C', into]);
  return join(into, 'package');
}

function main() {
  const asJson = process.argv.includes('--json');
  const ourIosTarget = iosTargetOf(join(ROOT, 'ios/ExpoWindowBrightness.podspec'));
  const workDir = mkdtempSync(join(tmpdir(), 'expo-compat-'));
  const results = [];
  const problems = [];
  const notes = [];

  try {
    // ── Any released SDK major we don't list? ───────────────────────────────
    // Expo publishes an `sdk-<major>` dist-tag per release, which is a more
    // reliable list of what exists than guessing from `latest`.
    const released = Object.keys(npmView('expo', 'dist-tags'))
      .map((tag) => /^sdk-(\d+)$/.exec(tag)?.[1])
      .filter(Boolean)
      .map(Number);
    const highestSupported = Math.max(...SUPPORTED_SDKS);
    for (const major of released.filter((m) => m > highestSupported).sort((a, b) => a - b)) {
      problems.push(
        `Expo SDK ${major} has been released but this module only claims support up to ` +
          `SDK ${highestSupported}. Test it and update SUPPORTED_SDKS + the README table.`
      );
    }

    // ── API surface per supported SDK ───────────────────────────────────────
    for (const sdk of SUPPORTED_SDKS) {
      // Expo's own dist-tag for the SDK, then the expo-modules-core it actually
      // pulls in — that is what a user on this SDK really gets.
      const expoVersion = resolveVersion(`expo@sdk-${sdk}`);
      const coreRange = npmView(`expo@${expoVersion}`, 'dependencies.expo-modules-core');
      const coreVersion = resolveVersion(`expo-modules-core@${coreRange}`);

      const dir = mkdtempSync(join(workDir, `sdk${sdk}-`));
      const pkg = fetchPackage(`expo-modules-core@${coreVersion}`, dir);

      const missing = REQUIRED_APIS.filter((api) => !api.find(pkg)).map((api) => api.name);
      const coreIosTarget = iosTargetOf(join(pkg, 'ExpoModulesCore.podspec'));

      // Our podspec declaring a *lower* iOS target than core is not a failure.
      // Verified against SDK 57 with a real `pod install`: Expo's own Podfile
      // helper raises every Expo module to match ExpoModulesCore —
      //   [Expo] Raised deployment target for Expo modules matching
      //   ExpoModulesCore: ExpoWindowBrightness (iOS=16.4)
      // — so the pod builds at 16.4 regardless of what we declare. Keeping our
      // declaration at the floor is deliberate: raising it to 16.4 would lock
      // out SDK 53-55 apps that still target iOS 15.x and gain nothing.
      // Report it, don't fail on it.
      const iosRaised = coreIosTarget != null && !isAtLeast(ourIosTarget, coreIosTarget);

      results.push({ sdk, expoVersion, coreVersion, missing, coreIosTarget, iosRaised });

      if (missing.length) {
        problems.push(
          `SDK ${sdk} (expo-modules-core ${coreVersion}): missing ${missing.join(', ')}`
        );
      }
      if (iosRaised) {
        notes.push(
          `SDK ${sdk}: core targets iOS ${coreIosTarget}, our podspec declares ${ourIosTarget} — ` +
            `Expo raises our pod to ${coreIosTarget} at install time. Expected, not a problem.`
        );
      }
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  if (asJson) {
    console.log(JSON.stringify({ ourIosTarget, results, notes, problems }, null, 2));
  } else {
    console.log(`\nour iOS deployment target: ${ourIosTarget}\n`);
    for (const r of results) {
      const status = r.missing.length === 0 ? '✅' : '❌';
      console.log(
        `${status} SDK ${r.sdk}  expo ${r.expoVersion}  expo-modules-core ${r.coreVersion}  ` +
          `iOS ${r.coreIosTarget}${r.iosRaised ? ' (raised by Expo)' : ''}` +
          (r.missing.length ? `  missing: ${r.missing.join(', ')}` : '')
      );
    }
    if (notes.length) {
      console.log('\nNotes:');
      for (const n of notes) console.log(`  - ${n}`);
    }
    if (problems.length) {
      console.log(`\n${problems.length} problem(s):`);
      for (const p of problems) console.log(`  - ${p}`);
    } else {
      console.log('\nNo drift detected.');
    }
  }

  process.exit(problems.length ? 1 : 0);
}

main();
