const capacitorPlatform = globalThis.Capacitor?.getPlatform?.();
const isNativeApp =
  globalThis.Capacitor?.isNativePlatform?.() === true ||
  capacitorPlatform === "ios" ||
  capacitorPlatform === "android";

if (!isNativeApp) {
  void import("https://esm.sh/@vercel/analytics")
    .then(({ inject }) => inject())
    .catch(() => {
      // Website analytics are optional when the hosted module is unavailable.
    });
}
