import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";

const DB_JWT_SECRET = process.env.DB_JWT_SECRET!;
const DB_JWT_AUD = process.env.DB_JWT_AUD || "postgrest";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // 1) Verify Clerk session
    const { userId, sessionId, sessionClaims } = getAuth(req);
    if (!userId || !sessionId)
      return res.status(401).json({ error: "unauthorized" });

    // Try to get email from claims first; if missing, fetch user
    let email = (sessionClaims?.email as string) || "";
    if (!email) {
      const user = await (await clerkClient()).users.getUser(userId);
      email = user?.primaryEmailAddress?.emailAddress || "";
    }

    // 2) Create admin token to call the RPC endpoint
    const adminToken = jwt.sign(
      {
        role: "portal_db_admin",
        aud: DB_JWT_AUD,
      },
      DB_JWT_SECRET,
      { algorithm: "HS256", expiresIn: "5m" }
    );

    // 3) Call ensure_portal_user RPC endpoint
    const rpcResponse = await fetch(
      `${process.env.PORTAL_API_ENDPOINT}/rpc/ensure_portal_user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Profile": "api",
          "Content-Profile": "api",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          p_email: email,
          p_auth_provider: "clerk",
          p_auth_type: "clerk_google",
          p_auth_provider_user_id: userId,
          p_federated: false,
        }),
      }
    );

    if (!rpcResponse.ok) {
      throw new Error(
        `RPC call failed: ${rpcResponse.status} ${rpcResponse.statusText}`
      );
    }

    const rpcData = await rpcResponse.json();
    if (!Array.isArray(rpcData) || rpcData.length === 0 || !rpcData[0]?.portal_user_id) {
      throw new Error("RPC did not return a valid portal_user_id");
    }
    const { portal_user_id } = rpcData[0]; // The RPC returns the portal_user_id
    // 4) Mint JWT for authenticated user with portal_user_id
    const token = jwt.sign(
      {
        role: "authenticated_user",
        email,
        sub: userId, // Clerk user id; DB maps sub -> portal_user_id via portal_user_auth
        aud: DB_JWT_AUD,
      },
      DB_JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" }
    );

    return res.status(200).json({ token, portalUserId: portal_user_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: (err as { message?: string })?.message ?? "internal_error",
    });
  }
}
