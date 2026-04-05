import "dotenv/config";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Not Authenticated!" });

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
    if (err) return res.status(403).json({ message: "Token is not Valid!" });

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.clearCookie("token");
      return res.status(403).json({ message: "Account access has been suspended." });
    }

    req.userId = user.id;
    req.userRole = user.role;

    next();
  });
};
