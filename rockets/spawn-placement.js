// Detect both observed respawn countdowns and deaths skipped between snapshots.
// Ordinary motion and camera orbit must not trigger a camera reset.
export function needsSpawnPlacement(avatar,player){
 const active=player.alive!==false&&!(player.respawn>0);
 const deaths=Number.isFinite(player.deaths)?player.deaths:0;
 const place=!avatar.placed||active&&(avatar.wasRespawning===true||avatar.placedDeaths!==undefined&&deaths!==avatar.placedDeaths);
 avatar.wasRespawning=!active;
 if(active)avatar.placedDeaths=deaths;
 return place;
}
