/* Local map experiment: the data grain is a latitude band, never a country. */
'use strict';
window.ClimateMaps = (() => {
  const $ = id => document.getElementById(id);
  const f = n => `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(2)}°C`;
  const short = n => `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(2)}°`;

  function bandPath(r, projection) {
    const top = d3.range(-180, 181, 2).map(lon => projection([lon, r.north]));
    const bottom = d3.range(180, -181, -2).map(lon => projection([lon, r.south]));
    return `M${top.concat(bottom).map(p => p.join(',')).join('L')}Z`;
  }

  function legend(id, scale, ticks, label) {
    const root = d3.select(`#${id}`); root.selectAll('*').remove();
    root.append('span').attr('class', 'map-legend-label').text(label);
    const ramp = root.append('div').attr('class', 'map-ramp');
    const [lo, hi] = d3.extent(ticks);
    ramp.append('div').attr('class', 'map-ramp-color').style('background',
      `linear-gradient(to right,${d3.range(101).map(i => `${scale(lo + (hi - lo) * i / 100)} ${i}%`).join(',')})`);
    const labels = ramp.append('div').attr('class', 'map-ramp-ticks');
    ticks.forEach(t => labels.append('span').style('left', `${100 * (t-lo)/(hi-lo)}%`).text(`${t}`));
  }

  function drawMap(svg, ctx, opt) {
    const {regions, land, state, tooltip, hideTip, C} = ctx;
    const w = 800, h = 455, compact = opt.compact || svg.node().clientWidth < 500;
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'group');
    const projection = d3.geoEqualEarth().fitExtent([[26, 22], [w-26, h-22]], {type:'Sphere'});
    const path = d3.geoPath(projection);
    svg.append('path').datum({type:'Sphere'}).attr('d', path).attr('fill', '#f4f1e7');
    const bands = svg.selectAll('.map-band').data(regions).join('g')
      .attr('class', 'map-band').attr('role', 'button').attr('tabindex', 0)
      .attr('data-region', r => r.id).attr('data-start', opt.start ?? '').attr('data-end', opt.end ?? '')
      .attr('data-focuskey', r => `${opt.key}-${r.id}`)
      .attr('data-value', r => opt.get(r).value)
      .attr('aria-label', r => `${r.name}, ${C.latitude(r)}. ${opt.describe(r)}. ${opt.action}`)
      .attr('aria-pressed', r => r.id === state.region && opt.active)
      .on('click', (_, r) => opt.select(r))
      .on('keydown', (e, r) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.select(r); } })
      .on('pointermove', (e, r) => tooltip(e, `${r.name} · ${C.latitude(r)}\n${opt.describe(r)}\nLatitude-band average, including land and ocean`))
      .on('focus', (e, r) => tooltip(e, `${r.name} · ${C.latitude(r)}\n${opt.describe(r)}`))
      .on('pointerleave', hideTip).on('blur', hideTip);
    bands.append('path').attr('class', 'band-fill').attr('d', r => bandPath(r, projection))
      .attr('fill', r => opt.scale(opt.get(r).value)).attr('stroke', '#ffffffab').attr('stroke-width', 1.3);
    // Context is an outline only: colors represent both ocean and land in each band.
    svg.append('path').datum(topojson.feature(land, land.objects.land)).attr('d', path)
      .attr('fill', 'none').attr('stroke', '#213d49').attr('stroke-opacity', .48)
      .attr('stroke-width', .9).attr('pointer-events', 'none');
    svg.append('path').datum(d3.geoGraticule10()).attr('d', path).attr('fill', 'none')
      .attr('stroke', '#fff').attr('stroke-opacity', .26).attr('stroke-width', .6).attr('pointer-events', 'none');
    svg.append('path').datum({type:'Sphere'}).attr('d', path).attr('fill', 'none')
      .attr('stroke', '#7b8e90').attr('stroke-width', 1).attr('pointer-events', 'none');
    svg.append('path').attr('class', 'selected-band-outline')
      .attr('d', bandPath(regions.find(r => r.id === state.region), projection))
      .attr('fill', 'none').attr('stroke', '#133f50').attr('stroke-width', 3)
      .attr('stroke-dasharray', opt.active ? null : '7 4').attr('pointer-events', 'none');
    const labels = svg.append('g').attr('pointer-events', 'none');
    regions.forEach(r => {
      const y = (projection([0, r.north])[1] + projection([0, r.south])[1])/2;
      const text = compact ? short(opt.get(r).value) : `${r.name}  ${short(opt.get(r).value)}`;
      const group = labels.append('g').attr('transform', `translate(${w/2},${y})`);
      const t = group.append('text').attr('class', 'map-value-label').attr('text-anchor', 'middle')
        .attr('dy', '.34em').style('font-size', compact ? '28px' : '18px')
        .style('font-weight', r.id === state.region ? 750 : 600).text(text);
      const b = t.node().getBBox();
      group.insert('rect', 'text').attr('x', b.x-9).attr('y', b.y-3).attr('width', b.width+18)
        .attr('height', b.height+6).attr('rx', 4).attr('fill', '#fffefa').attr('fill-opacity', .94);
    });
  }

  function regional(ctx) {
    const {state, C, regions, chooseRegion, warmingDomain} = ctx;
    const scale = d3.scaleDiverging([warmingDomain[0], 0, warmingDomain[1]],
      t => t < .5 ? d3.interpolateRgb('#4775ac', '#ffffcc')(t*2) : d3.interpolateYlOrRd((t-.5)*2));
    const get = r => C.period(r.id, state.scenario, state.start, state.end, state.model);
    const name = state.model === 'mean' ? 'Mean of three models' : state.model;
    const describe = r => {
      const v = get(r);
      return `${C.names[state.scenario]} · ${state.start}–${state.end}\n${name}: ${f(v.value)} relative to 1995–2014${state.model === 'mean' ? `\nThree-model range: ${f(v.min)} to ${f(v.max)} (not a confidence interval)` : ''}`;
    };
    drawMap(d3.select('#region-map'), ctx, {key:'regional', get, scale, describe, active:true,
      action:'Select to follow this region', select:r => chooseRegion(r.id)});
    const [lo, hi] = warmingDomain;
    legend('warming-legend', scale, [lo, 0, hi/2, hi], 'Temperature change from 1995–2014 (°C) · blue below 0 · fixed color scale');
    const list = d3.select('#regional-values'); list.selectAll('*').remove();
    regions.forEach(r => {
      const v = get(r), b = list.append('button').attr('type', 'button').attr('class', 'map-region-row')
        .attr('data-region', r.id).attr('data-focuskey', `row-${r.id}`).attr('aria-pressed', r.id === state.region)
        .on('click', () => chooseRegion(r.id));
      b.append('span').attr('class', 'map-swatch').style('background', scale(v.value));
      const label = b.append('span'); label.append('strong').text(r.name); label.append('small').text(C.latitude(r));
      b.append('span').attr('class', 'map-row-value').text(f(v.value));
    });
    const r = regions.find(r => r.id === state.region), v = get(r);
    $('map-global').textContent = `${f(C.period('global', state.scenario, state.start, state.end, state.model).value)} globally`;
    $('map-global-model').textContent = name;
    $('map-selected-value').textContent = f(v.value);
    $('map-selected-range').textContent = state.model === 'mean'
      ? `Three-model range: ${f(v.min)} to ${f(v.max)}. Not a confidence interval.`
      : `${state.model} · one model selected`;
  }

  function gaps(ctx) {
    const {state, C, periods, regions, setComparison, chooseRegion} = ctx;
    const extent = ctx.gapScale.domain()[2];
    const scale = d3.scaleDiverging([-extent, 0, extent], d3.interpolatePuOr);
    const root = d3.select('#gap-maps'); root.selectAll('*').remove();
    const compare=state.gapView==='compare', count=state.end-state.start+1;
    root.classed('gap-single-view',!compare).attr('data-view',compare?'compare':'single');
    $('gap-time-controls').hidden=compare;$('gap-compare-description').hidden=!compare;
    $('gap-view-toggle').textContent=compare?'← Back to time slider':'Compare three periods ↗';
    $('gap-view-toggle').setAttribute('aria-pressed',String(compare));
    const slider=$('gap-time-slider');slider.max=2101-count;slider.value=state.start;slider.disabled=count===86;
    slider.setAttribute('aria-valuetext',`${state.start} to ${state.end}, ${count} ${count===1?'year':'years'}`);
    $('gap-window-label').textContent=count===1?'Move the selected year':`Move the ${count}-year window`;
    $('gap-slider-period').textContent=`${state.start}–${state.end}`;
    $('gap-slider-first').textContent=`2015–${2014+count}`;$('gap-slider-last').textContent=`${2101-count}–2100`;
    $('gap-slider-help').textContent=count===86?'The full 2015–2100 range is selected. Choose a shorter period above to move the window.':'Drag to shift the period. Its length stays the same; the linked charts and values update with it.';
    const model = state.model === 'mean' ? 'Mean of three models' : state.model;
    if(!compare){
      const a=state.start,b=state.end,get=r=>C.pairedGap(r.id,a,b,state.model);
      const panel=root.append('div').attr('class','gap-single-panel');
      const map=panel.append('div').attr('class','gap-single-map');
      const heading=map.append('div').attr('class','chart-top');heading.append('h3').text(`Scenario gap · ${a}–${b}`);heading.append('span').text('Click a band to follow it');
      drawMap(map.append('svg').attr('id','gap-map-current').attr('aria-label',`Scenario difference, ${a} to ${b}`),ctx,
        {key:'gap-current',start:a,end:b,active:true,get,scale,
          describe:r=>{const v=get(r);return `${a}–${b} · ${model}\nSSP5-8.5 minus SSP1-2.6: ${f(v.value)}${state.model==='mean'?`\nThree-model range: ${f(v.min)} to ${f(v.max)} (not a confidence interval)`:''}`;},
          action:'Select to follow this region',select:r=>chooseRegion(r.id)});
      const r=regions.find(r=>r.id===state.region),v=get(r),aside=panel.append('aside').attr('class','gap-single-detail');
      aside.append('p').attr('class','eyebrow').text('Following this region');
      aside.append('h4').text(r.name);aside.append('p').attr('class','small').text(`${C.latitude(r)} · ${a}–${b}`);
      aside.append('p').attr('class','gap-single-number').text(f(v.value));
      aside.append('p').attr('class','small').text('Scenario difference · high minus low');
      const values=aside.append('dl').attr('class','gap-scenario-values');
      ['ssp126','ssp585'].forEach(s=>{const row=values.append('div');row.append('dt').text(C.names[s]);row.append('dd').text(f(C.period(r.id,s,a,b,state.model).value));});
      aside.append('p').attr('class','small gap-baseline-note').text('Scenario values: temperature change relative to 1995–2014.');
      aside.append('p').attr('class','small gap-range-note').text(state.model==='mean'?`Difference across three models: ${f(v.min)} to ${f(v.max)}. Not a confidence interval.`:`${state.model} · one model selected`);
    }else periods.forEach(([a, b], i) => {
      const active = a === state.start && b === state.end;
      const card = root.append('section').attr('class', `gap-map-card${active ? ' active-period' : ''}`)
        .attr('data-period-start', a);
      const head = card.append('div').attr('class', 'gap-map-heading');
      head.append('span').attr('class', 'gap-era').text(['Early century', 'Mid-century', 'Late century'][i]);
      head.append('h4').text(`${a}–${b}`);
      head.append('span').attr('class', 'gap-period-status').text(active ? 'Selected period' : 'Click a band to compare');
      const get = r => C.pairedGap(r.id, a, b, state.model);
      drawMap(card.append('svg').attr('id', `gap-map-${a}`).attr('aria-label', `Scenario difference, ${a} to ${b}`), ctx,
        {key:`gap-${a}`, start:a, end:b, compact:true, active, get, scale,
          describe:r => `${a}–${b} · ${model}\nSSP5-8.5 minus SSP1-2.6: ${f(get(r).value)}`,
          action:'Select this region and period', select:r => setComparison(r.id, a, b)});
      const r = regions.find(r => r.id === state.region);
      const selected = card.append('p').attr('class', 'gap-map-followed');
      selected.append('span').text(r.name); selected.append('strong').text(f(get(r).value));
      selected.append('small').text(`${C.latitude(r)} · high minus low`);
    });
    legend('matrix-legend', scale, [-extent, 0, extent], 'Scenario difference (°C) · shared fixed scale · neutral center = 0');
    $('gap-model-context').textContent = state.model === 'mean' ? 'Mean of three models' : state.model;
    $('gap-custom-note').hidden = !compare || periods.some(([a,b]) => a === state.start && b === state.end);
    $('gap-custom-note').textContent = `Your custom period is ${state.start}–${state.end}. The three maps keep their fixed 20-year windows; the timeline and summary above use your custom period.`;
  }
  return Object.freeze({regional, gaps});
})();
