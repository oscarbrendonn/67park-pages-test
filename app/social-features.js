import {QUICK_MESSAGES, DEFAULT_INVITE_PREFERENCES} from './social-rules.js';
import {createRecoveryCode,restoreRecoveryCode} from './preview-network.js?v=online-next-1';
import {createPartyFundamentals} from './party-fundamentals.js';
import {createPlayerReport} from './player-report.js?v=player-report-20261002-1';

// Both island bundles use these components; keep one source for social UI.
export function createSocialFeatures(React, jsx, client) {
  const h = (type, props, ...children) => React.createElement(type, props, ...children);
  const act = (type, data) => client.act(type, data);
  const {ConfirmAction,RemoveMember,PartyRequests,QueueTools}=createPartyFundamentals(React,client);
  const {ReportPlayer}=createPlayerReport(React,client);
  function PersonActions({state,person}){
    const blocked=state.playerSafety?.blocked.some(p=>p.id===person.id),muted=state.playerSafety?.muted.some(p=>p.id===person.id);
    return h('span',{className:'social-person-tools'},
      h('button',{'aria-label':`${muted?'Unmute':'Mute'} ${person.name}`,disabled:!state.connected,onClick:()=>act('safety.set',{target:person.id,kind:'muted',value:!muted})},muted?'Unmute':'Mute'),
      h('button',{'aria-label':`${blocked?'Unblock':'Block'} ${person.name}`,disabled:!state.connected,onClick:()=>act('safety.set',{target:person.id,kind:'blocked',value:!blocked})},blocked?'Unblock':'Block'),h(ReportPlayer,{person,state}));
  }
  function Account({state,expanded=false}){
    const [code,setCode]=React.useState(''),[entered,setEntered]=React.useState(''),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[confirmed,setConfirmed]=React.useState(false);
    const saving=React.useRef(false);
    const save=async()=>{if(saving.current)throw Error('A code change is already finishing.');if(!client.getSnapshot().connected)throw Error('Reconnect before changing your recovery code.');saving.current=true;setBusy(true);setMessage('');try{setCode((await createRecoveryCode()).code);setMessage('Save this secret somewhere safe. It is shown only now.');}catch(e){setMessage(e.message);throw e;}finally{saving.current=false;setBusy(false);}};
    const restore=async event=>{event.preventDefault();setBusy(true);setMessage('');try{await restoreRecoveryCode(entered);location.assign('/67park-pages-test/play/');}catch(e){setMessage(e.message);setBusy(false);}};
    return h('details',{className:'social-account',open:expanded||undefined},h('summary',null,'Account · keep your friends'),
      h('p',null,state.account?.recoverable?'Recovery is enabled. Your friends and privacy follow this identity.':'Protect your guest identity before changing devices or clearing site data.'),
      h('p',null,'This secret restores your identity on another device. It is NOT your public friend code. Anyone with it can access your account. There is no email reset if you lose it.'),
      state.account?.recoverable?h(ConfirmAction,{label:'Replace recovery code',title:'Replace your recovery code?',description:'Your previous recovery code will stop working immediately. Keep the new secret somewhere private. Cancel keeps your current code unchanged.',confirmLabel:'Replace code now',disabled:busy||!state.connected,onConfirm:save}):h('button',{disabled:busy||!state.connected,onClick:()=>save().catch(()=>{})},'Create recovery code'),
      state.account?.recoverable&&h('small',null,'Replacing the code invalidates the previous one.'),
      code&&h('div',{className:'social-recovery-secret'},h('label',null,'Your secret recovery code',h('textarea',{readOnly:true,value:code,'aria-label':'Your secret recovery code',autoComplete:'off',spellCheck:false})),h('button',{onClick:async()=>{try{await navigator.clipboard.writeText(code);setMessage('Copied. Store it privately, not in game chat.');}catch{setMessage('Select the recovery code above and copy it manually.');}}},'Copy recovery code'),h('button',{onClick:()=>setCode('')},'I saved it · hide')),
      h('form',{onSubmit:restore},h('h3',null,'Restore on this device'),h('label',null,'Secret recovery code',h('input',{type:'password',value:entered,onChange:e=>setEntered(e.target.value),'aria-label':'Secret recovery code',autoComplete:'off',autoCapitalize:'none',spellCheck:false,maxLength:100})),
        h('label',{className:'social-checkbox'},h('input',{type:'checkbox',checked:confirmed,onChange:e=>setConfirmed(e.target.checked)}),'Switch identity on this device and sign the other device out. Current guest friends are not merged.'),
        h('button',{disabled:busy||!state.connected||!confirmed||!entered.trim()||!!state.room},'Restore account'),state.room&&h('p',null,'Leave your room before restoring.')),
      message&&h('p',{role:'status'},message));
  }
  function PartyControls({state}){
    const room=state.room;if(!room||room.status!=='waiting')return null;
    const ready=room.lobbyReady||[],host=room.host===state.me?.id;
    return h('section',{className:'social-party','aria-label':'Party readiness'},h('h2',null,'Your party'),
      h('p',null,'Stay together when the leader changes games. Everyone chooses Ready for the selected game.'),
      h('ul',{className:'social-people'},...room.members.map(p=>h('li',{key:p.id},h('span',null,p.name+(p.id===room.host?' · Leader':'')+' · '+(!p.connected?'Reconnecting':ready.includes(p.id)?'Ready':'Not ready')),
        host&&p.id!==state.me.id&&h('button',{'aria-label':`Make ${p.name} leader`,disabled:!p.connected||!state.connected,onClick:()=>act('room.transfer-host',{target:p.id})},'Make leader'),h(RemoveMember,{state,person:p})))),
      h('button',{className:'online-primary',disabled:!state.connected,onClick:()=>act('room.ready',{value:!ready.includes(state.me.id)})},ready.includes(state.me.id)?'Not ready':'Ready'),
      h('p',{role:'status'},`${ready.length}/${room.members.length} ready · ${room.members.length}/${room.capacity} seats`));
  }
  function RoundAgain({state}) {
    const room = state.room, voted = room?.again?.includes(state.me?.id);
    if (room?.status !== 'results') return null;
    return h('section', {className: 'social-round', 'aria-label': 'Play again together'},
      h('h2', null, 'Another round together?'),
      h('p', {role: 'status'}, `${room.again?.length || 0}/${room.capacity} players want to play again. Everyone must agree.`),
      h('button', {className: 'online-primary', disabled: !state.connected || voted,
        onClick: () => act('room.play-again', {})}, voted ? 'Waiting for your team…' : 'Play again together'),
      voted && h('button', {onClick: () => act('room.play-again', {value: false})}, 'Cancel ready'),
      room.members.length < room.capacity && h('p', null, 'Someone left. The host can set up a new round below.'));
  }
  function SocialLobby({state, team}) {
    const room = state.room;
    const friends = (state.friends || []).filter(p => p.connected && !room?.members.some(m => m.id === p.id) && !['playing','loading','countdown','queued'].includes(p.roomStatus)).slice(0, 6);
    const available = state.connected && (!room || room.status === 'waiting' && room.members.length < room.capacity);
    return h('section', {className: 'social-lobby online-card', 'aria-label': 'Quick team actions'},
      h(RoundAgain, {state}),
      h(PartyControls,{state}),
      h(PartyRequests,{state}),h(QueueTools,{state}),
      h('h2', null, 'Quick invite'),
      h('p', {className: 'online-caption'}, room ? 'Bring an online friend into this room.' : 'Meet a friend on your island.'),
      h('div', {className: 'social-quick-invites'}, ...friends.map(p => h('button', {key:p.id, disabled:!available,
        'aria-label': `Quick invite ${p.name}`, onClick: () => act('invite.send', {target:p.id,kind:room?'match':'island',team:room?.teamMode==='teams'?team:undefined})}, p.name))),
      !friends.length && h('p', {className: 'online-caption'}, 'No available friends online. Add someone in Friends or share your invite link.'),
      ...(state.sentInvites || []).map(i => h('div', {key:i.id, className: 'social-pending'},
        h('span', null, `${i.to} · Invitation pending`), h('button', {'aria-label':`Cancel invitation to ${i.to}`,onClick:()=>act('invite.cancel',{id:i.id})}, 'Cancel'))),
      !!state.inviteActivity?.length&&h('details',{key:'invite-history',open:true,className:'social-invite-history'},h('summary',null,'Invitation activity'),h('ul',{className:'social-people','aria-label':'Invitation activity'},...state.inviteActivity.slice(-6).reverse().map(i=>h('li',{key:i.id},`${i.name} · ${i.direction==='sent'?'Sent':'Received'} · ${i.status}`)))),
      room && h('section', {className:'social-team-messages', 'aria-label':'Team quick messages'},
        h('h3', null, 'Team messages'),
        h('div', {className:'social-phrases'}, ...Object.entries(QUICK_MESSAGES).map(([key,text]) => h('button', {key,disabled:!state.connected,onClick:()=>act('room.quick-message',{key})},text))),
        h('ol', {className:'social-message-log', 'aria-live':'polite','aria-relevant':'additions', 'aria-label':'Team message history'},
          ...(room.quickMessages || []).slice(-4).map(m => h('li', {key:m.id}, h('b', null,m.name+': '),m.text))),
        h('small', null, 'Only people in this room can see these messages.')));
  }
  function SocialSettings({state,view='all'}) {
    const prefs = state.preferences || DEFAULT_INVITE_PREFERENCES;
    const save = patch => act('social.preferences', {...prefs,...patch});
    return h(React.Fragment,null,(view==='all'||view==='account')&&h('details', {className:'social-privacy'},
      h('summary', null, 'Invitation privacy'),
      h('label', null, 'Who can invite me?', h('select', {'aria-label':'Who can invite me?', value:prefs.invites,disabled:!state.connected,onChange:e=>save({invites:e.target.value})},
        h('option',{value:'everyone'},'Everyone'),h('option',{value:'friends'},'Friends only'),h('option',{value:'none'},'No one · Do not disturb'))),
      h('label', {className:'social-checkbox'}, h('input',{type:'checkbox',checked:prefs.whileInRoom,disabled:!state.connected,onChange:e=>save({whileInRoom:e.target.checked})}), 'Allow invitations while I am in a room'),
      h('p', {className:'online-caption'}, 'Saved with your identity. These choices also apply to party join requests. Turning invitations off clears pending invites and join requests. Blocked players cannot contact you.')),
      (view==='all'||view==='requests')&&h('details',{className:'social-sent-requests',open:view==='requests'||undefined},h('summary',null,`Sent friend requests (${state.outgoingRequests?.length||0})`),
        !state.outgoingRequests?.length&&h('p',null,'No pending requests.'),
        h('ul',{className:'social-people'},...(state.outgoingRequests||[]).map(q=>h('li',{key:q.id},h('span',null,(q.toPlayer?.name||'Player')+' · Pending'),h('button',{disabled:!state.connected,'aria-label':`Cancel friend request to ${q.toPlayer?.name||'Player'}`,onClick:()=>act('friend.cancel',{id:q.id})},'Cancel request'))))),
      (view==='all'||view==='friends')&&h('details',{className:'social-recent'},h('summary',null,`Recently played (${state.recentPlayers?.length||0})`),h('p',null,'Your last 30 teammates and opponents, kept for 30 days.'),
        h('ul',{className:'social-people'},...(state.recentPlayers||[]).map(p=>{const friend=state.friendIds?.includes(p.id),sent=state.outgoingRequests?.find(q=>q.to===p.id);return h('li',{key:p.id},h('span',null,p.name),h('button',{disabled:!state.connected||friend||!!sent,onClick:()=>act('friend.request',{target:p.id})},friend?'Friends':sent?'Request pending':'Add friend'),h(PersonActions,{state,person:p}));}))),
      (view==='all'||view==='friends')&&h('details',{className:'social-safety'},h('summary',null,'Players · mute & block'),h('p',null,'Mute hides messages. Block also stops invitations and friend requests.'),
        h('ul',{className:'social-people'},...[...new Map([...(state.friends||[]),...(state.room?.members||[]),...(state.island?.players||[]),...(state.playerSafety?.blocked||[]),...(state.playerSafety?.muted||[])].filter(p=>p.id!==state.me?.id).map(p=>[p.id,p])).values()].map(p=>h('li',{key:p.id},h('span',null,p.name),h(PersonActions,{state,person:p}))))),
      (view==='all'||view==='account')&&h(Account,{state,expanded:view==='account'}));
  }
  return {SocialLobby, SocialSettings};
}
