# Contributing

Maintainer notes. This file is not published to npm — see the `files` allowlist
in `package.json`.

```shell
npm ci
npm run verify   # lint, typecheck, tests, build
npm run compat   # check the supported Expo SDK range
```

## ⚠️ `ci.yml` must keep its name

The npm trusted publisher (OIDC) for `@gabo2151/expo-window-brightness` is bound
to `gabo2151/expo-window-brightness` **plus the workflow filename**. Renaming
`.github/workflows/ci.yml` breaks publishing with an auth error that never
mentions the filename.

## Releasing

Releases are **staged**, not published outright. The trusted publisher may stage
without 2FA; approving is what makes a version installable, and that step is a
human with 2FA:

```shell
npm stage approve <stage-id>   # the stage id is printed in the CI run summary
npm stage reject  <stage-id>   # to discard instead
```

CI refuses to publish when the release tag does not match `package.json`.

## How compatibility is checked

Two tiers, both in CI:

- **Native build** — [`scripts/make-compat-app.mjs`](./scripts/make-compat-app.mjs)
  generates a throwaway Expo app pinned to an SDK, installs this module into it
  *from the packed npm tarball* (so it tests what npm ships, not the working
  tree), and prebuilds it. CI then runs Gradle on Android and `pod install` plus
  `xcodebuild` on iOS. Run at both ends of the supported range.
- **Symbol check** — [`scripts/check-expo-compat.mjs`](./scripts/check-expo-compat.mjs)
  resolves the real `expo-modules-core` behind each SDK from Expo's `sdk-*`
  dist-tags, downloads it, and asserts every native symbol the module
  references is still there. Cheap, so it covers every SDK on every run, and a
  [weekly workflow](./.github/workflows/expo-compat.yml) opens an issue when a
  new SDK ships or something drifts.

`REQUIRED_APIS` in the symbol checker is the list of symbols the native sources
use. **Add to it whenever the native code starts depending on something new** —
that is what makes the compatibility table a claim rather than a hope.

### Local-only Gradle quirk

On SDK 57 (React Native 0.86, Gradle 9.3.1) the upstream
`@react-native/gradle-plugin` fails to configure **on some machines** — even
built standalone with its own wrapper — with `Unresolved reference 'libs'`.
It builds fine on GitHub runners. If it bites locally, trust CI over your
laptop, or build against SDK 54 through `example/` instead.

## Adding a new Expo SDK

1. Add the major to `SUPPORTED_SDKS` in [`scripts/check-expo-compat.mjs`](./scripts/check-expo-compat.mjs).
2. Run `npm run compat`. If a symbol is gone, the native code needs to change.
3. Build against it for real:

   ```shell
   node scripts/make-compat-app.mjs --sdk <major> --out /tmp/compat --platform ios
   cd /tmp/compat/app/ios && pod install
   ```

4. Update the table in [COMPATIBILITY.md](./COMPATIBILITY.md) and the range in
   [README.md](./README.md).

## Why one package, not a branch per SDK

The native code has not changed across SDK 53–57 — the same Kotlin and the same
Swift compile against all of them. Mirroring Expo's majors would mean publishing
five identical packages and giving up the ability to signal this package's *own*
breaking changes through semver.

A branch is only warranted when the native source itself must diverge, not when
metadata does. `peerDependencies` is what enforces the range in practice; the
version number is not.

## Testing

The JS layer is tested with Jest under all four `jest-expo` projects
(`src/__tests__`). The platform behaviour lives in Swift and Kotlin and is not
unit-tested — the native build jobs are what cover it, so a change there needs
a real build, not just a green `npm test`.
