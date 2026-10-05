import {ensurePreviewGuest,parkSocket} from '../app/preview-network.js?v=mac-recovery-1';
import {sendBoundedOnlineMessage,installOnlinePageLifecycle} from '../app/online-resilience.js';
import {installSocialResults} from '../app/social-results.js';

// The existing park identity and server remain authoritative. No new account,
// position packets, scores, or room ownership are invented by this arena.
export function createTumbleClient(){
  const listeners=new Set(),frames=new Set();let retry=null,ping=null,pending=null,epoch=0;
  const client={data:{connected:false,me:null,room:null,error:'',notice:''},ws:null,seq:0,offset:0,stopped:false,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},onFrame(fn){frames.add(fn);return()=>frames.delete(fn)},
    getSnapshot(){return this.data},
    send(message){if(this.data.room?.spectating&&['input','match.ready'].includes(message.t))return false;return sendBoundedOnlineMessage(this.ws,message)},
    act(t,payload={}){return this.send({t,...payload})},
    async connect(){
      if(this.stopped||this.ws?.readyState===1||pending)return pending;
      const mine=++epoch;
      pending=(async()=>{try{
        await ensurePreviewGuest();if(this.stopped||mine!==epoch)return;
        const ws=parkSocket('online');this.ws=ws;
        ws.addEventListener('open',()=>{if(mine!==epoch)return;this.seq=0;this.send({t:'hello'});ping=setInterval(()=>this.send({t:'ping',at:Date.now()}),5000)});
        ws.addEventListener('message',event=>{
          if(mine!==epoch)return;let m;try{m=JSON.parse(event.data)}catch{return}
          if(m.t==='state'){const sameRound=this.data.room?.code===m.room?.code&&this.data.room?.round===m.room?.round;this.data={...this.data,...m,connected:true,error:'',notice:sameRound?this.data.notice:''};if(Number.isFinite(m.now))this.offset=m.now-Date.now();notify()}
          else if(m.t==='match.snapshot'){for(const fn of frames)fn(m)}
          else if(m.t==='pong'){const rtt=Math.max(0,Date.now()-m.at);this.data.ping=rtt;this.offset=m.now-(m.at+Date.now())/2;notify()}
          else if(m.t==='notice'){this.data={...this.data,notice:String(m.message||'')};notify()}
          else if(m.t==='error'){this.data={...this.data,error:String(m.message||'The server could not complete that action.')};notify()}
        });
        const disconnected=()=>{if(mine!==epoch)return;clearInterval(ping);this.data={...this.data,connected:false};notify();if(!this.stopped){clearTimeout(retry);retry=setTimeout(()=>this.connect(),2500)}};
        ws.addEventListener('close',disconnected);ws.addEventListener('error',()=>{if(ws.readyState!==1)disconnected()});
      }catch(error){this.data={...this.data,connected:false,error:error.message};notify();if(!this.stopped){clearTimeout(retry);retry=setTimeout(()=>this.connect(),5000)}}
      finally{pending=null}})();return pending;
    },
    close(){this.stopped=true;epoch++;clearTimeout(retry);clearInterval(ping);this.ws?.close();this.ws=null;this.data.connected=false;notify()},
  };
  const notify=()=>{for(const fn of listeners)fn()};
  // Shared reconnect UI observes this established park client slot. Without it,
  // a healthy standalone match is incorrectly marked disconnected after8s.
  window.__candyOnline=client;
  const disposeResults=installSocialResults(client);
  const disposeLifecycle=installOnlinePageLifecycle(client);
  client.dispose=()=>{disposeResults();disposeLifecycle();client.close();listeners.clear();frames.clear();if(window.__candyOnline===client)delete window.__candyOnline};
  return client;
}
