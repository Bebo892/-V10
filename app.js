/**
 * Halaweyat Masr Café — display-only digital menu, v8.1.
 * All product names, prices, descriptions and pictures come from index.html.
 * Product cards with photos can open the shared details dialog.
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const categoryGrid = $('.category-grid');
  const categoryLinks = $$('.category-card');
  const menuSections = $$('.menu-section');
  const searchForm = $('#menu-search');
  const searchInput = $('#search-input');
  const searchStatus = $('#search-status');
  const noResults = $('#no-results');
  const resetFilter = $('.reset-filter');
  const stickyBar = $('#sticky-categories');
  const stickyLinks = $$('.sticky-category-link');
  const suggestions = $('#search-suggestions');
  const priceFilter = $('.price-filter');
  const priceButtons = $$('.price-filter-btn');
  const categoriesSection = $('#categories');
  const siteHeader = $('.site-header');
  const languageToggle = $('.language-toggle');
  const dialog = $('#product-dialog');
  const dialogClose = $('.dialog-close', dialog);
  const dialogVisual = $('#dialog-visual');
  const dialogCategory = $('#dialog-category');
  const dialogTitle = $('#dialog-product-name');
  const dialogDescription = $('#dialog-product-description');
  const dialogPriceLabel = $('#dialog-price-label');
  const dialogPrice = $('#dialog-price');
  const dialogIngredients = $('#dialog-ingredients');
  const dialogIngredientsLabel = $('#dialog-ingredients-label');
  const dialogIngredientChips = $('#dialog-ingredient-chips');
  const languageLabel = $('.language-toggle-label', languageToggle);
  if (!categoryGrid || !searchForm || !dialog) return;

  const categories = {
    'hot-drinks': { ar: 'المشروبات الساخنة', en: 'Hot Drinks' },
    'cold-drinks': { ar: 'العصائر والمشروبات الباردة', en: 'Juices & Cold Drinks' },
    'dessert-cups': { ar: 'الكاسات والديسيرت', en: 'Dessert Cups' },
    'mixed-plates': { ar: 'أطباق متنوعة', en: 'Assorted Plates' },
    specials: { ar: 'الأصناف المميزة', en: 'Signature Specials' }
  };
  const sectionCopy = {
    'hot-drinks': { ar: 'من القهوة التركي للكابتشينو، اختار مشروبك المفضل.', en: 'Choose your favorite, from Turkish coffee to cappuccino.' },
    'cold-drinks': { ar: 'نكهات منعشة من منيو الكافيه.', en: 'Refreshing flavors from our café menu.' },
    'dessert-cups': { ar: 'أصناف حلوة لكل وقت.', en: 'Something sweet for every moment.' },
    'mixed-plates': { ar: 'أطباق ومخبوزات بتفاصيل تستاهل تتشاف.', en: 'Plates and pastries worth exploring.' },
    specials: { ar: 'أصناف الكافيه المميزة بالصور والتفاصيل.', en: 'Explore our signature treats in detail.' }
  };
  const labels = {
    ar: {
      title: 'منيو الكافيه | حلويات مصر', skip: 'تخطي إلى المنيو', brand: 'كافيه حلويات مصر', menu: 'الأقسام',
      heroLead: 'كل لحظة أحلى في', heroName: 'كافيه حلويات مصر', intro: 'اكتشف مشروباتك المفضلة وأصناف الديسيرت من منيو الكافيه.',
      searchLabel: 'بتدور على صنف معين؟', searchPlaceholder: 'جرّب: كابتشينو، أم علي، بانانا سبليت...',
      searchButton: 'بحث', categories: 'أقسام المنيو', showAll: 'عرض جميع الأقسام',
      currency: 'جنيه', price: 'السعر', ingredients: 'أبرز المكونات', close: 'إغلاق التفاصيل', details: 'عرض التفاصيل', specialDetails: 'التفاصيل',
      specialBadge: 'صنف مميز', plateBadge: 'من أطباقنا', plateCaption: 'من أطباق الكافيه',
      footerNotice: 'هذا المنيو للعرض فقط، ولا توجد طلبات أو مدفوعات من خلال الموقع.',
      footerBrand: 'حلويات مصر', footerMenu: ' — منيو الكافيه الرقمي', top: 'العودة للأعلى ↑',
      noMatches: 'مفيش أصناف مطابقة للبحث. جرّب كلمة تانية.',
      matches: n => `لقينا ${n} صنف`, categoryMatches: (name,n) => `${name} — ${n} صنف`,
      view: name => `عرض تفاصيل ${name}`, changeLanguage: 'Switch to English',
      footerDescription: 'لحظات ألذ، ومنيو أسهل — استمتع بتصفح مشروبات وحلويات الكافيه.',
      footerMenuTitle: 'تصفح المنيو', footerDisclaimer: 'المنيو للعرض فقط • الأسعار قابلة للتحديث',
      suggestionLabel: 'اقتراحات البحث',
      priceFilterLabel: 'حدد ميزانيتك',
      priceRanges: {all:'كل الأسعار', under50:'أقل من 50 جنيه', between:'50 – 100 جنيه', over100:'أكثر من 100 جنيه'},
      priceFilterAria: 'فلترة الأصناف حسب السعر', noMatchesReset: 'مسح الفلاتر',
      footerContactTitle: 'تواصل مع الكافيه', footerContactDesc: 'للاستفسارات أو معرفة تفاصيل الفروع:',
      footerMap: 'عرض الموقع على Google Maps', footerCity: 'الإسكندرية، مصر', adminLink: 'دخول الإدارة'
    },
    en: {
      title: 'Café Menu | Halaweyat Masr', skip: 'Skip to menu', brand: 'Halaweyat Masr Café', menu: 'Categories',
      heroLead: 'Every moment is sweeter at', heroName: 'Halaweyat Masr Café', intro: 'Explore drinks and desserts from our café menu.',
      searchLabel: 'Looking for something?', searchPlaceholder: 'Try: Cappuccino, Om Ali, Banana Split...',
      searchButton: 'Search', categories: 'Menu Categories', showAll: 'Show all categories',
      currency: 'EGP', price: 'Price', ingredients: 'Key ingredients', close: 'Close details', details: 'View details', specialDetails: 'Details',
      specialBadge: 'Signature item', plateBadge: 'From our menu', plateCaption: 'From our café kitchen',
      footerNotice: 'This menu is for viewing only. No orders or payments are accepted here.',
      footerBrand: 'Halaweyat Masr', footerMenu: ' — Digital Café Menu', top: 'Back to top ↑',
      noMatches: 'No matching items. Try another search.',
      matches: n => `${n} matching item${n===1?'':'s'}`, categoryMatches: (name,n) => `${name} — ${n} item${n===1?'':'s'}`,
      view: name => `View details for ${name}`, changeLanguage: 'التبديل للعربية',
      footerDescription: 'Sweet moments, made easy — explore our café drinks and desserts.',
      footerMenuTitle: 'Explore the menu', footerDisclaimer: 'Display-only menu • Prices may change',
      suggestionLabel: 'Search suggestions',
      priceFilterLabel: 'Filter by budget',
      priceRanges: {all:'All prices', under50:'Under EGP 50', between:'EGP 50 – 100', over100:'Over EGP 100'},
      priceFilterAria: 'Filter menu by price', noMatchesReset: 'Clear filters',
      footerContactTitle: 'Contact the café', footerContactDesc: 'Questions or branch information? Call us:',
      footerMap: 'View on Google Maps', footerCity: 'Alexandria, Egypt', adminLink: 'Admin sign-in'
    }
  };
  const state = { lang: 'ar', category: 'all', price: 'all', query: '', activeProduct: null };
  const makeProduct = card => ({
    card, id: card.dataset.productId,
    basePrice: card.dataset.price ? Number(card.dataset.price) : null,
    name: card.dataset.name, en: card.dataset.nameEn || card.dataset.name,
    category: card.dataset.category, price: card.dataset.price,
    descriptionAr: card.dataset.descriptionAr || '',
    descriptionEn: card.dataset.descriptionEn || '', image: card.dataset.image || '',
    ingredientsAr: (card.dataset.ingredientsAr || '').split('|').filter(Boolean),
    ingredientsEn: (card.dataset.ingredientsEn || '').split('|').filter(Boolean),
    aliases: card.dataset.aliases || ''
  });
  let products = $$('.product-card').map(makeProduct);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layeredFeaturedMotion = window.matchMedia('(min-width: 651px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const preparedPhotos = new WeakSet();
  const decodedPhotos = new WeakSet();
  const nearbyCards = new WeakSet();
  const revealedCards = new WeakSet();
  const photoSelector = '.photo-visual img, .simple-thumb img';
  function preparePhotos(card) {
    $$(photoSelector, card).forEach(image => {
      if (preparedPhotos.has(image)) return;
      preparedPhotos.add(image);
      if (typeof image.decode === 'function') {
        image.decode().then(() => decodedPhotos.add(image), () => {});
      }
    });
  }
  const canObservePhotos = 'IntersectionObserver' in window;
  const nearbyPhotoObserver = canObservePhotos
    ? new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!target.isConnected) return;
        if (isIntersecting) {
          nearbyCards.add(target);
          preparePhotos(target);
        } else {
          nearbyCards.delete(target);
          revealedCards.delete(target);
          target.classList.remove('menu-photo-reveal');
        }
      });
    }, { rootMargin: '240px 0px' }) : null;
  const productObserver = canObservePhotos
    ? new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting || !target.isConnected || revealedCards.has(target)) return;
        revealedCards.add(target);
        const images = $$(photoSelector, target);
        if (images.length && images.every(image => decodedPhotos.has(image) ||
            (typeof image.decode !== 'function' && image.complete && image.naturalWidth))) {
          target.classList.add('menu-photo-reveal');
        }
      });
    }) : null;
  function observeProductRows() {
    if (!productObserver) return;
    productObserver.disconnect();
    nearbyPhotoObserver.disconnect();
    products.forEach(({ card }) => {
      if (!$('.photo-visual, .simple-thumb',card)) return;
      nearbyPhotoObserver.observe(card);
      productObserver.observe(card);
    });
  }
  function prioritizeMenuImages() {
    const section = menuSections.find(section => section.id === state.category);
    $$('.product-card img', section || document).slice(0, 2).forEach(image => {
      image.fetchPriority = 'high';
      image.loading = 'eager';
    });
  }
  const readablePrice = product => {
    const n = Number(product.price);
    return product.price !== '' && product.price != null && Number.isFinite(n) && n > 0
      ? `${n} ${t().currency}` : (state.lang === 'ar' ? 'اسأل عن السعر' : 'Ask for price');
  };
  function prepareCard(product) {
    const { card } = product;
    const layout = $('.product-tap', card);
    const more = $('.card-more', card);
    if (!product.image && !$(photoSelector, card)) {
      if (layout instanceof HTMLButtonElement) {
        const row = document.createElement('div');
        row.className = layout.className;
        row.append(...layout.childNodes);
        layout.replaceWith(row);
      }
      if (more) more.hidden = true;
      return;
    }

    let button = layout instanceof HTMLButtonElement ? layout : $('.product-open', card);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      if (layout) {
        button.className = layout.className;
        button.append(...layout.childNodes);
        layout.replaceWith(button);
      } else {
        button.className = 'product-open';
        card.append(button);
      }
    }
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.setAttribute('aria-label', t().view(displayName(product)));
    if (more) more.hidden = false;
    product.trigger = button;
  }

  $('#main-content').addEventListener('click', event => {
    const button = event.target.closest('button:is(.product-tap, .product-open)');
    if (!button) return;
    openDetails(products.find(product => product.trigger === button));
  });
  // The new admin manages a single /menu/catalog document. The public menu has
  // its original static products as an offline fallback and accepts live updates.
  document.addEventListener('menu:catalog-updated', event => {
    const activeId = state.activeProduct?.id;
    products = $$('.product-card').map(makeProduct);
    products.forEach(prepareCard);
    state.activeProduct = products.find(p => p.id === activeId && p.trigger) || null;
    if (!state.activeProduct && dialog.open) closeDetails();
    translatePage();
    observeProductRows();
    prioritizeMenuImages();
    updateSticky();
  });
  document.addEventListener('menu:image-loaded', event => {
    const { id, image } = event.detail || {};
    const product=products.find(p=>p.id===id);
    if (!product || !image) return;
    product.image=image;
    product.card.dataset.image=image;
    const visual=$('.product-visual',product.card);
    if(visual){
      visual.classList.remove('plate-visual','photo-visual--pending');
      visual.classList.add('photo-visual');
      visual.replaceChildren();
      const img=document.createElement('img');img.alt=displayName(product);
      img.loading='eager';img.decoding='async';img.src=image;
      visual.append(img);
    }
    const thumb=$('.simple-thumb',product.card);
    if(thumb){thumb.classList.remove('simple-thumb--pending');thumb.replaceChildren();const img=document.createElement('img');img.src=image;img.alt=displayName(product);img.loading='eager';img.decoding='async';thumb.append(img);}
    prepareCard(product);
    if (nearbyCards.has(product.card)) preparePhotos(product.card);
    if (state.activeProduct?.id === id) updateDialog();
  });

  const normalize = value => String(value || '').toLocaleLowerCase().normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

  const t = () => labels[state.lang];
  const categoryName = id => categories[id]?.[state.lang] || id;
  const displayName = p => state.lang === 'en' ? p.en : p.name;
  const displayDescription = p => state.lang === 'en' ? p.descriptionEn : p.descriptionAr;


  // Arabic variants, accents, typing prefixes, and common café terms.
  // Search only from the local verified menu: no AI and no invented prices.
  const searchTerm = value => normalize(value).replace(/ة/g, 'ه');
  const synonyms = {
    'قهوه': ['coffee','turkish','قهوة','كابتشينو','نسكافيه','اسبريسو'],
    'coffee': ['قهوة','كابتشينو','nescafe','espresso','coffee'],
    'شوكولاته': ['chocolate','شيكولاته','شوكولاتة','كاكاو'],
    'chocolate': ['شيكولاتة','شوكولاتة','كاكاو','chocolate'],
    'ايس كريم': ['آيس كريم','ice cream','ايسكريم'],
    'juice': ['عصير','juice','مانجو','فراولة','ليمون'],
    'عصير': ['juice','ليمون','مانجو','برتقال','فراوله'],
  };
  function productMatches(p, typed) {
    const query = searchTerm(typed);
    if (!query) return true;
    const combined = searchTerm([p.name,p.en,p.descriptionAr,p.descriptionEn,p.aliases,categories[p.category].ar,categories[p.category].en].join(' '));
    const words = query.split(' ').filter(Boolean);
    if (words.every(w => combined.includes(w))) return true;
    // Special intent synonyms only for an exact single common term to avoid noise.
    if (words.length > 2) return false;
    return (synonyms[query] || []).some(word => combined.includes(searchTerm(word)));
  }

  function matchesPrice(product) {
    if (product.price === '' || product.price == null) return state.price === 'all';
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) return state.price === 'all';
    if (state.price === 'under50') return price < 50;
    if (state.price === 'between') return price >= 50 && price <= 100;
    if (state.price === 'over100') return price > 100;
    return true;
  }

  function resetAll(scroll = false) {
    state.price = 'all';
    setCategory('all', { scroll });
  }

  function revealResults() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    products.filter(p => !p.card.hidden).slice(0, 22).forEach(p => {
      const card = p.card;
      card.classList.remove('filter-reveal');
      card.style.setProperty('--reveal-index', Math.min(i++, 9));
      void card.offsetWidth;
      card.classList.add('filter-reveal');
    });
  }

  function matchingProducts() {
    if (!searchInput.value.trim()) return [];
    return products.filter(p => productMatches(p,searchInput.value))
      .sort((a,b) => {
        const q=searchTerm(searchInput.value);
        const arA=searchTerm(a.name), arB=searchTerm(b.name);
        const enA=searchTerm(a.en), enB=searchTerm(b.en);
        const aa=Number(arA.startsWith(q)||enA.startsWith(q));
        const bb=Number(arB.startsWith(q)||enB.startsWith(q));
        return bb-aa;
      });
  }
  function closeSuggestions() {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    searchInput.setAttribute('aria-expanded','false');
  }
  function updateSuggestions() {
    suggestions.replaceChildren();
    if (!searchInput.value.trim() || document.activeElement!==searchInput) { closeSuggestions(); return; }
    const matches=matchingProducts().slice(0,6);
    if (!matches.length) {closeSuggestions(); return;}
    suggestions.setAttribute('aria-label',t().suggestionLabel);
    matches.forEach(product => {
      const button=document.createElement('button');
      button.type='button'; button.className='suggestion-item';
      button.setAttribute('role','option'); button.setAttribute('aria-selected','false');
      const name=document.createElement('strong'); name.textContent=displayName(product);
      const amount=document.createElement('span'); amount.textContent=readablePrice(product);
      button.append(name,amount);
      button.addEventListener('click',()=>{
        state.query=''; state.category='all';
        searchInput.value=''; renderResults(); closeSuggestions();
        if (product.trigger) openDetails(product);
        else product.card.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      });
      suggestions.append(button);
    });
    suggestions.hidden=false;
    searchInput.setAttribute('aria-expanded','true');
  }
  const scrollBehavior=() => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const categoryFromLocation = () => menuSections.find(section => location.hash === `#${section.id}`)?.id || 'all';
  function setCategory(filter, { recordHistory = true, scroll = true } = {}) {
    const target = filter === 'all' ? categoriesSection : menuSections.find(section => section.id === filter);
    if (!target) return;

    state.category = filter;
    state.query = '';
    searchInput.value = '';
    closeSuggestions();
    const animate = recordHistory && (filter !== 'specials' || layeredFeaturedMotion.matches);
    renderResults(animate);
    prioritizeMenuImages();

    const hash = `#${target.id}`;
    if (recordHistory && location.hash !== hash) history.pushState(null, '', hash);
    if (scroll) target.scrollIntoView({ behavior: animate ? scrollBehavior() : 'instant', block: 'start' });
  }
  function restoreCategory() {
    const filter = categoryFromLocation();
    if (state.category !== filter) {
      setCategory(filter, { recordHistory: false, scroll: filter !== 'all' });
    }
  }
  let lastStickyCategory;
  let lastHeaderHeight;
  let lastStickyVisibility;
  function updateSticky() {
    const h=siteHeader.getBoundingClientRect().height;
    const height=Math.round(h);
    if(height!==lastHeaderHeight){
      document.documentElement.style.setProperty('--v6-header-height',`${height}px`);
      lastHeaderHeight=height;
    }
    const visible=categoriesSection.getBoundingClientRect().bottom < h+8 &&
      $('.site-footer').getBoundingClientRect().top > h+85;
    if(visible!==lastStickyVisibility){
      stickyBar.classList.toggle('is-visible',visible);
      stickyBar.setAttribute('aria-hidden',String(!visible));
      lastStickyVisibility=visible;
    }
    if(!visible){
      lastStickyCategory=undefined;
      return;
    }
    const bar=stickyBar.querySelector('.sticky-categories-inner');
    const threshold=h+stickyBar.offsetHeight+20;
    const currentSection=menuSections.find(section=>!section.hidden && section.getBoundingClientRect().bottom>threshold);
    const category=state.category==='all'?currentSection?.id:state.category;
    if(category===lastStickyCategory)return;
    lastStickyCategory=category;
    const active=stickyLinks.find(link=>link.dataset.filter===category);
    if(active&&bar.scrollWidth>bar.clientWidth){
      const bounds=bar.getBoundingClientRect();
      const target=active.getBoundingClientRect();
      bar.scrollBy({left:(target.left+target.right-bounds.left-bounds.right)/2,behavior:scrollBehavior()});
    }
  }

  function renderResults(animate = false) {
    const query = normalize(state.query);
    let shownCount = 0;
    products.forEach(product => {
      const matchCategory = state.category === 'all' || product.category === state.category;
      const show = matchCategory && matchesPrice(product) && (!query || productMatches(product,state.query));
      product.card.hidden = !show;
      if (show) shownCount += 1;
    });
    menuSections.forEach(section => {
      section.hidden = !products.some(p => p.category === section.id && !p.card.hidden);
    });
    [...categoryLinks,...stickyLinks].forEach(link => {
      const selected = state.category === link.dataset.filter;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    resetFilter.hidden = state.category === 'all' && state.price === 'all' && !state.query.trim();
    priceButtons.forEach(btn => {
      const active = btn.dataset.priceRange === state.price;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    updateSticky();
    noResults.hidden = shownCount > 0;
    noResults.replaceChildren();
    if (shownCount === 0) {
      const message = document.createElement('p');
      message.textContent = t().noMatches;
      const clear = document.createElement('button');
      clear.type = 'button'; clear.className = 'no-results-reset';
      clear.textContent = t().noMatchesReset;
      clear.addEventListener('click', () => { resetAll(); searchInput.focus(); });
      noResults.append(message, clear);
    }
    searchStatus.textContent = query || state.price !== 'all'
      ? t().matches(shownCount)
      : state.category !== 'all' ? t().categoryMatches(categoryName(state.category), shownCount) : '';
    if (animate) revealResults();
  }

  function updateDialog() {
    const product = state.activeProduct;
    if (!product) return;
    dialogCategory.textContent = categoryName(product.category);
    dialogTitle.textContent = displayName(product);
    dialogDescription.textContent = displayDescription(product);
    dialogDescription.hidden = !dialogDescription.textContent.trim();
    if (dialogDescription.hidden) dialog.removeAttribute('aria-describedby');
    else dialog.setAttribute('aria-describedby', dialogDescription.id);
    dialogPriceLabel.textContent = t().price;
    dialogPrice.textContent = readablePrice(product);
    dialogClose.setAttribute('aria-label', t().close);
    const ingredients = state.lang === 'ar' ? product.ingredientsAr : product.ingredientsEn;
    dialogIngredients.hidden = ingredients.length === 0;
    dialogIngredientsLabel.textContent = t().ingredients;
    dialogIngredientChips.replaceChildren();
    ingredients.forEach((name, i) => {
      const chip = document.createElement('span');
      chip.className = 'dialog-ingredient-chip';
      chip.textContent = name;
      chip.style.setProperty('--chip-index', i);
      dialogIngredientChips.appendChild(chip);
    });
    const thumbnails = $$(photoSelector, product.card);
    const photos = thumbnails.map((thumbnail, index) => ({
      src: (index === 0 && product.image) ||
        thumbnail.getAttribute('src').replace('assets/products/cutouts/cards/', 'assets/products/cutouts/'),
      alt: thumbnail.alt,
      width: thumbnail.naturalWidth,
      height: thumbnail.naturalHeight
    }));
    if (!photos.length) photos.push({ src: product.image, alt: displayName(product) });

    dialogVisual.classList.add('has-photo');
    dialogVisual.classList.toggle('has-cutout', product.card.classList.contains('has-cutout'));
    dialogVisual.classList.toggle('is-pair', photos.length === 2);
    dialogVisual.replaceChildren(...photos.map(photo => {
      const img = document.createElement('img');
      img.alt = photo.alt;
      img.width = photo.width || 800;
      img.height = photo.height || 800;
      img.decoding = 'async';
      img.fetchPriority = 'high';
      img.src = photo.src;
      return img;
    }));
  }

  function openDetails(product) {
    if (!product?.trigger) return;
    state.activeProduct = product;
    updateDialog();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    dialogClose.focus({ preventScroll: true });
  }

  function closeDetails() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (prefersReducedMotion.matches) {
      dialog.close();
      return;
    }
    const { opacity, transform } = getComputedStyle(dialog);
    dialog.style.setProperty('--dialog-exit-opacity', opacity);
    dialog.style.setProperty('--dialog-exit-transform', transform);
    dialog.classList.add('is-closing');
    const animation = dialog.getAnimations?.().find(item => item.animationName === 'featured-dialog-out');
    if (animation) {
      const finish = () => { if (dialog.open && dialog.classList.contains('is-closing')) dialog.close(); };
      animation.finished.then(finish, finish);
    } else dialog.close();
  }

  function translatePage() {
    const x = t();
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = x.title;
    $('.skip-link').textContent = x.skip;
    $('.brand').setAttribute('aria-label', x.brand);
    $('.brand-name').textContent = x.brand;
    $('.header-menu-link').textContent = x.menu;
    languageLabel.textContent = state.lang === 'ar' ? 'EN' : 'عربي';
    languageToggle.setAttribute('aria-label', x.changeLanguage);
    $('#hero-lead').textContent = x.heroLead;
    $('#hero-name').textContent = x.heroName;
    $('.hero-content > p').textContent = x.intro;
    $('.search-form label').textContent = x.searchLabel;
    searchInput.placeholder = x.searchPlaceholder;
    $('.search-field button').textContent = x.searchButton;
    $('#categories-title').textContent = x.categories;
    resetFilter.firstChild.textContent = x.showAll + ' ';
    categoryLinks.forEach(link => {
      $('strong',link).textContent = categoryName(link.dataset.filter);
    });
    menuSections.forEach(section => {
      $('h2',section).textContent = categoryName(section.id);
      $('.section-intro',section).textContent = sectionCopy[section.id][state.lang];
    });
    products.forEach(product => {
      const name = displayName(product);
      $('.product-title',product.card).textContent = name;
      product.trigger?.setAttribute('aria-label', x.view(name));
      const badge = $('.product-badge', product.card);
      if (badge) badge.textContent = product.category === 'specials' ? x.specialBadge : x.plateBadge;
      const more = $('.card-more', product.card);
      if (more) more.firstChild.textContent = (product.category === 'specials' ? x.specialDetails : x.details) + ' ';
      const caption = $('.plate-visual .plate-visual-caption', product.card);
      if (caption) caption.textContent = x.plateCaption;
      const image = $('img', product.card);
      if (image && !image.closest('.photo-visual--pair')) image.alt = name;
      const currency=$('.price small',product.card);
      if(currency) currency.textContent = product.price !== '' ? x.currency : (state.lang==='ar' ? 'اسأل عن السعر' : 'Ask for price');
    });
    $('.price-filter-label').textContent = x.priceFilterLabel;
    priceFilter.setAttribute('aria-label', x.priceFilterAria);
    priceButtons.forEach(button => {button.textContent = x.priceRanges[button.dataset.priceRange];});
    $('.footer-contact-title').textContent = x.footerContactTitle;
    $('.footer-contact-desc').textContent = x.footerContactDesc;
    $('.footer-map-link').firstChild.textContent = x.footerMap + ' ';
    $('.footer-city').textContent = x.footerCity;
    $('.footer-title').textContent=x.brand;
    $('.footer-desc').textContent=x.footerDescription;
    $('.footer-links-title').textContent=x.footerMenuTitle;
    $('.footer-notice').textContent=x.footerDisclaimer;
    $('.footer-to-top').textContent=x.top;
    $('.footer-admin-text').textContent=x.adminLink;
    $('.footer-admin-link').setAttribute('aria-label',x.adminLink);
    const footerNames = {categories:x.menu,'hot-drinks':categoryName('hot-drinks'),'cold-drinks':categoryName('cold-drinks'),specials:categoryName('specials')};
    $$('[data-footer-link]').forEach(link=>link.textContent=footerNames[link.dataset.footerLink]);
    stickyLinks.forEach(link=>link.textContent=categoryName(link.dataset.filter));
    renderResults();
    updateDialog();
    updateSuggestions();
    updateSticky();
  }

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    state.category = 'all';
    renderResults();
    updateSuggestions();
  });
  searchInput.addEventListener('focus',updateSuggestions);
  searchInput.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeSuggestions();searchInput.blur();}
    if(event.key==='ArrowDown'&&!suggestions.hidden){event.preventDefault();suggestions.querySelector('button')?.focus();}
  });
  document.addEventListener('pointerdown',event=>{
    if(!searchForm.contains(event.target)&&!suggestions.contains(event.target)) closeSuggestions();
  });
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    state.query = searchInput.value;
    state.category = 'all';
    renderResults(); closeSuggestions();
    (menuSections.find(section => !section.hidden) || noResults).scrollIntoView({behavior:scrollBehavior(),block:'start'});
  });
  categoryGrid.addEventListener('click', event => {
    const link=event.target.closest('.category-card');
    if(!link)return;
    event.preventDefault(); setCategory(link.dataset.filter);
  });
  stickyBar.addEventListener('click',event=>{
    const link=event.target.closest('.sticky-category-link');
    if(link) setCategory(link.dataset.filter);
  });
  resetFilter.addEventListener('click',()=>resetAll(true));
  window.addEventListener('popstate', restoreCategory);
  window.addEventListener('hashchange', restoreCategory);
  priceFilter.addEventListener('click', event => {
    const button = event.target.closest('[data-price-range]');
    if (!button) return;
    state.price = button.dataset.priceRange;
    closeSuggestions(); renderResults(true);
  });

  // Reflect the currently visible section in the fixed navigation when browsing all items.
  let scrollTick = false;
  function syncActiveStickySection() {
    scrollTick = false;
    if (state.category !== 'all' || state.price !== 'all' || state.query.trim()) return;
    const headerBottom = siteHeader.getBoundingClientRect().bottom + stickyBar.offsetHeight + 20;
    let active = null;
    menuSections.forEach(section => {
      if (!section.hidden && section.getBoundingClientRect().top <= headerBottom + 55) active = section.id;
    });
    stickyLinks.forEach(link => {
      const isActive = link.dataset.filter === active;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      syncActiveStickySection();
      updateSticky();
    });
  }, {passive: true});
  window.addEventListener('resize',updateSticky,{passive:true});

  products.forEach(prepareCard);
  // Fade the text out, swap RTL/LTR at the midpoint, then bring it back in.
  // The original brown/gold hero remains; the decorative coffee was intentionally removed.
  let switchingLanguage = false;
  languageToggle.addEventListener('click', () => {
    if (switchingLanguage) return;
    switchingLanguage = true;
    languageToggle.disabled = true;
    languageToggle.classList.add('is-switching');
    const swap = () => {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      translatePage();
      document.body.classList.remove('language-transition-out');
      document.body.classList.add('language-transition-in');
    };
    const finish = () => {
      document.body.classList.remove('language-transition-in');
      languageToggle.classList.remove('is-switching');
      languageToggle.disabled = false;
      switchingLanguage = false;
    };
    if (prefersReducedMotion?.matches) {
      swap();
      finish();
      return;
    }
    document.body.classList.add('language-transition-out');
    window.setTimeout(() => {
      swap();
      window.setTimeout(finish, 270);
    }, 190);
  });
  dialogClose.addEventListener('click', closeDetails);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDetails();
  });
  dialog.addEventListener('click', event => {
    // Clicking on dark backdrop (outside dialog-shell) closes the modal.
    if (event.target === dialog) closeDetails();
  });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('is-closing');
    dialog.style.removeProperty('--dialog-exit-opacity');
    dialog.style.removeProperty('--dialog-exit-transform');
    document.body.classList.remove('dialog-open');
    state.activeProduct = null;
    // Restore keyboard focus to the original item unless it was hidden by a filter.
  });


  state.category = categoryFromLocation();
  translatePage();
  observeProductRows();
  prioritizeMenuImages();
  syncActiveStickySection();
  const linkedItem = new URLSearchParams(location.search).get('item');
  if (linkedItem) {
    const matched = products.find(p => p.trigger && (normalize(p.name) === normalize(linkedItem) || normalize(p.en) === normalize(linkedItem)));
    if (matched) openDetails(matched);
  }
})();
