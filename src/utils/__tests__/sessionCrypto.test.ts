import { encryptSession, decryptSession } from "../sessionCrypto";

describe("sessionCrypto - AES-256-GCM Helpers", () => {
  const testData = {
    userId: "user-123",
    score: 5,
    seed: "secret-seed-here",
    nested: {
      items: [1, 2, 3],
      active: true
    }
  };

  test("successfully encrypts and decrypts valid session payloads", () => {
    const token = encryptSession(testData);
    expect(typeof token).toBe("string");
    expect(token.split(":").length).toBe(3); // iv:authTag:encryptedText

    const decrypted = decryptSession(token);
    expect(decrypted).toEqual(testData);
    expect(decrypted.userId).toBe("user-123");
    expect(decrypted.nested.items).toEqual([1, 2, 3]);
  });

  test("throws error when attempting to decrypt corrupted tokens", () => {
    const token = encryptSession(testData);
    const [iv, authTag, ciphertext] = token.split(":");

    // Modify ciphertext slightly to corrupt it
    const corruptedCiphertext = ciphertext.slice(0, -2) + (ciphertext.endsWith("0") ? "1" : "0");
    const corruptedToken = `${iv}:${authTag}:${corruptedCiphertext}`;

    expect(() => {
      decryptSession(corruptedToken);
    }).toThrow("Failed to decrypt session token");
  });

  test("throws error when token format is invalid", () => {
    const invalidToken = "some-malformed-token-without-delimiters";
    expect(() => {
      decryptSession(invalidToken);
    }).toThrow("Invalid token format");
  });
});
