import type { AppProps } from "next/app";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import "@/styles/globals.css";

function JWTManager() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    // Clear JWT and portal user ID when user signs out
    if (isSignedIn === false) {
      localStorage.removeItem("dbJwt");
      localStorage.removeItem("portalUserId");
    }
  }, [isSignedIn]);

  return null;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <JWTManager />
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
