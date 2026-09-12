'use client';
import { ArrowRight, MapPin, ShieldCheck, Landmark } from 'lucide-react';
export default function CivicBanner({onMap,source=false}:{onMap:()=>void;source?:boolean}){
 function explore(){const section=document.getElementById('project-explorer');section?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});window.setTimeout(()=>section?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true}),350);}
 return <section className="civic-banner" aria-labelledby="civic-banner-title">
  <img className="civic-artwork" src="/images/public-works-montage.png" alt="" aria-hidden="true" width="2172" height="724" fetchPriority="high"/>
  <div className="civic-overlay"/>
  <div className="civic-copy">
   <div className="civic-eyebrow"><Landmark size={17}/><span lang="hi">जन विकास निगरानी</span><i/>MPLADS INTELLIGENCE</div>
   <h2 id="civic-banner-title"><span lang="hi">हर निर्माण पर नज़र।</span>Every public work, in view.</h2>
   <p lang="hi">स्वीकृत बजट से कार्य प्रगति तक - पारदर्शी निगरानी, एक ही स्थान पर।</p>
   <div className="civic-actions"><button className="button civic-primary" onClick={explore}><MapPin size={18}/><span>Find projects <small lang="hi">परियोजनाएँ खोजें</small></span><ArrowRight size={17}/></button><button className="button civic-secondary" onClick={onMap}><ShieldCheck size={18}/><span>{source?'Explore state coverage':'Explore risk map'} <small lang="hi">निगरानी मानचित्र</small></span><ArrowRight size={17}/></button></div>
  </div>
  <div className="civic-caption">Illustrative artwork · SIH prototype</div>
 </section>;
}
