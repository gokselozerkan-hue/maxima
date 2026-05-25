// =============================================================
// MAXIMA PATCH v3 - fillCaseForm derin kopya düzeltmesi dahil
// =============================================================

// 1. Yeni global değişkenler
if(typeof tmpGuncelDurumlar === 'undefined') var tmpGuncelDurumlar = [];
if(typeof tmpIcraList === 'undefined') var tmpIcraList = [];
if(typeof caseSortField === 'undefined') var caseSortField = 'buro';
if(typeof caseSortDir === 'undefined') var caseSortDir = 1;

// 2. Güncel Durum Listesi
function addGuncelDurum() {
  tmpGuncelDurumlar.push({id:Date.now().toString(),tarih:new Date().toISOString().slice(0,10),metin:''});
  renderGuncelDurumList();
}
function renderGuncelDurumList() {
  const cont = document.getElementById('guncel-durum-list');
  if(!cont) return;
  if(!tmpGuncelDurumlar.length){
    cont.innerHTML='<div style="font-size:12px;color:var(--txt3);padding:4px 0;">Henüz güncel durum notu eklenmedi.</div>';
    return;
  }
  cont.innerHTML = tmpGuncelDurumlar.map((n,i)=>`
    <div style="background:var(--sur2);border:1px solid var(--brd);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px;">
      <input type="date" class="fc" style="flex:1;max-width:150px;" value="${n.tarih||''}" onchange="tmpGuncelDurumlar[${i}].tarih=this.value">
      <textarea class="fc" style="flex:4;" rows="2" placeholder="Güncel durum notu..." onchange="tmpGuncelDurumlar[${i}].metin=this.value">${n.metin||''}</textarea>
      <button style="background:var(--sur3);border:none;color:var(--txt2);width:24px;height:24px;border-radius:5px;cursor:pointer;flex-shrink:0;" onclick="tmpGuncelDurumlar.splice(${i},1);renderGuncelDurumList()">🗑</button>
    </div>`).join('');
}

// 3. İcra Listesi (Çoklu)
function addIcra() {
  tmpIcraList.push({id:Date.now().toString(),yapildi:false,daire:'',esas:'',tebligTarih:'',tebligYapildi:false,teminatTarih:'',teminatYapildi:false,tahsil:false,not:''});
  renderIcraList();
}
function renderIcraList() {
  const cont = document.getElementById('icra-list');
  if(!cont) return;
  if(!tmpIcraList.length){
    cont.innerHTML='<div style="font-size:12px;color:var(--txt3);padding:4px 0;">Henüz icra takibi eklenmedi.</div>';
    return;
  }
  cont.innerHTML = tmpIcraList.map((icra,i)=>`
    <div style="background:var(--sur2);border:1px solid var(--brd);border-radius:8px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;color:var(--acc);">${i+1}. İcra Takibi</span>
        <button style="background:var(--sur3);border:none;color:var(--txt2);width:24px;height:24px;border-radius:5px;cursor:pointer;" onclick="tmpIcraList.splice(${i},1);renderIcraList()">🗑</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:flex-end;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" style="width:16px;height:16px;accent-color:var(--acc);" ${icra.yapildi?'checked':''} onchange="tmpIcraList[${i}].yapildi=this.checked">
            <span style="font-size:12.5px;color:var(--txt2);">İcra takibi yapıldı</span>
          </label>
        </div>
        <div><label style="font-size:10.5px;color:var(--txt3);display:block;margin-bottom:5px;">İCRA DAİRESİ</label>
          <input class="fc" placeholder="... İcra Müdürlüğü" value="${icra.daire||''}" oninput="tmpIcraList[${i}].daire=this.value">
        </div>
        <div><label style="font-size:10.5px;color:var(--txt3);display:block;margin-bottom:5px;">İCRA ESAS NO</label>
          <input class="fc" placeholder="2024/1234" value="${icra.esas||''}" oninput="tmpIcraList[${i}].esas=this.value">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:8px;">
        <div><label style="font-size:10.5px;color:var(--txt3);display:block;margin-bottom:5px;">TEBLİĞ TARİHİ</label>
          <input type="date" class="fc" value="${icra.tebligTarih||''}" onchange="tmpIcraList[${i}].tebligTarih=this.value">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" style="width:16px;height:16px;accent-color:var(--acc);" ${icra.tebligYapildi?'checked':''} onchange="tmpIcraList[${i}].tebligYapildi=this.checked">
            <span style="font-size:12.5px;color:var(--txt2);">Tebliğ edildi ✓</span>
          </label>
        </div>
        <div><label style="font-size:10.5px;color:var(--txt3);display:block;margin-bottom:5px;">TEMİNAT TARİHİ</label>
          <input type="date" class="fc" value="${icra.teminatTarih||''}" onchange="tmpIcraList[${i}].teminatTarih=this.value">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" style="width:16px;height:16px;accent-color:var(--acc);" ${icra.teminatYapildi?'checked':''} onchange="tmpIcraList[${i}].teminatYapildi=this.checked">
            <span style="font-size:12.5px;color:var(--txt2);">Teminat yatırıldı ✓</span>
          </label>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" style="width:16px;height:16px;accent-color:var(--acc);" ${icra.tahsil?'checked':''} onchange="tmpIcraList[${i}].tahsil=this.checked">
          <span style="font-size:12.5px;color:var(--txt2);">İcra dosyası tahsil edildi ✓</span>
        </label>
      </div>
      <div><label style="font-size:10.5px;color:var(--txt3);display:block;margin-bottom:5px;">İCRA NOTLARI</label>
        <textarea class="fc" placeholder="İcra ile ilgili notlar..." rows="2" onchange="tmpIcraList[${i}].not=this.value">${icra.not||''}</textarea>
      </div>
    </div>`).join('');
}

// 4. Sort fonksiyonu
function sortCases(field) {
  if(caseSortField===field) caseSortDir*=-1;
  else{caseSortField=field;caseSortDir=1;}
  ['buro','muv','nextDate'].forEach(f=>{
    const el=document.getElementById('sort-'+f);
    if(el) el.textContent=f===caseSortField?(caseSortDir===1?'↑':'↓'):'↕';
  });
  renderCasesTable();
}

// =====================================================================
// KRİTİK DÜZELTME: fillCaseForm override
// Orijinal fillCaseForm referans kopyası alıyor - bu tüm davaları etkiliyor
// Bu override derin kopya kullanarak sorunu çözüyor
// =====================================================================
const _origFillCaseForm = fillCaseForm;
fillCaseForm = function(c) {
  // Önce tüm tmp'leri temizle
  if(typeof tmpDurusmalar !== 'undefined') tmpDurusmalar = [];
  if(typeof tmpMuzekkere !== 'undefined') tmpMuzekkere = [];
  if(typeof tmpGenelNotlar !== 'undefined') tmpGenelNotlar = [];
  if(typeof tmpBilirkisi !== 'undefined') tmpBilirkisi = [];
  tmpGuncelDurumlar = [];
  tmpIcraList = [];

  // Orijinal fonksiyonu çağır
  _origFillCaseForm(c);

  // KRİTİK: Derin kopya ile üzerine yaz - referans kopyası sorununu önle
  if(typeof tmpBilirkisi !== 'undefined') {
    tmpBilirkisi = JSON.parse(JSON.stringify(c.bilirkisiList||[]));
    if(typeof renderBilList === 'function') renderBilList();
  }
  if(typeof tmpDurusmalar !== 'undefined') {
    tmpDurusmalar = JSON.parse(JSON.stringify(c.durusmalar||[]));
    if(typeof renderDurusmaList === 'function') renderDurusmaList();
  }
  if(typeof tmpMuzekkere !== 'undefined') {
    tmpMuzekkere = JSON.parse(JSON.stringify(c.muzekkere||[]));
    if(typeof renderMuzList === 'function') renderMuzList();
  }
  if(typeof tmpGenelNotlar !== 'undefined') {
    tmpGenelNotlar = JSON.parse(JSON.stringify(c.genelNotlar||[]));
    if(typeof renderGenelNotList === 'function') renderGenelNotList();
  }

  // Güncel durum listesi
  tmpGuncelDurumlar = JSON.parse(JSON.stringify(c.guncelDurumlar||[]));
  if(!tmpGuncelDurumlar.length && c.guncelDurum) {
    tmpGuncelDurumlar = [{id:Date.now().toString(),tarih:'',metin:c.guncelDurum}];
  }

  // İcra listesi
  if(c.icraList&&c.icraList.length) {
    tmpIcraList = JSON.parse(JSON.stringify(c.icraList));
  } else if(c.icraDaire||c.icraEsas) {
    tmpIcraList = [{id:Date.now().toString(),yapildi:c.icraYapildi||false,daire:c.icraDaire||'',
      esas:c.icraEsas||'',tebligTarih:c.icraTebligTarih||'',tebligYapildi:c.icraTebligYapildi||false,
      teminatTarih:c.teminatTarih||'',teminatYapildi:c.teminatYapildi||false,
      tahsil:c.icraTahsil||false,not:c.icraNot||''}];
  } else {
    tmpIcraList = [];
  }

  // Arabuluculuk checkboxları
  const ab=document.getElementById('c-arabulucu-basvuruldu'); if(ab) ab.checked=!!c.arabulucuBasvuruldu;
  const an=document.getElementById('c-arabulucu-anlasildi'); if(an) an.checked=!!c.arabulucuAnlasildi;

  renderGuncelDurumList();
  renderIcraList();
};

// 5. openNewCase override - tüm tmp'leri sıfırla
const _origOpenNewCase = openNewCase;
openNewCase = function() {
  if(typeof tmpDurusmalar !== 'undefined') tmpDurusmalar = [];
  if(typeof tmpMuzekkere !== 'undefined') tmpMuzekkere = [];
  if(typeof tmpGenelNotlar !== 'undefined') tmpGenelNotlar = [];
  if(typeof tmpBilirkisi !== 'undefined') tmpBilirkisi = [];
  tmpGuncelDurumlar = [];
  tmpIcraList = [];
  _origOpenNewCase();
  ['c-arabulucu-basvuruldu','c-arabulucu-anlasildi'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.checked=false;
  });
};

// 6. saveCase override - yeni alanları kaydet
const _origSaveCase = saveCase;
saveCase = function() {
  _origSaveCase();
  setTimeout(()=>{
    const targetId = editingCaseId;
    const last = targetId ? cases.find(c=>c.id===targetId) : cases[cases.length-1];
    if(last) {
      last.guncelDurumlar = JSON.parse(JSON.stringify(tmpGuncelDurumlar));
      last.icraList = JSON.parse(JSON.stringify(tmpIcraList));
      last.arabulucuBasvuruldu = document.getElementById('c-arabulucu-basvuruldu')?.checked||false;
      last.arabulucuAnlasildi = document.getElementById('c-arabulucu-anlasildi')?.checked||false;
      if(tmpIcraList.length) {
        last.icraDaire = tmpIcraList[0].daire;
        last.icraEsas = tmpIcraList[0].esas;
      }
      save();
    }
  }, 150);
};

// 7. renderCasesTable override - esas no araması + sıralama
const _origRenderCasesTable = renderCasesTable;
renderCasesTable = function() {
  const tb = document.getElementById('cases-tbody');
  let list = [...cases];
  if(caseFilter!=='all') list = list.filter(c=>c.status===caseFilter);
  if(caseSearch) {
    const normalize = s => (s||'').toLocaleLowerCase('tr-TR')
      .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ğ/g,'g').replace(/Ğ/g,'g')
      .replace(/ş/g,'s').replace(/Ş/g,'s').replace(/ç/g,'c').replace(/Ç/g,'c')
      .replace(/ö/g,'o').replace(/Ö/g,'o').replace(/ü/g,'u').replace(/Ü/g,'u');
    const q = normalize(caseSearch);
    list = list.filter(c => normalize(
      c.buro+c.muv+c.tel+c.mahkeme+(c.konu||'')+(c.esas||'')+c.karsitaraf+
      (c.guncelDurumlar||[]).map(g=>g.metin||'').join(' ')
    ).includes(q));
  }
  list.sort((a,b)=>{
    if(caseSortField==='muv') return(a.muv||'').localeCompare(b.muv||'','tr')*caseSortDir;
    if(caseSortField==='nextDate'){
      const va=getNextDate(a)||'9999';const vb=getNextDate(b)||'9999';
      return va.localeCompare(vb)*caseSortDir;
    }
    const na=parseInt((a.buro||'').replace(/\D/g,''))||0;
    const nb=parseInt((b.buro||'').replace(/\D/g,''))||0;
    if(na!==nb) return(na-nb)*caseSortDir;
    return(a.buro||'').localeCompare(b.buro||'')*caseSortDir;
  });
  if(!list.length){tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--txt3)">Sonuç bulunamadı</td></tr>';return;}
  const kararLbl={kabul:'Kabul',red:'Red',kismi:'Kısmi'};
  tb.innerHTML = list.map(c=>{
    const nextDate=getNextDate(c);
    const nextLbl=nextDate?`<span class="${daysDiff(nextDate)<=3?'txt-red':daysDiff(nextDate)<=7?'txt-acc':''} mono" style="font-size:11px;">${fmtDate(nextDate)}</span>`:'—';
    return `<tr class="cr" onclick="openEditCase('${c.id}')">
      <td><span class="mono txt-acc fw6">${c.buro||'—'}</span></td>
      <td style="font-size:11.5px;">${c.tel||'—'}</td>
      <td class="fw6" style="color:var(--txt)">${c.muv||'—'}</td>
      <td class="hide-mobile" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.karsitaraf||'—'}</td>
      <td class="hide-mobile" style="font-size:11.5px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.mahkeme||'—'}</td>
      <td class="hide-mobile"><span class="mono" style="font-size:11px;">${c.esas||'—'}</span></td>
      <td class="hide-mobile" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.konu||c.tur||'—'}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="hide-mobile">${nextLbl}</td>
      <td class="hide-mobile">${c.karar?`<span class="badge ${c.karar==='kabul'?'ba':c.karar==='red'?'bu':'bb'}">${kararLbl[c.karar]||c.karar}</span>`:'—'}</td>
      <td><div class="row-acts">
        <button class="ib" onclick="event.stopPropagation();openEditCase('${c.id}')">✏️</button>
        <button class="ib" onclick="event.stopPropagation();deleteCase('${c.id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
};

// 8. checkPassword override - boş şifre engeli
const _origCheckPassword = checkPassword;
checkPassword = async function() {
  const pw = document.getElementById('password-input')?.value;
  if(!pw) {
    const errEl = document.getElementById('password-error');
    if(errEl){errEl.textContent='Şifre boş olamaz.';errEl.style.display='block';}
    return;
  }
  return _origCheckPassword();
};

// 9. getAllDates override - delil/tanık/istinaf ekle
const _origGetAllDates = getAllDates;
getAllDates = function() {
  const result = _origGetAllDates();
  cases.forEach(c => {
    const add = (date, label, type='deadline', priority='normal') => {
      if(date && date.trim()) result.push({date:date.trim(),title:label,sub:'Büro: '+(c.buro||'?')+' — '+(c.muv||''),priority,type,caseId:c.id});
    };
    if(c.delilTarih && !c.delilYapildi) add(c.delilTarih,'📋 Delil Bildirimi Son Gün','deadline','high');
    if(c.tanikTarih && !c.tanikYapildi) add(c.tanikTarih,'👤 Tanık Bildirimi Son Gün','deadline','high');
    if(c.istinafTarih && !c.istinafYapildi) add(c.istinafTarih,'⚖️ İstinaf Son Günü','deadline','urgent');
  });
  return result;
};

// 10. DOM hazır olunca form değişikliklerini uygula
document.addEventListener('DOMContentLoaded', function() {
  // Dava türlerine İtirazın İptali ekle
  const turSel = document.getElementById('c-tur');
  if(turSel && !Array.from(turSel.options).find(o=>o.value==='İtirazın İptali')) {
    const icraOpt = Array.from(turSel.options).find(o=>o.value==='İcra');
    if(icraOpt) {
      const newOpt = document.createElement('option');
      newOpt.value = 'İtirazın İptali';
      newOpt.textContent = 'İtirazın İptali';
      icraOpt.insertAdjacentElement('afterend', newOpt);
    }
  }

  // Tablo başlıklarına sort ekle
  setTimeout(()=>{
    const thead = document.querySelector('#page-cases thead tr');
    if(thead) {
      const headers = thead.querySelectorAll('th');
      if(headers[0] && !headers[0].getAttribute('data-sort')) {
        headers[0].setAttribute('data-sort','1');
        headers[0].style.cursor='pointer';
        headers[0].innerHTML='Büro No <span id="sort-buro">↑</span>';
        headers[0].onclick=()=>sortCases('buro');
        if(headers[2]){headers[2].style.cursor='pointer';headers[2].innerHTML='Müvekkil <span id="sort-muv">↕</span>';headers[2].onclick=()=>sortCases('muv');}
        if(headers[8]){headers[8].style.cursor='pointer';headers[8].innerHTML='Sonraki Tarih <span id="sort-nextDate">↕</span>';headers[8].onclick=()=>sortCases('nextDate');}
      }
    }
  }, 800);

  // Modal açılınca arabuluculuk checkboxları + icra/güncel durum formu ekle
  const caseModal = document.getElementById('modal-case');
  if(caseModal) {
    const observer = new MutationObserver(()=>{
      if(caseModal.classList.contains('show')) {
        setTimeout(()=>{
          // Arabuluculuk checkboxları
          if(!document.getElementById('c-arabulucu-basvuruldu')) {
            const arabulucuInput = document.getElementById('c-arabulucu');
            if(arabulucuInput) {
              const section = arabulucuInput.closest('.frow');
              if(section) {
                const checkRow = document.createElement('div');
                checkRow.className = 'frow frow-2';
                checkRow.style.marginBottom = '8px';
                checkRow.innerHTML = `
                  <div class="fg" style="display:flex;align-items:center;">
                    <label class="fc-check"><input type="checkbox" id="c-arabulucu-basvuruldu"><span>Arabuluculuğa başvuruldu ✓</span></label>
                  </div>
                  <div class="fg" style="display:flex;align-items:center;">
                    <label class="fc-check"><input type="checkbox" id="c-arabulucu-anlasildi"><span>Arabuluculukta anlaşıldı ✓</span></label>
                  </div>`;
                section.insertAdjacentElement('beforebegin', checkRow);
              }
            }
          }

          // Güncel Durum textarea → liste
          const guncelTextarea = document.getElementById('c-guncel-durum');
          if(guncelTextarea) {
            const frow = guncelTextarea.closest('.frow');
            if(frow) {
              const listDiv = document.createElement('div');
              listDiv.id = 'guncel-durum-list';
              listDiv.style.marginBottom = '8px';
              const addBtn = document.createElement('button');
              addBtn.className = 'btn btn-s btn-sm';
              addBtn.style.marginBottom = '12px';
              addBtn.textContent = '+ Güncel Durum Notu Ekle';
              addBtn.onclick = addGuncelDurum;
              frow.replaceWith(listDiv, addBtn);
              renderGuncelDurumList();
            }
          }

          // İcra alanları → liste
          const icraDaire = document.getElementById('c-icra-daire');
          if(icraDaire && !document.getElementById('icra-list')) {
            const icraSection = icraDaire.closest('.frow');
            if(icraSection) {
              const icraDiv = document.createElement('div');
              icraDiv.id = 'icra-list';
              icraDiv.style.marginBottom = '8px';
              const addBtn = document.createElement('button');
              addBtn.className = 'btn btn-s btn-sm';
              addBtn.style.marginBottom = '12px';
              addBtn.textContent = '+ İcra Takibi Ekle';
              addBtn.onclick = addIcra;
              // Tüm icra satırlarını gizle
              let el = icraSection;
              while(el && el.className !== 'mbody') {
                const next = el.nextElementSibling;
                if(el.classList && (el.classList.contains('frow') || el.tagName === 'DIV')) {
                  if(el.querySelector && (el.querySelector('#c-icra-daire,#c-icra-esas,#c-icra-teblig-tarih,#c-teminat-tarih,#c-icra-tahsil,#c-icra-not'))) {
                    el.style.display = 'none';
                  }
                }
                el = next;
                if(!el) break;
              }
              icraSection.style.display = 'none';
              icraSection.insertAdjacentElement('beforebegin', icraDiv);
              icraSection.insertAdjacentElement('beforebegin', addBtn);
              renderIcraList();
            }
          }
        }, 50);
      }
    });
    observer.observe(caseModal, {attributes:true, attributeFilter:['class']});
  }
});
