import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const original = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), 'eventops-test-'));
process.chdir(temp);
process.env.DATABASE_URL = '';
process.env.REDIS_URL = '';
process.env.ADMIN_SECRET_KEY = '';
const { apiRouter } = await import('./server/routes.ts');
const app = express(); app.use(express.json()); app.use('/api',apiRouter);
const server = app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
try {
 for(const [url,method,body] of [['/admins','POST',{phone:'09120000000'}],['/events/x','DELETE',{}],['/vendors/x/status','PATCH',{status:'approved'}],['/vendors','POST',{}]] as const) {
 const response = await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.ok([401,403].includes(response.status),url);
 }
 const otp = await (await fetch(base+'/auth/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:'09121111111'})})).json() as any;
 const login = await (await fetch(base+'/auth/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:'09121111111',code:otp.devCode,role:'admin'})})).json() as any;
 assert.equal(login.user.role,'vendor');
 const upload = await fetch(base+'/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl:'data:text/html;base64,PHNjcmlwdD4=',mimeType:'text/html'})});
 assert.equal(upload.status,400);
 console.log('Security regression checks passed');
} finally { server.close(); process.chdir(original); rmSync(temp,{recursive:true,force:true}); }
