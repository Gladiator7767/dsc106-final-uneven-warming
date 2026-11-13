'use strict';
fetch('content.json').then(r=>{if(!r.ok)throw Error('Content unavailable');return r.json();}).then(copy=>{document.querySelectorAll('[data-copy]').forEach(el=>{if(copy[el.dataset.copy]?.en)el.textContent=copy[el.dataset.copy].en;});}).catch(()=>{});
