import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [jwtStatus, setJwtStatus] = useState<
    "loading" | "success" | "error" | "none"
  >("none");
  const [log, setLog] = useState("");

  // Automatically exchange for JWT when user is loaded and signed in
  useEffect(() => {
    const exchangeForJWT = async () => {
      if (!isLoaded || !user) return;

      // Check if we already have a valid JWT
      const existingJWT = localStorage.getItem("dbJwt");
      if (existingJWT) {
        try {
          // Quick validation - decode without verification to check expiration
          const payload = JSON.parse(atob(existingJWT.split(".")[1]));
          const now = Math.floor(Date.now() / 1000);

          if (payload.exp > now + 300) {
            // If token expires more than 5 minutes from now
            setJwtStatus("success");
            setLog("Valid JWT found in storage");
            return;
          } else {
            localStorage.removeItem("dbJwt"); // Remove expired token
            localStorage.removeItem("portalUserId"); // Remove expired portal user ID
          }
        } catch {
          localStorage.removeItem("dbJwt"); // Remove invalid token
          localStorage.removeItem("portalUserId"); // Remove invalid portal user ID
        }
      }

      setJwtStatus("loading");
      setLog("Exchanging Clerk session → DB JWT...");

      try {
        const res = await fetch("/api/auth/exchange", { method: "POST" });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(JSON.stringify(json));
        }

        // Store JWT and portal user ID in localStorage
        localStorage.setItem("dbJwt", json.token);
        localStorage.setItem("portalUserId", json.portalUserId);
        setJwtStatus("success");
        setLog("JWT obtained and stored successfully!");
      } catch (error) {
        setJwtStatus("error");
        setLog("JWT exchange failed: " + (error as Error).message);
      }
    };

    exchangeForJWT();
  }, [user, isLoaded]);

  const goToUserProfile = () => {
    router.push("/user");
  };

  return (
    <main
      style={{ fontFamily: "system-ui", margin: "2rem auto", maxWidth: 720 }}
    >
      <header style={{ display: "flex", justifyContent: "center" }}>
        <SignedOut>
          <SignInButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      <SignedIn>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p>Welcome {user?.primaryEmailAddress?.emailAddress}</p>

          {jwtStatus === "loading" && (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              🔄 Setting up your session...
            </p>
          )}

          {jwtStatus === "error" && (
            <p style={{ color: "#d32f2f", fontSize: "0.9rem" }}>
              ❌ Failed to set up session. Please refresh the page.
            </p>
          )}

          {jwtStatus === "success" && (
            <button
              onClick={goToUserProfile}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              View User Profile
            </button>
          )}
        </div>
      </SignedIn>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {log}
      </pre>
    </main>
  );
}
