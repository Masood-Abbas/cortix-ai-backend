import "./config/env.js";
import express from "express";

import connectDB from "./config/db.js";
import router from "./routes/billing.route.js";


const app = express();
const PORT = process.env.PORT || 3000;



// Middlewares
app.use((req, res, next) => {
  if (req.originalUrl === "/stripeWebhook") return next();
  return express.json()(req, res, next);
});

// Routes
app.use("/", router);

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`Billing Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});
