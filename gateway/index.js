import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getCurrentUser } from "./controller/user.controller.js";
import protect from "./middleware/auth.middleware.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";

dotenv.config();

const app = express();



// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


const PORT = process.env.PORT || 8000;
app.use(cookieParser());
app.use(express.json());


// Auth microservice
app.use(
  "/api/auth",
  proxy(process.env.AUTH_SERVICE)
);
app.use(
  "/api/chat",protect,
  proxyWithHeader(process.env.CHAT_SERVICE)
);
app.use(
  "/api/agent",protect,
  proxyWithHeader(process.env.AGENT_SERVICE)
);

app.get("/api/me",protect,getCurrentUser)

app.listen(PORT, () => {
  console.log(`Gateway Server running on http://localhost:${PORT}`);
});