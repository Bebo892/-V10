import {firebaseConfig,firebaseReady} from './firebase-config.js';

const publicMenuHost=['misrsweetsmenu.com','www.misrsweetsmenu.com'].includes(location.hostname);
if(firebaseReady&&publicMenuHost&&navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'){
  void recordMenuView().catch(()=>{});
}

async function recordMenuView(){
  const [app,analytics]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js')
  ]);
  if(!await analytics.isSupported())return;
  const instance=app.initializeApp(firebaseConfig,'public-menu-analytics');
  const pageLocation=new URL(location.pathname,location.origin).href;
  const tracker=analytics.initializeAnalytics(instance,{config:{
    send_page_view:false,
    allow_google_signals:false,
    allow_ad_personalization_signals:false,
    page_location:pageLocation
  }});
  analytics.logEvent(tracker,'page_view',{page_location:pageLocation,page_title:document.title});
}
