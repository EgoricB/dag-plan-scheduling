"use strict";
const $=id=>document.getElementById(id), D=window.DAG_DATA;
if(!D) throw Error("Не загружен data.js. Скопируйте все файлы сайта.");
const names={left_short:"Короткая слева",left_long:"Длительная слева",right_short:"Короткая справа",right_long:"Длительная справа",open:"Открыть ящик",take_mug:"Взять кружку",put_mug:"Положить кружку",take_apple:"Взять яблоко",put_apple:"Положить яблоко",end:"Завершение"};
const fmt=(n,d=1)=>Number(n).toLocaleString("ru-RU",{minimumFractionDigits:d,maximumFractionDigits:d}),label=id=>names[id]||id||"Ожидание";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let key="parallel",mode="baseline",time=0,playing=false,lastStamp=null,models={},maxTime=20;
const color={baseline:"#4264db",optimized:"#197d65"};
function model(scene,plan){
 const tasks=Object.fromEntries(scene.tasks.map(t=>[t.id,t])),pos=[[-1,0],[1,0]],segments=[],stages=[];let start=0;
 plan.stages.forEach((st,idx)=>{const end=start+st.time,items=[];
  [st.left,st.right].forEach((id,arm)=>{if(!id){segments.push({arm,type:"idle",start,end,id:null,stage:idx});return;}
   const t=tasks[id],move=Math.hypot(t.pos[0]-pos[arm][0],t.pos[1]-pos[arm][1])/scene.parameters.speed;
   if(move>1e-8)segments.push({arm,type:"move",start,end:start+move,id,stage:idx});
   const finish=start+move+t.duration;segments.push({arm,type:"op",start:start+move,end:finish,id,stage:idx});
   if(end>finish+1e-8)segments.push({arm,type:"idle",start:finish,end,id,stage:idx});
   items.push({id,arm,finish});pos[arm]=t.pos;
  });stages.push({...st,start,end,items,index:idx});start=end;
 });return{scene,plan,tasks,segments,stages};
}
function load(){
 playing=false;time=0;lastStamp=null;const item=D.scenes[key];
 models={baseline:model(item.scene,item.plans.baseline),optimized:model(item.scene,item.plans.optimized)};
 maxTime=Math.max(...Object.values(models).map(m=>m.plan.execution_seconds));$("scrub").max=maxTime;
 $("scenario-description").textContent=key==="parallel"?"Сценарий включает четыре независимые операции и терминальный узел. Различие длительностей позволяет оценить влияние локального критерия расстояний на время завершения.":"Сценарий включает две цепочки удержания и операцию открытия ящика. Политики формируют различные расписания с одинаковым временем завершения.";
 ["baseline","optimized"].forEach(m=>{const p=models[m].plan;$(m==="baseline"?"base-total":"opt-total").textContent=fmt(p.execution_seconds,0)+" с";
  $(m+"-metrics").innerHTML=`<div><b>${fmt(p.distance,0)}</b>усл. ед. перемещения</div><div><b>${fmt(p.planning_ms,3)} мс</b>вычисление плана</div><div><b>${p.states}</b>состояний в кэше</div>`;drawTimeline(m);
 });
 $("insight").textContent=key==="parallel"?"В базовом расписании асимметрия длительностей приводит к ожиданию на границах стадий. Модификация совмещает длительные операции, затем короткие: 11 + 2 = 13 с вместо 9 + 11 = 20 с. Суммарное перемещение возрастает с 2 до 3 условных единиц.":"Зависимость размещения от открытия ящика и условия удержания ограничивают допустимую параллельность. Оба расписания завершаются за 6 с; в этом сценарии модификация не снижает итоговое время.";
 renderDetails();update();
}
function drawTimeline(m){
 const M=models[m],x=t=>100+t/maxTime*760;let svg=`<svg viewBox="0 0 900 188" role="img" aria-label="Расписание ${m==="baseline"?"базового":"точного"} алгоритма"><defs><pattern id="hatch-${m}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fafbf8"/><line x1="0" y1="0" x2="0" y2="7" stroke="#d7dfd6" stroke-width="2"/></pattern></defs>`;
 for(let a=0;a<2;a++)svg+=`<text x="5" y="${56+a*65}" font-size="14" fill="#647273">${a===0?"Левая":"Правая"}</text><rect x="100" y="${29+a*65}" width="760" height="41" rx="5" fill="#f0f3ed"/>`;
 M.segments.forEach(s=>{const width=(s.end-s.start)/maxTime*760,fill=s.type==="op"?color[m]:s.type==="move"?"#bcc5d7":`url(#hatch-${m})`;svg+=`<g><title>${esc(label(s.id))}: ${s.type==="op"?"операция":s.type==="move"?"перемещение":"ожидание"}, ${fmt(s.start)}–${fmt(s.end)} с</title><rect x="${x(s.start)}" y="${29+s.arm*65}" width="${width}" height="41" fill="${fill}"/>`;
 if(s.type==="op"&&width>100)svg+=`<text x="${x(s.start)+8}" y="${55+s.arm*65}" fill="white" font-size="12">${esc(label(s.id))}</text>`;svg+="</g>";});
 M.stages.forEach(s=>{svg+=`<line x1="${x(s.end)}" x2="${x(s.end)}" y1="22" y2="145" stroke="#8c9994" stroke-dasharray="3 4"/>`;});
 const ticks=maxTime<=8?1:5;for(let t=0;t<=maxTime+1e-8;t+=ticks)svg+=`<text x="${x(t)}" y="165" text-anchor="middle" font-size="13" fill="#647273">${fmt(t,0)}</text>`;
 svg+=`<line id="cursor-${m}" x1="100" x2="100" y1="18" y2="145" stroke="#182526" stroke-width="2.2"/><circle id="dot-${m}" cx="100" cy="17" r="4" fill="#182526"/></svg>`;$(m+"-timeline").innerHTML=svg;
}
function renderDetails(){
 const M=models[mode];$("log-mode").textContent=mode==="baseline"?"Базовый алгоритм":"Модифицированный алгоритм";
 function armCell(s,a){
  const id=a===0?s.left:s.right;
  if(!id)return `<span>Не назначен</span><small>Ожидание: ${fmt(s.time)} с</small>`;
  const parts=M.segments.filter(v=>v.stage===s.index&&v.arm===a),duration=type=>parts.filter(v=>v.type===type).reduce((sum,v)=>sum+v.end-v.start,0);
  return `<span>${esc(label(id))}</span><small>Перемещение: ${fmt(duration("move"))} с<br>Операция: ${fmt(duration("op"))} с<br>Ожидание: ${fmt(duration("idle"))} с</small>`;
 }
 $("stage-log").innerHTML=M.stages.map(s=>`<tr id="stage-${s.index}"><td>${s.index+1}</td><td>${fmt(s.start)}–${fmt(s.end)}</td><td>${armCell(s,0)}</td><td>${armCell(s,1)}</td><td>${fmt(s.time)}</td></tr>`).join("");
 document.querySelectorAll("[data-mode]").forEach(b=>{b.classList.toggle("selected",b.dataset.mode===mode);b.setAttribute("aria-pressed",String(b.dataset.mode===mode));});drawGraph();
}
function status(m,a){
 const M=models[m];if(time>=M.plan.execution_seconds-1e-8)return"Задача завершена";
 const s=M.stages.find(s=>time>=s.start&&time<s.end);if(!s)return"Ожидание";
 const seg=M.segments.find(v=>v.arm===a&&time>=v.start&&time<v.end);
 if(!seg||seg.type==="idle")return"Ожидание синхронизации";
 return(seg.type==="move"?"Перемещение → ":"Операция: ")+label(seg.id);
}
function update(){
 $("scrub").value=time;$("clock").textContent=fmt(time)+" с";$("play").textContent=playing?"Пауза":"Воспроизвести";
 ["baseline","optimized"].forEach(m=>{const x=100+time/maxTime*760;$("cursor-"+m).setAttribute("x1",x);$("cursor-"+m).setAttribute("x2",x);$("dot-"+m).setAttribute("cx",x);
 $(m+"-status").innerHTML=[0,1].map(a=>`<div><span class="hand-label">${a===0?"Левая":"Правая"}</span><span>${esc(status(m,a))}</span></div>`).join("");});
 models[mode].stages.forEach(s=>{const row=$("stage-"+s.index);row.className=time>=s.end-1e-8?"finished":time>=s.start?"current":"";});drawGraph();
}
function drawGraph(){
 const M=models[mode],tasks=Object.values(M.tasks),layers={},groups={},visiting=new Set();
 function layer(t){
  if(layers[t.id]!==undefined)return layers[t.id];
  if(visiting.has(t.id))throw Error("Цикл в графе");
  visiting.add(t.id);
  const n=Math.max(-1,...(t.deps||[]).map(id=>{if(!M.tasks[id])throw Error("Неизвестный предшественник: "+id);return layer(M.tasks[id]);}))+1;
  visiting.delete(t.id);return layers[t.id]=n;
 }
 tasks.forEach(t=>(groups[layer(t)]??=[]).push(t));
 const cols=Math.max(...Object.keys(groups).map(Number))+1,rows=Math.max(...Object.values(groups).map(g=>g.length));
 const W=230,H=83,DX=310,DY=118,top=80,width=60+cols*DX,height=top+rows*DY+25,coords={};
 Object.entries(groups).forEach(([l,group])=>group.forEach((t,k)=>{coords[t.id]=[25+Number(l)*DX,top+k*DY+(rows-group.length)*DY/2];}));
 const done=new Set(),current=new Map();
 M.stages.forEach(s=>{
  if(time>=s.end-1e-8)[s.left,s.right].filter(Boolean).forEach(id=>done.add(id));
  else if(time>=s.start)[s.left,s.right].forEach((id,a)=>{if(!id)return;const seg=M.segments.find(v=>v.stage===s.index&&v.arm===a&&time>=v.start&&time<v.end);current.set(id,seg?.type||"idle");});
 });
 if(time>=M.plan.execution_seconds-1e-8)tasks.filter(t=>t.kind==="complete").forEach(t=>done.add(t.id));
 const types={operate:"операция",occupy:"захват",release:"освобождение",tool:"действие с удержанием",complete:"логическое завершение"};
 let svg=`<svg style="min-width:${Math.min(width,900)}px;width:100%;height:auto" viewBox="0 0 ${width} ${height}" role="img" aria-label="Граф предшествования: стрелка направлена от предшественника к зависимому действию"><defs><marker id="dep-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#657387"/></marker></defs>`;
 Object.keys(groups).forEach(l=>{svg+=`<text x="${25+Number(l)*DX}" y="29" font-size="13" fill="#606974">Уровень ${Number(l)+1}</text>`;});
 tasks.forEach(t=>(t.deps||[]).forEach((id,i)=>{
  const a=coords[id],b=coords[t.id],x1=a[0]+W,y1=a[1]+H/2,x2=b[0]-5,y2=b[1]+H/2;let d;
  if(layer(t)-layer(M.tasks[id])>1){const route=45+(i%3)*10;d=`M${x1},${y1} C${x1+35},${y1} ${x1+35},${route} ${x1+55},${route} L${x2-55},${route} C${x2-25},${route} ${x2-25},${y2} ${x2},${y2}`;}
  else{const mid=(x1+x2)/2;d=`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;}
  svg+=`<path d="${d}" fill="none" stroke="#657387" stroke-width="1.5" marker-end="url(#dep-arrow)"><title>${esc(label(id))} → ${esc(label(t.id))}</title></path>`;
 }));
 tasks.forEach(t=>{
  const [x,y]=coords[t.id],completed=done.has(t.id),phase=current.get(t.id),ready=(t.deps||[]).every(id=>done.has(id));
  const text=completed?(t.kind==="complete"?"Задание завершено":"Стадия завершена"):phase==="move"?"Перемещение":phase==="op"?"Выполнение операции":phase==="idle"?"Ожидание границы стадии":ready?"Предшественники завершены":"Ожидание предшественников";
  const fill=completed?"#e8f2ec":phase?"#e8eef9":ready?"#fff":"#f0f1f3",stroke=phase?color[mode]:"#aeb8c5";
  svg+=`<g><title>${esc(t.id)}; ${esc((t.deps||[]).join(", ")||"без предшественников")}</title><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="3" fill="${fill}" stroke="${stroke}"/><text x="${x+10}" y="${y+22}" font-size="14" fill="#20262d">${esc(label(t.id))}</text><text x="${x+10}" y="${y+43}" font-size="11" fill="#535e6a">${esc(types[t.kind]||t.kind)} · ${fmt(t.duration||0)} с</text><text x="${x+10}" y="${y+65}" font-size="11" fill="#354660">${esc(text)}</text></g>`;
 });
 $("graph").innerHTML=svg+"</svg>";
}
$("scene").addEventListener("change",e=>{key=e.target.value;load();});
$("play").addEventListener("click",()=>{if(time>=maxTime)time=0;playing=!playing;lastStamp=null;update();});
$("reset").addEventListener("click",()=>{playing=false;time=0;lastStamp=null;update();});
$("step").addEventListener("click",()=>{playing=false;const boundaries=[...new Set(Object.values(models).flatMap(m=>m.stages.map(s=>s.end)))].sort((a,b)=>a-b);time=boundaries.find(t=>t>time+1e-6)??maxTime;update();});
$("scrub").addEventListener("input",e=>{playing=false;time=Number(e.target.value);update();});
$("speed").addEventListener("change",()=>lastStamp=null);
for(const b of document.querySelectorAll("[data-mode]"))b.addEventListener("click",()=>{mode=b.dataset.mode;renderDetails();update();});
document.addEventListener("visibilitychange",()=>{lastStamp=null;});
function frame(stamp){if(playing&&!document.hidden){if(lastStamp!==null){time=Math.min(maxTime,time+(stamp-lastStamp)/1000*Number($("speed").value));if(time>=maxTime)playing=false;update();}lastStamp=stamp;}else lastStamp=null;requestAnimationFrame(frame);}
const S=D.summary,P=D.scenes.parallel.plans;
$("hero-before").textContent=fmt(P.baseline.execution_seconds,0)+" с";$("hero-after").textContent=fmt(P.optimized.execution_seconds,0)+" с";$("hero-gain").textContent="−"+fmt(100*(1-P.optimized.execution_seconds/P.baseline.execution_seconds),0)+"%";
$("mean-gain").textContent=fmt(S.mean_relative_reduction_percent,2)+" %";$("improved-count").textContent=S.improved;$("equal-count").textContent=S.equal;
$("improved-bar").style.width=(100*S.improved/S.cases)+"%";$("equal-bar").style.width=(100*S.equal/S.cases)+"%";
$("base-cost").textContent=fmt(S.mean_baseline_planning_ms,2)+" мс";$("opt-cost").textContent=fmt(S.mean_optimized_planning_ms,2)+" мс";
const costMax=Math.max(S.mean_baseline_planning_ms,S.mean_optimized_planning_ms);$("base-cost-bar").style.width=100*S.mean_baseline_planning_ms/costMax+"%";$("opt-cost-bar").style.width=100*S.mean_optimized_planning_ms/costMax+"%";
$("aggregate").textContent="Сокращение суммы времён исполнения: "+fmt(S.aggregate_reduction_percent,2)+" %. Это отношение суммарных времён, а не среднее относительных снижений; поэтому значения различаются.";
load();requestAnimationFrame(frame);
$("case-count").textContent=String(S.cases); // ACADEMIC_ALL_IN_ONE
