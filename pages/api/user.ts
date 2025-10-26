import type { NextApiRequest, NextApiResponse } from "next";

interface PortalUser {
  portal_user_id: string;
  portal_user_email: string;
  signed_up: boolean;
  portal_admin: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    // 1) Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.slice(7);

    // 2) Get portal_user_id from query parameter
    const portalUserId = req.query.portal_user_id as string;
    if (!portalUserId) {
      return res
        .status(400)
        .json({ error: "Portal user ID is required as query parameter" });
    }

    // 3) Fetch user data using the user's own authenticated token
    const userDataResponse = await fetch(
      `${process.env.PORTAL_API_ENDPOINT}/portal_users?portal_user_id=eq.${portalUserId}`,
      {
        method: "GET",
        headers: {
          "Accept-Profile": "public",
          Authorization: `Bearer ${token}`, // Use the user's own token
        },
      }
    );

    if (!userDataResponse.ok) {
      throw new Error(
        `User data fetch failed: ${userDataResponse.status} ${userDataResponse.statusText}`
      );
    }

    const userData: PortalUser[] = await userDataResponse.json();

    if (!userData.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: userData[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: (err as { message?: string })?.message ?? "internal_error",
    });
  }
}
