export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
 const headers = new Headers(init.headers); const token = localStorage.getItem('event_ops_token');
 if(token) headers.set('Authorization', 'Bearer '+token);
 return globalThis.fetch(input,{...init,headers});
}