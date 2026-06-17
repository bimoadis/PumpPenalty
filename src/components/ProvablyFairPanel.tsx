"use client";

import React, { useState, useEffect } from "react";
import { sha256Hex } from "@/utils/crypto";

interface ProvablyFairPanelProps {
  serverHash: string;
  clientSeed: string;
  setClientSeed: (s: string) => void;
  nonce: number;
  lastHash: string;
  onRandomizeClient: () => void;
  disabled: boolean;
  revealedServerSeed?: string;
}

export default function ProvablyFairPanel({
  serverHash,
  clientSeed,
  setClientSeed,
  nonce,
  lastHash,
  onRandomizeClient,
  disabled,
  revealedServerSeed,
}: ProvablyFairPanelProps) {
  const [auditStatus, setAuditStatus] = useState<"pending" | "valid" | "invalid">("pending");

  useEffect(() => {
    if (revealedServerSeed && serverHash) {
      sha256Hex(revealedServerSeed).then((hash) => {
        if (hash === serverHash) {
          setAuditStatus("valid");
        } else {
          setAuditStatus("invalid");
        }
      });
    } else {
      setAuditStatus("pending");
    }
  }, [revealedServerSeed, serverHash]);

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
        }}
      >
        <div>
          <div className="lbl up">Server seed (committed)</div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--green)",
              wordBreak: "break-all",
              marginTop: 3,
            }}
          >
            {serverHash ? serverHash.slice(0, 22) + "..." : "…"}
          </div>
          
          {revealedServerSeed && (
            <div style={{ marginTop: 8 }}>
              <div className="lbl up">Revealed Plaintext Seed</div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--text)",
                  wordBreak: "break-all",
                  background: "#050708",
                  padding: 4,
                  border: "1px dashed var(--line)",
                  marginTop: 2,
                }}
              >
                {revealedServerSeed}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="lbl up" style={{ marginBottom: 3 }}>
            Client seed
          </div>
          <input
            className="inp"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            spellCheck={false}
            disabled={disabled}
          />
          <button
            className="btn"
            style={{ marginTop: 6, padding: "5px 9px", fontSize: 10 }}
            onClick={onRandomizeClient}
            disabled={disabled}
          >
            Randomize
          </button>
        </div>
        <div>
          <div className="lbl up">Kick nonce</div>
          <div
            className="disp"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            {nonce}
          </div>
          <div className="lbl" style={{ marginTop: 2, wordBreak: "break-all" }}>
            last roll {lastHash ? lastHash.slice(0, 12) : "—"}
          </div>
        </div>
      </div>
      
      {auditStatus !== "pending" && (
        <div 
          className="mono"
          style={{ 
            marginTop: 12, 
            padding: 8, 
            background: auditStatus === "valid" ? "rgba(0, 255, 136, 0.08)" : "rgba(255, 59, 92, 0.08)",
            border: `1px solid ${auditStatus === "valid" ? "var(--green)" : "var(--red)"}`,
            fontSize: 11,
            color: auditStatus === "valid" ? "var(--green)" : "var(--red)"
          }}
        >
          {auditStatus === "valid" ? (
            <span>✔ PROVABLY FAIR VERIFIED: Revealed server seed matches initial commitment hash!</span>
          ) : (
            <span>❌ WARNING: AUDIT FAILED! Revealed server seed does NOT match initial hash!</span>
          )}
        </div>
      )}

      <hr className="hr" style={{ margin: "10px 0 8px" }} />
      <div className="mono" style={{ fontSize: 11, color: "var(--gray)", lineHeight: 1.5 }}>
        Each kick rolls from sha256(server seed : client seed : nonce). Byte 0 picks the seed driven zone, bytes 1 to 4 set the conversion roll. Same inputs reproduce the same kick. Swap this for ORAO VRF on Solana to make the entropy verifiable on chain. See README for steps.
      </div>
    </section>
  );
}
