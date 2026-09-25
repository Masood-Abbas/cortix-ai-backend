import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import redis from "../../../shared/redis/redis.js";

export const loginController = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Firebase token
    const decoded = await getAuth(app).verifyIdToken(token);

    // Find existing user
    let user = await User.findOne({
      firebaseUid: decoded.uid,
    });

    // Create user if doesn't exist
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture,
      });
    }


    // Create session ID
    const sessionId = crypto.randomUUID();
      await redis.set(`session-${sessionId}`,JSON.stringify({
        userId: user._id,
        name:user.name,
        email:user.email,
        avatar:user.avatar
      }),"EX",7 * 24 * 60 * 60)
      

    // Set cookie
    res.cookie("session", sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user,
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

export const logoutController= async(req,res)=>{
  try {
    const sessionId=req.cookies?.session
    await redis.del(`session-${sessionId}`)

    res.clearCookie("session")
    return res.status(200).json({message:"logout successfully"})
  } catch (error) {
    console.log(error)
     return res.status(200).json({message:"logout error",error})
  }
} 