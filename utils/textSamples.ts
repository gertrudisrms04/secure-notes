export function getBenchmarkSampleText(): string {
  return `
Secure Notes benchmark mengukur performa proses enkripsi dan dekripsi pada data catatan. Pengujian dilakukan dengan membandingkan skema AES-ECC dan AES-RSA. Pada AES-ECC, kunci AES untuk catatan diamankan menggunakan shared secret berbasis elliptic curve. Pada AES-RSA, kunci AES diamankan menggunakan RSA-OAEP. Data yang diukur meliputi rata-rata waktu enkripsi, rata-rata waktu dekripsi, total waktu, ukuran payload, ukuran ciphertext, dan ukuran encrypted key.
`.trim();
}
