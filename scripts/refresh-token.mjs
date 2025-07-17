import express from "express";
import {google} from "googleapis";
import open from "open";

const app = express();
const port = 3000;

const client_id = "";
const client_secret = "";
const redirect_uri = `http://localhost:${port}`;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

const SCOPES = ["https://www.googleapis.com/auth/chromewebstore"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

app.get("/", async (req, res) => {
  const {code} = req.query;
  const {tokens} = await oauth2Client.getToken(code);
  res.send("Autenticazione completata. Puoi chiudere la finestra.");
  console.log("\n✅ Refresh token:", tokens.refresh_token);
  process.exit(0);
});

app.listen(port, () => {
  console.log("Apri il browser per autorizzare: ", authUrl);
  open(authUrl);
});
