"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function VerifyEmailLogic() {
  const search = useSearchParams();
  const token = search.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    document.title = "Verify Email | AstroSeva";
    if (!token) {
      setStatus("error");
      setErrorMsg("Verification token is missing.");
      return;
    }

    api.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((e) => {
        setStatus("error");
        setErrorMsg((e as Error).message || "Verification failed.");
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      {status === "verifying" && <p>Verifying your email...</p>}
      {status === "success" && (
        <div className="space-y-4">
          <p style={{ color: "var(--success)" }}>Your email has been verified!</p>
          <button onClick={() => router.push("/login")} className="btn-primary">
            Continue to Login
          </button>
        </div>
      )}
      {status === "error" && (
        <div className="space-y-4">
          <p style={{ color: "var(--danger)" }}>{errorMsg}</p>
          <button onClick={() => router.push("/login")} className="btn-ghost">
            Return to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <VerifyEmailLogic />
    </Suspense>
  );
}