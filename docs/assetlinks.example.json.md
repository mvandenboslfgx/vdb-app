# Proposed Android App Links — assetlinks.json

Host at: `https://vdbdigital.nl/.well-known/assetlinks.json`

Replace `REPLACE_WITH_SHA256_CERT_FINGERPRINT` with the Play App Signing certificate SHA-256 (from Play Console) after EAS/Play signing is configured.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "nl.vdbdigital.app",
      "sha256_cert_fingerprints": ["REPLACE_WITH_SHA256_CERT_FINGERPRINT"]
    }
  }
]
```

Do not publish until the fingerprint is verified. Never accept arbitrary redirect URLs from query parameters in the app.
