'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, LocateFixed, MapPin } from 'lucide-react';
import { Project, Alert } from '@/lib/domain';
const project=(lat:number,lng:number,z:number)=>{const size=256*2**z,s=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);return {x:(lng+180)/360*size,y:(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*size};};
const unproject=(x:number,y:number,z:number)=>{const size=256*2**z;return {lat:Math.atan(Math.sinh(Math.PI*(1-2*y/size)))*180/Math.PI,lng:x/size*360-180};};
export default function ProjectMap({projects,alerts,onSelect,large=false}:{projects:Project[];alerts:Alert[];onSelect:(p:Project)=>void;large?:boolean}){
 const element=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;cx:number;cy:number}|null>(null);
 const [size,setSize]=useState({w:700,h:420}),[center,setCenter]=useState({lat:28.55,lng:77.31}),[zoom,setZoom]=useState(10),[failed,setFailed]=useState(false);
 const points=projects.filter(p=>p.lat!==null&&p.lng!==null);const signature=points.map(p=>p.id).join(',');
 function fit(){if(!points.length)return;const minlat=Math.min(...points.map(p=>p.lat!)),maxlat=Math.max(...points.map(p=>p.lat!)),minlng=Math.min(...points.map(p=>p.lng!)),maxlng=Math.max(...points.map(p=>p.lng!));setCenter({lat:(minlat+maxlat)/2,lng:(minlng+maxlng)/2});let z=14;while(z>2){const a=project(minlat,minlng,z),b=project(maxlat,maxlng,z);if(Math.abs(a.x-b.x)<size.w-100&&Math.abs(a.y-b.y)<size.h-100)break;z--;}setZoom(z);}
 useEffect(()=>{if(!element.current)return;const ro=new ResizeObserver(([e])=>setSize({w:e.contentRect.width,h:e.contentRect.height}));ro.observe(element.current);return()=>ro.disconnect();},[]);
 useEffect(()=>{fit();},[signature,size.w,size.h]);
 const c=project(center.lat,center.lng,zoom),left=c.x-size.w/2,top=c.y-size.h/2,tiles=[];
 for(let x=Math.floor(left/256);x<=Math.floor((left+size.w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+size.h)/256);y++){if(y<0||y>=2**zoom)continue;const xx=((x%2**zoom)+2**zoom)%2**zoom;tiles.push(<img draggable={false} alt="" key={`${zoom}-${x}-${y}`} src={`https://tile.openstreetmap.org/${zoom}/${xx}/${y}.png`} referrerPolicy="strict-origin-when-cross-origin" onError={()=>setFailed(true)} style={{position:'absolute',left:x*256-left,top:y*256-top,width:256,height:256,maxWidth:'none'}}/>);}
 return <div className={`map-surface ${large?'large-map':''}`} ref={element} tabIndex={0} role="region" aria-label="Interactive project map. Use arrow keys to pan, plus and minus to zoom."
 onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setCenter(unproject(c.x+(e.key==='ArrowRight'?100:e.key==='ArrowLeft'?-100:0),c.y+(e.key==='ArrowDown'?100:e.key==='ArrowUp'?-100:0),zoom));}if(e.key==='+')setZoom(z=>Math.min(18,z+1));if(e.key==='-')setZoom(z=>Math.max(2,z-1));}}
 onPointerDown={e=>{if((e.target as HTMLElement).closest('button,a'))return;drag.current={x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};e.currentTarget.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{if(!drag.current)return;const d=drag.current;setCenter(unproject(d.cx-(e.clientX-d.x),Math.max(0,Math.min(256*2**zoom,d.cy-(e.clientY-d.y))),zoom));}}
 onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 <div className="map-tiles">{tiles}</div>
 {points.map((p,i)=>{const xy=project(p.lat!,p.lng!,zoom),x=xy.x-left,y=xy.y-top;if(x< -30||x>size.w+30||y< -30||y>size.h+30)return null;const high=alerts.some(a=>a.projectId===p.id&&a.severity==='High');return <button key={p.id} className={`map-marker ${high?'danger':p.status==='Completed'?'complete':''}`} style={{left:x,top:y}} onClick={()=>onSelect(p)} title={`${p.title} · ${p.status}`} aria-label={`Open ${p.title}`}><MapPin size={17}/><span>{i+1}</span></button>;})}
 <div className="map-context"><span className="map-key"/> {points.length} mapped projects</div>
 <div className="map-controls"><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(18,z+1))}><Plus size={19}/></button><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(2,z-1))}><Minus size={19}/></button><button aria-label="Fit all projects" onClick={fit}><LocateFixed size={19}/></button></div>
 <div className="map-legend"><span><i className="legend-dot green"/>Ongoing / planned</span><span><i className="legend-dot blue"/>Completed</span><span><i className="legend-dot red"/>High-priority alert</span></div>
 {(!points.length||failed)&&<div className="map-notice">{!points.length?'No coordinates in this selection. Projects remain available in the list.':'Basemap tiles could not load. Project markers remain available; check your connection.'}</div>}
 <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
 </div>;
}
