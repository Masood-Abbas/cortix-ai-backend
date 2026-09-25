import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;



// Middlewares
app.use(express.json());

// Routes
// app.use("/", router);

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`agent Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});