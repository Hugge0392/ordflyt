/**
 * Production environment check and debugging utilities
 */

export function checkProductionEnvironment() {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: !!process.env.DATABASE_URL,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    PASSWORD_PEPPER: !!process.env.PASSWORD_PEPPER,
    REPL_ID: process.env.REPL_ID,
    REPL_SLUG: process.env.REPL_SLUG,
  };

  console.log('=== PRODUCTION ENVIRONMENT CHECK ===');
  console.log('Environment variables:', env);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Running in PRODUCTION mode');
    console.log('Expected domain: ordflyt.se');
    
    if (!process.env.SESSION_SECRET) {
      console.warn('⚠️  SESSION_SECRET not set in production!');
    }
    
    if (!process.env.PASSWORD_PEPPER) {
      console.warn('⚠️  PASSWORD_PEPPER not set in production!');
    }
  } else {
    console.log('Running in DEVELOPMENT mode');
  }
  
  console.log('===================================');
}

export function logRequestInfo(req: any) {
  if (process.env.NODE_ENV === 'production') {
    console.log('Request debug info:', {
      host: req.get('host'),
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent')?.substring(0, 50) + '...',
      ip: req.ip,
      protocol: req.protocol,
      secure: req.secure,
      cookies: Object.keys(req.cookies || {}),
    });
  }
}