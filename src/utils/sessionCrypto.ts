import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits is recommended for GCM

function getKey(): Buffer {
  // Ensure we always get a valid 32-byte (256-bit) key
  const secret = process.env.SESSION_SECRET || "default-secret-pump-penalty-for-dev-use-only-123456";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSession(data: any): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Concatenate iv, authTag, and encrypted data with colon delimiters
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptSession(token: string): any {
  try {
    const key = getKey();
    const parts = token.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error("Failed to decrypt session token: " + (error as Error).message);
  }
}
