/* Genting planner: dependency-free, device-local state and touch/keyboard reordering. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const clone = x => JSON.parse(JSON.stringify(x));
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = ['28 Sep','29 Sep','30 Sep','1 Oct'];
  const key = 'gentingPlanner_v2';
  const defaults = window.TRIP_DEFAULTS;
  const venues = window.GENTING_VENUES;
  const originals = defaults.flatMap(d => d.items);
  const activities = [
    ['SkyAvenue shopping & indoor stroll','SkyAvenue','Summit','Shopping','Indoor shopping and a flexible break.'],
    ['First World Plaza exploring','First World Plaza','Summit','Shopping','Browse shops and stop for snacks.'],
    ['Skytropolis Indoor Theme Park','First World Plaza','Summit','Indoor activities','Check tickets, opening times and ride restrictions before visiting.'],
    ['Awana SkyWay cable-car ride','SkyAvenue ↔ Awana SkyCentral','Mid-hill','Cable car','Allow for queues and check the last return ride.'],
    ['Premium Outlets shopping','Genting Highlands Premium Outlets','Mid-hill','Shopping','Take the cable car to Awana or drive; leave time for the return journey.'],
    ['Genting Bowl','First World Plaza · Level 3','Summit','Indoor activities','Check lane availability for the group.'],
    ['SnowWorld','First World Plaza','Summit','Indoor activities','Check ticket availability and current entry conditions.'],
    ["Ripley’s Believe It or Not!",'SkyAvenue · Level 4A','Summit','Indoor activities','Check admission and group suitability.'],
    ['Hotel rest & free time','Your hotel','Summit','Rest','A flexible break for the family.'],
    ['Coffee & dessert break','Choose a café from the food list','Summit','Rest','Pick a café or dessert stop using the cuisine filter.']
  ].map((a,i)=>({id:'activity-'+i,name:a[0],area:a[1],zone:a[2],category:a[3],type:'activity',cuisines:[],note:a[4]}));
  const allOptions = [...activities,...venues];
  let state = clone(defaults), activeDay = 'd1', undoStack = [], editingId = null, returnFocus = null;
  let storageProblem = false;
  const valid = x => Array.isArray(x) && x.length === 4 && x.every((d,i) => d.id === defaults[i].id && Array.isArray(d.items) && d.items.every(it => it && typeof it.id === 'string' && ['time','title','place','note'].every(k => typeof it[k] === 'string'))) && new Set(x.flatMap(d=>d.items.map(it=>it.id))).size === originals.length && x.flatMap(d=>d.items).length === originals.length && originals.every(it => x.some(d=>d.items.some(j=>j.id===it.id)));
  function announce(message, error=false) { $('#save-status').textContent=message; $('#save-status').classList.toggle('save-error',error); }
  try {
    const raw=localStorage.getItem(key);
    if(raw) {
      const saved=JSON.parse(raw);
      if(valid(saved)) state=saved;
      else {storageProblem=true;announce('Saved plans could not be read. Original plans are shown; your previous data has not been replaced.',true);}
    } else {
      state.forEach(d=>d.items.forEach(it=>{
        if(it.legacyMeal === undefined) return;
        const saved=localStorage.getItem('gentingMeal_'+it.legacyMeal);
        if(saved && saved !== it.place) {
          it.place=saved; it.title='Meal';
          const v=venues.find(v=>v.name.toLowerCase()===saved.toLowerCase());
          it.note=v ? [v.area,v.level,v.zone].filter(Boolean).join(' · ') : 'Your previously selected restaurant. Confirm the location before setting off.';
        }
      }));
    }
  } catch {storageProblem=true;announce('Device storage is unavailable or saved data is unreadable. Changes may only last this session.',true);}
  function persist(message='Saved on this device') {
    try {
      // Keep unreadable older data for recovery before the first explicit edit.
      if(storageProblem) { const old=localStorage.getItem(key); if(old) localStorage.setItem(key+'_recovery',old); }
      localStorage.setItem(key,JSON.stringify(state));storageProblem=false;announce(message);
    } catch {announce('Change kept for this session only — device storage is unavailable.',true);}
  }
  function locate(id){for(const day of state){const index=day.items.findIndex(it=>it.id===id);if(index>=0)return {day,index,item:day.items[index]};}return null;}
  function change(fn,message){undoStack.push(clone(state));if(undoStack.length>30)undoStack.shift();fn();persist(message);render();}
  function move(id,dayId,targetId=null,after=false){
    const from=locate(id),dest=state.find(d=>d.id===dayId);if(!from||!dest||id===targetId)return;
    change(()=>{const [item]=from.day.items.splice(from.index,1);let at=targetId?dest.items.findIndex(it=>it.id===targetId):dest.items.length;if(at<0)at=dest.items.length;else if(targetId&&after)at++;dest.items.splice(at,0,item);activeDay=dayId;},'Stop moved. Check its time and travel connections.');
  }
  function showDay(id){activeDay=id;document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t.dataset.day===id);t.setAttribute('aria-pressed',String(t.dataset.day===id));});document.querySelectorAll('.day').forEach(d=>d.classList.toggle('hidden',d.id!==id));}
  $('.tabs').innerHTML=defaults.map((d,i)=>`<button class="tab" data-day="${d.id}" aria-controls="${d.id}">${labels[i]}</button>`).join('');
  $('.tabs').addEventListener('click',e=>{const tab=e.target.closest('.tab');if(tab)showDay(tab.dataset.day);});
  function render(){
    $('#undo').disabled=!undoStack.length;
    $('#itinerary').innerHTML=state.map((day,di)=>`<section id="${day.id}" class="day"><h2 class="section-title">${esc(defaults[di].title)}</h2><p class="section-note">${esc(defaults[di].note)}</p><p class="day-progress">${day.items.filter(it=>it.done).length} of ${day.items.length} stops done</p><div class="items" data-day="${day.id}">${day.items.length?day.items.map((it,i)=>`<article class="card${it.done?' is-done':''}" data-id="${it.id}"><div class="card-heading"><button class="drag-handle" aria-label="Drag ${esc(it.title)}. Use the move controls for keyboard reordering." title="Drag to reorder">⠿</button><div class="card-content"><div class="time">${esc(it.time)}</div><h3 class="plan-title">${esc(it.title)}</h3>${it.place?`<div class="place">${esc(it.place)}</div>`:''}${it.note?`<div class="note">${esc(it.note)}</div>`:''}</div></div><div class="card-actions"><button class="action done-button" data-action="done" aria-pressed="${!!it.done}" aria-label="${it.done?'Mark not done':'Mark done'}: ${esc(it.title)}">${it.done?'✓ Done · undo':'Done'}</button><button class="action primary" data-action="swap">Swap plan</button><button class="action" data-action="edit">Edit</button><button class="action" data-action="up" aria-label="Move ${esc(it.title)} up" ${i===0?'disabled':''}>↑</button><button class="action" data-action="down" aria-label="Move ${esc(it.title)} down" ${i===day.items.length-1?'disabled':''}>↓</button><select class="move-select" aria-label="Move ${esc(it.title)} to another day"><option value="">Move to day…</option>${defaults.map((d,j)=>`<option value="${d.id}" ${d.id===day.id?'disabled':''}>${labels[j]}</option>`).join('')}</select></div></article>`).join(''):'<p class="empty-day">No stops here. Drop a stop here or use “Move to day”.</p>'}</div></section>`).join('');
    showDay(activeDay);
  }
  $('#itinerary').addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]'),card=e.target.closest('.card');if(!btn||!card)return;
    const id=card.dataset.id,l=locate(id);
    if(btn.dataset.action==='swap'||btn.dataset.action==='edit')openEditor(id,btn.dataset.action==='edit',btn);
    else if(btn.dataset.action==='done'){change(()=>l.item.done=!l.item.done,l.item.done?'Stop marked not done':'Stop marked done');focusStop(id,'done');}
    else if(btn.dataset.action==='up'&&l.index>0){move(id,l.day.id,l.day.items[l.index-1].id);focusStop(id,'up');}
    else if(btn.dataset.action==='down'&&l.index<l.day.items.length-1){move(id,l.day.id,l.day.items[l.index+1].id,true);focusStop(id,'down');}
  });
  function focusStop(id,action){const card=$(`[data-id="${id}"]`);(card?.querySelector(`[data-action="${action}"]:not(:disabled)`)||card?.querySelector('[data-action="swap"]'))?.focus();}
  $('#itinerary').addEventListener('change',e=>{if(e.target.matches('.move-select')&&e.target.value){const id=e.target.closest('.card').dataset.id;move(id,e.target.value);focusStop(id,'swap');}});
  $('#undo').onclick=()=>{if(undoStack.length){state=undoStack.pop();persist('Change undone');render();}};
  $('#restore').onclick=()=>{if(confirm('Restore all original plans and times? You can undo this. Your checklist stays as it is.'))change(()=>state=clone(defaults),'Original itinerary restored');};

  // Shared filters keep the directory and alternative picker consistent.
  function makeFilters(container,prefix,onChange,includeActivities=false){
    const types=[['all','Everything'],['restaurant','Food & drinks'],['shop','Shops'],['wellness','Massage & spa'],...(includeActivities?[['activity','Activities & rest']]:[])];
    const groups=[['search','Search',null],['type','Type',types],['cuisine','Cuisine',[['all','All cuisines'],...unique(venues.flatMap(v=>v.cuisines)).map(x=>[x,x])]],['category','Category',[['all','All categories'],...unique((includeActivities?allOptions:venues).map(v=>v.category)).map(x=>[x,x])]],['area','Location',[['all','All locations'],...unique(venues.map(v=>v.area)).map(x=>[x,x])]],['zone','Getting there',[['all','All areas'],['Summit','Summit · resort complex'],['Mid-hill','Mid-hill · cable car / drive'],['Downhill · drive','Gohtong Jaya · drive']]]];
    container.innerHTML=groups.map(([key,label,options])=>`<label for="${prefix}-${key}">${label}${options?`<select id="${prefix}-${key}" data-filter="${key}">${options.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('')}</select>`:`<input id="${prefix}-${key}" data-filter="${key}" type="search" placeholder="Name, food, store or location…">`}</label>`).join('')+'<button class="action" type="button" data-clear>Clear filters</button>';
    container.addEventListener('input',e=>{if(e.target.matches('input'))onChange();});container.addEventListener('change',e=>{if(e.target.matches('select'))onChange();});
    container.querySelector('[data-clear]').onclick=()=>{container.querySelectorAll('select').forEach(el=>el.value='all');container.querySelector('input').value='';onChange();};
    return ()=>Object.fromEntries([...container.querySelectorAll('[data-filter]')].map(el=>[el.dataset.filter,el.value]));
  }
  function unique(list){return [...new Set(list)].sort((a,b)=>a.localeCompare(b));}
  function filtered(options,f){const terms=f.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return options.filter(v=>(f.type==='all'||v.type===f.type)&&(f.cuisine==='all'||v.cuisines.includes(f.cuisine))&&(f.category==='all'||v.category===f.category)&&(f.area==='all'||v.area===f.area)&&(f.zone==='all'||v.zone===f.zone)&&terms.every(t=>[v.name,v.area,v.level,v.lot,v.category,v.zone,...v.cuisines,...(v.aliases||[])].join(' ').toLocaleLowerCase().includes(t))).sort((a,b)=>a.name.localeCompare(b.name));}
  function venueCard(v,swapping){const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name+' '+v.area+' Genting Highlands');return `<article class="dir-item"><div class="dir-name">${esc(v.name)}</div><div class="dir-meta">${esc([v.area,v.level,v.lot?'Lot '+v.lot:''].filter(Boolean).join(' · '))}</div><div class="tags"><span class="dir-badge zone-badge">${esc(v.zone)}</span><span class="dir-badge">${esc(v.category)}</span>${v.cuisines.map(c=>`<span class="dir-badge">${esc(c)}</span>`).join('')}</div>${v.note?`<div class="dir-meta">${esc(v.note)}</div>`:''}${v.source?`<div class="venue-links"><a href="${esc(map)}" target="_blank" rel="noopener">Map ↗</a><a href="${esc(v.source)}" target="_blank" rel="noopener">Source ↗</a></div>`:''}<button class="action ${swapping?'primary':''}" data-venue="${v.id}">${swapping?'Use this plan':'Use in itinerary'}</button></article>`;}
  let dirLimit=24,swapLimit=24;
  const dirFilters=makeFilters($('#directory-filters'),'dir',()=>{dirLimit=24;renderDirectory();});
  const swapFilters=makeFilters($('#swap-filters'),'swap',()=>{swapLimit=24;renderAlternatives();},true);
  function renderDirectory(){const list=filtered(venues,dirFilters());$('#directory-count').textContent=`${list.length} matches · showing ${Math.min(dirLimit,list.length)}`;$('#dir-list').innerHTML=list.slice(0,dirLimit).map(v=>venueCard(v,false)).join('')||'<p class="no-results">No matches. Try clearing a filter.</p>';$('#show-more').hidden=dirLimit>=list.length;}
  function renderAlternatives(){const list=filtered(allOptions,swapFilters());$('#swap-count').textContent=`${list.length} alternatives · showing ${Math.min(swapLimit,list.length)}`;$('#swap-list').innerHTML=list.slice(0,swapLimit).map(v=>venueCard(v,true)).join('')||'<p class="no-results">No matches. Clear a filter or create a custom plan.</p>';$('#swap-more').hidden=swapLimit>=list.length;}
  $('#show-more').onclick=()=>{dirLimit+=24;renderDirectory();};$('#swap-more').onclick=()=>{swapLimit+=24;renderAlternatives();};
  $('#directory-summary').textContent=`${venues.length} venues, including ${venues.filter(v=>v.type==='restaurant').length} food & drink options. Filter by cuisine, shop category and location.`;
  const dialog=$('#plan-dialog');
  function editorPanel(custom){$('#custom-form').classList.toggle('hidden',!custom);$('#browse-panel').classList.toggle('hidden',custom);$('#browse-tab').classList.toggle('primary',!custom);$('#custom-tab').classList.toggle('primary',custom);$('#dialog-title').textContent=custom?'Edit plan':'Swap plan';}
  function openEditor(id,custom=false,trigger=null){
    const item=locate(id)?.item;if(!item)return;editingId=id;returnFocus=trigger;
    $('#dialog-context').textContent=`${item.time} · ${item.title}. Swapping keeps this time slot.`;
    for(const field of ['time','title','place','note'])$('#edit-'+field).value=item[field];
    $('#swap-filters').querySelectorAll('select').forEach(el=>el.value='all');$('#swap-search').value='';
    if(!custom)$('#swap-type').value=/breakfast|lunch|dinner|meal/i.test(item.title)?'restaurant':/massage/i.test(item.title)?'wellness':'all';
    swapLimit=24;renderAlternatives();editorPanel(custom);dialog.showModal();dialog.scrollTop=0;
  }
  function closeEditor(){dialog.close();}
  $('#close-dialog').onclick=closeEditor;
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else if(editingId)focusStop(editingId,'swap');editingId=null;});
  $('#browse-tab').onclick=()=>editorPanel(false);$('#custom-tab').onclick=()=>editorPanel(true);
  $('#custom-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(['time','title','place','note'].map(k=>[k,$('#edit-'+k).value.trim()]));if(!data.title||!data.time)return;change(()=>Object.assign(locate(editingId).item,data),'Plan updated');closeEditor();};
  $('#original-stop').onclick=()=>{const original=originals.find(it=>it.id===editingId);change(()=>Object.assign(locate(editingId).item,clone(original),{done:false}),'Original stop restored');closeEditor();};
  function applyVenue(id){const v=allOptions.find(v=>v.id===id);if(!v||!editingId)return;change(()=>{const it=locate(editingId).item;it.done=false;it.title=v.name;it.place=[v.area,v.level,v.lot?'Lot '+v.lot:''].filter(Boolean).join(' · ');it.note=[v.zone==='Summit'?'In the summit resort complex.':v.zone==='Mid-hill'?'Mid-hill: take the cable car or drive; allow travel time.':'Gohtong Jaya: drive required; allow travel time.',v.note||'',v.type==='restaurant'?'Confirm opening and a table for nine.':''].filter(Boolean).join(' ');},'Alternative saved. Check the time and travel needed.');closeEditor();}
  $('#swap-list').onclick=e=>{const b=e.target.closest('[data-venue]');if(b)applyVenue(b.dataset.venue);};
  // Directory selection opens a clear slot chooser, so it never silently replaces a stop.
  $('#dir-list').onclick=e=>{const b=e.target.closest('[data-venue]');if(!b)return;const v=venues.find(v=>v.id===b.dataset.venue);returnFocus=b;editingId=null;$('#dialog-title').textContent='Choose a stop to replace';$('#dialog-context').textContent=v.name;$('#custom-form').classList.add('hidden');$('#browse-panel').classList.remove('hidden');$('.dialog-tabs').classList.add('hidden');$('#swap-filters').classList.add('hidden');$('#swap-count').textContent='The selected stop keeps its time.';$('#swap-more').hidden=true;$('#swap-list').innerHTML=state.map((d,i)=>`<div><h3>${labels[i]}</h3>${d.items.map(it=>`<button class="action slot-choice" data-slot="${it.id}" data-choice="${v.id}">${esc(it.time)} · ${esc(it.title)}</button>`).join('')}</div>`).join('');dialog.showModal();dialog.scrollTop=0;};
  $('#swap-list').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b){editingId=b.dataset.slot;applyVenue(b.dataset.choice);}});
  dialog.addEventListener('close',()=>{$('.dialog-tabs').classList.remove('hidden');$('#swap-filters').classList.remove('hidden');});

  // Load the third-party interactive map only on request; never cache map tiles.
  const mapAreas={
    all:{bbox:'101.76,3.38,101.815,3.44',center:'14/3.410/101.788'},
    summit:{bbox:'101.785,3.416,101.804,3.432',center:'16/3.424/101.795'},
    awana:{bbox:'101.777,3.397,101.792,3.411',center:'16/3.404/101.785'},
    gohtong:{bbox:'101.763,3.39,101.785,3.407',center:'15/3.398/101.774'}
  };
  let mapLoaded=false;
  function updateMap(load=false){
    const area=mapAreas[$('#map-area').value];
    $('#map-full').href='https://www.openstreetmap.org/#map='+area.center;
    if(!navigator.onLine){$('#map-status').textContent='You are offline. Reconnect to load the map; saved plans still work.';return;}
    $('#map-status').textContent='Internet needed. Drag to pan; use + / − to zoom. If the map is blank, open the full map.';
    if(load||mapLoaded){
      mapLoaded=true;
      const frame=document.createElement('iframe');
      frame.title='Interactive Genting Highlands area map';
      frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(area.bbox)+'&layer=mapnik';
      $('#map-canvas').replaceChildren(frame);
      $('#load-map').textContent='Reload map';
    }
  }
  $('#load-map').onclick=()=>updateMap(true);
  $('#map-area').onchange=()=>updateMap();
  window.addEventListener('offline',()=>updateMap());
  window.addEventListener('online',()=>updateMap());
  updateMap();

  // Pointer events support touch, pen and mouse; only the handle captures scrolling.
  let drag=null,frame=0;
  function clearTargets(){document.querySelectorAll('.drop-before,.drop-after,.drop-tab').forEach(el=>el.classList.remove('drop-before','drop-after','drop-tab'));}
  function inspectDrop(){
    if(!drag?.started)return;clearTargets();
    const hit=document.elementFromPoint(drag.x,drag.y);const tab=hit?.closest('.tab');
    if(tab){tab.classList.add('drop-tab');if(drag.hoverDay!==tab.dataset.day){drag.hoverDay=tab.dataset.day;drag.hoverAt=performance.now();}if(performance.now()-drag.hoverAt>450)showDay(tab.dataset.day);drag.target={day:tab.dataset.day,id:null,after:false};return;}
    drag.hoverDay=null;
    const card=hit?.closest('.card'),list=hit?.closest('.items');
    if(card&&card.dataset.id!==drag.id){const rect=card.getBoundingClientRect();const after=drag.y>rect.top+rect.height/2;card.classList.add(after?'drop-after':'drop-before');drag.target={day:card.closest('.day').id,id:card.dataset.id,after};}
    else if(list&&!card)drag.target={day:list.dataset.day,id:null,after:false};
    else drag.target=null;
  }
  function dragFrame(){if(!drag?.started)return;const top=$('.tabs').getBoundingClientRect().bottom+30;if(drag.y>innerHeight-80)window.scrollBy(0,12);else if(drag.y<top&&!document.elementFromPoint(drag.x,drag.y)?.closest('.tab'))window.scrollBy(0,-12);inspectDrop();frame=requestAnimationFrame(dragFrame);}
  $('#itinerary').addEventListener('pointerdown',e=>{const handle=e.target.closest('.drag-handle');if(!handle||e.button!==0)return;const card=handle.closest('.card');drag={id:card.dataset.id,handle,card,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,started:false,originDay:activeDay};handle.setPointerCapture(e.pointerId);});
  document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;if(!drag.started&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)<6)return;if(!drag.started){drag.started=true;drag.card.classList.add('dragging');document.body.classList.add('drag-active');drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=locate(drag.id).item.title;document.body.append(drag.ghost);frame=requestAnimationFrame(dragFrame);}drag.ghost.style.left=Math.min(innerWidth-180,Math.max(8,drag.x-50))+'px';drag.ghost.style.top=(drag.y+20)+'px';inspectDrop();});
  function endDrag(cancel=false){if(!drag)return;const d=drag;drag=null;cancelAnimationFrame(frame);d.ghost?.remove();d.card.classList.remove('dragging');document.body.classList.remove('drag-active');clearTargets();if(d.handle.hasPointerCapture(d.pointerId))d.handle.releasePointerCapture(d.pointerId);if(d.started&&!cancel&&d.target){move(d.id,d.target.day,d.target.id,d.target.after);focusStop(d.id,'swap');}else showDay(d.originDay);}
  document.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.pointerId)endDrag();});document.addEventListener('pointercancel',()=>endDrag(true));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)endDrag(true);});

  const checks=[...document.querySelectorAll('.check')];
  try{const saved=JSON.parse(localStorage.getItem('gentingChecks')||'[]');checks.forEach((c,i)=>c.checked=saved[i]===true);}catch{}
  function updateChecks(save){$('#progress').textContent=`${checks.filter(c=>c.checked).length} of ${checks.length} done`;if(save)try{localStorage.setItem('gentingChecks',JSON.stringify(checks.map(c=>c.checked)));}catch{announce('Checklist changes last this session only — device storage is unavailable.',true);}}
  checks.forEach(c=>c.onchange=()=>updateChecks(true));$('#reset').onclick=()=>{checks.forEach(c=>c.checked=false);updateChecks(true);};updateChecks(false);
  render();renderDirectory();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(async reg=>{
      await navigator.serviceWorker.ready;
      $('#offline-status').textContent='Ready offline · plans save on this device';
      reg.update().catch(()=>{});
    }).catch(()=>{$('#offline-status').textContent='Offline setup unavailable. Keep this page open or reconnect and reload.';});
  }else $('#offline-status').textContent='Offline installation is not supported in this browser.';
})();
