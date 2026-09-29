import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve the service environment independently of the launch directory.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
