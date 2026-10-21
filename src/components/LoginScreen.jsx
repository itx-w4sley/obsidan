import React from 'react';
import {ArrowRight,Layers,LockKeyhole} from 'lucide-react';
import {STUDIO,getAccentStyle} from '../config/studio';

/** Public lock page. Only public branding is loaded here; no private data is fetched. */
export default function LoginScreen({preferences,code,onCodeChange,onSubmit,error,busy}) {
  return <div className="lockscreen" style={getAccentStyle(preferences)}>
    <div className="lockbrand"><Layers/> {preferences.workspaceName.toUpperCase()} | <span>{STUDIO.product.toUpperCase()}</span></div>
    <div className="orb"/>
    <section className="login">
      <div className="lockicon"><LockKeyhole size={25}/></div>
      <div className="eyebrow">{preferences.tagline.toUpperCase()}</div>
      <h1>{STUDIO.loginTitle}<br/><span>{STUDIO.loginHighlight}</span></h1>
      <p>{STUDIO.loginDescription}<br/>{STUDIO.loginSubdescription}</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="pin">Access code</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password"
          minLength={6} maxLength={12} pattern="[0-9]{6,12}" required
          value={code} onChange={e=>onCodeChange(e.target.value.replace(/\D/g,''))}
          placeholder="Enter your access code"/>
        <button className="primary" disabled={busy}>
          {busy?'Opening…':'Open workspace'}<ArrowRight size={17}/>
        </button>
      </form>
      {error&&<div role="alert" className="error">{error}</div>}
      <div className="loginfoot"><LockKeyhole size={12}/>{STUDIO.secureCaption}</div>
    </section>
    <footer>{preferences.workspaceName.toUpperCase()}<span>{STUDIO.product.toUpperCase()} / 03</span></footer>
  </div>;
}
