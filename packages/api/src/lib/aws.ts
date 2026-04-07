import { TextractClient } from "@aws-sdk/client-textract";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error(
    "Missing AWS_REGION, AWS_ACCESS_KEY_ID, or AWS_SECRET_ACCESS_KEY env vars"
  );
}

const credentials = { accessKeyId, secretAccessKey };

export const textract = new TextractClient({ region, credentials });
export const rekognition = new RekognitionClient({ region, credentials });
export const s3 = new S3Client({ region, credentials });
