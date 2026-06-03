# Secure Notes

Secure Notes adalah aplikasi mobile berbasis Expo React Native untuk menyimpan catatan lokal dengan mekanisme enkripsi. Aplikasi ini menggunakan skema utama **AES + ECC** untuk mengamankan isi catatan, serta menyediakan fitur benchmark untuk membandingkan performa **AES-ECC** dan **AES-RSA**.

## Fitur Utama

- Membuat, menyimpan, dan membuka catatan lokal
- Master key dari user untuk membuka vault
- Enkripsi catatan menggunakan AES
- Pengamanan AES note key menggunakan ECC
- Penyimpanan catatan terenkripsi di SQLite
- Generate ECC key pair
- Export public key
- Benchmark AES-ECC dan AES-RSA
- Reset local vault

## Teknologi

- Expo
- React Native
- TypeScript
- Expo Router
- Expo SQLite
- Expo SecureStore
- Expo Crypto
- Noble Ciphers
- Noble Curves
- Node Forge

## Prasyarat

Pastikan sudah menginstall:

- Node.js
- npm
- Expo Go di HP
- VS Code

Cek versi Node dan npm:

```bash
node -v
npm -v
```

## Cara Menjalankan Project

### 1. Clone atau buka folder project

Masuk ke folder project:

```bash
cd secure-notes
```

Contoh jika folder ada di drive D:

```bash
cd D:\secure-notes
```

### 2. Install dependency

Jalankan:

```bash
npm install
```

Jika ada package Expo yang belum sesuai, jalankan:

```bash
npx expo install --fix
```

### 3. Jalankan project

```bash
npx expo start -c
```

Setelah Metro Bundler terbuka, scan QR menggunakan Expo Go di HP.

## Cara Menjalankan di Web

Jika ingin menjalankan di browser:

```bash
npx expo install react-native-web react-dom @expo/metro-runtime
```

Lalu jalankan:

```bash
npx expo start -c
```

Tekan:

```text
w
```

Catatan: beberapa fitur seperti SecureStore dan SQLite dapat memiliki perilaku berbeda di web dibandingkan di perangkat mobile.

## Alur Penggunaan Aplikasi

### 1. Buka aplikasi

Saat aplikasi dibuka, user akan masuk ke halaman Home.

Jika vault belum terbuka, aplikasi akan menampilkan status:

```text
Vault Locked
```

### 2. Input Master Key

Tekan tombol:

```text
Unlock Vault
```

Masukkan master key minimal 8 karakter.

Jika pertama kali menggunakan aplikasi, master key akan dibuat. Jika sudah pernah dibuat, master key akan divalidasi.

### 3. Membuat Note

Setelah vault terbuka, tekan tombol:

```text
+
```

User akan masuk ke halaman editor note.

### 4. Menulis Note

User dapat mengisi:

- Title
- Body

Catatan akan tersimpan otomatis setelah user berhenti mengetik.

### 5. Membuka Note

Saat note dibuka, aplikasi akan melakukan proses decrypt menggunakan alur AES-ECC.

Jika vault terkunci, user harus memasukkan master key terlebih dahulu.

## Alur Enkripsi Notes

Alur utama aplikasi menggunakan AES-ECC:

```text
User input master key
↓
Master key membuka ECC private key
↓
User menulis note
↓
Generate AES note key
↓
AES encrypt isi note
↓
ECC derive wrapping key
↓
AES note key dienkripsi menggunakan wrapping key hasil ECC
↓
SQLite menyimpan ciphertext dan metadata enkripsi
```

Data yang disimpan di SQLite:

- encryptedTitle
- encryptedBody
- titleIv
- keyIv
- encryptedNoteKey
- ephemeralPublicKey
- cryptoAlgorithm
- createdAt
- updatedAt
- pinned

Plaintext note tidak disimpan langsung di SQLite.

## Alur Dekripsi Notes

```text
User input master key
↓
Master key membuka ECC private key
↓
Aplikasi mengambil encrypted note dari SQLite
↓
ECC private key + ephemeral public key menghasilkan wrapping key
↓
Wrapping key membuka AES note key
↓
AES note key decrypt isi note
↓
Title dan body tampil di UI
```

## Benchmark

Halaman Benchmark digunakan untuk membandingkan performa:

- AES-ECC
- AES-RSA

Cara menjalankan benchmark:

1. Buka halaman Benchmark
2. Tekan tombol:

```text
Run Benchmark
```

3. Aplikasi akan menampilkan dua tabel:

### AES-ECC Performance

Berisi:

- Avg Encrypt
- Avg Decrypt
- Avg Total
- Payload Size
- Ciphertext
- Encrypted Key
- Runs

### AES-RSA Performance

Berisi:

- Avg Encrypt
- Avg Decrypt
- Avg Total
- Payload Size
- Ciphertext
- Encrypted Key
- Runs

## Parameter Kriptografi

### AES-ECC

```text
AES: AES-256-GCM
AES key size: 256-bit / 32 bytes
AES IV: 96-bit / 12 bytes
ECC curve: P-256
ECC private key: 256-bit / 32 bytes
Key exchange: ECDH
KDF: SHA-256 dari shared secret
```

### AES-RSA

```text
AES: AES-256-GCM
AES key size: 256-bit / 32 bytes
AES IV: 96-bit / 12 bytes
RSA: RSA-OAEP
RSA key size: 2048-bit
OAEP hash: SHA-256
MGF1 hash: SHA-256
```

## Settings

Pada halaman Settings tersedia fitur:

### Generate ECC Key Pair

Membuat ECC key pair untuk vault.

Private key disimpan dalam bentuk terenkripsi, sedangkan public key dapat diexport.

### Export Public Key

Menyalin ECC public key ke clipboard.

### Reset Local Vault

Menghapus:

- Notes lokal
- Master key check
- ECC key pair
- Metadata vault lokal

Gunakan fitur ini jika terjadi error decrypt akibat perubahan schema atau data lama.

## Troubleshooting

### 1. Project tidak jalan / dependency mismatch

Jalankan:

```bash
npx expo install --fix
npx expo start -c
```

### 2. Error crypto.getRandomValues must be defined

Pastikan sudah install:

```bash
npx expo install react-native-get-random-values
```

Pastikan file `polyfills.ts` ada di root project:

```ts
import "react-native-get-random-values";
```

Pastikan `app/_layout.tsx` mengimport polyfill di baris paling atas:

```ts
import "../polyfills";
```

### 3. Error metadata enkripsi note tidak lengkap

Biasanya terjadi karena note lama dibuat sebelum mode AES-ECC aktif.

Solusi:

1. Buka Settings
2. Tekan Reset Local Vault
3. Buat master key baru
4. Buat note baru

### 4. Database table is locked

Restart Metro:

```bash
npx expo start -c
```

Jika masih error, tutup Expo Go lalu buka ulang.

### 5. Benchmark RSA terasa lama

AES-RSA menggunakan RSA 2048-bit, sehingga prosesnya lebih berat dibanding ECC, terutama di perangkat mobile.

## Struktur Folder Penting

```text
app/
  index.tsx
  unlock.tsx
  benchmark.tsx
  settings.tsx
  note/
    [id].tsx

components/
  NoteCard.tsx

services/
  db/
    database.ts
    notesRepository.ts
  crypto/
    aes.ts
    cryptoService.ts
    eccKeyService.ts
    benchmarkCryptoService.ts
  secureStore/
    keyStore.ts

types/
  note.ts
  benchmark.ts

utils/
  date.ts
  encoding.ts
  id.ts
  performance.ts
  random.ts
  size.ts
  textSamples.ts
```

## Catatan Keamanan

Project ini menggunakan master key input user sebagai akses vault. Pada implementasi demo, proses derivasi key menggunakan SHA-256. Untuk implementasi produksi, disarankan menggunakan KDF yang lebih kuat seperti:

- PBKDF2
- Argon2
- scrypt

dengan salt dan jumlah iterasi yang tinggi.

## Ringkasan

Secure Notes menggunakan AES-ECC sebagai algoritma utama untuk melindungi catatan. AES digunakan untuk mengenkripsi isi note, sedangkan ECC digunakan untuk melindungi AES note key. AES-RSA hanya digunakan sebagai pembanding pada fitur benchmark.
