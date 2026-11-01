# Android release signing (template)

Add to `frontend/android/app/build.gradle` (inside `android {}`):

```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "release.keystore")
        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias System.getenv("ANDROID_KEY_ALIAS")
        keyPassword System.getenv("ANDROID_KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

Generate a keystore (keep it safe, never commit):

```bash
keytool -genkeypair -v -keystore release.keystore -alias rehardwire -keyalg RSA -keysize 2048 -validity 10000
```

Then build the AAB:

```bash
cd frontend/android
./gradlew bundleRelease
# output: app/build/outputs/bundle/release/app-release.aab
```