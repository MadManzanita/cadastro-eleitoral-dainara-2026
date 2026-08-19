const KEY="cadastro-eleitoral-demo-v1";
const empty=()=>({leaders:[],activists:[],admins:[],activity:[]});
export function getDemoData(){if(typeof window==="undefined")return empty();try{return JSON.parse(localStorage.getItem(KEY))||empty()}catch{return empty()}}
export function saveDemoData(data){if(typeof window!=="undefined")localStorage.setItem(KEY,JSON.stringify(data))}
export function clearDemoData(){if(typeof window!=="undefined")localStorage.removeItem(KEY)}
export function seedDemoData(){const data=empty();saveDemoData(data);return data}
