import test from 'node:test';
import assert from 'node:assert/strict';
import {hashCode,verifyCode} from '../server/security.mjs';
import {safeUser,generateTeamCode,codeIsAssigned,newUniqueCode,provisionStarters,addMember} from '../server/team.mjs';

class InMemoryUsers{
  constructor(){this.rows=[]}
  async findOne({id}){return this.rows.find(x=>x.id===id)||null}
  find(){return {project:()=>({toArray:async()=>this.rows.map(x=>({...x}))})}}
  async insertOne(doc){if(this.rows.some(x=>x.id===doc.id)){let err=new Error('duplicate');err.code=11000;throw err;}this.rows.push(doc);return {acknowledged:true}}
}
test('starter accounts are automatically created once, each with a unique 10-digit code',async()=>{
  const users=new InMemoryUsers(),ownerCode=hashCode('123456789012');
  const issued=await provisionStarters(users,ownerCode);
  assert.equal(issued.length,2);
  assert.deepEqual(issued.map(x=>x.user.name),['Hunter Brady','Alex Atwell']);
  assert.equal(await provisionStarters(users,ownerCode).then(x=>x.length),0);
  for(const {user,code} of issued){
    assert.match(code,/^\d{10}$/);
    const saved=users.rows.find(x=>x.id===user.id);
    assert.equal(saved.code,undefined);
    assert.equal(safeUser(saved).codeHash,undefined);
    assert.equal(verifyCode(code,saved.codeHash),true);
    assert.equal(await codeIsAssigned(code,users,ownerCode),true);
  }
  assert.notEqual(issued[0].code,issued[1].code);
  assert.equal(await codeIsAssigned('123456789012',users,ownerCode,'hunter-brady'),true);
  assert.equal(await codeIsAssigned(issued[0].code,users,ownerCode,issued[0].user.id),false);
});
test('generators produce numeric codes and account creation never exposes stored hashes',async()=>{
  const users=new InMemoryUsers(),ownerHash=hashCode('987654321012');
  for(let i=0;i<10;i++)assert.match(generateTeamCode(),/^\d{10}$/);
  const newCode=await newUniqueCode(users,ownerHash);assert.match(newCode,/^\d{10}$/);
  const result=await addMember(users,{name:'New Member'},ownerHash);
  assert.match(result.code,/^\d{10}$/);
  assert.equal(result.user.codeHash,undefined);
  assert.equal(users.rows[0].code,undefined);
});
