import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import router from "./routes/agent.routes.js";




const app = express();
const PORT = process.env.PORT || 3000;



// Middlewares
app.use(express.json());

// Routes
app.use("/", router);

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`agent Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});
