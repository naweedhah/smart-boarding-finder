import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../shared/lib/prisma.js";
import { createNotification } from "../../shared/services/notification.service.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const FULL_NAME_REGEX = /^[A-Za-z\s'.-]+$/;
const ALLOWED_ROLES = ["student", "boardingOwner"];
const ALLOWED_GENDERS = ["male", "female", "other", "preferNotToSay"];

export const register = async (req, res) => {
  const {
    username,
    email,
    password,
    role,
    gender,
    fullName,
    phone,
  } = req.body;

  const normalizedUsername = username?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedFullName = fullName?.trim();
  const normalizedPhone = phone?.trim();

  if (!normalizedFullName || normalizedFullName.length < 2) {
    return res
      .status(400)
      .json({ message: "Full name must be at least 2 characters long." });
  }

  if (!FULL_NAME_REGEX.test(normalizedFullName)) {
    return res.status(400).json({
      message: "Full name can only contain letters and common name symbols.",
    });
  }

  if (!USERNAME_REGEX.test(normalizedUsername || "")) {
    return res.status(400).json({
      message:
        "Username must be 3-20 characters and use only letters, numbers, or underscores.",
    });
  }

  if (!EMAIL_REGEX.test(normalizedEmail || "")) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!PHONE_REGEX.test(normalizedPhone || "")) {
    return res.status(400).json({
      message: "Phone number must contain exactly 10 digits.",
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long.",
    });
  }

  if (!ALLOWED_GENDERS.includes(gender)) {
    return res.status(400).json({ message: "Select a valid gender." });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Select a valid user type." });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: normalizedUsername }, { email: normalizedEmail }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.username === normalizedUsername
            ? "That username is already taken."
            : "That email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        gender,
        fullName: normalizedFullName,
        phone: normalizedPhone,
      },
    });

    await createNotification({
      userId: createdUser.id,
      type: "accountCreated",
      title: "Welcome to BoardingFinder",
      message: `Hi ${normalizedFullName}, your account is ready. You can now explore boardings, track alerts, and message owners safely.`,
      metadata: {
        role,
        username: normalizedUsername,
      },
      bypassPreference: true,
    });

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create user!" });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = username?.trim();

  if (!normalizedUsername || normalizedUsername.length < 3) {
    return res
      .status(400)
      .json({ message: "Enter a valid username to continue." });
  }

  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) return res.status(400).json({ message: "Invalid Credentials!" });
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid Credentials!" });

    const age = 1000 * 60 * 60 * 24 * 7;

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        isAdmin: user.role === "admin",
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: age }
    );

    const { password: userPassword, ...userInfo } = user;

    res
      .cookie("token", token, {
        httpOnly: true,
        // secure:true,
        maxAge: age,
      })
      .status(200)
      .json(userInfo);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to login!" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout Successful" });
};
