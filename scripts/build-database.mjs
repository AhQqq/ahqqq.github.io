import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => readFileSync(resolve(root, p), 'utf8');
const data = n => JSON.parse(read(`character-builder/frontend/data/${n}.json`));
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p = x => x ? `<p>${esc(x).replace(/\n/g,'<br>')}</p>` : '';
const cards = xs => `<ul class="card-wrapper">${xs.join('\n')}</ul>`;
const card = (x, body) => `<li class="card" id="${esc(x.id)}"><h3>${esc(x.name)}</h3><h4>${esc(x.englishName || x.eng_name || '')}</h4>${body}</li>`;
const table = (id, title, heads, rows) => `<table id="${id}"><caption>${esc(title)}</caption><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('\n')}</tbody></table>`;
const pages = {};
const put = (page, key, value) => (pages[page] ??= {})[key] = value;
for (const [category,key] of Object.entries({'고마법':'high_magic','원소마법':'elem_magic','사령마법':'nec_magic'})) put('spells',key,cards(data('spells').filter(x=>x.category===category).map(x=>card(x,p(x.category+' · '+x.level)+p(x.description)))));
const artKeys = {high:'high_mage',elem:'elementalist',healer:'healer',necro:'necromancer',vowed:'vowed',skinshifter:'shifter',duelist:'duelist',beastmaster:'beastmaster',priest:'priest',thought_noble:'thought_noble',accursed:'accursed',bard:'bard',mageslayer:'mageslayer',wise:'wise'};
for (const [name,key] of Object.entries(artKeys)) put('arts',key,cards(data(`arts/${name}_arts`).map(x=>card({...x,id:`art-${name}-${x.id}`},p(x.description)))));
const legacy = JSON.parse(read('database-templates/focus-legacy.json'));
const focusKeys = {'기본':'basic','다른 아인':'oth_demi','다른 세계':'oth_setting','다른 크리쳐':'oth_creature','기사 유파':'knight','성혈':'godblood','신비한 비밀':'arcane-secrets','비인간':'nonhuman','기타':'etc-focus'};
for (const [category,key] of Object.entries(focusKeys)) {
 const groups = new Map();
 for (const x of data('foci').filter(x=>x.category===category)) { const k=x.englishName || x.name; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(x); }
 const content = [...groups.values()].map(xs=>{
  xs.sort((a,b)=>a.level-b.level); const first=xs[0]; const old=legacy.find(r=>r[1]===first.englishName && r[2]===category);
  const desc=xs.find(x=>x.desc)?.desc || old?.[3];
  let body=p(desc);
  for(const x of xs) { const text=x.effect || old?.[3+x.level]; body+=text ? p(`레벨 ${x.level}${x.name!==first.name ? ` (${x.name})` : ""}: ${text}`) : ''; }
  for (const level of [1,2]) if(old?.[3+level] && !xs.some(x=>x.level===level)) body+=p(`레벨 ${level}: ${old[3+level]}`);
  if(old?.[6]) body+=`<h4>${esc(old[6])}</h4>`+p(old[7]);
  return card(first,body);
 });
 put('focus',key,cards(content));
}
const equipment=data('equipment'), props=data('equipment_properties');
const byId=new Map(equipment.map(x=>[x.id,x]));
const price=x=>x.price ? `${({silver:'은',copper:'동',gold:'금'}[x.price.currency] || x.price.currency)} ${x.price.amount}` : '—';
const load=x=>x.encumbrance?.raw ?? x.encumbrance?.value ?? '—';
const properties=x=>(x.propertyIds || []).map(id=>{const found=props.find(p=>p.id===id);if(!found)throw Error(`Unknown property ${id}`);return found.name;}).join(', ');
for(const [cat,id,title] of [['gear','gear_tbl','모험 장비'],['bundle','gearbundle_tbl','장비 묶음']]) put('equipment',id,table(id,title,['물품','가격','하중'],equipment.filter(x=>x.category===cat).map(x=>[x.name,price(x),load(x)])));
put('equipment','weapon_tbl',table('weapon_tbl','무기',['무기','피해','충격','능력치','사거리','가격','하중','특성'],equipment.filter(x=>x.weapon).map(x=>[x.name,x.weapon.damage,x.weapon.shock?`${x.weapon.shock.damage} / AC ${x.weapon.shock.maxAc}`:'—',x.weapon.attributes.join('/'),x.weapon.range?`${x.weapon.range.normal}/${x.weapon.range.maximum} 피트`:'—',price(x),load(x),properties(x)])));
put('equipment','armorTable',table('armorTable','방어구',['방어구','AC','가격','하중','특성'],equipment.filter(x=>x.armor||x.shield).map(x=>[x.name,x.armor?.baseAc ?? x.shield.baseAc,price(x),load(x),properties(x)])));
put('equipment','properties','<div class="listing"><h2>장비 특성</h2>'+props.map(x=>`<h3 id="property-${esc(x.id)}">${esc(x.name)}</h3>${p(x.description)}`).join('')+'</div>');
put('equipment','packages',cards(data('starting_equipment').map(x=>card(x,table(`package-${x.id}`,x.name,['물품','수량','하중'],x.items.map(i=>{if(!byId.has(i.id))throw Error(`Unknown equipment ${i.id}`);return [byId.get(i.id).name,i.count,i.encumbrance ?? '—'];}))+p(`은 ${x.currency.silver}`)))));
const skills=data('skills');
const tags={any:'아무',phys:'육체',mental:'정신',combat:'전투'};
function action(x) {const label=x.action==='fixed_skill'?skills.find(s=>s.id===x.id)?.name : `${tags[x.id] || x.id} ${x.action==='tag_attr'?'능력치':'기술'}`; if(!label)throw Error(`Unknown action ${JSON.stringify(x)}`);return label+(x.count>1?` +${x.count}`:'');}
put('backgrounds','backgrounds',cards(data('backgrounds').map(x=>card(x,p(x.description)+p('공짜 기술: '+x.free_skill.map(action).join(', '))+p('추천 기술: '+x.sugg_skill.map(action).join(', '))+table(`growth-${x.id}`,'성장',['d6','결과'],x.growth.map((a,i)=>[i+1,action(a)]))+table(`learn-${x.id}`,'학습',['d8','결과'],x.learn.map((a,i)=>[i+1,action(a)]))))));
put('reference','skills','<div class="listing"><ul>'+skills.map(x=>`<li id="skill-${esc(x.id)}"><p><b>${esc(x.name)}:</b> ${esc(x.description)}</p></li>`).join('')+'</ul></div>');
for (const [page,values] of Object.entries(pages)) {
 let html=read(`database-templates/${page}.html`).replace(/\{\{([^}]+)\}\}/g,(_,key)=>{if(!(key in values))throw Error(`Missing ${page}:${key}`);return values[key];});
 html=html.replace('<!DOCTYPE html>','<!DOCTYPE html>\n<!-- Generated by scripts/build-database.mjs; edit database-templates and shared catalogues. -->');
 if(process.argv.includes('--check')) {if(read(page+'.html')!==html)throw Error(`Stale generated page: ${page}`);} else writeFileSync(resolve(root,page+'.html'),html);
}
console.log(`Database ${process.argv.includes('--check')?'verified':'generated'}: ${Object.keys(pages).join(', ')}`);
