import "../polyfills";

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Secure Notes" }} />
      <Stack.Screen name="unlock" options={{ title: "Unlock Vault" }} />
      <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="benchmark" options={{ title: "Benchmark" }} />
    </Stack>
  );
}
