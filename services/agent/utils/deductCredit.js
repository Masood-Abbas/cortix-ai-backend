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
    console.log(error?.response?.data || error.message || error)
    return null
    
}
}
