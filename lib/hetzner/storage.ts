import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function s3() {
  return new S3Client({
    endpoint: process.env.HETZNER_STORAGE_ENDPOINT!,
    region: process.env.HETZNER_STORAGE_REGION ?? "eu-central-003",
    credentials: {
      accessKeyId: process.env.HETZNER_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.HETZNER_STORAGE_SECRET_KEY!,
    },
    forcePathStyle: false,
  });
}

const BUCKET = () => process.env.HETZNER_STORAGE_BUCKET!;

export async function listResults(caseId: string) {
  const res = await s3().send(
    new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: `results/${caseId}/` })
  );
  return res.Contents ?? [];
}

export async function signedResultUrl(key: string, expiresIn = 86400) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET(), Key: key }), { expiresIn });
}
