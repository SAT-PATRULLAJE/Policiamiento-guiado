/* SAT — app.js (para GitHub Pages)
 * Reemplazá los 'xxx' por tus URLs reales ANTES de publicar.
 */
var CONFIG = {
  CSV_RESUMEN_URL: 'xxx_RESUMEN_CSV_URL',       // ej: https://docs.google.com/.../gviz/tq?tqx=out:csv&sheet=ALERTAS_RESUMEN
  CSV_CUADRANTES_URL: 'xxx_CUADRANTES_CSV_URL', // ej: https://docs.google.com/.../gviz/tq?tqx=out:csv&sheet=PATRULLAJE_CUADRANTES
  URL_MAPA_GEO: 'xxx_MAPA_URL'                  // ej: https://youtu.be/xxxx
};

/* ===== Utilidades ===== */
function $(sel){ return document.querySelector(sel); }
function $$(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

function openModal(id){ var m = document.getElementById(id); if (m) m.classList.add('show'); }
function closeModal(id){ var m = document.getElementById(id); if (m) m.classList.remove('show'); }

document.addEventListener('click', function(e){
  var t = e.target;
  if (t.matches && t.matches('[data-modal]')) openModal(t.getAttribute('data-modal'));
  if (t.matches && t.matches('[data-close]')) t.closest('.modal') && t.closest('.modal').classList.remove('show');
  if (t.classList && t.classList.contains('modal')) t.classList.remove('show');
});

function parseCSV(text){
  var rows=[], i=0, cur='', inQ=false, row=[];
  function pushCell(){ row.push(cur); cur=''; }
  for (; i<text.length; i++){
    var c=text[i], n=text[i+1];
    if (inQ){
      if (c=='"' && n=='"'){ cur+='"'; i++; continue; }
      if (c=='"'){ inQ=false; continue; }
      cur+=c; continue;
    }
    if (c=='"'){ inQ=true; continue; }
    if (c==','){ pushCell(); continue; }
    if (c=='\n'){ pushCell(); rows.push(row); row=[]; continue; }
    if (c=='\r'){ continue; }
    cur+=c;
  }
  pushCell(); rows.push(row);
  var headers = rows.shift().map(function(x){ return String(x||'').trim(); });
  return rows.filter(function(r){ return r.length; }).map(function(r){
    var o={}; headers.forEach(function(h,idx){ o[h] = (idx<r.length ? r[idx] : ''); }); return o;
  });
}

function fetchCSV(url){
  if (!url || url.indexOf('xxx')===0) throw new Error('⚠️ Reemplazá los "xxx" de CONFIG antes de usar.');
  return fetch(url, {cache:'no-store'}).then(function(r){ return r.text(); }).then(parseCSV);
}

function toNumber(v){ var n = Number(v); return isFinite(n) ? n : NaN; }
function toDate(v){ var d = new Date(v); return isNaN(d) ? null : d; }

/* ===== Mapeo flexible de columnas (por nombre) ===== */
function norm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function mapResumenRow(raw){
  var m = {};
  for (var k in raw){
    var nk = norm(k), val = raw[k];
    if (nk.indexOf('alerta_id')>=0) m.id = val;
    else if (nk==='fecha') m.fecha = toDate(val);
    else if (nk.indexOf('ventana_horaria')>=0) m.franja = String(val||'');
    else if (nk.indexOf('rango_horario_total')>=0) m.rango = String(val||'');
    else if (nk.indexOf('radio')>=0) m.radio = toNumber(val);
    else if (nk.indexOf('cantidad_eventos')>=0) m.n = toNumber(val);
    else if (nk.indexOf('centroide_lat')>=0) m.lat = toNumber(val);
    else if (nk.indexOf('centroide_lng')>=0) m.lng = toNumber(val);
    else if (nk.indexOf('poligono_wkt')>=0 || nk==='wkt') m.wkt = String(val||'');
    else if (nk.indexOf('calles_triangulacion')>=0) m.calles = String(val||'');
    else if (nk==='delitos_comp') m.delitosComp = String(val||'');
    else if (nk==='confiabilidad') m.conf = toNumber(val);
    else if (nk.indexOf('confiabilidad_leyenda')>=0) m.confTxt = String(val||'');
    else if (nk.indexOf('cuadrante_dominante')>=0) m.cuadDom = String(val||'');
    else if (nk.indexOf('cuadrantes_comp')>=0) m.cuadComp = String(val||'');
    else if (nk.indexOf('link_gmaps')>=0) m.link = String(val||'');
    else if (nk==='zona_centroide') m.zona = String(val||'');
  }
  return m;
}

function mapCuadRow(raw){
  return {
    cuadrante: raw['Cuadrante'] || '',
    eventos: toNumber(raw['Eventos']),
    top3: raw['Top_3_delitos'] || raw['Top 3 delitos'] || '',
    interes: raw['Interés (eventos)'] || raw['Interes (eventos)'] || ''
  };
}

/* ===== INDEX ===== */
function bootIndex(){
  try{
    if ($('#btn-geo')) $('#btn-geo').setAttribute('href', CONFIG.URL_MAPA_GEO);
  }catch(_){}

  fetchCSV(CONFIG.CSV_RESUMEN_URL).then(function(data){
    var rows = data.map(mapResumenRow).filter(function(r){ return r.id; });

    // KPIs
    var totalAlertas = rows.length;
    var totalEventos = rows.reduce(function(a,r){ return a + (r.n||0); }, 0);
    var avgRadio = Math.round(rows.reduce(function(a,r){ return a + (r.radio||0); }, 0) / Math.max(1,totalAlertas));
    var avgConf = Math.round(rows.reduce(function(a,r){ return a + (isFinite(r.conf)?r.conf:0); }, 0) / Math.max(1,totalAlertas));
    var cuadsSet = {};
    rows.forEach(function(r){
      var key = r.cuadDom && r.cuadDom.indexOf('Cuadrante')===0 ? r.cuadDom.split(' / ')[0] : null;
      if (key) cuadsSet[key]=1;
    });
    var cuadsActivos = Object.keys(cuadsSet).length;

    $('#kpi-eventos').textContent = String(totalEventos);
    $('#kpi-alertas').textContent = String(totalAlertas);
    $('#kpi-radio').textContent = isNaN(avgRadio) ? '–' : String(avgRadio);
    $('#kpi-conf').textContent  = isNaN(avgConf)  ? '–' : String(avgConf);
    $('#kpi-cuads').textContent = String(cuadsActivos);
    $('#last-updated').textContent = 'Fuente: ALERTAS_RESUMEN — ' + new Date().toLocaleString();

    renderResumenes_(rows);
    renderAlertList_(rows);

    var b1=$('#btn-wa-c1'), b2=$('#btn-wa-c2'), b3=$('#btn-wa-c3'), b4=$('#btn-wa-c4'), bo=$('#btn-wa-otros');
    if (b1) b1.addEventListener('click', function(){ copyWAGroup_(rows, 'Cuadrante 1'); });
    if (b2) b2.addEventListener('click', function(){ copyWAGroup_(rows, 'Cuadrante 2'); });
    if (b3) b3.addEventListener('click', function(){ copyWAGroup_(rows, 'Cuadrante 3'); });
    if (b4) b4.addEventListener('click', function(){ copyWAGroup_(rows, 'Cuadrante 4'); });
    if (bo) bo.addEventListener('click', function(){ copyWAGroup_(rows, 'OTROS'); });

    if ($('#btn-limpiar')) $('#btn-limpiar').addEventListener('click', function(){ renderResumenes_(rows); renderAlertList_(rows); });
    if ($('#btn-aplicar')) $('#btn-aplicar').addEventListener('click', function(){
      var conf = $('#f-conf').value;
      var cuad = $('#f-cuad').value;
      var del = $('#f-delito').value.trim().toLowerCase();
      var days = $('#f-fecha').value;

      var filt = rows.slice(0);
      if (conf !== 'all'){
        filt = filt.filter(function(r){
          if (!isFinite(r.conf)) return false;
          if (conf==='alta') return r.conf>=70;
          if (conf==='media') return r.conf>=40 && r.conf<70;
          if (conf==='baja') return r.conf<40;
          return true;
        });
      }
      if (cuad !== 'all'){
        if (cuad==='otros') filt = filt.filter(function(r){ return !(r.cuadDom||'').indexOf('Cuadrante ')===0; });
        else filt = filt.filter(function(r){ return (r.cuadDom||'').indexOf(cuad.replace('C','Cuadrante '))===0; });
      }
      if (del) filt = filt.filter(function(r){ return (r.delitosComp||'').toLowerCase().indexOf(del)>=0; });

      if (days !== 'all'){
        var ms = Number(days)*24*60*60*1000;
        var from = Date.now() - ms;
        filt = filt.filter(function(r){ return r.fecha && r.fecha.getTime()>=from; });
      }

      renderResumenes_(filt);
      renderAlertList_(filt);
    });

  }).catch(function(e){
    console.error(e);
    $('#lista-alertas').textContent = '⚠️ Error cargando datos. Ver consola.';
  });
}

function renderResumenes_(rows){
  // Por cuadrante
  var byCuad = {};
  rows.forEach(function(r){
    var key = (r.cuadDom && r.cuadDom.indexOf('Cuadrante')===0) ? r.cuadDom.split(' / ')[0] : 'Otros';
    if (!byCuad[key]) byCuad[key] = {count:0, eventos:0};
    byCuad[key].count++; byCuad[key].eventos += (r.n||0);
  });
  var htmlC = Object.keys(byCuad).map(function(k){
    var v = byCuad[k];
    return '<div class="row"><span>'+k+'</span><span>'+v.count+' alertas · '+v.eventos+' ev.</span></div>';
  }).sort().join('');
  $('#sum-cuadrantes').innerHTML = htmlC || 'Sin datos';

  // Por franja
  var byF = {};
  rows.forEach(function(r){
    var k = String(r.franja||'').split(' (')[0] || '–';
    byF[k] = (byF[k]||0)+1;
  });
  var htmlF = Object.keys(byF).sort(function(a,b){ return byF[b]-byF[a]; })
    .map(function(k){ return '<div class="row"><span>'+k+'</span><span>'+byF[k]+'</span></div>'; }).join('');
  $('#sum-franjas').innerHTML = htmlF || 'Sin datos';

  // Por día
  var byD = {};
  rows.forEach(function(r){
    var k = (String(r.dia||'').split(' (')[0]) || '–';
    byD[k] = (byD[k]||0)+1;
  });
  var htmlD = Object.keys(byD).sort(function(a,b){ return byD[b]-byD[a]; })
    .map(function(k){ return '<div class="row"><span>'+k+'</span><span>'+byD[k]+'</span></div>'; }).join('');
  $('#sum-dias').innerHTML = htmlD || 'Sin datos';

  // Comisarías / Otros
  var byC = {};
  rows.forEach(function(r){
    var key = r.cuadDom && r.cuadDom.indexOf('Cuadrante')!==0 ? r.cuadDom : (r.zona || '–');
    byC[key] = (byC[key]||0)+1;
  });
  var pairs = Object.keys(byC).map(function(k){ return [k,byC[k]]; })
    .sort(function(a,b){ return b[1]-a[1]; }).slice(0,10);
  var htmlCom = pairs.map(function(p){ return '<div class="row"><span>'+p[0]+'</span><span>'+p[1]+'</span></div>'; }).join('');
  $('#sum-comis').innerHTML = htmlCom || 'Sin datos';
}

function renderAlertList_(rows){
  if (!rows.length){ $('#lista-alertas').textContent = 'Sin resultados con los filtros aplicados.'; return; }
  rows.sort(function(a,b){ return (b.conf||0)-(a.conf||0) || (b.n||0)-(a.n||0); });

  var html = '';
  rows.forEach(function(r){
    var fecha = r.fecha ? r.fecha.toLocaleDateString() : '';
    var franja = (r.franja||'').split(' (')[0];
    var conf = isFinite(r.conf) ? r.conf : '–';
    var cuad = r.cuadDom || 'Otros (Comis./Localidad)';
    var wkt = r.wkt || '(sin polígono)';
    var calles = r.calles || '(sin calles)';
    var link = (r.link && r.link.indexOf('http')===0) ? r.link : '#';
    var zona = r.zona || '';
    var head = (r.id || 'Alerta')+' — '+fecha+' · '+franja+' · N='+ (r.n||0) +' · Conf='+conf;

    var payload = safeAlertForWA_(r);
    var payloadStr = JSON.stringify(payload).replace(/'/g, '&#39;');

    html += '<article class="alert-card">'
         +   '<div class="alert-head"><div>'+head+'</div><span class="badge">'+cuad+'</span></div>'
         +   (zona ? '<div class="badge">Zona: '+zona+'</div>' : '')
         +   '<div class="wkt">Polígono WKT:\n'+wkt+'</div>'
         +   '<div style="margin-top:.25rem">Calles: '+calles+'</div>'
         +   '<div class="row actions">'
         +     '<a class="btn" href="'+link+'" target="_blank" rel="noopener">Ver mapa</a>'
         +     '<button class="btn primary wa-btn" data-payload=\''+payloadStr+'\'>WhatsApp</button>'
         +   '</div>'
         + '</article>';
  });
  $('#lista-alertas').innerHTML = html;

  $$('.wa-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      try{
        var payload = JSON.parse(btn.getAttribute('data-payload') || '{}');
        copyWA(payload);
      }catch(e){
        alert('No se pudo preparar el mensaje.');
      }
    });
  });
}

/* ===== WhatsApp ===== */
function safeAlertForWA_(r){
  return {
    cuad: r.cuadDom || 'Otros (Comis./Localidad)',
    id: r.id || '',
    fecha: r.fecha ? r.fecha.toLocaleDateString() : '',
    franja: (r.franja||'').split(' (')[0],
    n: r.n || 0,
    conf: isFinite(r.conf) ? r.conf : '',
    confTxt: r.confTxt || '',
    lat: r.lat, lng: r.lng,
    wkt: r.wkt || '',
    calles: r.calles || '',
    link: (r.link && r.link.indexOf('http')===0) ? r.link : ''
  };
}

function buildWAMessage_(r){
  var lines = [];
  lines.push('🚓 Patrullaje sugerido — ' + r.cuad);
  lines.push('• Alerta: ' + r.id);
  lines.push('• Fecha/Franja: ' + r.fecha + ' — ' + r.franja);
  lines.push('• Eventos: ' + r.n + ' — Conf: ' + r.conf + (r.confTxt?(' ('+r.confTxt+')'):''));
  lines.push('• Centroide: ' + (isFinite(r.lat)?r.lat:'') + ',' + (isFinite(r.lng)?r.lng:''));
  lines.push('• Polígono WKT: ' + r.wkt);
  lines.push('• Calles: ' + r.calles);
  lines.push('▶️ Mapa: ' + r.link);
  return lines.join('\n');
}

function copyWA(payload){
  var msg = buildWAMessage_(payload);
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(msg).then(function(){
      alert('Mensaje copiado. Pegalo en WhatsApp.');
    }, function(){
      var href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      window.open(href, '_blank','noopener');
    });
  } else {
    var href = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(href, '_blank','noopener');
  }
}

function copyWAGroup_(rows, key){
  var filt = rows.filter(function(r){
    if (key==='OTROS') return !(r.cuadDom||'').indexOf('Cuadrante ')===0;
    return (r.cuadDom||'').indexOf(key)===0;
  }).sort(function(a,b){ return (b.conf||0)-(a.conf||0); }).slice(0,8);

  if (!filt.length){ alert('No hay alertas para ese grupo.'); return; }

  var block = filt.map(function(r){ return buildWAMessage_(safeAlertForWA_(r)); }).join('\n\n— — — — —\n\n');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(block).then(function(){
      alert('Bloque copiado. Pegalo en WhatsApp.');
    }, function(){
      window.open('https://wa.me/?text=' + encodeURIComponent(block), '_blank','noopener');
    });
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(block), '_blank','noopener');
  }
}

/* ===== Vistas dedicadas ===== */
function bootAlertas(){
  try{ if ($('#btn-geo')) $('#btn-geo').setAttribute('href', CONFIG.URL_MAPA_GEO); }catch(_){}
  fetchCSV(CONFIG.CSV_RESUMEN_URL).then(function(data){
    var rows = data.map(mapResumenRow).filter(function(r){ return r.id; });
    $('#a-kpi-alertas').textContent = String(rows.length);
    $('#a-kpi-eventos').textContent = String(rows.reduce(function(a,r){ return a + (r.n||0); }, 0));
    var avgConf = Math.round(rows.reduce(function(a,r){ return a + (isFinite(r.conf)?r.conf:0); }, 0) / Math.max(1,rows.length));
    $('#a-kpi-conf').textContent = isNaN(avgConf)?'–':String(avgConf);

    var html='';
    rows.slice(0,100).forEach(function(r){
      var fecha = r.fecha ? r.fecha.toLocaleDateString() : '';
      var franja = (r.franja||'').split(' (')[0];
      var conf = isFinite(r.conf) ? r.conf : '–';
      var link = (r.link && r.link.indexOf('http')===0) ? r.link : '#';
      var wkt = r.wkt || '(sin polígono)';

      var payload = safeAlertForWA_(r);
      var payloadStr = JSON.stringify(payload).replace(/'/g,'&#39;');

      html += '<article class="alert-card">'
           +   '<div class="alert-head"><div>'+ (r.id||'Alerta') +' — '+fecha+' · '+franja+' · N='+ (r.n||0) +' · Conf='+conf+'</div></div>'
           +   '<div class="wkt">Polígono WKT:\n'+wkt+'</div>'
           +   '<div class="row actions">'
           +     '<a class="btn" href="'+link+'" target="_blank" rel="noopener">Ver mapa</a>'
           +     '<button class="btn primary wa-btn" data-payload=\''+payloadStr+'\'>WhatsApp</button>'
           +   '</div>'
           + '</article>';
    });
    $('#a-lista').innerHTML = html;

    $$('.wa-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        try{
          var payload = JSON.parse(btn.getAttribute('data-payload') || '{}');
          copyWA(payload);
        }catch(e){ alert('No se pudo preparar el mensaje.'); }
      });
    });

  }).catch(function(e){
    console.error(e);
    $('#a-lista').textContent = '⚠️ Error cargando datos.';
  });
}

function bootCuadrantes(){
  try{ if ($('#btn-geo')) $('#btn-geo').setAttribute('href', CONFIG.URL_MAPA_GEO); }catch(_){}
  fetchCSV(CONFIG.CSV_CUADRANTES_URL).then(function(data){
    var rows = data.map(mapCuadRow).filter(function(r){ return r.cuadrante; });

    var activos = rows.filter(function(r){ return (r.eventos||0)>0; }).length;
    var totalEv = rows.reduce(function(a,r){ return a + (r.eventos||0); }, 0);
    $('#c-kpi-activos').textContent = String(activos);
    $('#c-kpi-eventos').textContent = String(totalEv);

    var html = rows.sort(function(a,b){ return (b.eventos||0)-(a.eventos||0); })
      .map(function(r){ return '<div class="row"><span>'+r.cuadrante+'</span><span>'+ (r.eventos||0) +' ev. · '+ (r.top3||'') +'</span></div>'; })
      .join('');
    $('#c-tabla').innerHTML = html || 'Sin datos';

  }).catch(function(e){
    console.error(e);
    $('#c-tabla').textContent = '⚠️ Error cargando datos.';
  });
}

/* ===== Router ===== */
(function(){
  var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  try{
    if (p.indexOf('alertas.html')>=0) bootAlertas();
    else if (p.indexOf('cuadrantes.html')>=0) bootCuadrantes();
    else bootIndex();
  }catch(e){ console.error(e); }
})();
