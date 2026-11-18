import {firebaseConfig,firebaseReady} from './firebase-config.js';
import {cairoDay,sections,visitsPath} from './menu-stats-shared.js?v=1';

const publicHost=['misrsweetsmenu.com','www.misrsweetsmenu.com'].includes(location.hostname);
if(firebaseReady&&publicHost&&navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'){
  if(document.visibilityState==='visible')void recordVisit().catch(()=>{});
  else document.addEventListener('visibilitychange',startWhenVisible);
}

function startWhenVisible(){
  if(document.visibilityState!=='visible')return;
  document.removeEventListener('visibilitychange',startWhenVisible);
  void recordVisit().catch(()=>{});
}

async function recordVisit(){
  const [app,authSdk,fs]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
  ]);
  const instance=app.initializeApp(firebaseConfig,'public-menu-stats');
  const auth=authSdk.initializeAuth(instance,{persistence:authSdk.browserLocalPersistence});
  await auth.authStateReady();
  const visitor=auth.currentUser ?? (await authSdk.signInAnonymously(auth)).user;
  if(!visitor.isAnonymous)return;
  const db=fs.getFirestore(instance);
  const day=cairoDay();
  const ref=fs.doc(db,...visitsPath(day),visitor.uid);
  const initial=await fs.runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(ref);
    if(snapshot.exists())return snapshot.data().sections;
    transaction.set(ref,{createdAt:fs.serverTimestamp(),sections:{}});
    return {};
  });
  if(!('IntersectionObserver' in window))return;

  const seen=new Set(Object.keys(initial));
  let queue=Promise.resolve();
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.intersectionRatio<0.25||document.visibilityState!=='visible')continue;
      const key=entry.target.closest('.menu-section')?.id;
      if(!key||seen.has(key))continue;
      seen.add(key);
      observer.unobserve(entry.target);
      queue=queue.then(()=>fs.runTransaction(db,async transaction=>{
        const current=await transaction.get(ref);
        if(current.exists()&&!current.data().sections[key]&&cairoDay()===day){
          transaction.update(ref,{['sections.'+key]:true});
        }
      })).catch(()=>{});
    }
  },{threshold:0.25});
  for(const [id] of sections){
    const heading=document.querySelector('#'+id+' h2');
    if(heading&&!seen.has(id))observer.observe(heading);
  }
}
