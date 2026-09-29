import proxy from "express-http-proxy";

export const proxyWithHeader = (serviceURL) => {
  return proxy(serviceURL, {
    proxyReqOptDecorator: (proxyReqOPTS, srcReq) => {
      if (srcReq.user) {
        proxyReqOPTS.headers["x-user-id"] = srcReq.user.userId;
      }
      return proxyReqOPTS
    },
  });
};
