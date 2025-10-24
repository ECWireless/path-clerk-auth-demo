import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useState } from "react";

export default function Home() {
  const { user } = useUser();

  const [dbJwt, setDbJwt] = useState<string | null>(null);
  const [log, setLog] = useState("");

  async function exchange() {
    setLog("Exchanging Clerk session → DB JWT...");
    const res = await fetch("/api/auth/exchange", { method: "POST" });
    const json = await res.json();
    if (!res.ok) return setLog("Exchange failed: " + JSON.stringify(json));
    setDbJwt(json.token);
    setLog("Got JWT; portal_user_id mapped in DB from sub");
  }

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
        <p>Welcome {user?.primaryEmailAddress?.emailAddress}</p>
        <button onClick={exchange}>Get DB JWT</button>
        {dbJwt && (
          <details style={{ marginTop: 12 }}>
            <summary>DB JWT (for PostgREST)</summary>
            <pre>{dbJwt}</pre>
          </details>
        )}
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
