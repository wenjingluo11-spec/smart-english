import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "token";

const isWeb = Platform.OS === "web";

export async function getToken(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (isWeb) { localStorage.setItem(TOKEN_KEY, token); return; }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  if (isWeb) { localStorage.removeItem(TOKEN_KEY); return; }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
