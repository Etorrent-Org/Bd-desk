import {createLicense} from '../src/license.js';
const secret=process.env.BD_DESK_LICENSE_SECRET; if(!secret){console.error('BD_DESK_LICENSE_SECRET requis');process.exit(1)}
const sub=process.argv[2]||'customer'; const expiresAt=process.argv[3]||null; console.log(createLicense({sub,expiresAt},secret));
