import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

interface PortalUser {
  portal_user_id: string;
  portal_user_email: string;
  signed_up: boolean;
  portal_admin: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function UserPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get token and portal user ID from localStorage
        const token = localStorage.getItem("dbJwt");
        const portalUserId = localStorage.getItem("portalUserId");

        if (!token || !portalUserId) {
          setError("No authentication token found. Please sign in again.");
          setLoading(false);
          return;
        }

        // Check if token is expired
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const now = Math.floor(Date.now() / 1000);

          if (payload.exp <= now) {
            localStorage.removeItem("dbJwt");
            localStorage.removeItem("portalUserId");
            setError("Your session has expired. Please sign in again.");
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem("dbJwt");
          localStorage.removeItem("portalUserId");
          setError("Invalid authentication token. Please sign in again.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/user?portal_user_id=${encodeURIComponent(portalUserId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("dbJwt");
            localStorage.removeItem("portalUserId");
            setError("Your session has expired. Please sign in again.");
          } else {
            throw new Error(data.error || "Failed to fetch user data");
          }
        } else {
          setUserData(data.user);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleBackToHome = () => {
    router.push("/");
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setUserData(null);

    const token = localStorage.getItem("dbJwt");
    const portalUserId = localStorage.getItem("portalUserId");

    if (!token || !portalUserId) {
      setError("No authentication token found. Please sign in again.");
      setLoading(false);
      return;
    }

    fetch(`/api/user?portal_user_id=${encodeURIComponent(portalUserId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        return response.json().then((data) => ({ response, data }));
      })
      .then(({ response, data }) => {
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("dbJwt");
            localStorage.removeItem("portalUserId");
            setError("Your session has expired. Please sign in again.");
          } else {
            setError(data.error || "Failed to fetch user data");
          }
        } else {
          setUserData(data.user);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <main
      style={{
        fontFamily: "system-ui",
        margin: "2rem auto",
        maxWidth: 720,
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        padding: "1rem",
        color: "#333333",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "2rem",
        }}
      >
        <SignedOut>
          <SignInButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      <SignedIn>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button
            onClick={handleBackToHome}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back to Home
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: loading ? "#e9ecef" : "#007bff",
              color: loading ? "#6c757d" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            {loading ? "Loading..." : "Refresh Data"}
          </button>
        </div>

        <h1
          style={{
            color: "#333333",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Portal User Profile
        </h1>

        {loading && (
          <p
            style={{ color: "#333333", textAlign: "center", fontSize: "16px" }}
          >
            Loading user data...
          </p>
        )}

        {error && (
          <div
            style={{
              background: "#f8d7da",
              border: "1px solid #f5c6cb",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1rem",
              color: "#721c24",
            }}
          >
            <strong style={{ color: "#721c24" }}>Error:</strong> {error}
          </div>
        )}

        {userData && (
          <div
            style={{
              background: "#ffffff",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              color: "#333333",
            }}
          >
            <h2
              style={{ color: "#333333", marginTop: 0, marginBottom: "1rem" }}
            >
              User Information
            </h2>
            <div style={{ fontSize: 16, lineHeight: 1.8, color: "#333333" }}>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Portal User ID:</strong>{" "}
                <code
                  style={{
                    background: "#f0f0f0",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "14px",
                    color: "#333333",
                  }}
                >
                  {userData.portal_user_id}
                </code>
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Email:</strong>{" "}
                <span style={{ color: "#333333" }}>
                  {userData.portal_user_email}
                </span>
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Signed Up:</strong>{" "}
                <span
                  style={{
                    color: userData.signed_up ? "#28a745" : "#fd7e14",
                    fontWeight: "bold",
                  }}
                >
                  {userData.signed_up ? "✓ Yes" : "✗ No"}
                </span>
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Portal Admin:</strong>{" "}
                <span
                  style={{
                    color: userData.portal_admin ? "#007bff" : "#6c757d",
                    fontWeight: "bold",
                  }}
                >
                  {userData.portal_admin ? "✓ Yes" : "✗ No"}
                </span>
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Created At:</strong>{" "}
                <span style={{ color: "#333333" }}>
                  {new Date(userData.created_at).toLocaleString()}
                </span>
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong style={{ color: "#000000" }}>Updated At:</strong>{" "}
                <span style={{ color: "#333333" }}>
                  {new Date(userData.updated_at).toLocaleString()}
                </span>
              </p>
              {userData.deleted_at && (
                <p style={{ margin: "0.5rem 0" }}>
                  <strong style={{ color: "#000000" }}>Deleted At:</strong>{" "}
                  <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                    {new Date(userData.deleted_at).toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            <details style={{ marginTop: "1rem" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#000000",
                  fontSize: "14px",
                }}
              >
                View Raw JSON Data
              </summary>
              <pre
                style={{
                  fontSize: 12,
                  background: "#f8f9fa",
                  padding: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #dee2e6",
                  marginTop: "0.5rem",
                  overflow: "auto",
                  color: "#333333",
                  fontFamily: "Monaco, Consolas, 'Courier New', monospace",
                }}
              >
                {JSON.stringify(userData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </SignedIn>

      <SignedOut>
        <p
          style={{
            color: "#333333",
            textAlign: "center",
            fontSize: "16px",
            padding: "2rem",
          }}
        >
          Please sign in to view your user profile.
        </p>
      </SignedOut>
    </main>
  );
}
