import {randomInt,randomUUID} from 'node:crypto';
import {hashCode,verifyCode} from './security.mjs';

// Starter accounts are provisioned into MongoDB after the owner signs in.
// Code secrets are returned to the owner once and NEVER persisted as plaintext.
export const STARTER_TEAM=Object.freeze([
  {id:'hunter-brady',name:'Hunter Brady',role:'member'},
  {id:'alex-atwell',name:'Alex Atwell',role:'member'}
]);
export const safeUser=user=>({id:user.id,name:user.name,role:user.role,active:user.active!==false,createdAt:user.createdAt||null});
export const generateTeamCode=()=>String(randomInt(0,10_000_000_000)).padStart(10,'0');

export async function codeIsAssigned(code,users,ownerHash,exceptId=''){
  if(exceptId!=='owner'&&verifyCode(code,ownerHash))return true;
  const existing=await users.find({}).project({id:1,codeHash:1}).toArray();
  return existing.some(user=>user.id!==exceptId&&verifyCode(code,user.codeHash));
}
export async function newUniqueCode(users,ownerHash,exceptId=''){
  const existing=await users.find({}).project({id:1,codeHash:1}).toArray();
  for(let i=0;i<30;i++){
    const code=generateTeamCode();
    if(!verifyCode(code,ownerHash)&&!existing.some(user=>verifyCode(code,user.codeHash)))return code;
  }
  throw Error('Unable to generate a unique access code. Try again.');
}
export async function addMember(users,{id=randomUUID(),name,role='member'},ownerHash){
  const code=await newUniqueCode(users,ownerHash);
  const member={id,name,role,active:true,codeHash:hashCode(code),version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await users.insertOne(member);
  return {user:safeUser(member),code};
}
export async function provisionStarters(users,ownerHash){
  const issued=[];
  for(const member of STARTER_TEAM){
    if(await users.findOne({id:member.id}))continue;
    try{issued.push(await addMember(users,member,ownerHash));}
    catch(e){if(e.code!==11000)throw e;} // Another admin request already created this account.
  }
  return issued;
}
