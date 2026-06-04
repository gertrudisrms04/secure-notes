import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const WEB_STORAGE_PREFIX = "secure_notes_";

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;

    return window.localStorage.getItem(WEB_STORAGE_PREFIX + key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(WEB_STORAGE_PREFIX + key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(WEB_STORAGE_PREFIX + key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
