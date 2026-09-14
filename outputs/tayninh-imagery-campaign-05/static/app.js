const state = { inventory: null, records: [], filters: { q: '', category: 'all', access: 'all' } };
const accessLabels = {
  asset_acquired: 'Đã thu tệp dữ liệu',
  metadata_or_diagnostic_acquired: 'Đã thu metadata/chẩn đoán',
  candidate_restricted: 'Ứng viên cần quyền/tài khoản',
  blocked_or_none: 'Bị chặn hoặc chưa có tệp',
  technique_roadmap: 'Kỹ thuật/lộ trình',
  unknown: 'Chưa phân loại'
};
const categoryLabels = { all: 'Tất cả', baseline: 'Baseline', optical: 'Ảnh/optical', local: 'Nguồn địa phương', technique: 'Kỹ thuật' };
const accessOrder = ['all','asset_acquired','metadata_or_diagnostic_acquired','candidate_restricted','blocked_or_none','technique_roadmap','unknown'];
const $ = (id) => document.getElementById(id);

function htmlEscape(value){ return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function isHttp(value){ return /^https?:\/\//i.test(String(value || '')); }
function hrefForPath(path){
  if(!path) return null;
  if(isHttp(path)) return path;
  if(path.startsWith('outputs/')) return '../' + path.slice('outputs/'.length);
  return path;
}
function shortHash(hash){ return hash ? hash.slice(0,10) + '…' : 'chưa có hash'; }
function fmtMeters(value){ return value === null || value === undefined ? '—' : `${value} m`; }
function setStatus(text, ok=true){ const el=$('status'); el.textContent=text; el.className='status ' + (ok ? 'ok':'fail'); }

function renderMetrics(inv){
  $('metricRgb').textContent = inv.summary.actual_highres_rgb_usable_count ?? 0;
  $('metricRasters').textContent = inv.summary.actual_model_rasters_count ?? 0;
  $('metricRecords').textContent = inv.summary.record_count ?? inv.records.length;
}
function renderGsd(){
  const medianArea=106.21;
  const rows=[10,4,1,0.5,0.1].map(gsd=>({gsd, px: medianArea/(gsd*gsd)}));
  const max=Math.max(...rows.map(r=>r.px));
  $('gsdCard').innerHTML = `<div class="gsd-grid">${rows.map(r=>`<div class="gsd-row"><strong>${r.gsd} m</strong><div class="bar" aria-hidden="true"><span style="width:${Math.max(2, (r.px/max)*100)}%"></span></div><span>${r.px.toLocaleString('vi-VN',{maximumFractionDigits: r.px<10?4:0})} px</span></div>`).join('')}<p class="note">Dưới 10 m là ví dụ toán học để xác định yêu cầu payload/mua ảnh, không phải nguồn ảnh đã thu.</p></div>`;
}
function populateFilters(records){
  const cats=['all', ...Array.from(new Set(records.map(r=>r.category))).sort()];
  $('categoryFilter').innerHTML = cats.map(c=>`<option value="${c}">${categoryLabels[c] || c}</option>`).join('');
  const buckets=Array.from(new Set(records.map(r=>r.access_bucket))).sort((a,b)=>accessOrder.indexOf(a)-accessOrder.indexOf(b));
  $('accessFilter').innerHTML = ['all', ...buckets].map(a=>`<option value="${a}">${a==='all'?'Tất cả trạng thái':(accessLabels[a]||a)}</option>`).join('');
  $('accessLegend').innerHTML = buckets.map(a=>`<span class="pill">${accessLabels[a]||a}: ${records.filter(r=>r.access_bucket===a).length}</span>`).join('');
}
function recordSearchText(r){ return JSON.stringify([r.id,r.title,r.publisher,r.data_type,r.access_status,r.coverage_status,r.license_status,r.next_action,r.limits], null, 0).toLowerCase(); }
function filteredRecords(){
  const q=state.filters.q.trim().toLowerCase();
  return state.records.filter(r=>{
    if(state.filters.category !== 'all' && r.category !== state.filters.category) return false;
    if(state.filters.access !== 'all' && r.access_bucket !== state.filters.access) return false;
    if(q && !recordSearchText(r).includes(q)) return false;
    return true;
  });
}
function renderRecords(){
  const items=filteredRecords();
  $('records').innerHTML = items.map(recordCard).join('') || '<p>Không có bản ghi phù hợp bộ lọc.</p>';
  setStatus(`Đang hiển thị ${items.length}/${state.records.length} bản ghi · snapshot đã qua validator`, true);
}
function linkList(record){
  const links=[];
  if(isHttp(record.primary_url)) links.push(`<a href="${htmlEscape(record.primary_url)}" target="_blank" rel="noreferrer">Nguồn chính</a>`);
  if(isHttp(record.license_url)) links.push(`<a href="${htmlEscape(record.license_url)}" target="_blank" rel="noreferrer">License</a>`);
  for(const e of (record.evidence||[]).slice(0,8)){
    const href = hrefForPath(e.path);
    const label = e.label || e.kind || 'bằng chứng';
    if(href) links.push(`<a href="${htmlEscape(href)}" title="${htmlEscape(e.sha256||'')}">${htmlEscape(label)} · ${htmlEscape(shortHash(e.sha256))}</a>`);
    if(e.url && isHttp(e.url)) links.push(`<a href="${htmlEscape(e.url)}" target="_blank" rel="noreferrer">URL bằng chứng</a>`);
  }
  if((record.evidence||[]).length>8) links.push(`<span class="tag">+${record.evidence.length-8} bằng chứng trong JSON</span>`);
  return links.join('');
}
function recordCard(r){
  const limits=(r.limits||[]).filter(Boolean).slice(0,3);
  const resolution = r.effective_resolution_m ? `hiệu dụng ${r.effective_resolution_m} m; grid ${r.raster_grid_m ?? '—'} m` : fmtMeters(r.nominal_gsd_m);
  return `<article class="record">
    <div class="meta"><span class="tag ${htmlEscape(r.access_bucket)}">${htmlEscape(accessLabels[r.access_bucket]||r.access_bucket)}</span><span class="tag">${htmlEscape(categoryLabels[r.category]||r.category)}</span><span class="tag">${htmlEscape(r.id)}</span>${r.acquired_model_input ? '<span class="tag asset_acquired">Model raster đã thu · testing-only</span>' : ''}</div>
    <h3>${htmlEscape(r.title)}</h3>
    <dl>
      <dt>Nhà xuất bản</dt><dd>${htmlEscape(r.publisher || '—')}</dd>
      <dt>Kiểu dữ liệu</dt><dd>${htmlEscape(r.data_type || '—')}</dd>
      <dt>Ngày/epoch</dt><dd>${htmlEscape(r.data_date || r.date_semantics || '—')}</dd>
      <dt>Độ phân giải</dt><dd>${htmlEscape(resolution)}</dd>
      <dt>Quyền dùng</dt><dd>${htmlEscape(r.license_status || r.free_export_status || '—')}</dd>
      <dt>Trạng thái</dt><dd>${htmlEscape(r.coverage_status || r.access_status || '—')}</dd>
      <dt>Việc tiếp theo</dt><dd>${htmlEscape(r.next_action || '—')}</dd>
    </dl>
    ${limits.length ? `<ul class="limits">${limits.map(x=>`<li>${htmlEscape(x)}</li>`).join('')}</ul>` : ''}
    <details class="evidence-details"><summary>Nguồn và bằng chứng (${(r.evidence||[]).length})</summary><div class="links">${linkList(r)}</div></details>
  </article>`;
}
function simpleMarkdown(md){
  const lines=md.split(/\r?\n/);
  let out=[];
  let inList=false;
  function closeList(){ if(inList){ out.push('</ul>'); inList=false; } }
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trimEnd();
    if(!line.trim()){ closeList(); continue; }
    if(line.startsWith('|')){
      closeList();
      const tableLines=[];
      while(i<lines.length && lines[i].trim().startsWith('|')){
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;
      out.push(renderMarkdownTable(tableLines));
      continue;
    }
    if(line.startsWith('### ')){ closeList(); out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); continue; }
    if(line.startsWith('## ')){ closeList(); out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); continue; }
    if(line.startsWith('# ')){ closeList(); out.push(`<h1>${inlineMd(line.slice(2))}</h1>`); continue; }
    if(line.startsWith('- ')){ if(!inList){out.push('<ul>'); inList=true;} out.push(`<li>${inlineMd(line.slice(2))}</li>`); continue; }
    closeList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}
function splitTableRow(line){
  const trimmed=line.replace(/^\|/,'').replace(/\|$/,'');
  return trimmed.split('|').map(cell=>cell.trim());
}
function isSeparatorRow(line){
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}
function renderMarkdownTable(lines){
  if(!lines.length) return '';
  const header=splitTableRow(lines[0]);
  const body=lines.slice(1).filter(line=>!isSeparatorRow(line)).map(splitTableRow);
  const head=`<thead><tr>${header.map(cell=>`<th>${inlineMd(cell)}</th>`).join('')}</tr></thead>`;
  const rows=body.map(row=>`<tr>${header.map((_,idx)=>`<td>${inlineMd(row[idx]||'')}</td>`).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table>${head}<tbody>${rows}</tbody></table></div>`;
}
function inlineMd(text){
  const escaped = htmlEscape(text);
  return parseMarkdownLinks(escaped)
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
function parseMarkdownLinks(text){
  let out='';
  for(let i=0;i<text.length;i++){
    if(text[i] !== '['){ out += text[i]; continue; }
    const closeText = text.indexOf(']', i + 1);
    if(closeText === -1 || text[closeText + 1] !== '('){ out += text[i]; continue; }
    let j = closeText + 2;
    let depth = 0;
    let end = -1;
    for(; j<text.length; j++){
      const ch = text[j];
      if(ch === '(') depth++;
      if(ch === ')'){
        if(depth === 0){ end = j; break; }
        depth--;
      }
    }
    if(end === -1){ out += text[i]; continue; }
    const label = text.slice(i + 1, closeText);
    const url = text.slice(closeText + 2, end);
    if(/^https?:\/\//i.test(url)){
      out += `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
      i = end;
    }else{
      out += text[i];
    }
  }
  return out;
}
async function loadReport(){
  try{ const text=await fetch('BAO-CAO-C05.md').then(r=>{ if(!r.ok) throw new Error(r.status); return r.text(); }); $('report').innerHTML=simpleMarkdown(text); }
  catch(err){ $('report').textContent='Không tải được BAO-CAO-C05.md: '+err.message; }
}
async function init(){
  renderGsd();
  try{
    const inv = await fetch('registry/inventory.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
    state.inventory=inv; state.records=inv.records || [];
    renderMetrics(inv); populateFilters(state.records); renderRecords();
  }catch(err){ setStatus('Không tải được danh mục nguồn: '+err.message, false); }
  $('search').addEventListener('input', e=>{ state.filters.q=e.target.value; renderRecords(); });
  $('categoryFilter').addEventListener('change', e=>{ state.filters.category=e.target.value; renderRecords(); });
  $('accessFilter').addEventListener('change', e=>{ state.filters.access=e.target.value; renderRecords(); });
  loadReport();
}
init();
