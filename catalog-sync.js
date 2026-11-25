/**
 * Read-only catalog and thumbnails. No credentials are ever sent from the menu.
 * The baked-in sheet snapshot remains usable if Firestore is unavailable.
 */
import {firebaseConfig, firebaseReady} from './firebase-config.js';

const categories = ['hot-drinks','cold-drinks','dessert-cups','mixed-plates','specials'];
const detailCats = new Set(['mixed-plates','specials']);
const featuredCutouts = new Set([
  'assets/products/lejua.webp',
  'assets/products/coco-choc.webp',
  'assets/products/dessert-dousser.webp',
  'assets/products/banana-split.webp',
  'assets/products/dame-blanche.webp',
  'assets/products/peche-melba.webp',
  'assets/products/choco-pistache.webp'
]);
const cutoutVersion = 'featured-cutouts-1';
const imageCache = new Map();
const imageVersions = new Map();
const imageRequests = new Map();
const $ = (q,root=document)=>root.querySelector(q);
const photoGrids = new Map(categories.map(category => [category, $(`#${category} .menu-photo-grid`)])
  .filter(([, grid]) => grid));
const menuPhotos = new Map([...document.querySelectorAll('[data-menu-photo]')].map(card => [
  card.dataset.productId,
  { image: card.dataset.image, thumbnails: [...card.querySelectorAll('img')].map(img => ({
    src: img.getAttribute('src'), alt: img.alt
  })) }
]));
const svgArrow = '<svg aria-hidden="true" class="details-arrow" fill="none" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85"></path></svg>';
let dbApi, db;
const isImageData = value=>typeof value==='string' && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 155000;
const addClass = (node,classes) => node.className=classes;
const txt=(tag,value,classes='')=>{const n=document.createElement(tag);n.textContent=String(value??'');if(classes)n.className=classes;return n;};
const versionedAsset=(path,version='103-2')=>typeof path==='string'&&path.startsWith('assets/products/')?path+(path.includes('?')?'&':'?')+'v='+version:path;
const validProduct=p=>p && typeof p==='object' && typeof p.id==='string' && /^[\w-]{1,70}$/.test(p.id) && categories.includes(p.category) && typeof p.ar==='string' && p.ar.trim().length>0;

function makeCard(p){
  const featured = p.category === 'specials';
  const cloud = p.imageSource === 'firestore' && p.hasImage;
  const asset = p.imageSource === 'asset' && p.image;
  const supplied = menuPhotos.get(p.id);
  const photoRow = photoGrids.has(p.category) && Boolean(asset || cloud);
  const menuPhoto = photoRow && supplied && asset === supplied.image.split('?')[0] ? supplied : null;
  const cutoutFile = featured && asset && featuredCutouts.has(p.image)
    ? p.image.split('/').pop() : '';
  const detail = featured || photoRow || (p.category === 'mixed-plates' && Boolean(asset || cloud));
  const article=document.createElement('article');
  addClass(article,`product-card product-card--${detail?'detail':'simple'}`);
  if(cutoutFile || menuPhoto)article.classList.add('has-cutout');
  if(photoRow)article.dataset.menuPhoto='';
  const price=typeof p.price==='number' && Number.isFinite(p.price) && p.price>0?p.price:null;
  Object.assign(article.dataset,{
    productId:p.id,category:p.category,name:p.ar,nameEn:p.en||p.ar,
    price: price===null?'':String(price),
    descriptionAr:p.descriptionAr||'',descriptionEn:p.descriptionEn||'',
    ingredientsAr:(Array.isArray(p.ingredientsAr)?p.ingredientsAr:[]).join('|'),
    ingredientsEn:(Array.isArray(p.ingredientsEn)?p.ingredientsEn:[]).join('|'),
    image:menuPhoto?.image || (asset
      ? (cutoutFile ? versionedAsset(`assets/products/cutouts/${cutoutFile}`,cutoutVersion) : versionedAsset(asset))
      : '')
  });
  if(p.imageSource==='firestore' && p.hasImage) article.dataset.cloudImage=p.id;
  const priceSpan=txt('span', price===null?'':price,'price');
  const priceSmall=txt('small',price===null?'اسأل عن السعر':'جنيه');
  priceSpan.append(document.createTextNode(' '),priceSmall);
  if(!detail){
    if(p.image || (p.imageSource==='firestore' && p.hasImage)){
      const thumb=document.createElement('div');addClass(thumb,'simple-thumb');
      if(p.imageSource==='asset' && p.image){const img=document.createElement('img');img.src=versionedAsset(p.image);img.alt=p.ar;img.loading='eager';img.decoding='async';thumb.append(img);}
      else thumb.classList.add('simple-thumb--pending');
      article.append(thumb);
    }
    article.append(txt('h3',p.ar,'product-title'),priceSpan);
    priceSpan.tagName; // stable role for both static and dynamically added cards
    return article;
  }
  const body=document.createElement(photoRow?'div':'button');
  body.className='product-tap';
  if(!photoRow){body.type='button';body.setAttribute('aria-label','عرض تفاصيل '+p.ar);}
  const visual=document.createElement('span');
  if(article.dataset.image || cloud){
    addClass(visual,'product-visual photo-visual'+(cloud?' photo-visual--pending':''));
    if(!cloud){
      const img=document.createElement('img');
      const thumbnail = menuPhoto?.thumbnails[0];
      img.alt=thumbnail?.alt || p.ar;
      img.loading='eager';
      img.decoding='async';
      img.src=thumbnail?.src || (cutoutFile
        ? versionedAsset(`assets/products/cutouts/cards/${cutoutFile}`,cutoutVersion)
        : article.dataset.image);
      visual.append(img);
      if(menuPhoto?.thumbnails.length>1){
        visual.classList.add('photo-visual--pair');
        for (const thumbnail of menuPhoto.thumbnails.slice(1)) {
          const alternate = document.createElement('img');
          alternate.loading = 'lazy';
          alternate.decoding = 'async';
          alternate.alt = thumbnail.alt;
          alternate.src = thumbnail.src;
          visual.append(alternate);
        }
      }
    }else visual.append(txt('span','جاري تحميل الصورة…','plate-visual-caption'));
  }else{
    addClass(visual,'product-visual plate-visual');
    visual.append(txt('span','✧','plate-visual-mark'),txt('span','من أطباق الكافيه','plate-visual-caption'));
  }
  const info=document.createElement('span');addClass(info,'product-info');
  info.append(txt('span',p.category==='specials'?'صنف مميز':'من أطباقنا','product-badge'),txt('span',p.ar,'product-title'));
  const foot=document.createElement('span');addClass(foot,'product-footer');
  foot.append(priceSpan);
  if(!photoRow){
    const more=txt('span',featured?'التفاصيل ':'عرض التفاصيل ','card-more');
    more.insertAdjacentHTML('beforeend',svgArrow);
    foot.append(more);
  }
  info.append(foot);body.append(visual,info);article.append(body);
  return article;
}
function applyImage(id,dataUrl){
  if(!isImageData(dataUrl))return;
  imageCache.set(id,dataUrl);
  document.dispatchEvent(new CustomEvent('menu:image-loaded',{detail:{id,image:dataUrl}}));
}
async function getImage(id){
  if(imageCache.has(id))return applyImage(id,imageCache.get(id));
  if(!dbApi||!db)return;
  const version=imageVersions.get(id);
  if(!imageVersions.has(id) || imageRequests.get(id)?.version===version)return;
  const request={version};
  imageRequests.set(id,request);
  try{
    const snap=await dbApi.getDoc(dbApi.doc(db,'menuImages',id));
    if(imageRequests.get(id)===request && imageVersions.get(id)===version && snap.exists()){
      applyImage(id,snap.data().dataUrl);
    }
  }catch(e){console.warn('Thumbnail unavailable',id,e.code||e.message);}
  finally{if(imageRequests.get(id)===request)imageRequests.delete(id);}
}
const pendingImageIds = new Set();
let activeImageReads = 0;
function loadQueuedImages(){
  while(activeImageReads < 4 && pendingImageIds.size){
    const id = pendingImageIds.values().next().value;
    pendingImageIds.delete(id);
    activeImageReads += 1;
    void getImage(id).finally(() => {
      activeImageReads -= 1;
      loadQueuedImages();
    });
  }
}
function queueImages(cards){
  pendingImageIds.clear();
  cards.forEach(card => pendingImageIds.add(card.dataset.cloudImage));
  loadQueuedImages();
}
function showCatalog(items){
  if(!Array.isArray(items))return;
  const catalog=items.filter(validProduct).filter(p=>p.active!==false)
    .sort((a,b)=>(a.order??0)-(b.order??0));
  const buckets=new Map(categories.map(c=>[c,document.createDocumentFragment()]));
  const photoBuckets=new Map([...photoGrids.keys()].map(c=>[c,document.createDocumentFragment()]));
  const cards=[];
  const photosWithoutGrid=[];
  catalog.forEach(p=>{
    if(p.imageSource==='firestore' && p.hasImage){
      const v=Number(p.photoVersion||0);
      if(imageVersions.has(p.id) && imageVersions.get(p.id)!==v)imageCache.delete(p.id);
      imageVersions.set(p.id,v);
    } else {imageVersions.delete(p.id);imageCache.delete(p.id);}
    const card=makeCard(p);
    const bucket=card.hasAttribute('data-menu-photo') ? photoBuckets.get(p.category) : buckets.get(p.category);
    if(p.category!=='specials' && !card.hasAttribute('data-menu-photo') && (card.dataset.image || card.dataset.cloudImage)){
      photosWithoutGrid.push(card);
    }else if(p.category==='specials' && p.id==='specials-533')bucket.prepend(card);
    else bucket.append(card);
    if(card.dataset.cloudImage)cards.push(card);
  });
  photosWithoutGrid.forEach(card => buckets.get(card.dataset.category).append(card));
  for(const c of categories){
    const grid=$(`#${c} .products-grid:not(.menu-photo-grid)`);
    if(grid)grid.replaceChildren(buckets.get(c));
    if(photoGrids.has(c))photoGrids.get(c).replaceChildren(photoBuckets.get(c));
  }
  // Old visual/UX code rebuilds its product list and click handlers here.
  document.dispatchEvent(new CustomEvent('menu:catalog-updated',{detail:{count:catalog.length}}));
  queueImages(cards);
}
if(firebaseReady){
  try {
    const [app,fs]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    dbApi=fs;const instance=app.getApps().length?app.getApp():app.initializeApp(firebaseConfig);
    db=fs.getFirestore(instance);
    fs.onSnapshot(fs.doc(db,'menu','catalog'),snapshot=>{
      if(snapshot.exists() && Array.isArray(snapshot.data().products)) showCatalog(snapshot.data().products);
    },error=>{
      console.error('Catalog offline; showing bundled menu:',error.code||error);
    });
  }catch(e){console.warn('Using bundled menu',e.message);}
}
