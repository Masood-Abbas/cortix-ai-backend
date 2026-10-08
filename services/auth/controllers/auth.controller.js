import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import redis from "../../../shared/redis/redis.js";
import { Cost } from "../utils/cost.js";

const sessionPayload = (user) => ({
  userId: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  plan: user.plan,
  credits: user.credits,
  totalCredits: user.totalCredits,
  planExpireAt: user.planExpireAt,
});

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
      await redis.set(`session-${sessionId}`,JSON.stringify(sessionPayload(user)),"EX",7 * 24 * 60 * 60)
      

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
    const sessionId = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("session="))?.slice(8)
    if (sessionId) await redis.del(`session-${sessionId}`)

    res.clearCookie("session")
    return res.status(200).json({message:"logout successfully"})
  } catch (error) {
    console.log(error)
     return res.status(500).json({message:"Logout failed"})
  }
} 

export const updateUserPayment =async (req,res)=>{
  try {
    const {plan,credits,userId}=req.body
    const user=await User.findById(userId)
    if(!user){
      return res.status(404).json({message:"user not found"})
    }
    user.plan=plan
    user.credits+= credits
    user.totalCredits+= credits
    user.planExpireAt=new Date(Date.now() + 30*24*60*60*1000)
    await user.save()

    const sessionId = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("session="))?.slice(8)
    if (sessionId) await redis.set(`session-${sessionId}`,JSON.stringify(sessionPayload(user)),"EX",7 * 24 * 60 * 60)
      return res.status(200).json({
        success:true
      })

  } catch (err) {
    console.log(err)
    return res.status(500).json({message:`update user payment error ${err}`})
    
  }
}

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "user not found" });

    return res.status(200).json(sessionPayload(user));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: `get current user error ${error}` });
  }
};



export const deductCredits=async(req,res)=>{
try {
  const {userId,agent}=req.body
  const requiredCredits=Cost[agent] || 1
  const user=await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: requiredCredits } },
    { $inc: { credits: -requiredCredits } },
    { new: true },
  )
  if (!user) {
    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ message: "user not found" });
    return res.status(402).json({
      message:"Insufficient credits",
      requiredCredits,
      credits: existingUser.credits,
      user: sessionPayload(existingUser),
    })
  }
    const updatedUser = sessionPayload(user)

      // Get current session
    const sessionId = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("session="))
      ?.slice(8);

    // Update Redis session
    if (sessionId) {
      await redis.set(
        `session-${sessionId}`,
        JSON.stringify(updatedUser),
        "EX",
        7 * 24 * 60 * 60
      );
    }

    return res.status(200).json({
      success: true,
      credits: user.credits,
      requiredCredits,
      user: updatedUser,
    });

} catch (error) {
  console.log(error)
   return res.status(500).json({
      success: false,
     message: `credits deduct failed ${error}`,
    })
}
}
