'use strict';
function bindTabs(selector,key,pick){const buttons=[...document.querySelectorAll(selector)];function select(b){buttons.forEach(x=>{x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});pick(b.dataset[key]);}buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||(e.key==='ArrowDown'&&b.parentElement.getAttribute('aria-orientation')==='vertical'))next=(i+1)%buttons.length;else if(e.key==='ArrowLeft'||(e.key==='ArrowUp'&&b.parentElement.getAttribute('aria-orientation')==='vertical'))next=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();select(buttons[next]);buttons[next].focus();});});}
let resultData=null;
function results(setting){if(!resultData)return;const cols=setting==='static'?[0,1,2,3,4,5,6]:[7,9,8];const names=setting==='static'?['Grounding','Discovery','Mobility','Multi-Entity','Long-Horizon','Safety','Region']:['Matched Static','Task-Only','Shared'];const table=document.querySelector('#results-table');table.dataset.setting=setting;document.querySelector('#result-panel').setAttribute('aria-labelledby','result-tab-'+setting);document.querySelector('#result-description').textContent=setting==='static'?'All 1,088 static tasks across seven categories, evaluated under fixed world states.':'The same 149 matched tasks are evaluated in all three columns. Matched Static uses the fixed-world versions of those tasks.';const head=document.createElement('tr');['Model',...names].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;head.append(th);});table.tHead.replaceChildren(head);const maxima=cols.map(c=>Math.max(...resultData.rows.map(r=>r.values[c].mean)));const rows=resultData.rows.map(row=>{const tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=row.model;tr.append(name);cols.forEach((c,i)=>{const v=row.values[c],td=document.createElement('td'),mean=document.createElement('span'),se=document.createElement('span');mean.className='mean';mean.textContent=v.mean.toFixed(1);se.className='se';se.textContent=' ± '+v.se.toFixed(1);if(v.mean===maxima[i])td.classList.add('best');td.append(mean,se);tr.append(td);});return tr;});table.tBodies[0].replaceChildren(...rows);}
window.resultsReady=fetch('assets/paper-v3/results.json').then(r=>{if(!r.ok)throw Error('Result data unavailable');return r.json();}).then(data=>{if(data.rows.length!==9||data.rows.some(r=>r.values.length!==10))throw Error('Invalid result data');resultData=data;results('static');return true;}).catch(e=>{document.querySelector('#result-description').textContent='The results table could not load. Please refresh the page.';throw e;});
bindTabs('[data-results]','results',results);

// The results table sits above Finding 1 and expands when its data arrives.
const q1QuestionLink = document.querySelector('#problem a[href="#finding-q1"]');
function followQ1AfterResults(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const previousHash = location.hash;
  function followLink() {
    if (location.hash !== previousHash) return;
    if (location.hash === q1QuestionLink.hash) document.querySelector(q1QuestionLink.hash).scrollIntoView();
    else location.hash = q1QuestionLink.hash;
  }
  window.resultsReady.then(followLink, followLink);
}
q1QuestionLink.addEventListener('click', followQ1AfterResults);
function restoreQ1Link() {
  q1QuestionLink.removeEventListener('click', followQ1AfterResults);
}
window.resultsReady.then(restoreQ1Link, restoreQ1Link);


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

const replayPanel = document.querySelector('#replay-panel');
const replayMap = replayPanel.querySelector('.replay-map-frame');
const routeCanvas = replayMap.querySelector('canvas');
const caseRouteMap = document.querySelector('#case-route-map');
const caseRouteCanvas = caseRouteMap.querySelector('canvas');
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

// Use one unobstructed segment on each leg, in route order.
const directionSegments = [
  [firstDrive, 18.57789],
  [secondDrive, 18.45986],
];
for (const map of [replayMap, caseRouteMap]) {
  for (const pin of map.querySelectorAll('[data-map-point]')) {
    const [x, y] = mapPosition(mapPoints[pin.dataset.mapPoint]);
    pin.style.left = 100 * x / routeCanvas.width + '%';
    pin.style.top = 100 * y / routeCanvas.height + '%';
  }
  for (const [index, [drive, longitude]] of directionSegments.entries()) {
    const start = drive.findIndex(point => point[1] === longitude);
    const [x1, y1] = mapPosition(drive[start]);
    const [x2, y2] = mapPosition(drive[start + 1]);
    const arrow = map.querySelector('[data-replay-leg="' + (index + 1) + '"]');
    arrow.style.left = 50 * (x1 + x2) / routeCanvas.width + '%';
    arrow.style.top = 50 * (y1 + y2) / routeCanvas.height + '%';
    arrow.style.setProperty('--direction', Math.atan2(y2 - y1, x2 - x1) + 'rad');
  }
}

function drawDrive(routeContext, points, color) {
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

function paintRoute(canvas, hasTraffic) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawDrive(context, firstDrive, '#245e93');
  drawDrive(context, secondDrive, '#245e93');
  if (hasTraffic) drawDrive(context, affectedN2, '#ac461e');
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
  paintRoute(routeCanvas, hasTraffic);
}
bindTabs('[data-replay]', 'replay', showReplay);
showReplay('static');

// Recorded steps shown in Figure 4. Untimed steps stay in the last column.
const caseTraces = {
  monitoring: {
    title: 'Misses the traffic update',
    verdict: true,
    consequence: 'The submission still uses about 50 minutes and leaves out the delay.',
    steps: [
      ['1200', 'Steps 13–14 · 12:00', 'Looks up CityNews', 'The first lookup fails. The next returns no alert because the traffic update has yet to be published.'],
      ['1330', 'Step 16 · 13:30', 'Checks weather only', 'The weather check finds no alert. The agent does not recheck traffic news.'],
      ['later', 'Step 17 · Final submission', 'Keeps the original judgment', 'The agent submits a feasible trip using its earlier estimate.'],
    ],
  },
  revision: {
    title: 'Finds the delay and revises the decision',
    verdict: false,
    consequence: 'The agent reports the alert and rejects the trip after including the delay.',
    steps: [
      ['1400', 'Step 15 · 14:00', 'Finds the alert in CityNews', 'The notice history returns the N2 collision and the 12-minute delay.'],
      ['later', 'Step 18 · Recalculation', 'Adds 12 minutes to the first drive', 'The new total is 61:22. The 20-minute meeting stays in the itinerary.'],
      ['later', 'Final submission', 'Changes the trip to infeasible', 'The revised trip exceeds the same 56-minute limit.'],
    ],
  },
  inertia: {
    title: 'Recalculates the trip but submits the old judgment',
    verdict: true,
    consequence: 'The submitted field conflicts with the agent’s written conclusion.',
    steps: [
      ['1330', 'Step 22 · 13:30', 'Finds the alert in CityNews', 'A CityNews query for PEP Woodstock returns the 12-minute delay.'],
      ['later', 'Step 23 · Written explanation', 'Recognizes that the trip exceeds the limit', 'With rounded leg times, the agent calculates 62 minutes and says the trip cannot finish within 56 minutes.'],
      ['later', 'Final submission', 'Still submits feasible: true', 'The structured judgment keeps the original answer.'],
    ],
  },
  kimi: {
    title: 'Rechecks base routes and misses the traffic alert',
    verdict: true,
    consequence: 'The model never queries CityNews and submits the unchanged 49:22 estimate.',
    steps: [
      ['1400', 'Steps 14–15 · 14:00', 'Rechecks the routes in MapApp', 'MapApp still returns the base driving times of 17:38 and 11:44.'],
      ['later', 'Step 16 · Final submission', 'Treats the base times as current', 'The model judges the trip feasible using 49:22, without accounting for the traffic delay.'],
    ],
  },
  'gemini-pro': {
    title: 'Rechecks CityNews after the alert',
    verdict: false,
    consequence: 'The updated estimate is 61:22, above the 56-minute limit.',
    steps: [
      ['1200', 'Step 15 · 12:00', 'Checks CityNews before the alert', 'The notice history is empty at 12:00.'],
      ['1400', 'Step 19 · 14:00', 'Rechecks CityNews and finds the alert', 'The same notice history now returns the N2 collision and the 12-minute delay.'],
      ['later', 'Step 20 · Final submission', 'Updates the feasibility judgment', 'The model adds the delay to the original estimate and submits the trip as infeasible.'],
    ],
  },
  grok: {
    title: 'Finds the delay and checks alternatives',
    verdict: false,
    consequence: 'The model combines the base driving times with the alert and judges the trip infeasible.',
    steps: [
      ['1330', 'Step 32 · 13:30', 'Finds the Woodstock traffic alert', 'CityNews returns a 12-minute delay on the affected N2 leg.'],
      ['later', 'Steps 35–36 · Route checks', 'Looks for a faster route', 'MapApp returns driving routes and indicates that transit is unavailable. The checks return no faster option.'],
      ['later', 'Step 37 · Final submission', 'Submits the trip as infeasible', 'The model includes the delay and determines that the trip exceeds the 56-minute limit.'],
    ],
  },
};

const casePanel = document.querySelector('#trace-panel');
const caseClock = [...casePanel.querySelectorAll('[data-case-time]')];
const caseWorldControls = [...document.querySelectorAll('[data-case-world]')];
const caseMapState = document.querySelector('#case-map-state');
const caseTrafficPin = caseRouteMap.querySelector('[data-map-point="traffic"]');
let selectedCaseTime = '1320';

function showCaseTime(time, hasTraffic = time !== '1200') {
  selectedCaseTime = time;
  const phase = hasTraffic ? 'after' : 'before';
  caseRouteMap.dataset.phase = phase;
  caseMapState.textContent = hasTraffic ? 'After the 13:20 alert' : 'Before the 13:20 alert';
  caseTrafficPin.hidden = !hasTraffic;
  caseWorldControls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.caseWorld === phase)));
  caseClock.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.caseTime === time)));
  casePanel.querySelectorAll('[data-case-step]').forEach(step => {
    step.classList.toggle('case-step-focus', step.dataset.caseStep === time);
  });
  paintRoute(caseRouteCanvas, hasTraffic);
}

function showCaseTrace(key) {
  const trace = caseTraces[key];
  casePanel.setAttribute('aria-labelledby', 'trace-tab-' + key);
  casePanel.dataset.outcome = trace.verdict ? 'incorrect' : 'correct';
  document.querySelector('#trace-title').textContent = trace.title;
  document.querySelector('#trace-verdict').textContent = 'feasible: ' + trace.verdict;
  document.querySelector('#trace-correctness').textContent = trace.verdict ? 'Incorrect' : 'Correct';
  document.querySelector('#trace-consequence').textContent = trace.consequence;

  const steps = trace.steps.map(([time, meta, title, detail]) => {
    const item = document.createElement('li');
    item.dataset.caseStep = time;
    const label = document.createElement('span');
    label.textContent = meta;
    const heading = document.createElement('b');
    heading.textContent = title;
    const body = document.createElement('p');
    body.textContent = detail;
    item.append(label, heading, body);
    return item;
  });
  document.querySelector('#trace-steps').replaceChildren(...steps);

  for (const button of caseClock) {
    const time = button.dataset.caseTime;
    if (time === '1320') continue;
    const matches = trace.steps.filter(([stage]) => stage === time);
    button.disabled = matches.length === 0;
    button.querySelector('small').textContent = matches.at(-1)?.[2] ?? 'No step shown';
  }
  const isAvailable = caseClock.some(button => button.dataset.caseTime === selectedCaseTime && !button.disabled);
  showCaseTime(isAvailable ? selectedCaseTime : '1320');
}

for (const button of caseClock) {
  button.addEventListener('click', () => showCaseTime(button.dataset.caseTime));
}
for (const button of caseWorldControls) {
  button.addEventListener('click', () => {
    const before = button.dataset.caseWorld === 'before';
    const hasEarlyStep = caseClock.some(node => node.dataset.caseTime === '1200' && !node.disabled);
    showCaseTime(before && hasEarlyStep ? '1200' : before ? '' : '1320', !before);
  });
}
bindTabs('[data-trace]', 'trace', showCaseTrace);
showCaseTrace('monitoring');

const dialog=document.querySelector('#image-dialog');document.querySelectorAll('.enlarge').forEach(b=>b.addEventListener('click',()=>{const image=document.querySelector('#dialog-image');image.src=b.dataset.image;image.alt=b.dataset.caption;document.querySelector('#dialog-caption').textContent=b.dataset.caption;dialog.showModal();}));


// Figure 8. Error-bar endpoints read from the vector figure on its percentage axes.
const checkingSettings = ['Task-Only', 'Shared'];
const postChangeSeries = checkingSettings.map((label, index) => [label, ['#d6b95d', '#6c805e'][index]]);
const coverageSeries = checkingSettings.map((label, index) => [label, ['#bd8675', '#80b3cf'][index]]);
const queryCoverage = {
  total: [
    ['0', [0, 0]],
    ['1–5', [5.3, 4.6], [[1.79, 9.42], [0.96, 9.21]]],
    ['6–10', [16.0, 12.5], [[10.32, 22.08], [7.47, 18.36]]],
    ['11–15', [25.3, 26.9], [[18.03, 32.97], [19.54, 34.13]]],
    ['16–20', [29.0, 24.2], [[20.42, 37.92], [17.63, 30.65]], 'volume'],
    ['≥21', [20.6, 18.0], [[16.52, 25.43], [14.25, 22.32]], 'volume'],
  ],
  targeted: [
    ['0', [7.5, 7.2], [[5.34, 10.0], [5.11, 9.47]], 'focused'],
    ['1', [85.7, 81.3], [[77.87, 92.19], [73.42, 88.48]], 'focused'],
    ['≥2', [95.4, 90.5], [[88.49, 100.0], [82.74, 97.73]]],
  ],
};

// Figure 9(a). Columns follow the four outcomes in the paper's legend.
const observationSeries = [
  ['Observed all necessary events', '#087ca7'],
  ['Reported events correctly', '#66b5d1'],
  ['Final decision correct', '#dca21d'],
  ['Overall success', '#465561'],
];
const observationOutcomes = [
  ['DeepSeek V4 Flash Vision Exp', [13.4, 8.1, 6.7, 3.4], [9.4, 3.4, 5.4, 1.3]],
  ['Kimi K3', [4.7, 4.0, 4.0, 2.7], [2.7, 2.7, 2.7, 2.0]],
  ['Qwen3.8-Max', [8.7, 6.0, 9.4, 4.7], [6.7, 4.7, 8.7, 4.0]],
  ['Grok 4.5', [31.5, 18.1, 12.1, 10.1], [27.5, 17.4, 8.7, 6.7]],
  ['Gemini 3.7 Flash', [38.9, 32.9, 17.4, 14.1], [37.6, 28.9, 16.1, 13.4]],
  ['Gemini 3.1 Pro Preview', [10.4, 9.6, 10.4, 6.7], [10.3, 8.1, 6.6, 3.7]],
  ['Claude Sonnet 5', [6.7, 6.0, 6.7, 2.7], [6.0, 5.4, 6.7, 2.0]],
  ['Claude Opus 5', [8.1, 7.4, 10.1, 4.7], [4.0, 4.0, 6.0, 1.3]],
  ['GPT-5.6 Sol', [4.7, 4.0, 6.0, 2.7], [2.0, 2.0, 6.0, 1.3]],
];

// Figure 9(b). Display the printed percentages. Normalize only the arc geometry.
const groundingSeries = [
  ['Both correct', '#624c91'],
  ['Event correct only', '#bb7142'],
  ['Decision correct only', '#5c9e9b'],
  ['Neither correct', '#8492a8'],
];
const groundingValues = [[40.3, 36.4, 2.8, 20.5], [35.3, 38.6, 4.6, 21.6]];
const maintenanceClaims = {
  targeted: 'Of runs that reached a necessary event, 20.6% in Task-Only and 18.0% in Shared queried the affected information after the change.',
  stale: 'Of runs that had already checked the affected information, 31.1% in Task-Only and 33.6% in Shared never checked it again.',
  volume: 'Mean coverage stays below 30% in every total-query group. In both settings, runs with at least 21 queries observe fewer necessary events on average than runs with 16–20.',
  focused: 'Mean coverage rises from 7.5% to 85.7% in Task-Only and from 7.2% to 81.3% in Shared when comparing runs with zero and one targeted query after a necessary event.',
  observe: 'In Task-Only, 38.9% of Gemini 3.7 Flash runs observe every necessary event, compared with 6.7% for Claude Sonnet 5. In Shared, the shares are 37.6% and 6.0%.',
  correct: 'Among runs observing every necessary event, 43.1% in Task-Only and 39.9% in Shared decide correctly, combining the “Both correct” and “Decision correct only” sectors.',
  report: 'Among runs observing every necessary event, 36.4% in Task-Only and 38.6% in Shared report the events correctly but decide incorrectly.',
};

function maintenanceLegend(series) {
  return '<ul class="maintenance-legend">' + series.map(([label, color]) =>
    '<li><i aria-hidden="true" style="--series-color:' + color + '"></i>' + label + '</li>').join('') + '</ul>';
}

function renderMaintenanceBars(id, { title, unit, scale, series, rows, labelWidth, compact = false, legend = false }) {
  const ticks = Array.from({ length: 5 }, (_, index) => scale * index / 4);
  const axis = ticks.map(tick => '<span style="--tick:' + (100 * tick / scale) + '%">' + tick + '</span>').join('');
  const groups = rows.map(([name, values, errors, focus = '']) => {
    const bars = values.map((value, index) => {
      const [label, color] = series[index];
      const range = errors?.[index];
      const error = range ? '<i class="maintenance-error" style="--error-left:' + (100 * range[0] / scale) +
        '%;--error-width:' + (100 * (range[1] - range[0]) / scale) + '%"></i>' : '';
      const end = Math.max(value, range?.[1] ?? 0);
      const accessibleName = name + ', ' + label + ': ' + value.toFixed(1) + '%';
      return '<div class="maintenance-bar" role="img" aria-label="' + accessibleName + '" title="' + accessibleName +
        '" data-chart-focus="' + (compact && index !== 0 ? '' : focus) +
        '" style="--series-color:' + color + ';--bar-width:' + (100 * value / scale) + '%;--value-left:' + (100 * end / scale) + '%">' +
        '<i class="maintenance-bar-fill"></i>' + error + '<b class="maintenance-value">' + value.toFixed(1) + '</b></div>';
    }).join('');
    return '<div class="maintenance-bar-group"><span class="maintenance-row-label" data-chart-focus="' + focus + '">' +
      name + '</span><div class="maintenance-plot">' + bars + '</div></div>';
  }).join('');
  const target = document.getElementById(id);
  target.className = 'maintenance-bar-chart' + (compact ? ' maintenance-bar-chart-compact' : '');
  target.style.setProperty('--chart-label', labelWidth);
  target.innerHTML = '<p class="maintenance-plot-title">' + title + '</p>' +
    '<p class="maintenance-unit">' + unit + '</p><div class="maintenance-axis" aria-hidden="true">' + axis + '</div>' +
    '<div class="maintenance-bar-groups">' + groups + '</div>' + (legend ? maintenanceLegend(series) : '');
}

renderMaintenanceBars('checking-rates', {
  title: 'Post-change checking', unit: 'Eligible runs (%)', scale: 40,
  series: postChangeSeries, labelWidth: '5.45rem', legend: true,
  rows: [['Targeted query', [20.6, 18.0], null, 'targeted'], ['No recheck', [31.1, 33.6], null, 'stale']],
});
renderMaintenanceBars('total-query-coverage', {
  title: 'Total queries per run', unit: 'Mean event coverage (%)', scale: 40,
  series: coverageSeries, rows: queryCoverage.total, labelWidth: '2.4rem', legend: true,
});
renderMaintenanceBars('targeted-query-coverage', {
  title: 'Post-event targeted queries', unit: 'Mean event coverage (%)', scale: 100,
  series: coverageSeries, rows: queryCoverage.targeted, labelWidth: '1.7rem', legend: true,
});
['task-only-outcomes', 'shared-outcomes'].forEach((id, setting) => {
  const rows = observationOutcomes.map(([model, taskOnly, shared]) => {
    const focus = model === 'Gemini 3.7 Flash' || model === 'Claude Sonnet 5' ? 'observe' : '';
    return [model, setting === 0 ? taskOnly : shared, null, focus];
  });
  renderMaintenanceBars(id, {
    title: checkingSettings[setting] + ' Dynamics', unit: 'Share of runs (%)', scale: 40,
    series: observationSeries, rows, labelWidth: '7.2rem', compact: true,
  });
});
document.querySelector('#observation-legend').innerHTML = maintenanceLegend(observationSeries);
document.querySelector('#grounding-legend').innerHTML = maintenanceLegend(groundingSeries);

const groundingCanvases = document.querySelectorAll('.grounding-ring');

function traceRingSector(ctx, x, y, inner, outer, start, end) {
  ctx.beginPath();
  ctx.arc(x, y, outer, start, end);
  ctx.arc(x, y, inner, end, start, true);
  ctx.closePath();
}

function drawGroundingRing(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const setting = Number(canvas.dataset.groundingSetting);
  const values = groundingValues[setting];
  const claim = canvas.closest('figure').dataset.activeClaim;
  const active = claim === 'report' ? [1] : claim === 'correct' ? [0, 2] : [];
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const x = width / 2;
  const y = height / 2;
  const outer = Math.min((width - 98) / 2, height * .39);
  const inner = outer * .68;
  const total = values.reduce((sum, value) => sum + value, 0);
  let start = -Math.PI / 2;

  values.forEach((value, index) => {
    const end = start + value / total * Math.PI * 2;
    const [, color] = groundingSeries[index];
    const emphasized = active.includes(index);
    ctx.globalAlpha = claim ? (emphasized ? 1 : .34) : 1;
    ctx.fillStyle = color;
    traceRingSector(ctx, x, y, inner, outer, start, end);
    ctx.fill();
    ctx.strokeStyle = '#f5f9fd';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const middle = (start + end) / 2;
    const dx = Math.cos(middle);
    const dy = Math.sin(middle);
    const right = dx >= 0;
    const elbowX = x + dx * (outer + 8);
    const elbowY = y + dy * (outer + 8);
    const endX = right ? width - 49 : 49;
    ctx.strokeStyle = color;
    ctx.lineWidth = emphasized ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(x + dx * outer, y + dy * outer);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(endX, elbowY);
    ctx.stroke();
    ctx.fillStyle = '#223a50';
    ctx.textBaseline = 'middle';
    ctx.textAlign = right ? 'left' : 'right';
    ctx.font = (emphasized ? '750 ' : '650 ') + '14px Segoe UI, sans-serif';
    ctx.fillText(value.toFixed(1) + '%', endX + (right ? 3 : -3), elbowY);
    start = end;
  });

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#223a50';
  ctx.textAlign = 'center';
  ctx.font = '700 15px Segoe UI, sans-serif';
  ctx.fillText(checkingSettings[setting], x, y);
  canvas.setAttribute('aria-label', checkingSettings[setting] + ' Dynamics. ' + values.map((value, index) =>
    groundingSeries[index][0] + ' ' + value.toFixed(1) + '%').join('. '));
}

const groundingObserver = new ResizeObserver(entries => entries.forEach(({ target }) => drawGroundingRing(target)));
groundingCanvases.forEach(canvas => groundingObserver.observe(canvas));
document.querySelectorAll('.maintenance-evidence').forEach(figure => {
  const buttons = figure.querySelectorAll('[data-maintenance-claim]');
  const marks = figure.querySelectorAll('[data-chart-focus]');
  const note = figure.querySelector('.maintenance-evidence-note');
  buttons.forEach(button => button.addEventListener('click', () => {
    const claim = button.getAttribute('aria-pressed') === 'true' ? '' : button.dataset.maintenanceClaim;
    figure.dataset.activeClaim = claim;
    buttons.forEach(choice => choice.setAttribute('aria-pressed', String(Boolean(claim) && choice === button)));
    marks.forEach(mark => {
      const focused = Boolean(claim) && mark.dataset.chartFocus === claim;
      mark.classList.toggle('is-focused', focused);
      mark.classList.toggle('is-muted', Boolean(claim) && !focused);
    });
    note.textContent = maintenanceClaims[claim] ?? '';
    const rings = figure.querySelectorAll('.grounding-ring');
    rings.forEach(drawGroundingRing);
    const firstFocus = figure.querySelector('.is-focused');
    const target = firstFocus?.closest('.maintenance-bar-chart') ?? rings[0];
    if (claim && target && window.matchMedia('(max-width: 640px)').matches && target.getBoundingClientRect().top > window.innerHeight - 140) {
      target.scrollIntoView({ block: 'start' });
    }
  }));
});


// Figures 10 and 11. Each row follows the category order in the corresponding legend.
const failureRadarSeries = [
  ['Landmark bias', '#b28520'],
  ['Spatial reasoning failure', '#29699d'],
  ['Visual perception failure', '#409174'],
  ['Intent-to-search failure', '#ba631e'],
  ['Discriminative verification failure', '#9d6297'],
  ['Evidence integration failure', '#619ab8'],
  ['Evidence hallucination', '#646d78'],
];
const failureRingSeries = [
  ['Change monitoring failure', '#466f87'],
  ['Task-relevance confusion', '#c8a455'],
  ['Event applicability misjudgment', '#78a08e'],
  ['Decision inertia', '#9987b1'],
  ['Constraint-preserving replanning failure', '#c98177'],
];
const failureProfiles = [
  ['GPT-5.6 Sol', [1.3, 4.9, 4.0, 24.3, 18.2, 9.8, 37.5], [95.4, 0.4, 0.0, 2.3, 1.9]],
  ['Claude Opus 5', [1.7, 10.1, 4.0, 27.2, 13.8, 9.7, 33.6], [86.4, 1.3, 3.8, 6.0, 2.6]],
  ['Claude Sonnet 5', [2.0, 11.2, 3.3, 29.8, 14.2, 9.8, 29.6], [85.3, 2.9, 4.2, 3.8, 3.8]],
  ['Gemini 3.1 Pro Preview', [0.4, 11.6, 7.2, 17.9, 24.6, 8.5, 29.8], [83.0, 2.0, 1.0, 4.0, 10.0]],
  ['Gemini 3.7 Flash', [0.8, 9.8, 4.6, 14.5, 28.2, 9.5, 32.6], [38.6, 16.6, 3.4, 13.8, 27.6]],
  ['Grok 4.5', [1.5, 11.3, 10.3, 20.4, 13.6, 10.5, 32.5], [61.4, 10.2, 3.9, 6.3, 18.1]],
  ['Qwen3.8-Max', [1.2, 16.5, 6.6, 23.3, 10.4, 8.7, 33.2], [86.9, 3.3, 3.9, 2.6, 3.3]],
  ['Kimi K3', [2.1, 8.1, 5.7, 11.4, 9.9, 6.3, 56.4], [86.6, 3.0, 3.0, 4.5, 3.0]],
  ['DeepSeek V4 Flash Vision Exp', [0.3, 12.7, 5.5, 16.6, 13.8, 5.6, 45.5], [68.1, 12.8, 4.3, 6.4, 8.5]],
  ['All models', [1.3, 10.6, 5.7, 20.4, 16.1, 8.7, 37.3], [79.4, 4.9, 3.0, 5.2, 7.6]],
];
const failureLogoNames = ['gpt', 'opus', 'sonnet', 'gemini-pro', 'gemini-flash', 'grok', 'qwen', 'kimi', 'deepseek'];
const failureClaims = {
  evidence: {
    note: 'Across all models, intent-to-search, discriminative verification, evidence integration, and evidence hallucination account for 82.5% of attributed static failures.',
    axes: { 'All models': [3, 4, 5, 6] },
  },
  profiles: {
    note: 'For Claude Sonnet 5, intent-to-search failures (29.8%) and evidence hallucinations (29.6%) are nearly equal. For Gemini 3.7 Flash, discriminative verification accounts for 28.2% of static attributions.',
    axes: { 'Claude Sonnet 5': [3, 6], 'Gemini 3.7 Flash': [4] },
  },
};

function drawFailureMarker(ctx, index, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = failureRadarSeries[index][1];
  if (index === 4 || index === 6) {
    if (index === 6) ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size, -size * .29, size * 2, size * .58);
    ctx.fillRect(-size * .29, -size, size * .58, size * 2);
  } else {
    const [sides, start, scale] = [
      [10, -Math.PI / 2, 1.12], [4, Math.PI / 4, 1.23], [3, -Math.PI / 2, 1.15],
      [4, 0, 1.12], null, [3, Math.PI / 2, 1.15],
    ][index];
    ctx.beginPath();
    for (let vertex = 0; vertex < sides; vertex++) {
      const angle = start + vertex * 2 * Math.PI / sides;
      const radius = size * scale * (index === 0 && vertex % 2 ? .45 : 1);
      const point = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      if (vertex === 0) ctx.moveTo(...point);
      else ctx.lineTo(...point);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = .55;
    ctx.strokeStyle = '#506879';
    ctx.stroke();
  }
  ctx.restore();
}

function drawFailureRadar(ctx, width, height, values, selected, dimmed) {
  const center = [width / 2, height * .52];
  const radius = Math.min(width * .345, (height - 25) / 2.35);
  const maxShare = Math.max(...values);
  const directions = values.map((_, index) => {
    const angle = -Math.PI / 2 + index / values.length * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  });
  const position = (index, distance) => directions[index].map((value, axis) => center[axis] + value * distance);
  const polygon = points => {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    points.slice(1).forEach(point => ctx.lineTo(...point));
    ctx.closePath();
  };

  ctx.lineWidth = 1;
  for (const level of [.25, .5, .75, 1]) {
    ctx.strokeStyle = level === 1 ? '#c2d0db' : '#e1e9f0';
    polygon(values.map((_, index) => position(index, radius * level)));
    ctx.stroke();
  }
  ctx.strokeStyle = '#d0dce6';
  for (const [index] of values.entries()) {
    ctx.beginPath();
    ctx.moveTo(...center);
    ctx.lineTo(...position(index, radius));
    ctx.stroke();
  }

  const points = values.map((value, index) => position(index, radius * value / maxShare));
  polygon(points);
  ctx.fillStyle = 'rgba(105, 131, 150, .14)';
  ctx.strokeStyle = '#6d8a9e';
  ctx.globalAlpha = dimmed ? .44 : selected.length ? .74 : 1;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const narrow = width < 165;
  values.forEach((_, index) => {
    const emphasized = selected.includes(index);
    const [, color] = failureRadarSeries[index];
    const [x, y] = points[index];
    ctx.globalAlpha = emphasized || (!dimmed && selected.length === 0) ? 1 : .65;
    ctx.fillStyle = emphasized ? color : '#6e899c';
    ctx.beginPath();
    ctx.arc(x, y, emphasized ? 3.6 : 2.25, 0, 2 * Math.PI);
    ctx.fill();
    if (emphasized) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const [glyphX, glyphY] = position(index, radius * 1.17);
    drawFailureMarker(ctx, index, glyphX, glyphY, narrow ? 6 : 8);
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + (narrow ? '13' : '16') + 'px "Times New Roman", serif';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  values.forEach((value, index) => {
    const emphasized = selected.includes(index);
    ctx.globalAlpha = emphasized || (!dimmed && selected.length === 0) ? 1 : .65;
    const label = value.toFixed(1) + '%';
    const [axisX, labelY] = position(index, radius * .81);
    const bottomGap = Math.max(4, ctx.measureText(label).width / 2 + 4 - Math.abs(axisX - center[0]));
    const labelX = index === 3 || index === 4 ? axisX + Math.sign(axisX - center[0]) * bottomGap : axisX;
    ctx.strokeText(label, labelX, labelY);
    ctx.fillStyle = emphasized ? failureRadarSeries[index][1] : '#172f45';
    ctx.fillText(label, labelX, labelY);
  });
}


function drawFailureRing(ctx, width, height, values, logo) {
  const x = width / 2;
  const y = height / 2;
  const outer = Math.min((width - 83) / 2, height * .33);
  const inner = outer * .66;
  const total = values.reduce((sum, value) => sum + value, 0);
  const labels = [];
  let start = -Math.PI / 2;

  values.forEach((value, index) => {
    if (value === 0) return;
    const end = start + value / total * 2 * Math.PI;
    ctx.fillStyle = failureRingSeries[index][1];
    traceRingSector(ctx, x, y, inner, outer, start, end);
    ctx.fill();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = '#f7fbfe';
    ctx.stroke();

    if (index !== 0) {
      const mid = (start + end) / 2;
      const dx = Math.cos(mid);
      const dy = Math.sin(mid);
      labels.push({
        value,
        index,
        side: dx >= 0 ? 1 : -1,
        edgeX: x + outer * dx,
        edgeY: y + outer * dy,
        elbowX: x + (outer + 5) * dx,
        y: y + (outer + 5) * dy,
      });
    }
    start = end;
  });

  ctx.font = '650 ' + (width < 174 ? '12' : '14') + 'px Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  for (const side of [-1, 1]) {
    const sideLabels = labels.filter(label => label.side === side).sort((a, b) => a.y - b.y);
    let previousY = 1;
    for (const label of sideLabels) {
      label.y = Math.max(label.y, previousY + 16);
      previousY = label.y;
    }
    const offset = Math.max(0, previousY - (height - 8));
    for (const label of sideLabels) {
      const labelY = label.y - offset;
      const text = label.value.toFixed(1) + '%';
      const inset = Math.max(29, ctx.measureText(text).width + 2);
      const textX = side === 1 ? width - inset : inset;
      const lineEnd = textX - 3 * side;
      ctx.strokeStyle = failureRingSeries[label.index][1];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(label.edgeX, label.edgeY);
      ctx.lineTo(label.elbowX, labelY);
      ctx.lineTo(lineEnd, labelY);
      ctx.stroke();
      ctx.fillStyle = '#233a50';
      ctx.textAlign = side === 1 ? 'left' : 'right';
      ctx.fillText(text, textX, labelY);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#315e78';
  const logoSize = outer * .51;
  const logoY = y - outer * .22;
  if (logo?.complete && logo.naturalWidth) {
    ctx.drawImage(logo, x - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
  } else if (!logo) {
    ctx.font = '700 ' + logoSize + 'px Segoe UI, sans-serif';
    ctx.fillText('Σ', x, logoY);
  }
  ctx.font = '700 ' + (outer < 46 ? '15' : '19') + 'px Segoe UI, sans-serif';
  ctx.fillText(values[0].toFixed(1) + '%', x, y + outer * .25);
}

const failureCharts = new Map();
function updateFailureChart(canvas) {
  const chart = failureCharts.get(canvas);
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  if (chart.kind === 'static') {
    const claim = chart.figure.dataset.activeClaim;
    const axes = failureClaims[claim]?.axes?.[chart.model] ?? [];
    drawFailureRadar(ctx, width, height, chart.values, axes, Boolean(claim) && axes.length === 0);
  } else {
    drawFailureRing(ctx, width, height, chart.values, chart.logo);
  }
}

const failureChartObserver = new ResizeObserver(entries => entries.forEach(({ target }) => updateFailureChart(target)));
document.querySelectorAll('.failure-evidence').forEach(figure => {
  const grid = figure.querySelector('.failure-profile-grid');
  const legend = figure.querySelector('.failure-chart-legend');
  const note = figure.querySelector('.failure-evidence-note');
  const buttons = figure.querySelectorAll('[data-failure-claim]');
  const kind = figure.id === 'failure-static' ? 'static' : 'dynamic';
  const series = kind === 'static' ? failureRadarSeries : failureRingSeries;

  const canvases = failureProfiles.map(([model, radar, ring], index) => {
    const values = kind === 'static' ? radar : ring;
    const tile = document.createElement('div');
    tile.className = 'failure-profile';
    tile.dataset.failureModel = model;
    const label = document.createElement('p');
    label.className = 'failure-profile-name';
    const name = document.createElement('span');
    name.textContent = '(' + String.fromCharCode(97 + index) + ') ' + model + (kind === 'dynamic' && index === 3 ? '*' : '');
    label.append(name);
    const canvas = document.createElement('canvas');
    canvas.className = 'failure-profile-chart';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', model + '. ' + values.map((value, index) =>
      series[index][0] + ': ' + value.toFixed(1) + '%').join('. '));
    if (kind === 'static') tile.append(canvas, label);
    else tile.append(label, canvas);
    grid.append(tile);
    const logo = kind === 'dynamic' && index < failureLogoNames.length ? new Image() : null;
    failureCharts.set(canvas, { figure, kind, model, values, logo });
    if (logo) {
      logo.addEventListener('load', () => updateFailureChart(canvas), { once: true });
      logo.src = 'assets/paper-v3/model-logos/' + failureLogoNames[index] + '.png';
    }
    failureChartObserver.observe(canvas);
    return canvas;
  });

  legend.innerHTML = maintenanceLegend(series);
  if (kind === 'static') {
    legend.querySelectorAll('i').forEach((swatch, index) => {
      const marker = document.createElement('canvas');
      marker.className = 'failure-marker';
      marker.width = 32;
      marker.height = 32;
      marker.setAttribute('aria-hidden', 'true');
      drawFailureMarker(marker.getContext('2d'), index, 16, 16, 10);
      swatch.replaceWith(marker);
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const claim = button.getAttribute('aria-pressed') === 'true' ? '' : button.dataset.failureClaim;
    figure.dataset.activeClaim = claim;
    buttons.forEach(choice => choice.setAttribute('aria-pressed', String(Boolean(claim) && choice === button)));
    note.textContent = failureClaims[claim]?.note ?? '';
    canvases.forEach(canvas => {
      const model = failureCharts.get(canvas).model;
      const selected = Boolean(failureClaims[claim]?.axes?.[model]);
      canvas.parentElement.classList.toggle('is-focused', selected);
      updateFailureChart(canvas);
    });
    const firstFocus = grid.querySelector('.is-focused');
    if (firstFocus && window.matchMedia('(max-width: 640px)').matches && firstFocus.getBoundingClientRect().top > window.innerHeight - 120) {
      firstFocus.scrollIntoView({ block: 'start' });
    }
  }));
});


// Figure 5, in the row and column order of the paper.
const heatmapModels = ['GPT-5.6 Sol', 'Claude Opus 5', 'Claude Sonnet 5', 'Gemini 3.1 Pro Preview', 'Gemini 3.7 Flash', 'Grok 4.5', 'Qwen3.8-Max', 'Kimi K3', 'DeepSeek V4 Flash Vision Exp', 'Model mean'];
const heatmapValues = {
  taskonly: [
    [-34.8,-15.6,0,-8.8,-20.0], [-26.1,-6.2,0,-17.6,-31.4],
    [-26.1,-15.6,0,-23.5,-31.4], [8.7,-15.6,-8.0,-17.6,-34.3],
    [39.1,-25.0,-4.0,-20.6,-31.4], [21.7,3.1,-4.0,-14.7,-20.0],
    [-17.4,-18.8,0,-20.6,-28.6], [-4.3,3.1,0,-2.9,-11.4],
    [-4.3,-9.4,-4.0,-17.6,-31.4], [-4.8,-11.1,-2.2,-16.0,-26.7],
  ],
  shared: [
    [-34.8,-21.9,0,-8.8,-20.0], [-30.4,-18.8,0,-17.6,-31.4],
    [-30.4,-15.6,0,-23.5,-31.4], [-4.3,-18.8,-8.0,-17.6,-34.3],
    [34.8,-25.0,-4.0,-26.5,-25.7], [8.7,-3.1,-4.0,-14.7,-20.0],
    [-26.1,-15.6,0,-20.6,-28.6], [-4.3,0,0,-2.9,-11.4],
    [0,-21.9,-4.0,-17.6,-31.4], [-9.7,-15.6,-2.2,-16.7,-26.0],
  ],
};
const heatmapPanel = document.querySelector('#heatmap-panel');
const heatmapBody = heatmapPanel.querySelector('tbody');
const heatmapClaims = document.querySelectorAll('[data-heatmap-focus]');
let heatmapSetting = 'taskonly';
let heatmapFocus = 'tasks';

function signedChange(value) {
  return value === 0 ? '0' : (value < 0 ? '−' : '+') + Math.abs(value).toFixed(1);
}

function showHeatmap() {
  const matrix = heatmapValues[heatmapSetting];
  const taskFocus = heatmapFocus === 'tasks';
  heatmapPanel.setAttribute('aria-labelledby', 'heatmap-tab-' + heatmapSetting);
  for (const claim of heatmapClaims) {
    claim.setAttribute('aria-pressed', String(claim.dataset.heatmapFocus === heatmapFocus));
  }
  heatmapPanel.querySelectorAll('thead th').forEach((cell, index) => {
    cell.classList.toggle('heatmap-header-focus', taskFocus && (index === 1 || index === 5));
  });
  const rows = heatmapModels.map((model, rowIndex) => {
    const tr = document.createElement('tr');
    const mean = rowIndex === heatmapModels.length - 1;
    const chosenModel = !taskFocus && (rowIndex === 2 || rowIndex === 4);
    tr.classList.toggle('heatmap-mean', mean);
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = model;
    label.classList.toggle('heatmap-header-focus', taskFocus ? mean : chosenModel);
    tr.append(label);
    matrix[rowIndex].forEach((value, column) => {
      const cell = document.createElement('td');
      const selected = taskFocus ? mean && (column === 0 || column === 4) : chosenModel;
      cell.textContent = signedChange(value);
      cell.classList.toggle('heatmap-cell-focus', selected);
      cell.classList.toggle('heatmap-cell-muted', !selected);
      cell.classList.toggle('heatmap-gain', value > 0);
      cell.classList.toggle('heatmap-strong', Math.abs(value) >= 28);
      cell.style.setProperty('--heat', (Math.abs(value) / 40 * 100).toFixed(2) + '%');
      tr.append(cell);
    });
    return tr;
  });
  heatmapBody.replaceChildren(...rows);
  const setting = heatmapSetting === 'taskonly' ? 'Task-Only' : 'Shared';
  const average = matrix.at(-1);
  document.querySelector('#heatmap-note').textContent = taskFocus
    ? 'In ' + setting + ', Region-Aware falls ' + Math.abs(average[4]).toFixed(1) + ' points on average, compared with ' + Math.abs(average[0]).toFixed(1) + ' for Mobility Planning.'
    : 'Gemini 3.7 Flash and Claude Sonnet 5 start at 26.2% and 22.8% in Static. In ' + setting + ', they reach ' +
      (heatmapSetting === 'taskonly' ? '14.1% and 2.7%' : '13.4% and 2.0%') + ' overall. The highlighted rows show how those changes vary by task.';
}
bindTabs('[data-heatmap-setting]', 'heatmapSetting', setting => {
  heatmapSetting = setting;
  showHeatmap();
});
for (const button of heatmapClaims) {
  button.addEventListener('click', () => {
    heatmapFocus = button.dataset.heatmapFocus;
    showHeatmap();
  });
}
showHeatmap();

// Figure 6(a) model rates and the means reported in the text.
const paperLineModels = [
  { name: 'GPT-5.6 Sol', color: '#2869ad', rates: [18.1, 10.7, 2.7, 1.3] },
  { name: 'Claude Opus 5', color: '#b94651', rates: [21.5, 15.4, 4.7, 1.3] },
  { name: 'Gemini 3.7 Flash', color: '#18796e', rates: [26.2, 22.8, 14.1, 13.4] },
];
const paperConditions = ['Static', 'Explicit Update', 'Task-Only', 'Shared'];
const paperLineSteps = {
  apply: { index: 0, note: 'Even with every necessary update provided, mean success falls from 21.9% to 16.3% (−5.6 pp).' },
  find: { index: 1, note: 'When agents must find the updates themselves, mean success falls from 16.3% to 7.2% (−9.1 pp).' },
  filter: { index: 2, note: 'When unrelated events appear alongside the necessary ones, mean success falls from 7.2% to 5.4% (−1.8 pp).' },
};
// Error-bar endpoints recovered from the vector coordinates in Figure 6(b–c).
const paperEventCounts = {
  unrelated: {
    label: 'Task-unrelated events', bins: ['0–<14', '14–<32', '≥32'], rates: [42.1, 55.6, 75.0],
    intervals: [[18.18,68.75], [20,100], [0,100]],
    note: 'Among model–task pairs that succeeded in Task-Only, the share failing in Shared rises with the number of unrelated events.',
  },
  necessary: {
    label: 'Necessary task events', bins: ['1', '2', '≥3'], rates: [66.7, 83.3, 100.0],
    intervals: [[55,78.05], [55.56,100], [100,100]],
    note: 'Among model–task pairs that succeeded in Static, the share failing in Explicit Update rises with the number of necessary events.',
  },
};

const paperContrastPanel = document.querySelector('#paper-contrast-panel');
const paperContrastNote = document.querySelector('#paper-contrast-note');
const paperLineView = paperContrastPanel.querySelector('.paper-line-view');
const paperCanvas = paperLineView.querySelector('canvas');
const paperCountView = document.querySelector('#paper-count-panel');
let activePaperStep = 0;

function drawPaperLineChart() {
  const width = paperCanvas.clientWidth;
  const height = paperCanvas.clientHeight;
  if (!width || !height) return;
  const pixelRatio = window.devicePixelRatio || 1;
  paperCanvas.width = Math.round(width * pixelRatio);
  paperCanvas.height = Math.round(height * pixelRatio);
  const ctx = paperCanvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  const plot = { left: 33, right: width - 7, top: 19, bottom: height - 13 };
  const x = index => plot.left + (plot.right - plot.left) * (index + .5) / 4;
  const y = value => plot.bottom - (plot.bottom - plot.top) * value / 30;
  const segment = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  ctx.fillStyle = '#e5effa';
  ctx.fillRect(x(activePaperStep) - 6, plot.top - 5, x(activePaperStep + 1) - x(activePaperStep) + 12, plot.bottom - plot.top + 5);
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let value = 0; value <= 30; value += 5) {
    ctx.strokeStyle = '#d0deeb';
    ctx.lineWidth = 1;
    segment(plot.left, y(value), plot.right, y(value));
    ctx.fillStyle = '#526b83';
    ctx.fillText(String(value), plot.left - 6, y(value));
  }
  for (let index = 0; index < 4; index++) {
    ctx.strokeStyle = '#d0deeb';
    segment(x(index), plot.top, x(index), plot.bottom);
  }
  for (const model of paperLineModels) {
    ctx.strokeStyle = model.color;
    ctx.fillStyle = model.color;
    for (let index = 0; index < 3; index++) {
      ctx.globalAlpha = index === activePaperStep ? 1 : .38;
      ctx.lineWidth = index === activePaperStep ? 3 : 1.6;
      segment(x(index), y(model.rates[index]), x(index + 1), y(model.rates[index + 1]));
    }
    model.rates.forEach((value, index) => {
      ctx.globalAlpha = index === activePaperStep || index === activePaperStep + 1 ? 1 : .45;
      ctx.beginPath();
      ctx.arc(x(index), y(value), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  ctx.font = '700 ' + (width < 400 ? '12' : '14') + 'px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  for (const index of [activePaperStep, activePaperStep + 1]) {
    paperLineModels.forEach((model, modelIndex) => {
      const value = model.rates[index];
      if (index === 3 && modelIndex === 1) return;
      const sharedTie = index === 3 && modelIndex === 0;
      ctx.fillStyle = sharedTie ? '#334a61' : model.color;
      const offset = modelIndex === 0 && index !== 3 ? 13 : -12;
      ctx.fillText(value.toFixed(1) + '%' + (sharedTie ? ' ×2' : ''), x(index), y(value) + offset);
    });
  }
  const labels = paperLineModels.map(model => model.name + ', ' +
    paperConditions[activePaperStep] + ' ' + model.rates[activePaperStep].toFixed(1) + '%, ' +
    paperConditions[activePaperStep + 1] + ' ' + model.rates[activePaperStep + 1].toFixed(1) + '%');
  paperCanvas.setAttribute('aria-label', 'Task success rates. Highlighted comparison: ' + labels.join('. '));
}

function renderPaperEventCounts(data) {
  paperCountView.querySelector('.paper-count-axis').textContent = data.label;
  const columns = data.rates.map((value, index) => {
    const [low, high] = data.intervals[index];
    const bin = data.bins[index];
    const label = bin + ' events: ' + value.toFixed(1) + '% conditional success loss. Error bar ' + low + '% to ' + high + '%.';
    return '<div class="paper-count-column' + (index === 1 ? ' paper-count-middle' : '') + '"><div class="paper-count-track" role="img" aria-label="' + label + '">' +
      '<i class="paper-count-bar" style="--value:' + value + '%"></i>' +
      '<i class="paper-count-error" style="--low:' + low + '%;--interval:' + (high - low) + '%"></i>' +
      '<b style="--value:' + value + '%">' + value.toFixed(1) + '%</b></div><span>' + bin + '</span></div>';
  }).join('');
  const chart = paperCountView.querySelector('.paper-count-chart');
  chart.dataset.countType = data === paperEventCounts.necessary ? 'necessary' : 'unrelated';
  chart.innerHTML =
    '<div class="paper-count-ticks" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>' + columns;
}

function showPaperContrast(view) {
  const step = paperLineSteps[view];
  paperContrastPanel.setAttribute('aria-labelledby', 'paper-contrast-tab-' + view);
  paperContrastNote.textContent = step.note;
  activePaperStep = step.index;
  drawPaperLineChart();
}
function showPaperCounts(view) {
  const counts = paperEventCounts[view];
  paperCountView.setAttribute('aria-labelledby', 'paper-count-tab-' + view);
  document.querySelector('#paper-count-note').textContent = counts.note;
  renderPaperEventCounts(counts);
}
bindTabs('[data-paper-contrast]', 'paperContrast', showPaperContrast);
bindTabs('[data-paper-count]', 'paperCount', showPaperCounts);
new ResizeObserver(drawPaperLineChart).observe(paperCanvas);
showPaperContrast('apply');
showPaperCounts('necessary');
