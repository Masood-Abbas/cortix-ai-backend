import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3.config.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const getFromS3 = async (fileName, expiresIn = 600) => {
  return await getSignedUrl(
    s3,
    new GetObjectCommand({
      Key: fileName,
      Bucket: process.env.AWS_BUCKET_NAME,
    }),
    { expiresIn },
  );
};
