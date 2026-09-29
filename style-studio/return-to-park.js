const root=new URL('../',import.meta.url);
const link=document.createElement('a');
link.className='return-to-park';link.textContent='Back to park';
let destination=root;
try {
 const saved=sessionStorage.getItem('67park.studio-return.'+root.pathname);
 if(saved){const url=new URL(saved,location.origin);if(url.origin===root.origin&&url.pathname===root.pathname)destination=url;}
}catch{}
link.href=destination.href;
document.querySelector('.topbar').append(link);
