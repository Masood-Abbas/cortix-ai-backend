import Stripe from "stripe"
import dotenv from "dotenv"
dotenv.config()
 const strip = new Stripe(process.env.STRIPE_SECRET_KEY);
 export default strip