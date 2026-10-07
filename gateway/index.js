import "./config/env.js";
import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import cookieParser from "cookie-parser";
import protect from "./middleware/auth.middleware.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
import morgan from "morgan";


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
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/stripeWebhook") return next();
  return express.json()(req, res, next);
});


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
app.use(
  "/api/billing/stripeWebhook",
  proxy(process.env.BILLING_SERVICE, {
    parseReqBody: false,
    proxyReqPathResolver: () => "/stripeWebhook",
  })
);
app.use(
  "/api/billing",protect,
  proxyWithHeader(process.env.BILLING_SERVICE)
);

app.use(morgan("dev"))

app.get(
  "/api/me",protect,
  proxyWithHeader(process.env.AUTH_SERVICE, "/me")
)

app.listen(PORT, () => {
  console.log(`Gateway Server running on http://localhost:${PORT}`);
});
