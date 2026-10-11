import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3g8Hod4iVtciM4eyWZWCZnxJJAPHr75o",
    authDomain: "mido-basterma.firebaseapp.com",
    databaseURL: "https://mido-basterma-default-rtdb.firebaseio.com",
    projectId: "mido-basterma",
    storageBucket: "mido-basterma.firebasestorage.app",
    messagingSenderId: "561976098166",
    appId: "1:561976098166:web:8aa5f1f6af3ebc900d4e57"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let RATE = 89000; 
let menuItems = [];
let cart = [];
let currentItemToCustomize = null;
let currentKiloItem = null;
let storePhone = "96170359935"; 
let geminiApiKey = ""; // لحفظ مفتاح الذكاء الاصطناعي

// جلب الإعدادات (أرقام التواصل وسعر الصرف ومفتاح AI)
onValue(ref(db, 'settings/contact'), (snapshot) => {
    const contact = snapshot.val();
    if (contact) {
        storePhone = contact.whatsapp || "96170359935"; 
        geminiApiKey = contact.geminiApiKey || ""; 
        const waBtn = document.getElementById('waLinkBtn');
        const phBtn = document.getElementById('phoneLinkBtn');
        if(waBtn) waBtn.href = `whatsapp://send?phone=${storePhone}`;
        if(phBtn) phBtn.href = `tel:${contact.phone || '01382472'}`;
        
        if (contact.rate && contact.rate !== RATE) {
            RATE = contact.rate;
            if (menuItems.length > 0) renderMenu();
            if (cart.length > 0) updateCartUI();
        }
    }
});

// جلب الداتا من فايربيس (مع الترتيب)
onValue(ref(db, 'menuItems'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        menuItems = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
        renderMenu();
    } else {
        document.getElementById("sandwichesContainer").innerHTML = '<p style="text-align:center;width:100%;">جاري تحميل المنيو...</p>';
    }
});

// ===== RENDER =====
function renderMenu() {
  const sandContainer  = document.getElementById("sandwichesContainer");
  const kiloContainer  = document.getElementById("kiloContainer");
  const drinksContainer = document.getElementById("drinksContainer");

  if(sandContainer) sandContainer.innerHTML = menuItems.filter(i=>i.type==='sandwich').map(item=>{
    const usd = (item.price/RATE).toFixed(2);
    const badge = item.badge ? `<div class="product-badge">⭐ ${item.badge}</div>` : '';
    return `
      <div class="product">
        <div class="product-img-wrap">
          <img src="${item.img || 'https://midomido.neocities.org/bastermaa.jpg'}" alt="${item.name}" loading="lazy">
          ${badge}
        </div>
        <div class="product-body">
          <h3>${item.name}</h3>
          <div class="price-box">
            <span class="price-lbp">${item.price.toLocaleString('en-US')} ل.ل</span>
            <span class="price-usd">$${usd}</span>
          </div>
          <button class="add-btn" onclick="prepareOrder('${item.id}')">
            <i class="fa-solid fa-sliders"></i> اطلب وعدّل
          </button>
        </div>
      </div>`;
  }).join('');

  if(kiloContainer) kiloContainer.innerHTML = menuItems.filter(i=>i.type==='kilo').map(item=>{
    const usd = (item.price/RATE).toFixed(2);
    const visual = item.img ? `<img src="${item.img}" style="width: 80px; height: 80px; object-fit: contain;">` : `<div class="kilo-icon">${item.icon||'⚖️'}</div>`;
    
    return `
      <div class="kilo-card">
        ${visual}
        <h3>${item.name}</h3>
        <div class="price-box" style="width:100%;">
          <span class="price-lbp">${item.price.toLocaleString('en-US')} ل.ل / كيلو</span>
          <span class="price-usd">$${usd}</span>
        </div>
        <button class="add-btn" onclick="openWeightModal('${item.id}')">
          <i class="fa-solid fa-weight-scale"></i> حدد الوزن
        </button>
      </div>`;
  }).join('');

  if(drinksContainer) drinksContainer.innerHTML = menuItems.filter(i=>i.type==='drink').map(item=>{
    const usd = (item.price/RATE).toFixed(2);
    return `
      <div class="product">
        <div class="product-img-wrap">
          <img src="${item.img || 'https://midomido.neocities.org/mido/%D8%A8%D9%8A%D8%A8%D8%B3%D9%8A.png'}" alt="${item.name}" loading="lazy">
        </div>
        <div class="product-body">
          <h3>${item.name}</h3>
          <div class="price-box">
            <span class="price-lbp">${item.price.toLocaleString('en-US')} ل.ل</span>
            <span class="price-usd">$${usd}</span>
          </div>
          <button class="add-btn" onclick="addToCartDirect('${item.id}')">
            <i class="fa-solid fa-circle-plus"></i> أضف للسلة
          </button>
        </div>
      </div>`;
  }).join('');
}

function triggerCartAnimation() {
  const btn = document.querySelector('.cart-float');
  if(btn) {
    btn.classList.remove('cart-added-animation');
    void btn.offsetWidth;
    btn.classList.add('cart-added-animation');
    setTimeout(()=>btn.classList.remove('cart-added-animation'), 600);
  }
}

function openClearCartModal() {
  if(cart.length===0){ openModal('emptyAlertModal'); return; }
  openModal('clearCartModal');
}
function closeClearCartModal() { closeModal('clearCartModal'); }
function closeEmptyAlertModal() { closeModal('emptyAlertModal'); }
function confirmClearCart() { cart=[]; updateCartUI(); closeClearCartModal(); }

function updateCartUI() {
  let totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  document.getElementById("cartCount").innerText = totalItems;
  
  const cartItemsDiv = document.getElementById("cartItems");
  let totalLBP = 0;
  
  if(cart.length === 0){
    cartItemsDiv.innerHTML = `<div class="empty-cart"><i class="fa-solid fa-cart-shopping"></i><p>السلة فارغة 😕</p><p style="font-size:0.85em;color:#bbb;margin-top:5px;">أضف منتجات من القائمة</p></div>`;
  } else {
    cartItemsDiv.innerHTML = cart.map((item, index) => {
      let itemTotal = item.price * (item.qty || 1);
      totalLBP += itemTotal;
      let qtyText = item.qty > 1 ? `<span style="color:var(--red); font-weight:bold; margin-right:5px;">(x${item.qty})</span>` : '';
      
      return `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name} ${qtyText}</div>
            ${item.notes ? `<span class="cart-notes">${item.notes}</span>` : ''}
            <div class="cart-item-price">${itemTotal.toLocaleString()} ل.ل</div>
          </div>
          <div class="cart-item-remove" onclick="removeFromCart(${index})">
            <i class="fa-solid fa-xmark"></i>
          </div>
        </div>`;
    }).join('');
  }
  document.getElementById("cartTotalLBP").innerText = totalLBP.toLocaleString() + " ل.ل";
  document.getElementById("cartTotalUSD").innerText = "$" + (totalLBP/RATE).toFixed(2);
}

function removeFromCart(index) {
  if (cart[index].qty > 1) {
    cart[index].qty--;
  } else {
    cart.splice(index, 1);
  }
  updateCartUI();
}

function addItemToCart(newItem) {
  let existingItem = cart.find(item => item.name === newItem.name && item.notes === newItem.notes);
  if (existingItem) {
    existingItem.qty = (existingItem.qty || 1) + 1;
  } else {
    newItem.qty = 1;
    cart.push(newItem);
  }
  updateCartUI();
  triggerCartAnimation();
}

function prepareOrder(id) {
  const item = menuItems.find(p=>p.id===id || p.id==id);
  currentItemToCustomize = item;
  const list = document.getElementById("ingredientsList");
  let ingredients = item.ingredients || ["مايونيز","خردل","بندورة","كبيس"];
  list.innerHTML = ingredients.map(ing=>`
    <label class="ingredient-option" id="opt_${ing}">
      <span>${ing}</span>
      <input type="checkbox" value="${ing}" checked onchange="toggleIngredientStyle('opt_${ing}', this.checked)">
    </label>`).join('');
  openModal('customizeModal');
}

function toggleIngredientStyle(id, checked) {
  const el = document.getElementById(id);
  el.classList.toggle('unchecked', !checked);
}

function confirmAddToCart() {
  const checkboxes = document.querySelectorAll('#ingredientsList input[type="checkbox"]');
  let excluded = [];
  checkboxes.forEach(box=>{ if(!box.checked) excluded.push(box.value); });
  let noteText = excluded.length > 0 ? "(بدون: " + excluded.join("، ") + ")" : "";
  
  addItemToCart({...currentItemToCustomize, notes: noteText});
  closeCustomizeModal();
}

function openWeightModal(id) {
  currentKiloItem = menuItems.find(p=>p.id===id || p.id==id);
  openModal('weightModal');
}

function closeWeightModal() { closeModal('weightModal'); }

function selectWeight(grams) {
  if(!currentKiloItem) return;
  const names = {200:"وقية (200غ)",300:"وقية ونصف (300غ)",400:"وقيتين (400غ)",500:"نصف كيلو (500غ)",600:"3 وقيات (600غ)",750:"كيلو إلا ربع (750غ)",800:"4 وقيات (800غ)",1000:"كيلو كامل (1000غ)"};
  const calculatedPrice = (currentKiloItem.price/1000)*grams;
  
  addItemToCart({ name:currentKiloItem.name, price:calculatedPrice, notes:`(كمية: ${names[grams]||grams+'غ'})`, img:null });
  closeWeightModal();
}

function addToCartDirect(id) {
  const item = menuItems.find(p=>p.id===id || p.id==id);
  addItemToCart({...item, notes:""});
}

function openModal(id) {
  const m = document.getElementById(id);
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('active'));
  history.pushState({ modal: id }, null, "#" + id);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m.classList.contains('active')) {
    m.classList.remove('active');
    m.style.display = 'none';
    if (window.location.hash === "#" + id) {
      history.replaceState(null, null, window.location.pathname);
    }
  }
}

function closeCustomizeModal() { closeModal('customizeModal'); }

function toggleCart() {
  const m = document.getElementById("cartModal");
  if(m.classList.contains('active')) {
    history.back();
  } else {
    updateCartUI();
    openModal('cartModal');
  }
}

// ===== SEND ORDER =====
function sendOrder() {
  if(cart.length === 0){ openModal('emptyAlertModal'); return; }
  
  let message = "مرحبا ميدو، طلبي من الموقع :%0a%0a";
  let total = 0;
  
  let groupedCart = {};
  cart.forEach(item => {
    let itemQty = item.qty || 1;
    total += item.price * itemQty;
    
    // تنظيف الملاحظات (إزالة الأقواس واستبدال "بدون:" بـ "بلا")
    let note = (item.notes && item.notes.trim() !== "")
      ? item.notes.replace(/^\(\vert{}\)$/g, '').replace('بدون: ', 'بلا ')
      : "عادي";
    
    if (!groupedCart[item.name]) {
      groupedCart[item.name] = { totalQty: 0, variants: {} };
    }
    groupedCart[item.name].totalQty += itemQty;
    
    if (!groupedCart[item.name].variants[note]) {
      groupedCart[item.name].variants[note] = 0;
    }
    groupedCart[item.name].variants[note] += itemQty;
  });
  
  for (const [name, data] of Object.entries(groupedCart)) {
    message += `- ${name} (x${data.totalQty})%0a`;
    
    let variantKeys = Object.keys(data.variants);
    // إذا كان الصنف كله "عادي" بدون أي تعديل، لا نطبع التفاصيل
    if (variantKeys.length === 1 && variantKeys[0] === "عادي") {
        // لا تفعل شيئاً إضافياً
    } else {
        for (const [note, qty] of Object.entries(data.variants)) {
          message += `- ${qty} ${note}%0a`;
        }
        message += `--------------%0a`;
    }
  }
  
  const usdTotal = (total/RATE).toFixed(2);
  // وضع العنوان قبل المجموع كما طلبت
  message += `%0aالعنوان : %0a`;
  message += `*المجموع الدقيق: ${total.toLocaleString('en-US')} ل.ل (${usdTotal}$)*`;
  
  window.location.href = `whatsapp://send?phone=${storePhone}&text=${message}`;
}

function checkStatus() {
  const now = new Date().toLocaleString("en-US",{timeZone:"Asia/Beirut"});
  const d = new Date(now);
  const h = d.getHours(), m = d.getMinutes();
  const open = (h>10||(h===10&&m>=0)) && (h<23||(h===23&&m<=30));
  const box = document.getElementById("statusBox");
  if(box) {
      box.innerHTML = open
        ? `<span class="status-dot"></span>🟢 مفتوح الآن (اطلب دليفري)`
        : `<span class="status-dot"></span>🔴 مغلق الآن (نفتح 10 ص)`;
      box.className = open ? 'open' : 'closed';
  }
}

function updateVisitorCounter() {
  const BASE_COUNT = 1500;
  const today = new Date();
  const START_DATE = new Date('2025-12-02');
  const diffDays = Math.floor((today-START_DATE)/(1000*60*60*24));
  let acc = 0;
  for(let i=0;i<=diffDays;i++){
    let d=new Date(START_DATE.getTime()+(i*86400000));
    let seed=d.getDate()*1000+(d.getMonth()+1)*100+d.getFullYear();
    seed=(seed*9301+49297)%233280;
    acc+=Math.floor((seed/233280)*11)+20;
  }
  let final = BASE_COUNT+acc;
  const key='mido_visited_today';
  if(localStorage.getItem(key)!==today.toDateString()){final++;localStorage.setItem(key,today.toDateString());}
  const counterDiv = document.getElementById('counter');
  if(counterDiv) counterDiv.innerHTML = `👑 عدد الزوار: <span>${final.toLocaleString('en-US')}</span>`;
}

// ===== CHATBOT & VOICE AI =====
let chatHistory = [];

function toggleChat() {
  const box = document.getElementById("chatBox");
  if (box.classList.contains('open')) {
    history.back(); // إغلاق المحادثة بزر الرجوع
  } else {
    box.classList.add('open');
    history.pushState({ modal: 'chatBox' }, null, "#chatBox");
  }
}

function sendPredefined(text) {
  document.getElementById("chatInput").value = text;
  sendUserMsg();
}

async function sendUserMsg() {
  const inputEl = document.getElementById("chatInput");
  const text = inputEl.value.trim();
  if (!text) return;
  
  const b = document.getElementById("chatBody");
  
  // تحويل النزول لسطر جديد في رسالة المستخدم إلى كود <br> ليظهر بشكل صحيح
  let formattedUserText = text.replace(/\n/g, '<br>');
  b.innerHTML += `<div class="user-msg">${formattedUserText}</div>`;
  
  inputEl.value = "";
  b.scrollTop = b.scrollHeight;
  
  const options = document.getElementById("chatOptions");
  if(options) options.style.display = "none";
  
  const typingId = "typing_" + Date.now();
  b.innerHTML += `<div class="bot-msg" id="${typingId}">المساعد عم يفكر... 🤖</div>`;
  b.scrollTop = b.scrollHeight;
  
  const botReply = await callGeminiAPI(text);
  
  document.getElementById(typingId).remove();
  let formattedReply = botReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formattedReply = formattedReply.replace(/\n/g, '<br>');
  b.innerHTML += `<div class="bot-msg">${formattedReply}</div>`;
  b.scrollTop = b.scrollHeight;
}

async function callGeminiAPI(userText, base64Audio = null, mimeType = null) {
  if (!geminiApiKey) {
      return "عذراً يا غالي، المساعد الذكي متوقف حالياً. لازم الإدارة تضيف المفتاح من صفحة الأدمن أولاً.";
  }
  
  let menuText = menuItems.map(i => `${i.name} (السعر: ${i.price.toLocaleString('en-US')} ل.ل)`).join(' | ');
  
  const systemPrompt = `أنت المساعد الشخصي الذكي لمطعم "ميدو ملك البسترما".
معلومات المطعم:
- فرع الشياح، طريق صيدا القديمة، مبنى سنتر دالاس بعد حلويات صدقة.
- الفرع الأساسي في خلدة، وفرع الجية.
- اللحم حلال 100%. نبيع بالكيلو وبالسندويشات.
- أصناف السندويشات: بسترما، روستو، سجق، مقانق، هوت دوغ، روستو مع جبنة. الخبز افرنجي فقط.
- قائمة الأصناف المتوفرة لدينا وأسعارها الحقيقية: ${menuText}.

تعليماتك الصارمة والأساسية (شخصيتك وأسلوبك):
- اسمك "مساعد ميدو الذكي".
- شخصيتك: فرفوش، كريم، مضياف، وبشوش جداً.
- لهجتك: لبنانية أصيلة ومحكية 100%.
- إذا سألك الزبون عن السعر، أعطه السعر المكتوب في القائمة ولا تخترع أي سعر من عندك.
- تنبيه برمجي حاسم: أنت لست آلة حاسبة! ممنوع نهائياً أن تحسب المجموع النهائي للزبون. النظام سيتولى ذلك.
    
طريقة إنهاء الطلب وإصدار الكود السري (مهم جداً جداً):
- عندما يؤكد الزبون الطلب بالكامل، اكتب في نهاية رسالتك الكود السري التالي بالضبط:
$$ORDER:اسم الصنف=الكمية=ملاحظات|اسم الصنف=الكمية=ملاحظات$$

قواعد كتابة الكود السري:
1. يجب فصل كل صنف بعلامة الخط العمودي (|) حصراً وليس فاصلة.
2. يجب فصل الاسم والكمية والملاحظات بعلامة يساوى (=).
3. إذا لم يطلب الزبون أي تعديل، اكتب في خانة الملاحظات كلمة "عادي".
4. إذا طلب الزبون تعديل (مثلاً: 5 روستو، 3 منهم بلا خس و2 عادي)، افصلها هكذا:
$$ORDER:سندويش روستو=3=بلا خس|سندويش روستو=2=عادي$$
ملاحظة: تأكد من كتابة أسماء الأصناف في الكود السري مطابقة تماماً للقائمة المذكورة.`;

  if (chatHistory.length === 0) {
      chatHistory.push({ role: "user", parts: [{ text: "ابدأ وتعرف على تعليماتك" }] });
      chatHistory.push({ role: "model", parts: [{ text: "يا مية هلا وغلا فيك يا غالي! أنا مساعد ميدو، فرفوش وجاهز آخد طلبك لتاكل أطيب لقمة.. شو بتأمرني؟ 👑" }] });
  }

  let userParts = [];
  if (userText) userParts.push({ text: userText });
  if (base64Audio) {
      let cleanMime = mimeType ? mimeType.split(';')[0] : "audio/webm";
      userParts.push({ inlineData: { mimeType: cleanMime, data: base64Audio } });
  }

  chatHistory.push({ role: "user", parts: userParts });

  try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: chatHistory
          })
      });
      const data = await response.json();
      if(data.error) {
          console.error(data.error);
          return "عذراً يا غالي، يبدو أن مفتاح الذكاء الاصطناعي غير صحيح أو انتهت الباقة الخاصة به.";
      }
      
      let botText = data.candidates[0].content.parts[0].text;
      
      // ===== تدخل الجافاسكريبت لحساب وتجميع الطلب =====
      const orderRegex = /\$\$ORDER:(.*?)\$\$/;
      const match = botText.match(orderRegex);
      
      if(match) {
         let itemsStr = match[1];
         
         // تصحيح الأخطاء إذا استخدم المساعد فواصل بالخطأ
         if (!itemsStr.includes('|') && itemsStr.includes(',')) {
             itemsStr = itemsStr.replace(/,/g, '|');
         }
         
         let total = 0;
         let groupedCart = {};
         
         itemsStr.split('|').forEach((pair) => {
            let parts = pair.split('=');
            if(parts.length >= 2) {
                let name = parts[0].trim();
                let qty = parseInt(parts[1].trim()) || 1;
                let note = parts[2] ? parts[2].trim() : "عادي";
                
                if (note === "" || note === "null" || note === "بدون") note = "عادي";
                
                let exactItem = menuItems.find(i => i.name === name) || menuItems.find(i => i.name.includes(name) || name.includes(i.name));
                
                if(exactItem) {
                    total += exactItem.price * qty;
                    
                    if (!groupedCart[exactItem.name]) {
                        groupedCart[exactItem.name] = { totalQty: 0, variants: {} };
                    }
                    groupedCart[exactItem.name].totalQty += qty;
                    
                    if (!groupedCart[exactItem.name].variants[note]) {
                        groupedCart[exactItem.name].variants[note] = 0;
                    }
                    groupedCart[exactItem.name].variants[note] += qty;
                }
            }
         });
         
         let orderTextForWa = "مرحبا ميدو، طلبي من المساعد الذكي:%0a%0a";
         let invoiceHtml = "";
         
         for (const [name, data] of Object.entries(groupedCart)) {
            orderTextForWa += `- ${name} (x${data.totalQty})%0a`;
            invoiceHtml += `<strong>${name} (x${data.totalQty})</strong><br>`;
            
            let variantKeys = Object.keys(data.variants);
            if (variantKeys.length === 1 && variantKeys[0] === "عادي") {
                // إذا كان الطلب كله عادياً، نتجاوز طبع التفاصيل
            } else {
                for (const [note, qty] of Object.entries(data.variants)) {
                   orderTextForWa += `- ${qty} ${note}%0a`;
                   invoiceHtml += `<span style="color:#777; font-size:0.9em;">- ${qty} ${note}</span><br>`;
                }
                orderTextForWa += `--------------%0a`;
            }
         }
         
         const usdTotal = (total/RATE).toFixed(2);
         orderTextForWa += `%0aالعنوان : %0a`;
         orderTextForWa += `*المجموع الدقيق: ${total.toLocaleString('en-US')} ل.ل (${usdTotal}$)*`;
         
         let waLink = `<br><br><div style="background:#fffaf5; border:1.5px dashed var(--red-light); padding:14px; border-radius:14px; margin-top:10px;">
            <div style="font-weight:900; color:var(--brown); margin-bottom:8px; font-size:1.1em;">🧾 تفاصيل فاتورتك:</div>
            <div style="font-size:0.95em; color:#555; margin-bottom:12px; line-height:1.6;">${invoiceHtml}</div>
            <div style="font-weight:900; color:var(--red); font-size:1.2em; margin-bottom:12px; border-top:1px solid #ddd; padding-top:8px;">المجموع: ${total.toLocaleString('en-US')} ل.ل</div>
            <a href="whatsapp://send?phone=${storePhone}&text=${orderTextForWa}" style="background:linear-gradient(135deg, #1ebe57, #25d366);color:white;padding:12px 15px;border-radius:50px;text-decoration:none;display:inline-flex;align-items:center;gap:8px;font-weight:bold;box-shadow:0 4px 10px rgba(37,211,102,0.3);width:100%;justify-content:center;font-size:1.05em;">
              <i class="fab fa-whatsapp" style="font-size:1.3em;"></i> إرسال الطلب واعتماده
            </a>
         </div>`;
         
         botText = botText.replace(orderRegex, waLink);
      }

      chatHistory.push({ role: "model", parts: [{ text: botText }] });
      return botText;
  } catch (e) {
      console.error(e);
      return "عذراً يا غالي، حدثت مشكلة بالاتصال. جرب مرة أخرى من فضلك.";
  }
}

// ===== NATIVE VOICE RECORDING =====
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
  const micBtn = document.getElementById("micBtn");
  const inputEl = document.getElementById("chatInput");

  if (isRecording) {
    mediaRecorder.stop();
    micBtn.classList.remove("recording");
    inputEl.placeholder = "جاري إرسال مقطع الصوت... 🚀";
    isRecording = false;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      const audioUrl = URL.createObjectURL(audioBlob); 
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        const mimeType = audioBlob.type;

        const b = document.getElementById("chatBody");
        
        b.innerHTML += `
          <div class="user-msg" style="display:flex; flex-direction:column; gap:5px; align-items:flex-end; min-width: 220px;">
            <span style="font-size:0.85em; font-weight:bold;">🎤 رسالتك الصوتية:</span>
            <audio controls src="${audioUrl}" style="width: 100%; height: 35px; outline: none;"></audio>
          </div>`;
        b.scrollTop = b.scrollHeight;

        const options = document.getElementById("chatOptions");
        if(options) options.style.display = "none";

        inputEl.placeholder = "اكتب سؤالك أو احكي...";

        const typingId = "typing_" + Date.now();
        b.innerHTML += `<div class="bot-msg" id="${typingId}">المساعد عم يسمع الفويس... 🎧</div>`;
        b.scrollTop = b.scrollHeight;

        const botReply = await callGeminiAPI("", base64Audio, mimeType);

        document.getElementById(typingId).remove();
        let formattedReply = botReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedReply = formattedReply.replace(/\n/g, '<br>');
        b.innerHTML += `<div class="bot-msg">${formattedReply}</div>`;
        b.scrollTop = b.scrollHeight;
      };
      
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    micBtn.classList.add("recording");
    inputEl.placeholder = "عم سجل... اكبس المايك مرة تانية لتبعت 🎤";

  } catch (err) {
    alert("ما قدرنا نوصل للمايكروفون يا غالي، تأكد إنك عاطي الصلاحية للمتصفح (وإنك فاتح الموقع بـ https).");
    console.error(err);
  }
}

window.onclick = function(event) {
  ['customizeModal','cartModal','clearCartModal','emptyAlertModal','weightModal'].forEach(id=>{
    const m = document.getElementById(id);
    if(event.target === m){ closeModal(id); }
  });
};

// تفعيل زر الرجوع للموبايل لجميع النوافذ
window.addEventListener('popstate', function(event) {
  ['customizeModal','cartModal','clearCartModal','emptyAlertModal','weightModal'].forEach(id => {
    const m = document.getElementById(id);
    if (m && m.classList.contains('active')) {
      m.classList.remove('active');
      m.style.display = 'none';
    }
  });
  
  const chatBox = document.getElementById("chatBox");
  if (chatBox && chatBox.classList.contains('open')) {
    chatBox.classList.remove('open');
  }
});

window.addEventListener('scroll', ()=>{
  const scrollBtn = document.getElementById('scrollTop');
  if(scrollBtn) scrollBtn.classList.toggle('visible', window.scrollY > 300);
});

checkStatus();
updateVisitorCounter();
setInterval(updateVisitorCounter, 3600000);
setInterval(checkStatus, 60000);

// ===== ربط الفنكشنات بالـ Window لتشتغل من الـ HTML =====
window.renderMenu = renderMenu;
window.prepareOrder = prepareOrder;
window.openWeightModal = openWeightModal;
window.addToCartDirect = addToCartDirect;
window.openModal = openModal;
window.closeModal = closeModal;
window.openClearCartModal = openClearCartModal;
window.closeClearCartModal = closeClearCartModal;
window.confirmClearCart = confirmClearCart;
window.closeEmptyAlertModal = closeEmptyAlertModal;
window.updateCartUI = updateCartUI;
window.removeFromCart = removeFromCart;
window.toggleIngredientStyle = toggleIngredientStyle;
window.confirmAddToCart = confirmAddToCart;
window.closeWeightModal = closeWeightModal;
window.selectWeight = selectWeight;
window.toggleCart = toggleCart;
window.closeCustomizeModal = closeCustomizeModal;
window.sendOrder = sendOrder;
window.toggleChat = toggleChat;
window.sendPredefined = sendPredefined;
window.sendUserMsg = sendUserMsg;
window.toggleRecording = toggleRecording;
