export function cleanDigits(v=""){return v.replace(/\D/g,"")}
export function isValidCPF(v=""){const c=cleanDigits(v);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);let d=(s*10)%11;if(d===10)d=0;if(d!==+c[9])return false;s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);d=(s*10)%11;if(d===10)d=0;return d===+c[10]}
export function isPlausibleTitle(v=""){const t=cleanDigits(v);return t.length===12&&!/^(\d)\1{11}$/.test(t)}
