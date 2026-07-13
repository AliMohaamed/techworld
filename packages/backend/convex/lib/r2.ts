import { AwsClient } from "aws4fetch";

function getClient() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !accountId || !bucket) {
    throw new Error(
      "Missing Cloudflare R2 configuration: check R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET"
    );
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  return { client, endpoint };
}

export async function presignPut(
  key: string,
  contentType: string,
  ttlSeconds: number
): Promise<string> {
  const { client, endpoint } = getClient();
  const url = new URL(`${endpoint}/${key}`);
  url.searchParams.set("X-Amz-Expires", ttlSeconds.toString());

  const request = new Request(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
  });

  const signed = await client.sign(request, {
    aws: { signQuery: true },
  });

  return signed.url;
}

export async function presignGet(
  key: string,
  ttlSeconds: number
): Promise<string> {
  const { client, endpoint } = getClient();
  const url = new URL(`${endpoint}/${key}`);
  url.searchParams.set("X-Amz-Expires", ttlSeconds.toString());

  const request = new Request(url, {
    method: "GET",
  });

  const signed = await client.sign(request, {
    aws: { signQuery: true },
  });

  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const { client, endpoint } = getClient();
  const url = `${endpoint}/${key}`;

  const response = await client.fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 Delete failed for key ${key}: ${response.status} ${response.statusText} - ${text}`);
  }
}

export async function listObjects(
  prefix: string,
  continuationToken?: string
): Promise<{ keys: string[]; nextToken?: string }> {
  const { client, endpoint } = getClient();
  const url = new URL(endpoint);
  url.searchParams.set("list-type", "2");
  url.searchParams.set("prefix", prefix);
  if (continuationToken) {
    url.searchParams.set("continuation-token", continuationToken);
  }

  const response = await client.fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 List failed for prefix ${prefix}: ${response.status} ${response.statusText} - ${text}`);
  }

  const xml = await response.text();
  const keys: string[] = [];
  const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
  for (const match of keyMatches) {
    keys.push(match[1]);
  }

  const nextTokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
  const nextToken = nextTokenMatch ? nextTokenMatch[1] : undefined;

  return { keys, nextToken };
}

export async function putBuffer(
  key: string,
  buffer: ArrayBuffer,
  contentType: string
): Promise<void> {
  const { client, endpoint } = getClient();
  const url = `${endpoint}/${key}`;

  const response = await client.fetch(url, {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 Put failed for key ${key}: ${response.status} ${response.statusText} - ${text}`);
  }
}
