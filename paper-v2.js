'use strict';
function bindTabs(selector,key,pick){const buttons=[...document.querySelectorAll(selector)];function select(b){buttons.forEach(x=>{x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});pick(b.dataset[key]);}buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();select(buttons[next]);buttons[next].focus();});});}
let resultData=null;
function results(setting){if(!resultData)return;const cols=setting==='static'?[0,1,2,3,4,5,6]:[7,9,8];const names=setting==='static'?['Grounding','Discovery','Mobility','Multi-Entity','Long-Horizon','Safety','Region']:['Matched Static','Task-Only','Shared'];const table=document.querySelector('#results-table');table.dataset.setting=setting;document.querySelector('#result-panel').setAttribute('aria-labelledby','result-tab-'+setting);document.querySelector('#result-description').textContent=setting==='static'?'All 1,088 static tasks across seven categories, evaluated under fixed world states.':'The same 149 matched tasks are evaluated in all three columns. Matched Static uses the fixed-world versions of those tasks.';const head=document.createElement('tr');['Model',...names].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;head.append(th);});table.tHead.replaceChildren(head);const maxima=cols.map(c=>Math.max(...resultData.rows.map(r=>r.values[c].mean)));const rows=resultData.rows.map(row=>{const tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=row.model;tr.append(name);cols.forEach((c,i)=>{const v=row.values[c],td=document.createElement('td'),mean=document.createElement('span'),se=document.createElement('span');mean.className='mean';mean.textContent=v.mean.toFixed(1);se.className='se';se.textContent=' ± '+v.se.toFixed(1);if(v.mean===maxima[i])td.classList.add('best');td.append(mean,se);tr.append(td);});return tr;});table.tBodies[0].replaceChildren(...rows);}
window.resultsReady=fetch('assets/paper-v3/results.json').then(r=>{if(!r.ok)throw Error('Result data unavailable');return r.json();}).then(data=>{if(data.rows.length!==9||data.rows.some(r=>r.values.length!==10))throw Error('Invalid result data');resultData=data;results('static');return true;}).catch(e=>{document.querySelector('#result-description').textContent='The results table could not load. Please refresh the page.';throw e;});
bindTabs('[data-results]','results',results);

const successTask = document.querySelector('#success-task');
const successRules = document.querySelectorAll('[data-success-rule]');
function showSuccessRule() {
  for (const rule of successRules) {
    rule.hidden = rule.dataset.successRule !== successTask.value;
  }
}
successTask.addEventListener('change', showSuccessRule);
showSuccessRule();

const geoworldFigure = document.querySelector('#geoworld-figure');
const constructionControls = [...document.querySelectorAll('[data-construction-focus]')];
const constructionTiles = [...document.querySelectorAll('[data-construction-item]')];

for (const control of constructionControls) {
  control.addEventListener('click', () => {
    const group = control.getAttribute('aria-pressed') === 'true' ? '' : control.dataset.constructionFocus;
    for (const option of constructionControls) {
      option.setAttribute('aria-pressed', String(option.dataset.constructionFocus === group));
    }
    for (const tile of constructionTiles) {
      tile.classList.toggle('construction-highlight', tile.dataset.constructionItem === group);
      tile.classList.toggle('construction-muted', Boolean(group) && tile.dataset.constructionItem !== group);
    }
  });
}

const geoworldControls = [...document.querySelectorAll('[data-geoworld-focus]')];

function showGeoworldRegion(region) {
  for (const zone of geoworldFigure.querySelectorAll('[data-zone]')) {
    zone.toggleAttribute('hidden', zone.dataset.zone !== region);
  }
  for (const control of geoworldControls) {
    control.setAttribute('aria-pressed', String(control.dataset.geoworldFocus === region));
  }
}

for (const control of geoworldControls) {
  control.addEventListener('click', () => {
    const selected = control.getAttribute('aria-pressed') === 'true';
    showGeoworldRegion(selected ? null : control.dataset.geoworldFocus);
  });
}

const modelSelectors = ['a', 'b'].map(key => document.querySelector('#comparison-model-' + key));
const comparisonBars = document.querySelector('#comparison-bars');
const comparisonColumns = [[7, 'Static', 'static'], [9, 'Task-Only', 'taskonly'], [8, 'Shared', 'shared']];

function renderModelComparison() {
  const panels = modelSelectors.map(select => {
    const model = resultData.rows[Number(select.value)];
    const panel = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = model.model;
    panel.append(title);
    for (const [column, label, color] of comparisonColumns) {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const name = document.createElement('span');
      name.textContent = label;
      const track = document.createElement('div');
      track.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('i');
      bar.className = color;
      const rate = model.values[column].mean;
      bar.style.width = (rate / 30 * 100) + '%';
      track.append(bar);
      const value = document.createElement('b');
      value.textContent = rate.toFixed(1) + '%';
      row.append(name, track, value);
      panel.append(row);
    }
    return panel;
  });
  comparisonBars.replaceChildren(...panels);
}

window.resultsReady.then(() => {
  const defaults = ['Claude Sonnet 5', 'Gemini 3.7 Flash'];
  modelSelectors.forEach((select, index) => {
    select.replaceChildren(...resultData.rows.map((row, i) => new Option(row.model, i)));
    select.value = resultData.rows.findIndex(row => row.model === defaults[index]);
    select.disabled = false;
    select.addEventListener('change', renderModelComparison);
  });
  renderModelComparison();
}).catch(() => {
  comparisonBars.textContent = 'Model comparison data could not load.';
});

const contrastPanel = document.querySelector('#contrast-panel');
const contrastChart = document.querySelector('#condition-compare');
const contrasts = {
  provided: ['Static → Explicit Update · −5.6 pp', 'Task-relevant conditions change, and the agent receives every necessary update directly. Success still falls below Static.', [0, 1]],
  discover: ['Explicit Update → Task-Only · −9.1 pp', 'Agents now need to discover the relevant updates through tools. This is the largest adjacent drop in this three-model comparison.', [1, 2]],
  filter: ['Task-Only → Shared · −1.8 pp', 'Unrelated world events coexist with the relevant changes. The agent also has to identify which updates affect the task.', [2, 3]]
};
function showContrast(key) {
  const [heading, explanation, selected] = contrasts[key];
  contrastPanel.setAttribute('aria-labelledby', 'contrast-tab-' + key);
  contrastPanel.querySelector('strong').textContent = heading;
  contrastPanel.querySelector('p').textContent = explanation;
  contrastChart.querySelectorAll('.bar-row').forEach((row, index) => {
    row.classList.toggle('contrast-active', selected.includes(index));
  });
}
bindTabs('[data-contrast]', 'contrast', showContrast);
showContrast('provided');

const replayPanel = document.querySelector('#replay-panel');
const replayMap = replayPanel.querySelector('.replay-map-frame');
const routeCanvas = replayMap.querySelector('canvas');
const routeContext = routeCanvas.getContext('2d');
const mapZoom = 13;
const tileSize = 256;

function mapPixels([latitude, longitude]) {
  const scale = tileSize * 2 ** mapZoom;
  const northing = Math.asinh(Math.tan(latitude * Math.PI / 180));
  return [(longitude + 180) / 360 * scale, (1 - northing / Math.PI) / 2 * scale];
}

const [centerX, centerY] = mapPixels([-33.956, 18.523]);
const mapLeft = centerX - routeCanvas.width / 2;
const mapTop = centerY - routeCanvas.height / 2;
function mapPosition(coordinates) {
  const [x, y] = mapPixels(coordinates);
  return [x - mapLeft, y - mapTop];
}

const mapPoints = {
  start: [-33.961933, 18.5945005],
  meeting: [-33.9303339, 18.4522236],
  end: [-33.9804004, 18.4649039],
  other: [-33.933, 18.566],
};
// Drive geometry from the frozen route snapshot used in the Cape Town case.
const firstDrive = [
  [-33.96197,18.59424], [-33.96213,18.59427], [-33.96224,18.59431], [-33.96253,18.5945], [-33.96275,18.59458],
  [-33.96284,18.59456], [-33.96287,18.59453], [-33.96294,18.59428], [-33.96301,18.59383], [-33.96312,18.59291],
  [-33.96507,18.59285], [-33.96572,18.59285], [-33.96586,18.59282], [-33.96604,18.59274], [-33.96643,18.59244],
  [-33.96657,18.59235], [-33.96673,18.59229], [-33.96699,18.59225], [-33.96725,18.59232], [-33.96788,18.59276],
  [-33.96806,18.59291], [-33.9684,18.59312], [-33.96857,18.59314], [-33.96871,18.5931], [-33.96883,18.59301],
  [-33.96897,18.5928], [-33.96906,18.59278], [-33.96911,18.59269], [-33.96909,18.59258], [-33.96905,18.59254],
  [-33.96893,18.5919], [-33.9689,18.59159], [-33.96889,18.59137], [-33.96872,18.58938], [-33.96838,18.5852],
  [-33.96834,18.58419], [-33.96813,18.58163], [-33.96787,18.57789], [-33.96774,18.5765], [-33.96769,18.57563],
  [-33.96762,18.57518], [-33.96753,18.57404], [-33.9675,18.57341], [-33.96745,18.57294], [-33.96735,18.5726],
  [-33.96713,18.57208], [-33.96701,18.57187], [-33.96683,18.57164], [-33.96664,18.57148], [-33.96642,18.57134],
  [-33.96566,18.57101], [-33.9654,18.57084], [-33.96517,18.57065], [-33.96478,18.57027], [-33.96425,18.56929],
  [-33.96373,18.56817], [-33.96325,18.56673], [-33.96204,18.56279], [-33.9615,18.56104], [-33.96068,18.5583],
  [-33.96043,18.55729], [-33.95913,18.55312], [-33.95751,18.54781], [-33.95634,18.54385], [-33.95582,18.54219],
  [-33.95573,18.54199], [-33.95419,18.53738], [-33.95326,18.53465], [-33.95081,18.52729], [-33.95067,18.52679],
  [-33.95056,18.52627], [-33.95048,18.52582], [-33.95044,18.52545], [-33.9504,18.52453], [-33.95035,18.52183],
  [-33.95021,18.51787], [-33.95004,18.51191], [-33.94997,18.50913], [-33.94993,18.50759], [-33.94986,18.50602],
  [-33.94986,18.50539], [-33.94984,18.50479], [-33.94987,18.50377], [-33.94994,18.5029], [-33.95005,18.50205],
  [-33.95027,18.501], [-33.95134,18.49607], [-33.95144,18.49551], [-33.95146,18.49508], [-33.95143,18.49458],
  [-33.95135,18.49419], [-33.9512,18.49372], [-33.95104,18.49338], [-33.94916,18.49043], [-33.94884,18.49],
  [-33.94844,18.48959], [-33.94805,18.48931], [-33.94712,18.48876], [-33.94678,18.48855], [-33.94498,18.48749],
  [-33.94452,18.48716], [-33.94422,18.48683], [-33.94396,18.48642], [-33.94379,18.48605], [-33.94368,18.48567],
  [-33.9436,18.48519], [-33.94359,18.48479], [-33.94367,18.48348], [-33.94366,18.48326], [-33.94377,18.48173],
  [-33.94384,18.48107], [-33.94424,18.47477], [-33.9443,18.47421], [-33.94464,18.47268], [-33.94521,18.47105],
  [-33.94633,18.46797], [-33.94646,18.46751], [-33.94649,18.46719], [-33.94646,18.46689], [-33.94642,18.46672],
  [-33.94636,18.4666], [-33.94617,18.46632], [-33.94599,18.46615], [-33.94582,18.46605], [-33.94525,18.4658],
  [-33.94519,18.46568], [-33.94485,18.46555], [-33.94457,18.46541], [-33.94432,18.4652], [-33.94408,18.46493],
  [-33.94383,18.46456], [-33.94366,18.46423], [-33.94349,18.46379], [-33.94336,18.46327], [-33.94329,18.46284],
  [-33.94328,18.46242], [-33.94333,18.46168], [-33.94347,18.46026], [-33.94346,18.45986], [-33.94337,18.45938],
  [-33.94326,18.45907], [-33.94312,18.45882], [-33.94288,18.45854], [-33.94259,18.45831], [-33.94227,18.45817],
  [-33.94172,18.45798], [-33.93993,18.45765], [-33.9396,18.45752], [-33.93935,18.45737], [-33.93906,18.45711],
  [-33.93885,18.45687], [-33.93865,18.45658], [-33.93778,18.45484], [-33.93728,18.45379], [-33.93707,18.45328],
  [-33.93646,18.4515], [-33.93649,18.45142], [-33.93655,18.45124], [-33.93666,18.45109], [-33.93685,18.45093],
  [-33.93667,18.45051], [-33.93651,18.44991], [-33.93637,18.4498], [-33.93623,18.44972], [-33.93609,18.44969],
  [-33.93586,18.44973], [-33.93572,18.44977], [-33.9356,18.44992], [-33.93551,18.45013], [-33.93549,18.45036],
  [-33.9355,18.45053], [-33.93565,18.45119], [-33.93567,18.45145], [-33.93455,18.45168], [-33.93356,18.45185],
  [-33.93316,18.45198], [-33.93082,18.45364], [-33.9307,18.45374], [-33.93022,18.45225],
];
// Illustrative extent near the affected N2 exit, using the recorded route geometry.
const affectedN2 = firstDrive.slice(
  firstDrive.findIndex(([, longitude]) => longitude === 18.47477),
  firstDrive.findIndex(([, longitude]) => longitude === 18.46026) + 1,
);
mapPoints.traffic = affectedN2[Math.floor(affectedN2.length / 2)];

const secondDrive = [
  [-33.93022,18.45225], [-33.9307,18.45374], [-33.93177,18.45296], [-33.93316,18.45198], [-33.93356,18.45185],
  [-33.93521,18.45155], [-33.9358,18.45141], [-33.93586,18.45143], [-33.93607,18.45141], [-33.93615,18.45146],
  [-33.93623,18.45157], [-33.93657,18.45242], [-33.93664,18.45251], [-33.93699,18.45348], [-33.93749,18.45457],
  [-33.93773,18.45503], [-33.93845,18.45653], [-33.93869,18.45695], [-33.93892,18.45723], [-33.93919,18.45745],
  [-33.93928,18.45753], [-33.93953,18.45766], [-33.93986,18.4578], [-33.94104,18.45812], [-33.94215,18.45841],
  [-33.94239,18.45851], [-33.94266,18.4587], [-33.94291,18.45893], [-33.9431,18.45926], [-33.94319,18.45949],
  [-33.94325,18.45982], [-33.94327,18.46013], [-33.94305,18.46244], [-33.94315,18.46351], [-33.94329,18.46419],
  [-33.94348,18.46477], [-33.94364,18.46508], [-33.94377,18.46526], [-33.944,18.46553], [-33.94432,18.46577],
  [-33.9445,18.46591], [-33.9457,18.46667], [-33.94593,18.46679], [-33.94623,18.46687], [-33.9467,18.46685],
  [-33.94778,18.46678], [-33.94827,18.46684], [-33.9489,18.46699], [-33.9493,18.46709], [-33.9496,18.46707],
  [-33.94983,18.46701], [-33.95093,18.46653], [-33.95155,18.4662], [-33.95254,18.46575], [-33.95467,18.46445],
  [-33.95527,18.46407], [-33.95558,18.46397], [-33.95607,18.46392], [-33.95728,18.46382], [-33.95775,18.46375],
  [-33.95851,18.46355], [-33.95904,18.46338], [-33.95948,18.46321], [-33.95969,18.46309], [-33.95993,18.46288],
  [-33.96013,18.46259], [-33.96026,18.46234], [-33.96041,18.4618], [-33.96054,18.46138], [-33.96063,18.46115],
  [-33.96083,18.46086], [-33.96108,18.46062], [-33.96128,18.46051], [-33.96326,18.45986], [-33.96412,18.45955],
  [-33.96443,18.45942], [-33.96451,18.45936], [-33.96466,18.45939], [-33.96473,18.45935], [-33.96499,18.45916],
  [-33.9654,18.45889], [-33.96557,18.45884], [-33.96565,18.45886], [-33.96578,18.45893], [-33.96599,18.45917],
  [-33.96663,18.46032], [-33.96686,18.46086], [-33.96686,18.46095], [-33.96685,18.46109], [-33.96674,18.46133],
  [-33.96663,18.46152], [-33.96653,18.46171], [-33.96647,18.46199], [-33.96648,18.46218], [-33.96658,18.46261],
  [-33.96663,18.46269], [-33.96701,18.46404], [-33.96726,18.46495], [-33.96753,18.46586], [-33.96769,18.46643],
  [-33.96772,18.46657], [-33.96893,18.46612], [-33.97117,18.4653], [-33.97146,18.46514], [-33.97235,18.46482],
  [-33.97264,18.4647], [-33.97306,18.46459], [-33.97348,18.46452], [-33.97379,18.4645], [-33.97496,18.46457],
  [-33.97698,18.46472], [-33.97707,18.46477], [-33.97725,18.46473], [-33.97827,18.46485], [-33.98038,18.46513],
];

for (const pin of replayMap.querySelectorAll('[data-map-point]')) {
  const [x, y] = mapPosition(mapPoints[pin.dataset.mapPoint]);
  pin.style.left = 100 * x / routeCanvas.width + '%';
  pin.style.top = 100 * y / routeCanvas.height + '%';
}

// Use one unobstructed segment on each leg, in route order.
const directionSegments = [
  [firstDrive, 18.57789],
  [secondDrive, 18.45986],
];
for (const [index, [drive, longitude]] of directionSegments.entries()) {
  const start = drive.findIndex(point => point[1] === longitude);
  const [x1, y1] = mapPosition(drive[start]);
  const [x2, y2] = mapPosition(drive[start + 1]);
  const arrow = replayMap.querySelector('[data-replay-leg="' + (index + 1) + '"]');
  arrow.style.left = 50 * (x1 + x2) / routeCanvas.width + '%';
  arrow.style.top = 50 * (y1 + y2) / routeCanvas.height + '%';
  arrow.style.setProperty('--direction', Math.atan2(y2 - y1, x2 - x1) + 'rad');
}

function drawDrive(points, color) {
  routeContext.beginPath();
  for (const [index, coordinates] of points.entries()) {
    const [x, y] = mapPosition(coordinates);
    if (index === 0) routeContext.moveTo(x, y);
    else routeContext.lineTo(x, y);
  }
  routeContext.lineCap = 'round';
  routeContext.lineJoin = 'round';
  routeContext.setLineDash([]);
  routeContext.lineWidth = 9;
  routeContext.strokeStyle = '#fff';
  routeContext.stroke();
  routeContext.setLineDash([]);
  routeContext.lineWidth = 5;
  routeContext.strokeStyle = color;
  routeContext.stroke();
}

function showReplay(setting) {
  const hasTraffic = setting !== 'static';
  replayPanel.dataset.setting = setting;
  replayPanel.setAttribute('aria-labelledby', 'replay-tab-' + setting);
  replayPanel.querySelector('[data-replay-empty]').hidden = hasTraffic;
  for (const item of replayPanel.querySelectorAll('[data-replay-traffic]')) item.hidden = !hasTraffic;
  for (const item of replayPanel.querySelectorAll('[data-replay-unrelated]')) item.hidden = setting !== 'shared';
  replayPanel.querySelector('[data-replay-duration]').textContent = hasTraffic ? '61 min 22 s' : '49 min 22 s';
  replayPanel.querySelector('[data-replay-outcome]').textContent = hasTraffic ? '5 min 22 s over the 56-minute limit.' : 'Within the 56-minute limit.';
  replayPanel.querySelector('.replay-delay').hidden = !hasTraffic;
  replayPanel.querySelector('[data-replay-meter-label]').textContent = (hasTraffic ? '61:22' : '49:22') + ' / 56:00 limit';
  routeContext.clearRect(0, 0, routeCanvas.width, routeCanvas.height);
  drawDrive(firstDrive, '#245e93');
  drawDrive(secondDrive, '#245e93');
  if (hasTraffic) drawDrive(affectedN2, '#ac461e');
}
bindTabs('[data-replay]', 'replay', showReplay);
showReplay('static');

const coveragePanel = document.querySelector('#coverage-panel');
// Figure 9 uses all runs for observation and the observed subset for correctness.
const maintenanceRates = { taskonly: ['14.1%', '43.1%'], shared: ['11.8%', '39.9%'] };
bindTabs('[data-coverage]', 'coverage', setting => {
  const [observed, correct] = maintenanceRates[setting];
  coveragePanel.setAttribute('aria-labelledby', 'coverage-tab-' + setting);
  coveragePanel.querySelector('[data-coverage-observed]').textContent = observed;
  coveragePanel.querySelector('[data-coverage-correct]').textContent = correct;
});
bindTabs('[data-analysis]','analysis',key=>{document.querySelector('#maintenance-panel').setAttribute('aria-labelledby','analysis-tab-'+key);for(const k of ['monitoring','grounding'])document.querySelector('#maintenance-'+k).hidden=k!==key;});
const traces={
 monitoring:{kind:'MISSED UPDATE',title:'Checks weather, but does not recheck traffic.',description:'After early CityNews queries return no alert, the model advances time and checks weather only. It does not acquire the traffic update that affects the trip.',verdict:'feasible: true',consequence:'The answer still uses about 50 minutes against the unchanged 56-minute limit.',outcome:'incorrect',steps:[['Steps 13–14 · 12:00','CityNews lookup fails, then returns an empty result. The traffic alert has not yet been published.'],['Step 16 · 13:30','Checks weather only. There is no weather alert; traffic news is not rechecked.'],['Step 17 · final','Submits a feasible trip using the earlier timing, without the 12-minute delay.']]},
 revision:{kind:'UPDATE APPLIED',title:'Reads the delay and revises the decision.',description:'The model obtains the relevant traffic notice and incorporates it while preserving the mandatory meeting and the original time limit.',verdict:'feasible: false',consequence:'The traffic-adjusted total exceeds 56 minutes, so the original trip is correctly rejected.',outcome:'correct',steps:[['Step 15 · 14:00','CityNews notice history returns the N2 collision alert: add 12 minutes.'],['Step 18 · recalculation','49 min 22 s + 12 min = 61 min 22 s > 56 min. The 20-minute meeting is retained.'],['Final decision','Reports the traffic alert and submits an infeasible trip judgment.']]},
 inertia:{kind:'CONFLICTING COMMITMENT',title:'The explanation changes; the submitted judgment does not.',description:'The model reads the update and computes that the trip exceeds the deadline. Its final structured decision nevertheless contradicts that calculation.',verdict:'feasible: true',consequence:'The committed judgment conflicts with its own updated calculation and written conclusion.',outcome:'incorrect',steps:[['Step 22 · 13:30','Queries CityNews for PEP Woodstock and receives the 12-minute delay.'],['Step 23 · explanation','Using rounded leg times, computes 62 > 56 minutes and says the trip cannot finish in time.'],['Submitted decision','Still commits feasible: true, despite recognizing that the updated trip is too long.']]}
};
function trace(key){const c=traces[key];for(const k of ['kind','title','description','verdict','consequence'])document.querySelector('#trace-'+k).textContent=c[k];const panel=document.querySelector('#trace-panel');panel.setAttribute('aria-labelledby','trace-tab-'+key);panel.dataset.outcome=c.outcome;document.querySelector('#trace-steps').replaceChildren(...c.steps.map(([title,description])=>{const li=document.createElement('li'),s=document.createElement('span'),p=document.createElement('p');s.textContent=title;p.textContent=description;li.append(s,p);return li;}));}
const clockActions = {
  monitoring: { '1200': 'Steps 13–14 · CityNews lookup returns no alert.', '1330': 'Step 16 · Checks weather only.', later: 'Step 17 · Submits feasible: true.' },
  revision: { '1400': 'Step 15 · CityNews returns the traffic delay.', later: 'Step 18 · Recalculates 61:22. Final decision: feasible: false.' },
  inertia: { '1330': 'Step 22 · CityNews returns the traffic delay.', later: 'Step 23 · Explains the overrun. Final decision: feasible: true.' }
};
function showCaseTrace(key) {
  trace(key);
  document.querySelectorAll('[data-clock]').forEach(point => {
    const action = clockActions[key][point.dataset.clock];
    point.textContent = action || 'No action shown.';
    point.closest('li').classList.toggle('clock-active', Boolean(action));
  });
}
bindTabs('[data-trace]', 'trace', showCaseTrace);
showCaseTrace('monitoring');
const dialog=document.querySelector('#image-dialog');document.querySelectorAll('.enlarge').forEach(b=>b.addEventListener('click',()=>{const image=document.querySelector('#dialog-image');image.src=b.dataset.image;image.alt=b.dataset.caption;document.querySelector('#dialog-caption').textContent=b.dataset.caption;dialog.showModal();}));
