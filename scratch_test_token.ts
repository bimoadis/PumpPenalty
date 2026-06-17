import { encryptSession, decryptSession } from "./src/utils/sessionCrypto.ts";

const mockPayload = {
  serverSeed: "5e883f8914a0f4e2f854e4efb1e8470a2a4b8df81775f0a2d0ef238210382838",
  serverHash: "8c3b7f5e883f8914a0f4e2f854e4efb1e8470a2a4b8df81775f0a2d0ef238210",
  clientSeed: "degen-xyz",
  yourTeam: { code: "ESP", name: "Spain", color: "#ef3340", p: 16 },
  oppTeam: { code: "FRA", name: "France", color: "#2563eb", p: 15 },
  gameState: {
    ys: 3,
    os: 2,
    yk: ["GOAL", "SAVED", "GOAL", "GOAL"],
    ok: ["GOAL", "GOAL", "SAVED", "SAVED"],
    nonce: 4,
    phase: "shoot"
  }
};

console.log("=== PENGUJIAN SESI TOKEN PUMP PENALTY ===\n");
console.log("1. Payload Sesi Asli (Sisi Server):");
console.dir(mockPayload, { depth: null });

console.log("\n--------------------------------------------------\n");

// 1. Jalankan Enkripsi
const token = encryptSession(mockPayload);
console.log("2. Hasil Enkripsi (Token Sesi yang dikirim ke Client):");
console.log(token);
console.log(`\nPanjang Token: ${token.length} karakter`);

const [iv, tag, ciphertext] = token.split(":");
console.log("\nStruktur Token Terbagi (Delimited by ':'):");
console.log(`- IV (Initialization Vector) [12 bytes hex]: ${iv}`);
console.log(`- Auth Tag (Authentication GCM Tag) [16 bytes hex]: ${tag}`);
console.log(`- Ciphertext (Data terenkripsi) [hex]: ${ciphertext}`);

console.log("\n--------------------------------------------------\n");

// 2. Jalankan Dekripsi
const decrypted = decryptSession(token);
console.log("3. Hasil Dekripsi Token (Kembali menjadi Object di Server):");
console.dir(decrypted, { depth: null });

console.log("\n--------------------------------------------------\n");

// 3. Uji Coba Keamanan / Modifikasi Ilegal oleh Client
console.log("4. Simulasi Pembajakan Token (Client mencoba memanipulasi skor):");
const corruptedToken = `${iv}:${tag}:${ciphertext.slice(0, -2)}00`;
console.log(`Token Manipulasi: ${corruptedToken}`);

try {
  console.log("Mencoba dekripsi token manipulasi...");
  decryptSession(corruptedToken);
} catch (error) {
  console.log(`\n❌ PROTEKSI BERHASIL! Dekripsi Gagal dengan Error:\n"${(error as Error).message}"`);
}
