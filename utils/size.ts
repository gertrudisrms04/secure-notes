import { base64ToBytes, utf8ToBytes } from "./encoding";

export function utf8SizeBytes(value: string): number {
  return utf8ToBytes(value).length;
}

export function base64SizeBytes(value: string): number {
  return base64ToBytes(value).length;
}
