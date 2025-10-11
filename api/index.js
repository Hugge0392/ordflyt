// Vercel serverless function entry point
import { getApp } from '../dist/app.js';

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
