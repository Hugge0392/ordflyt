/**
 * Production environment check and debugging utilities
 */

export function checkProductionEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
  
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    DATABASE_URL: !!process.env.DATABASE_URL,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    PASSWORD_PEPPER: !!process.env.PASSWORD_PEPPER,
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    REPL_ID: process.env.REPL_ID,
    REPL_SLUG: process.env.REPL_SLUG,
  };

  console.log('=== PRODUCTION ENVIRONMENT CHECK ===');
  console.log('Environment variables:', env);
  console.log('Is Production:', isProduction);
  
  if (isProduction) {
    console.log('🚀 Running in PRODUCTION mode');
    console.log('🌐 Expected domain: ordflyt.se');
    
    let hasAllRequiredSecrets = true;
    
    if (!process.env.SESSION_SECRET) {
      console.error('❌ CRITICAL: SESSION_SECRET not set in production!');
      hasAllRequiredSecrets = false;
    }
    
    if (!process.env.PASSWORD_PEPPER) {
      console.error('❌ CRITICAL: PASSWORD_PEPPER not set in production!');
      hasAllRequiredSecrets = false;
    }
    
    if (!process.env.ADMIN_PASSWORD) {
      console.error('❌ CRITICAL: ADMIN_PASSWORD not set in production!');
      console.error('   Admin login will NOT work until this is set!');
      console.error('');
      console.error('   📝 TO FIX IN VERCEL:');
      console.error('   1. Go to Vercel Dashboard → Your Project');
      console.error('   2. Settings → Environment Variables');
      console.error('   3. Add: ADMIN_PASSWORD = <your-secure-password>');
      console.error('   4. Check "Production" checkbox');
      console.error('   5. Redeploy: Deployments → ... → Redeploy');
      console.error('   6. Login with username: admin, password: <your-secure-password>');
      console.error('');
      hasAllRequiredSecrets = false;
    }
    
    if (hasAllRequiredSecrets) {
      console.log('✅ Production environment configured properly');
    } else {
      console.error('⚠️  WARNING: Production environment is MISSING required secrets!');
      console.error('   See ADMIN_LOGIN_FIX.md for detailed instructions');
    }
  } else {
    console.log('🛠️  Running in DEVELOPMENT mode');
  }
  
  console.log('===================================');
}

export function logRequestInfo(req: any) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isProduction) {
    console.log('🔍 Request debug info:', {
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