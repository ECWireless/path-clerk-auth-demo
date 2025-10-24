import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
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

    // 2) Upsert portal user + mapping (provider='clerk', auth_provider_user_id=sub=userId)
    const client = await pool.connect();
    let portalUserId: string;
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT portal_user_id
           FROM portal_user_auth
          WHERE portal_auth_provider = 'clerk'
            AND auth_provider_user_id = $1
          LIMIT 1`,
        [userId]
      );

      if (existing.rows.length) {
        portalUserId = existing.rows[0].portal_user_id;
      } else {
        const gen = await client.query(`SELECT gen_random_uuid()::text AS id`);
        portalUserId = gen.rows[0].id;

        await client.query(
          `INSERT INTO portal_users (portal_user_id, portal_user_email, signed_up)
           VALUES ($1, $2, TRUE)`,
          [portalUserId, email]
        );

        await client.query(
          `INSERT INTO portal_user_auth
             (portal_user_id, portal_auth_provider, portal_auth_type, auth_provider_user_id, federated)
           VALUES ($1, 'clerk', 'auth0_username', $2, TRUE)`,
          [portalUserId, userId]
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    // 3) Mint JWT
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

    return res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: (err as { message?: string })?.message ?? "internal_error",
    });
  }
}
