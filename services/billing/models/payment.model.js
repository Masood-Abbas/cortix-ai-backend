import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
        },

        orderId: {
            type: String,
            required: true,
            unique: true,
        },

        paymentId: {
            type: String,
        },

        amount: {
            type: Number,
            required: true,
        },

        currency: {
            type: String,
            default: "USD",
        },

        credits: {
            type: Number,
            required: true,
        },

        plan: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["created", "paid", "failed"],
            default: "created",
        },
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;