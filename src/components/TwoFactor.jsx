import { useState } from "react";
const baseURL = import.meta.env.VITE_BASE_URL;

const CODE_LENGTH = 6;

// The backend answers a failed verify as {"success": false, "message": "..."},
// DRF-style as {"detail": "..."} or with field errors ({"otp_code": ["..."]}).
function errorMessage(data, status) {
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  const field = data?.otp_code || data?.tmp_token || data?.non_field_errors;
  if (field) return Array.isArray(field) ? field.join(" ") : String(field);
  return status ? `Verification failed (${status}).` : "Verification failed.";
}

// Second sign-in step: the code from the authenticator app plus the tmp_token
// sign-in returned. A verified code returns the same token payload as a sign-in
// without 2FA, which goes to onVerified exactly as Login's would.
// Renders inside Login's card, so it brings no page chrome of its own.
export default function TwoFactor({ tmpToken, email, onVerified, onBack }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const complete = code.length === CODE_LENGTH;

  const handleChange = (e) => {
    // Digits only; also tidies a pasted "123 456".
    setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!complete || loading) return;

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${baseURL}auth/2fa/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp_code: code, tmp_token: tmpToken }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.idToken || data.id_token)) {
        onVerified?.(data);
        return;
      }
      setError(errorMessage(data, res.ok ? 0 : res.status));
      setCode(""); // a wrong code is retyped, not edited
    } catch (err) {
      setError(err?.message || "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: 0,
          padding: 0,
          marginBottom: 24,
          cursor: loading ? "default" : "pointer",
          color: "var(--text)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Login
      </button>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 18px",
            borderRadius: 14,
            background: "color-mix(in srgb, var(--accent) 14%, transparent)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            <path d="M12 15v2" />
          </svg>
        </div>

        <h1 style={{ margin: 0, fontSize: 24, color: "var(--text)" }}>
          Two-Factor Authentication
        </h1>
        <p style={{ margin: "10px 0 0", color: "var(--text-2)", lineHeight: 1.6 }}>
          Enter the 6-digit code from your authenticator app to complete your login.
          {email && (
            <>
              <br />
              <span style={{ color: "var(--text-3)", fontSize: 13 }}>Signing in as {email}</span>
            </>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              background: "var(--crit-soft)",
              border: "1px solid var(--crit)",
              color: "var(--crit)",
              padding: 12,
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        <input
          value={code}
          onChange={handleChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={CODE_LENGTH}
          placeholder="Enter 6-digit code"
          aria-label="6-digit verification code"
          autoFocus
          disabled={loading}
          className="otp-input"
          style={{
            width: "100%",
            padding: "14px 16px",
            marginBottom: 24,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text)",
            outline: "none",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.4em",
            textAlign: "center",
            fontFamily: "'Geist Mono', monospace",
          }}
        />

        <button
          type="submit"
          disabled={!complete || loading}
          style={{
            width: "100%",
            padding: "15px",
            border: 0,
            borderRadius: 12,
            cursor: !complete || loading ? "default" : "pointer",
            opacity: !complete || loading ? 0.6 : 1,
            fontWeight: 700,
            fontSize: 16,
            background: "var(--accent)",
            color: "black",
          }}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      </form>
    </div>
  );
}
