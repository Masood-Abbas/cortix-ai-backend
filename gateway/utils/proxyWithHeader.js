import proxy from "express-http-proxy";

export const proxyWithHeader = (serviceURL, proxyPath, options = {}) => {
  return proxy(serviceURL, {
    ...options,
    proxyReqPathResolver: (req) => proxyPath || req.url,
    proxyReqOptDecorator: (proxyReqOPTS, srcReq) => {
      if (srcReq.user) {
        proxyReqOPTS.headers["x-user-id"] = srcReq.user.userId;
      }
      if (options.proxyReqOptDecorator) {
        return options.proxyReqOptDecorator(proxyReqOPTS, srcReq);
      }
      return proxyReqOPTS
    },
  });
};
