// Vercel serverless function entry point
import { getApp } from '../dist/app.js';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await getApp();
  }

  // Express apps are middleware, need to be called with req, res, and next
  app.handle(req, res);
}
