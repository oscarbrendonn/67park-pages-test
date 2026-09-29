import {CHARACTER_CONTROL as profile} from '../app/character-control-profile.js';

// Human input is edge-triggered, like the park: one ground jump and one
// released/repressed air jump. Bot requests retain their obstacle planner.
export function stepLaneJump(actor,held,{bot=false,blocked=false}={}){
 const pressed=held&&!actor.jumpHeld;
 actor.jumpHeld=held;
 if(actor.grounded)actor.airJumps=1;
 if(blocked||!(bot?held:pressed))return false;
 if(!actor.grounded&&(bot||(actor.airJumps??1)<=0))return false;
 const ground=actor.grounded;
 if(!ground)actor.airJumps=(actor.airJumps??1)-1;
 actor.vy=ground?profile.jump:profile.doubleJump;
 actor.grounded=false;
 return true;
}
