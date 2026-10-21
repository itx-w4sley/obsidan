import React,{useEffect,useState} from 'react';
import {Download,LockKeyhole,RefreshCw,Save,Palette,ShieldCheck} from 'lucide-react';
import {STUDIO} from '../config/studio';

/**
 * Account security and shared branding have their own component so you can
 * edit the Settings screen without touching task/branding CRUD in main.jsx.
 */
export default function SettingsPanel({preferences,onSavePreferences,onChangeCode,onRefresh,onLock,busy}) {
  const [appearance,setAppearance]=useState(preferences);
  const [currentCode,setCurrentCode]=useState('');
  const [newCode,setNewCode]=useState('');
  const [repeatCode,setRepeatCode]=useState('');
  const [localError,setLocalError]=useState('');
  useEffect(()=>setAppearance(preferences),[preferences]);

  async function updateAppearance(e){
    e.preventDefault();setLocalError('');
    await onSavePreferences(appearance);
  }
  async function changeCode(e){
    e.preventDefault();setLocalError('');
    if(newCode!==repeatCode){setLocalError('The new access codes do not match.');return;}
    if(!/^\d{6,12}$/.test(newCode)){setLocalError('Your new code must be 6–12 digits.');return;}
    const ok=await onChangeCode({currentCode,newCode});
    if(ok){setCurrentCode('');setNewCode('');setRepeatCode('');}
  }
  return <div className="settingsgrid studio-settings">
    <article className="settingscard">
      <h2><Palette size={18}/> Customise studio</h2>
      <p>Change your workspace title, name, subtitle and accent colour. Settings are saved to MongoDB for every device.</p>
      <form className="studio-form" onSubmit={updateAppearance}>
        <label>Workspace name
          <input maxLength={48} minLength={2} required value={appearance.workspaceName||''} onChange={e=>setAppearance({...appearance,workspaceName:e.target.value})}/>
        </label>
        <label>Your display name
          <input maxLength={60} minLength={2} required value={appearance.userName||''} onChange={e=>setAppearance({...appearance,userName:e.target.value})}/>
        </label>
        <label>Workspace tagline
          <input maxLength={100} minLength={2} required value={appearance.tagline||''} onChange={e=>setAppearance({...appearance,tagline:e.target.value})}/>
        </label>
        <label>Accent colour
          <div className="studio-colour"><input type="color" aria-label="Choose accent colour" value={appearance.accent||'#BBA6FF'} onChange={e=>setAppearance({...appearance,accent:e.target.value})}/><input aria-label="Accent hex code" pattern="#[0-9a-fA-F]{6}" maxLength={7} value={appearance.accent||''} onChange={e=>setAppearance({...appearance,accent:e.target.value})}/></div>
        </label>
        <div className="studio-form-actions"><button className="primary" disabled={busy}><Save size={15}/>Save appearance</button><button type="button" className="secondary" onClick={()=>setAppearance(STUDIO.defaultPreferences)} disabled={busy}>Restore defaults</button></div>
      </form>
    </article>
    <article className="settingscard">
      <h2><ShieldCheck size={18}/> Change access code</h2>
      <p>Update your 6–12 digit code directly here — no editing server files or redeploying Vercel. Your existing code is required to confirm this change.</p>
      <form className="studio-form" onSubmit={changeCode}>
        <label>Current code<input type="password" inputMode="numeric" autoComplete="current-password" required minLength={6} maxLength={12} pattern="[0-9]{6,12}" value={currentCode} onChange={e=>setCurrentCode(e.target.value.replace(/\D/g,''))}/></label>
        <label>New code<input type="password" inputMode="numeric" autoComplete="new-password" required minLength={6} maxLength={12} pattern="[0-9]{6,12}" value={newCode} onChange={e=>setNewCode(e.target.value.replace(/\D/g,''))}/></label>
        <label>Confirm new code<input type="password" inputMode="numeric" autoComplete="new-password" required minLength={6} maxLength={12} pattern="[0-9]{6,12}" value={repeatCode} onChange={e=>setRepeatCode(e.target.value.replace(/\D/g,''))}/></label>
        {localError&&<div className="error" role="alert">{localError}</div>}
        <button className="primary" disabled={busy}><LockKeyhole size={15}/>Update access code</button>
      </form>
      <p className="hint">Changing your code locks other sessions. This device stays signed in. Changes are saved in the database.</p>
    </article>
    <article className="settingscard">
      <h2>Your workspace</h2>
      <dl><dt>Storage</dt><dd>MongoDB + GridFS images</dd><dt>Timezone</dt><dd>Australia/Perth</dd><dt>Session</dt><dd>12 hours · Code protected</dd><dt>Hosting</dt><dd>Local Node.js or Vercel</dd></dl>
      <button className="secondary" onClick={onRefresh}><RefreshCw size={14}/>Refresh connection</button>
    </article>
    <article className="settingscard">
      <h2>Export & backup</h2>
      <p>Download tasks, projects, notes and asset metadata as JSON. Images are stored separately in MongoDB GridFS.</p>
      <a className="primary" href="/api/export"><Download size={15}/>Export records</a>
      <p className="hint">A full image backup requires MongoDB Database Tools. See README.md.</p>
      <button className="secondary" onClick={onLock}><LockKeyhole size={14}/>Lock workspace</button>
    </article>
  </div>;
}
