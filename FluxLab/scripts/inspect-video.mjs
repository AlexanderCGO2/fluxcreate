const response=await fetch('https://ai-gateway.vercel.sh/v1/models');
const body=await response.json();console.log(JSON.stringify(body.data.filter(m=>m.type==='video'),null,2));
