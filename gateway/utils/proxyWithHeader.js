import proxy from "express-http-proxy";

export const proxyWithHeader = (serviceURL, proxyPath) => {
  return proxy(serviceURL, {
    proxyReqPathResolver: (req) => proxyPath || req.url,
    proxyReqOptDecorator: (proxyReqOPTS, srcReq) => {
      if (srcReq.user) {
        proxyReqOPTS.headers["x-user-id"] = srcReq.user.userId;
      }
      return proxyReqOPTS
    },
  });
};
