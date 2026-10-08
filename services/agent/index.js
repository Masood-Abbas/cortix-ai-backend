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
app.use((err,req,res,next)=>{
  console.log(err)
  if(err.status){
    return res.status(err.status).json(err.data || { message: err.message })
  }
  return res.status(500).json({message:`agent error ${err}`})
})

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`agent Server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});
