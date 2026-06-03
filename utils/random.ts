import * as Crypto from "expo-crypto";

export async function getRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return new Uint8Array(bytes);
}
