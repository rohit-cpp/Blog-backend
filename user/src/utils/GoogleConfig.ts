import {google} from 'googleapis';
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_CLIENT_ID= process.env.Google_Client_id;
const GOOGLE_CLIENT_SECRET= process.env.Google_Client_secret;

export const oauthClient = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage"
);