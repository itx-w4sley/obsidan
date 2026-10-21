import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export function hashCode(code){if(!/^\d{6,12}$/.test(code))throw Error('Use a code containing 6–12 digits.');const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(code,salt,64).toString('hex')}`;}
export function verifyCode(code,stored){if(typeof code!=='string'||!/^\d{6,12}$/.test(code))return false;const [salt,key]=String(stored).split(':');if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(key))return false;return timingSafeEqual(scryptSync(code,salt,64),Buffer.from(key,'hex'));}
