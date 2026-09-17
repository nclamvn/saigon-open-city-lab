/* Lightweight runtime diagnostics for city-demo QA. */
window.cityRuntimeErrors=[];
const runtime20=document.createElement('output');runtime20.id='runtime20Status';runtime20.hidden=true;document.body.append(runtime20);
const record20=error=>{window.cityRuntimeErrors.push(error);runtime20.dataset.json=JSON.stringify(window.cityRuntimeErrors);};
window.addEventListener('error',event=>record20({message:event.message,file:event.filename?.split('/').pop(),line:event.lineno,column:event.colno}));
window.addEventListener('unhandledrejection',event=>record20({message:String(event.reason?.message||event.reason||'Unhandled promise rejection'),file:'promise'}));
