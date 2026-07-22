// Minimal Google Sheets writer using a service account, with no SDK dependency.
// Auth: sign a JWT with the service account's private key (RS256) and exchange
// it for an access token. Then call the Sheets REST API.
//
// Requires env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY.
// No-ops (returns { skipped: true }) when unconfigured.
import crypto from "crypto";

const b64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

let cached = null; // { token, exp }

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  key = key.replace(/\\n/g, "\n"); // env files escape newlines

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer
    .sign(key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Google token error:", data);
    return null;
  }
  cached = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

// Returns the first row's values (header) or [] if the sheet is empty.
async function getFirstRow(sheetId, token) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/1:1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null; // treat as unknown
  const data = await res.json();
  return data.values?.[0] || [];
}

async function appendRow(sheetId, token, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [values] }),
    }
  );
  if (!res.ok) {
    console.error("Sheets append error:", res.status, await res.text());
    return { error: true };
  }
  return { ok: true };
}

// Appends a response row, writing the header row first if the sheet is empty.
export async function appendResponseRow(sheetId, header, row) {
  const token = await getAccessToken();
  if (!token || !sheetId) return { skipped: true };

  const existing = await getFirstRow(sheetId, token);
  if (Array.isArray(existing) && existing.length === 0) {
    await appendRow(sheetId, token, header);
  }
  return appendRow(sheetId, token, row);
}

// Removes every data row, keeping the header row (row 1). Best-effort.
export async function clearSheetData(sheetId) {
  const token = await getAccessToken();
  if (!token || !sheetId) return { skipped: true };

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) return { error: true };
  const meta = await metaRes.json();
  const gridId = meta.sheets?.[0]?.properties?.sheetId;
  const rowCount = meta.sheets?.[0]?.properties?.gridProperties?.rowCount;
  if (gridId === undefined) return { error: true };
  if (!rowCount || rowCount <= 1) return { skipped: true };

  const delRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gridId,
                dimension: "ROWS",
                startIndex: 1, // keep header (row index 0)
                endIndex: rowCount,
              },
            },
          },
        ],
      }),
    }
  );
  if (!delRes.ok) {
    console.error("Sheet clear error:", delRes.status, await delRes.text());
    return { error: true };
  }
  return { ok: true };
}

// Deletes the sheet row whose `columnLabel` cell equals `matchValue`.
export async function deleteRowByMatch(sheetId, columnLabel, matchValue) {
  const token = await getAccessToken();
  if (!token || !sheetId) return { skipped: true };

  // Need the first sheet's numeric gridId for the delete request.
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) return { error: true };
  const meta = await metaRes.json();
  const gridId = meta.sheets?.[0]?.properties?.sheetId;
  if (gridId === undefined) return { error: true };

  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!valRes.ok) return { error: true };
  const values = (await valRes.json()).values || [];
  if (values.length === 0) return { skipped: true };

  const colIdx = values[0].indexOf(columnLabel);
  if (colIdx === -1) return { skipped: true }; // sheet has no ID column

  let rowIdx = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i]?.[colIdx] ?? "") === String(matchValue)) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) return { skipped: true }; // no matching row

  const delRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gridId,
                dimension: "ROWS",
                startIndex: rowIdx,
                endIndex: rowIdx + 1,
              },
            },
          },
        ],
      }),
    }
  );
  if (!delRes.ok) {
    console.error("Sheet row delete error:", delRes.status, await delRes.text());
    return { error: true };
  }
  return { ok: true };
}
