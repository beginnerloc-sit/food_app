import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { config } from "./config";

WebBrowser.maybeCompleteAuthSession();

const DRIVE_TOKEN_KEY = "platepal.drive.accessToken";
const DRIVE_FOLDER_KEY = "platepal.drive.folderId";
const FOLDER_NAME = "PlatePal Meals";

/**
 * Hook that wires up Google OAuth (Drive scope) using expo-auth-session.
 * On success the access token is stashed in SecureStore for uploads.
 */
export function useGoogleDrive() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.google.webClientId,
    iosClientId: config.google.iosClientId,
    androidClientId: config.google.androidClientId,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "openid",
      "profile",
      "email",
    ],
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      SecureStore.setItemAsync(
        DRIVE_TOKEN_KEY,
        response.authentication.accessToken
      ).catch(() => {});
    }
  }, [response]);

  return {
    ready: !!request,
    connect: () => promptAsync(),
    connected: response?.type === "success",
  };
}

export async function getDriveToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DRIVE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function isDriveConnected(): Promise<boolean> {
  return !!(await getDriveToken());
}

export async function disconnectDrive(): Promise<void> {
  await SecureStore.deleteItemAsync(DRIVE_TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(DRIVE_FOLDER_KEY).catch(() => {});
}

/** Find or create the "PlatePal Meals" folder, caching its id. */
async function ensureFolder(token: string): Promise<string> {
  const cached = await SecureStore.getItemAsync(DRIVE_FOLDER_KEY);
  if (cached) return cached;

  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.json());

  if (search.files?.length) {
    await SecureStore.setItemAsync(DRIVE_FOLDER_KEY, search.files[0].id);
    return search.files[0].id;
  }

  const created = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  }).then((r) => r.json());

  await SecureStore.setItemAsync(DRIVE_FOLDER_KEY, created.id);
  return created.id;
}

export interface DriveUploadResult {
  fileId: string;
  /** Public-ish link usable as an <Image> src via the thumbnail endpoint. */
  publicUrl: string;
  webViewLink: string;
}

/**
 * Upload a local meal photo to the user's Google Drive using a multipart
 * upload, make it readable by link, and return a URL usable in the app.
 */
export async function uploadMealPhotoToDrive(
  localUri: string,
  fileName = `meal-${Date.now()}.jpg`
): Promise<DriveUploadResult> {
  const token = await getDriveToken();
  if (!token) throw new Error("Google Drive not connected");

  const folderId = await ensureFolder(token);
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const boundary = "platepal" + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: image/jpeg\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    throw new Error(`Drive upload failed: ${await uploadRes.text()}`);
  }
  const file = await uploadRes.json();

  // Make the file readable by anyone with the link so <Image> can render it.
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );

  return {
    fileId: file.id,
    publicUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`,
    webViewLink: file.webViewLink,
  };
}
