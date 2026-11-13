/* Guided CMIP6 story. Calculations are shared with the reviewed Project 3 dataset. */
'use strict';
(async function () {
  const C=window.Climate, $=id=>document.getElementById(id);
  const defaults={region:'arctic',scenario:'ssp585',model:'mean',start:2081,end:2100,smooth:false};
  const state={...defaults};
  const periods=[[2021,2040],[2041,2060],[2081,2100]];
  const color={ssp126:'#146b84',ssp585:'#b94724'},tip=$('tooltip');
  let data,land,copy={},release={},regions,warmingDomain,gapScale,frame=0;
  const fmt=v=>`${v<0?'−':'+'}${Math.abs(v).toFixed(2)}°C`;
  const plain=v=>`${v<0?'−':''}${Math.abs(v).toFixed(2)}°C`;
  const region=id=>data.meta.regions.find(r=>r.id===(id||state.region));
  const periodLabel=()=>`${state.start}–${state.end}`;
  const modelLabel=()=>state.model==='mean'?'Mean of three models':state.model;
  const value=(id=state.region,s=state.scenario,m=state.model,a=state.start,b=state.end)=>C.period(id,s,a,b,m);
  function tooltip(event,text){tip.textContent=text;tip.hidden=false;const r=event.currentTarget.getBoundingClientRect();const x=Number.isFinite(event.clientX)?event.clientX:r.x+r.width/2,y=Number.isFinite(event.clientY)?event.clientY:r.y;tip.style.left=`${Math.max(8,Math.min(x+12,innerWidth-tip.offsetWidth-12))}px`;tip.style.top=`${Math.max(8,Math.min(y+12,innerHeight-tip.offsetHeight-12))}px`;}
  function hideTip(){tip.hidden=true;}
  function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});}
  function chooseRegion(id){if(!regions.some(r=>r.id===id))return;state.region=id;hideTip();render();}
  function setPeriod(a,b){if(!Number.isInteger(a)||!Number.isInteger(b)||a<2015||b>2100||a>b)throw Error('Choose whole years from 2015 to 2100, with the start no later than the end.');state.start=a;state.end=b;$('period-error').hidden=true;hideTip();render();}
  try {
    [data,land]=await Promise.all([d3.json('data/climate.json'),d3.json('data/land-110m.json')]);
    [copy,release]=await Promise.all([d3.json('content.json').catch(()=>({})),d3.json('release.json').catch(()=>({}))]);
    C.init(data);regions=data.meta.regions.filter(r=>r.id!=='global');
    const values=data.rows.filter(r=>r.scenario!=='historical').map(r=>r.anomaly);
    warmingDomain=[Math.min(0,Math.floor(d3.min(values))),Math.ceil(d3.max(values)/2)*2];
    const gaps=regions.flatMap(r=>data.meta.models.flatMap(m=>periods.map(([a,b])=>C.pairedGap(r.id,a,b,m).value)));
    const maxGap=Math.ceil(d3.max(gaps.map(Math.abs)));
    gapScale=d3.scaleDiverging([-maxGap,0,maxGap],d3.interpolatePuOr);
    document.querySelectorAll('[data-copy]').forEach(el=>{const entry=copy[el.dataset.copy];if(entry?.en)el.textContent=entry.en;});
    d3.select('#region').selectAll('option').data(regions).join('option').attr('value',d=>d.id).text(d=>d.name);
    d3.select('#model').selectAll('option.model-option').data(data.meta.models).join('option').attr('class','model-option').attr('value',d=>d).text(d=>d);
    const options=d3.select('#guess-options').selectAll('label').data(regions).join('label').attr('class','guess-choice');
    options.append('input').attr('type','radio').attr('name','guess').attr('value',d=>d.id);
    options.append('span').each(function(d){d3.select(this).append('span').text(d.name);d3.select(this).append('small').text(C.latitude(d));});
    if(release.videoUrl&&/^https:\/\/(www\.)?youtube\.com\/watch\?v=|^https:\/\/youtu\.be\//.test(release.videoUrl)){$('video-link').href=release.videoUrl;$('video-section').hidden=false;}
    if(release.repositoryUrl&&release.repositoryUrl.startsWith('https://github.com/')){$('repo-link').href=release.repositoryUrl;$('repo-link-wrap').hidden=false;}
    $('load-status').hidden=true;
  }catch(error){$('load-status').className='error';$('load-status').textContent=`The climate data could not load. Open this site through a local web server or reload the published page. ${error.message}`;document.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);return;}

  function globe(id,interactive){
    const svg=d3.select(`#${id}`),w=interactive?420:480,h=interactive?275:360;
    svg.selectAll('*').remove();
    const projection=d3.geoEqualEarth().fitExtent([[10,15],[w-10,h-25]],{type:'Sphere'}),path=d3.geoPath(projection);
    svg.append('path').datum({type:'Sphere'}).attr('d',path).attr('fill','#e1e9e2').attr('stroke','#adbbb4').attr('stroke-width',.8);
    svg.append('path').datum(topojson.feature(land,land.objects.land)).attr('d',path).attr('fill','#b7c9c0');
    svg.append('path').datum(d3.geoGraticule10()).attr('d',path).attr('fill','none').attr('stroke','#fffefa').attr('opacity',.6).attr('stroke-width',.6);
    const layers=svg.selectAll('g.latitude-band').data(regions).join('g').attr('class','latitude-band').attr('data-region',r=>r.id);
    layers.append('path').attr('d',r=>{const top=d3.range(-180,181,3).map(lon=>projection([lon,r.north]));const bottom=d3.range(180,-181,-3).map(lon=>projection([lon,r.south]));return `M${top.concat(bottom).map(p=>p.join(',')).join('L')}Z`;}).attr('fill',r=>interactive&&r.id===state.region?'#146b8438':'transparent').attr('stroke',r=>interactive&&r.id===state.region?'#146b84':'#ffffffaa').attr('stroke-width',r=>interactive&&r.id===state.region?2:1);
    if(interactive){layers.attr('tabindex',0).attr('role','button').attr('aria-label',r=>`Follow ${r.name}, ${C.latitude(r)}`).attr('aria-pressed',r=>r.id===state.region).style('cursor','pointer').on('click',(_,r)=>chooseRegion(r.id)).on('keydown',(e,r)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRegion(r.id);}}).on('pointermove',(e,r)=>tooltip(e,`${r.name}\n${C.latitude(r)}\nIncludes land and ocean`)).on('pointerleave',hideTip).on('blur',hideTip);}
    else{[-60,-30,0,30,60].forEach(lat=>{const p=projection([0,lat]);svg.append('text').attr('x',w-20).attr('y',p[1]+4).attr('text-anchor','end').style('font-size','10px').text(`${Math.abs(lat)}°${lat>0?'N':lat<0?'S':''}`);});}
  }
  function setupChart(id,height,margin){const svg=d3.select(`#${id}`),w=Math.max(270,svg.node().clientWidth);svg.selectAll('*').remove();svg.attr('viewBox',`0 0 ${w} ${height}`);return {svg,w,h:height,m:margin};}
  function axes(svg,x,y,w,h,m,xTicks){svg.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w-m.l-m.r)).tickFormat(''));svg.append('g').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d3.format('d')));svg.append('g').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>`${d}°`));svg.append('text').attr('x',m.l).attr('y',13).style('font-size','10px').text('Temperature change (°C)');}
  function timeChart(id,area,brushable){
    const {svg,w,h,m}=setupChart(id,350,{l:40,r:12,t:26,b:32});
    const x=d3.scaleLinear().domain([2015,2100]).range([m.l,w-m.r]),y=d3.scaleLinear().domain(warmingDomain).range([h-m.b,m.t]);
    const ticks=w<450?[2015,2040,2070,2100]:[2015,2030,2050,2070,2090,2100];axes(svg,x,y,w,h,m,ticks);
    svg.append('rect').attr('x',x(state.start)).attr('y',m.t).attr('width',Math.max(2,x(state.end)-x(state.start))).attr('height',h-m.b-m.t).attr('fill','#647d6c').attr('opacity',.075);
    const sets=C.scenarios.map(s=>({id:s,rows:C.series(area,s,state.model,state.smooth)}));
    sets.forEach(s=>{if(state.model==='mean')svg.append('path').datum(s.rows).attr('fill',color[s.id]).attr('opacity',.1).attr('d',d3.area().x(d=>x(d.year)).y0(d=>y(d.min)).y1(d=>y(d.max)));svg.append('path').datum(s.rows).attr('class','plot-line').attr('stroke',color[s.id]).attr('stroke-dasharray',s.id==='ssp585'?'7 4':null).attr('d',d3.line().x(d=>x(d.year)).y(d=>y(d.value)));});
    const guide=svg.append('line').attr('y1',m.t).attr('y2',h-m.b).attr('stroke','#778d8e').attr('stroke-dasharray','3 3').attr('visibility','hidden').style('pointer-events','none');
    const read=(event)=>{const yr=Math.max(sets[0].rows[0].year,Math.min(2100,Math.round(x.invert(d3.pointer(event,svg.node())[0]))));guide.attr('x1',x(yr)).attr('x2',x(yr)).attr('visibility','visible');tooltip(event,`${region(area).name} · ${yr}\n${modelLabel()}${state.smooth?' · trailing 10-year mean':''}\n${sets.map(s=>`${C.names[s.id]}: ${fmt(s.rows.find(d=>d.year===yr).value)}`).join('\n')}\nRelative to 1995–2014`);};
    if(brushable){const brush=d3.brushX().extent([[m.l,m.t],[w-m.r,h-m.b]]).on('end',e=>{if(!e.sourceEvent)return;if(!e.selection){svg.select('.brush').call(brush.move,[x(state.start),x(state.end)]);return;}const [a,b]=e.selection.map(v=>Math.max(2015,Math.min(2100,Math.round(x.invert(v)))));setPeriod(a,b);});const bg=svg.append('g').attr('class','brush').call(brush);bg.call(brush.move,[x(state.start),x(state.end)]);bg.select('.selection').attr('fill','#739888').attr('fill-opacity',.1).attr('stroke','#607f71');bg.on('pointermove',read).on('pointerleave',()=>{guide.attr('visibility','hidden');hideTip();});}
    else svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',h-m.t-m.b).attr('fill','transparent').on('pointermove',read).on('pointerleave',()=>{guide.attr('visibility','hidden');hideTip();});
    svg.attr('aria-label',`${region(area).name} warming, ${modelLabel()}, ${state.smooth?'trailing ten-year averages':'annual values'}, relative to 1995–2014. Selected period ${periodLabel()}.`);
  }
  const labels={'arctic':['Arctic','60–90°N'],'north-mid':['Northern','midlatitudes'],'north-tropics':['Northern tropics','0–30°N'],'south-tropics':['Southern tropics','0–30°S'],'south-mid':['Southern','midlatitudes'],'antarctic':['Antarctic','60–90°S']};
  function regionalChart(){
    const {svg,w,h,m}=setupChart('regional-chart',370,{l:115,r:53,t:26,b:35});
    if(w<400)m.l=93;
    const x=d3.scaleLinear().domain(warmingDomain).range([m.l,w-m.r]);
    const y=d3.scaleBand().domain(regions.map(r=>r.id)).range([m.t+20,h-m.b-10]).padding(.25);
    svg.append('g').attr('class','grid').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(w<400?3:5).tickSize(-(h-m.b-m.t)).tickFormat(d=>`${d}°`));
    svg.append('text').attr('x',m.l).attr('y',12).style('font-size','10px').text('Warming (°C above 1995–2014)');
    svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',m.t).attr('y2',h-m.b).attr('stroke','#8b9c94').attr('stroke-width',1);
    const global=value('global').value;
    svg.append('line').attr('x1',x(global)).attr('x2',x(global)).attr('y1',m.t).attr('y2',h-m.b).attr('stroke','#536c64').attr('stroke-dasharray','4 4');
    svg.append('text').attr('x',x(global)+4).attr('y',m.t+8).style('font-size','10px').text(`Global ${global.toFixed(2)}°`);
    const rows=svg.selectAll('g.region-row').data(regions).join('g').attr('class','region-row').attr('data-region',r=>r.id).attr('role','button').attr('tabindex',0).attr('aria-label',r=>`${r.name}: ${fmt(value(r.id).value)}. Select this region.`).attr('aria-pressed',r=>r.id===state.region).style('cursor','pointer').on('click',(_,r)=>chooseRegion(r.id)).on('keydown',(e,r)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRegion(r.id);}}).on('pointermove',(e,r)=>tooltip(e,`${r.name} · ${C.latitude(r)}\n${C.names[state.scenario]} · ${periodLabel()}\n${modelLabel()}: ${fmt(value(r.id).value)}${state.model==='mean'?`\nModel range: ${fmt(value(r.id).min)} to ${fmt(value(r.id).max)}\nNot a confidence interval`:''}`)).on('pointerleave',hideTip);
    rows.append('rect').attr('x',0).attr('y',r=>y(r.id)-6).attr('width',w).attr('height',y.bandwidth()+12).attr('rx',4).attr('fill',r=>r.id===state.region?'#e8efea':'transparent');
    rows.each(function(r){const g=d3.select(this),cy=y(r.id)+y.bandwidth()/2,v=value(r.id);const t=g.append('text').attr('x',m.l-12).attr('y',cy-4).attr('text-anchor','end').style('font-size',w<400?'10px':'11px').style('font-weight',r.id===state.region?'700':'400');labels[r.id].forEach((s,i)=>t.append('tspan').attr('x',m.l-12).attr('dy',i?13:0).text(s));if(state.model==='mean'){g.append('line').attr('x1',x(v.min)).attr('x2',x(v.max)).attr('y1',cy).attr('y2',cy).attr('stroke',color[state.scenario]).attr('stroke-opacity',.35).attr('stroke-width',3);[v.min,v.max].forEach(z=>g.append('line').attr('x1',x(z)).attr('x2',x(z)).attr('y1',cy-4).attr('y2',cy+4).attr('stroke',color[state.scenario]).attr('stroke-opacity',.5));}g.append('circle').attr('cx',x(v.value)).attr('cy',cy).attr('r',r.id===state.region?6:4.5).attr('fill',color[state.scenario]);g.append('text').attr('x',w-2).attr('y',cy+4).attr('text-anchor','end').style('font-weight',r.id===state.region?'700':'400').text(`${v.value.toFixed(2)}°`);});
    // Keep the reference visible above row backgrounds.
    svg.append('line').attr('x1',x(global)).attr('x2',x(global)).attr('y1',m.t+16).attr('y2',h-m.b).attr('stroke','#536c64').attr('stroke-dasharray','4 4').attr('opacity',.65).style('pointer-events','none');
  }
  function gapMatrix(){
    const root=d3.select('#gap-matrix');root.selectAll('*').remove();root.append('span').attr('class','matrix-heading').text('Latitude band');periods.forEach(p=>root.append('span').attr('class','matrix-heading').text(p.join('–')));
    regions.forEach(r=>{root.append('span').attr('class','matrix-label').text(r.name);periods.forEach(([a,b])=>{const v=C.pairedGap(r.id,a,b,state.model).value,bg=gapScale(v),c=d3.color(bg).rgb(),light=(.2126*c.r+.7152*c.g+.0722*c.b)>145;root.append('button').attr('type','button').attr('class','matrix-cell').attr('data-region',r.id).attr('data-start',a).attr('aria-pressed',r.id===state.region&&a===state.start&&b===state.end).attr('aria-label',`${r.name}, ${a}–${b}: scenario gap ${fmt(v)}. Select this comparison.`).style('background',bg).style('color',light?'#192f38':'white').text(`${v<0?'−':''}${Math.abs(v).toFixed(2)}°`).on('click',()=>{state.region=r.id;setPeriod(a,b);}).on('pointermove',e=>tooltip(e,`${r.name} · ${a}–${b}\n${modelLabel()}\nSSP5-8.5 − SSP1-2.6: ${fmt(v)}`)).on('pointerleave',hideTip);});});
    const max=gapScale.domain()[2];$('matrix-legend').innerHTML='';const legend=d3.select('#matrix-legend');legend.append('span').text(`−${max}°C`);const stops=d3.range(0,101,5).map(p=>`${gapScale(-max+2*max*p/100)} ${p}%`);legend.append('span').attr('class','legend-gradient').style('background',`linear-gradient(to right,${stops.join(',')})`);legend.append('span').text(`+${max}°C`);legend.append('span').text('Neutral center = 0 · Fixed color scale');
  }
  function modelChart(){
    const {svg,w,h,m}=setupChart('model-chart',245,{l:148,r:15,t:26,b:35});if(w<420)m.l=113;
    const x=d3.scaleLinear().domain(warmingDomain).range([m.l,w-m.r]),y=d3.scalePoint().domain(data.meta.models).range([60,175]);
    svg.append('g').attr('class','grid').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(w<420?3:5).tickSize(-(h-m.b-m.t)).tickFormat(v=>`${v}°`));svg.append('text').attr('x',m.l).attr('y',13).style('font-size','10px').text('Warming above 1995–2014');
    svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',m.t).attr('y2',h-m.b).attr('stroke','#8b9c94').attr('stroke-width',1);
    data.meta.models.forEach(model=>{const a=value(state.region,'ssp126',model).value,b=value(state.region,'ssp585',model).value,cy=y(model);svg.append('text').attr('x',m.l-10).attr('y',cy+4).attr('text-anchor','end').style('font-size',w<420?'9px':'11px').style('font-weight',state.model===model?'750':'400').text(model);svg.append('line').attr('x1',x(a)).attr('x2',x(b)).attr('y1',cy).attr('y2',cy).attr('stroke','#a9b9b7').attr('stroke-width',2);[{s:'ssp126',v:a},{s:'ssp585',v:b}].forEach(z=>{svg.append('path').attr('d',d3.symbol().type(z.s==='ssp126'?d3.symbolCircle:d3.symbolDiamond).size(64)()).attr('transform',`translate(${x(z.v)},${cy})`).attr('fill',color[z.s]).append('title').text(`${model}, ${C.names[z.s]}: ${fmt(z.v)}`);svg.append('text').attr('x',x(z.v)).attr('y',cy+(z.s==='ssp126'?-13:23)).attr('text-anchor','middle').style('fill',color[z.s]).style('font-size','10px').text(`${z.v.toFixed(2)}°`);});});
  }
  function renderTable(){
    const rows=[...data.meta.models,'mean'].map(m=>({m,low:value(state.region,'ssp126',m).value,high:value(state.region,'ssp585',m).value,gap:C.pairedGap(state.region,state.start,state.end,m).value}));
    const wrap=d3.select('#data-table');wrap.selectAll('*').remove();const table=wrap.append('table');table.append('caption').text(`${region().name} · ${periodLabel()} · warming relative to 1995–2014`);const head=table.append('thead').append('tr');['Model','SSP1-2.6 (°C)','SSP5-8.5 (°C)','Gap (°C)'].forEach(s=>head.append('th').attr('scope','col').text(s));const body=table.append('tbody');rows.forEach(r=>{const tr=body.append('tr');tr.append('th').attr('scope','row').text(r.m==='mean'?'Mean of three models':r.m);[r.low,r.high,r.gap].forEach(v=>tr.append('td').text(v.toFixed(2)));});
  }
  function render(){
    const focused=document.activeElement, focusIdentity=focused?.matches('.latitude-band,.region-row,.matrix-cell')?{cls:focused.classList.contains('matrix-cell')?'matrix-cell':focused.classList.contains('region-row')?'region-row':'latitude-band',region:focused.dataset.region,start:focused.dataset.start,scope:focused.ownerSVGElement?.id||'gap-matrix'}:null;
    $('region').value=state.region;$('scenario').value=state.scenario;$('model').value=state.model;$('smoothing').value=state.smooth?'smooth':'annual';$('start-year').value=state.start;$('end-year').value=state.end;
    document.querySelectorAll('.period-context').forEach(el=>el.textContent=periodLabel());document.querySelectorAll('.model-context').forEach(el=>el.textContent=modelLabel());document.querySelectorAll('[data-period]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.period===`${state.start},${state.end}`));
    const r=region(),selected=value().value,g=value('global').value,delta=selected-g,low=value(state.region,'ssp126').value,high=value(state.region,'ssp585').value,gap=C.pairedGap(state.region,state.start,state.end,state.model),globLow=value('global','ssp126').value,globHigh=value('global','ssp585').value;
    $('global-insight').textContent=`In ${periodLabel()}, global warming averages ${fmt(globLow)} under SSP1-2.6 and ${fmt(globHigh)} under SSP5-8.5. ${state.model==='mean'?'These values average the three selected models.':'This view uses '+state.model+'.'}`;
    $('region-caption').textContent=`${r.name} · ${C.latitude(r)}`;$('regional-title').textContent=`${C.names[state.scenario]} · regional warming`;
    $('regional-insight').textContent=`${r.name}: ${fmt(selected)}, ${Math.abs(delta).toFixed(2)}°C ${delta>=0?'above':'below'} the global mean in ${periodLabel()}.${state.model==='mean'?' Thin whiskers show the three-model range, not a confidence interval.':''}`;
    $('regional-line-title').textContent=`${r.name} temperature change`;$('models-title').textContent=`${r.name} · ${periodLabel()}`;
    const summary=d3.select('#period-summary');summary.selectAll('*').remove();[{label:'SSP1-2.6 · low emissions',v:low,cls:'low',note:periodLabel()},{label:'SSP5-8.5 · very high emissions',v:high,cls:'high',note:periodLabel()},{label:'Scenario gap · high minus low',v:gap.value,cls:'gap',note:state.model==='mean'?`Model range: ${plain(gap.min)} to ${plain(gap.max)}`:'Paired within the selected model'}].forEach(s=>{const div=summary.append('div').attr('class',`stat ${s.cls}`);div.append('span').attr('class','stat-label').text(s.label);div.append('span').attr('class','stat-number').text(fmt(s.v));div.append('span').attr('class','stat-note').text(s.note);});
    const highs=data.meta.models.map(m=>value(state.region,'ssp585',m).value);
    $('model-insight').textContent=`For ${r.name} in ${periodLabel()}, SSP5-8.5 period averages range from ${fmt(d3.min(highs))} to ${fmt(d3.max(highs))} across these three models. The range reflects model disagreement in this selected subset; it is not a confidence interval.`;
    $('personal-takeaway').textContent=`You followed ${r.name}. Under ${C.names[state.scenario]}, its ${periodLabel()} warming is ${Math.abs(delta).toFixed(2)}°C ${delta>=0?'above':'below'} the global mean. In the same region and period, the two scenarios differ by ${fmt(gap.value)} (${modelLabel().toLowerCase()}).`;
    timeChart('global-chart','global',false);globe('region-map',true);regionalChart();timeChart('regional-timeline',state.region,true);gapMatrix();modelChart();renderTable();
    if(focusIdentity){const candidates=document.querySelectorAll('#'+focusIdentity.scope+' .'+focusIdentity.cls);const match=[...candidates].find(el=>el.dataset.region===focusIdentity.region&&el.dataset.start===focusIdentity.start);match?.focus({preventScroll:true});}
    document.body.dataset.ready='true';document.body.dataset.region=state.region;
  }
  $('reveal').addEventListener('click',()=>{const picked=document.querySelector('input[name=guess]:checked')?.value;const sorted=regions.map(r=>({...r,v:value(r.id,'ssp585','mean',2081,2100).value})).sort((a,b)=>b.v-a.v);const winner=sorted[0],gv=value('global','ssp585','mean',2081,2100).value;Object.assign(state,defaults,{region:picked||winner.id});$('prediction-result').hidden=false;$('prediction-result').textContent=`${picked?(picked===winner.id?'Your prediction matches this comparison. ':`You chose ${region(picked).name}. `):''}${winner.name} has the largest warming among these six bands: ${fmt(winner.v)}, compared with ${fmt(gv)} globally — about ${(winner.v/gv).toFixed(1)} times as much. This result uses 2081–2100, SSP5-8.5 and the mean of these three models. Explore other selections below.`;render();});
  $('skip-guess').addEventListener('click',()=>{$('global').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $('region').addEventListener('change',e=>chooseRegion(e.target.value));$('scenario').addEventListener('change',e=>{state.scenario=e.target.value;render();});$('model').addEventListener('change',e=>{state.model=e.target.value;render();});$('smoothing').addEventListener('change',e=>{state.smooth=e.target.value==='smooth';render();});
  document.querySelectorAll('[data-period]').forEach(el=>el.addEventListener('click',()=>setPeriod(...el.dataset.period.split(',').map(Number))));
  $('period-form').addEventListener('submit',e=>{e.preventDefault();try{setPeriod(Number($('start-year').value),Number($('end-year').value));}catch(error){$('period-error').textContent=error.message;$('period-error').hidden=false;}});
  $('reset').addEventListener('click',()=>{Object.assign(state,defaults);$('prediction-result').hidden=true;document.querySelectorAll('input[name=guess]').forEach(el=>el.checked=false);$('period-error').hidden=true;render();});
  $('download').addEventListener('click',()=>{const out=[];[region()].forEach(r=>{[...data.meta.models,'mean'].forEach(m=>{const l=value(r.id,'ssp126',m),h=value(r.id,'ssp585',m),gap=C.pairedGap(r.id,state.start,state.end,m);out.push({region:r.name,latitude_south:r.south,latitude_north:r.north,start_year:state.start,end_year:state.end,model:m,ssp126_warming_c:l.value,ssp585_warming_c:h.value,paired_scenario_gap_c:gap.value,baseline_start:1995,baseline_end:2014,period_values:'original annual values',range_scope:'three selected models, not a confidence interval'});});});const a=document.createElement('a'),url=URL.createObjectURL(new Blob([d3.csvFormat(out)],{type:'text/csv;charset=utf-8;'}));a.href=url;a.download=`warming-comparison-${state.start}-${state.end}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',hideTip,{passive:true});globe('hero-globe',false);render();
  window.FinalStory=Object.freeze({getState:()=>({...state}),getData:()=>data,getCopy:()=>copy,calculate:(id,s,a,b,m='mean')=>C.period(id,s,a,b,m),version:'2026-11-12'});
})();
