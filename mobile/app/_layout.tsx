import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useUserStore } from "../stores/user";
import { useOnboardingStore } from "../stores/onboarding";

export default function RootLayout() {
  const { token, ready, init } = useUserStore();
  const { completed, fetchStatus } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "login";
    const inOnboarding = segments[0] === "onboarding";

    if (!token && !inAuth) {
      router.replace("/login");
    } else if (token && inAuth) {
      router.replace("/");
    } else if (token && !inOnboarding) {
      // Check onboarding status once authenticated
      fetchStatus().then(() => {
        const { completed: done } = useOnboardingStore.getState();
        if (!done) {
          router.replace("/onboarding");
        }
      });
    }
  }, [token, ready, segments]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
