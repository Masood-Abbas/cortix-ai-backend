import axios from "axios"

export const deductCredit=async (userId,agent,cookie)=>{
try {
    const authServiceUrl =
        process.env.AUTH_SERVICES ||
        process.env.AUTH_SERVICE ||
        process.env.AUTH_SERVICE_URL;

    if (!authServiceUrl) {
        throw new Error("Auth service URL is not configured");
    }

    const {data}=await axios.post(
        `${authServiceUrl}/deduct-credits`,
        {userId,agent},
        cookie ? { headers: { Cookie: cookie } } : undefined,
    )
    return data
} catch (error) {
    const payload = error?.response?.data;
    const message = payload?.message || error.message || "Credit deduction failed";
    const creditError = new Error(message);
    creditError.status = error?.response?.status || 500;
    creditError.user = payload?.user || null;
    creditError.requiredCredits = payload?.requiredCredits;
    creditError.credits = payload?.credits;
    throw creditError;
    
}
}
