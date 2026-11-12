/* Maquetació de les proves de comprensió lectora (CEP de Formentera).
   La comparteixen l'eina de català i castellà i l'eina de llengües estrangeres.
   Llegeix la resposta de la IA (Markdown simple) i la posa en el format dels centres:
   capçalera (tipus de prova, curs, matèria), quadre amb el logo, nom i curs, instruccions,
   TEXT 1 (i TEXT 2 si n'hi ha), preguntes agrupades per PART segons el procés de la pauta,
   requadre per a la resposta oberta, taula de resultats i pauta en pàgina a part.
   Tipografia, mida, alineació i partició segons els paràmetres que rep (els del prompt).
   Surt en vista prèvia HTML i en Word (.docx, s'obre també amb Google Docs). JSZip per al .docx. */
(function(root){
'use strict';

var L10N={
 ca:{text:'TEXT',part:'PART',procs:['Localitzar','Deduir','Interpretar','Avaluar'],nom:'Nom i llinatges:',curs:'Curs i grup:',res:'Taula de resultats',punts:'Punts',pauta:'PAUTA DE CORRECCIÓ'},
 es:{text:'TEXTO',part:'PARTE',procs:['Localizar','Deducir','Interpretar','Evaluar'],nom:'Nombre y apellidos:',curs:'Curso y grupo:',res:'Tabla de resultados',punts:'Puntos',pauta:'PAUTA DE CORRECCIÓN'},
 en:{text:'TEXT',part:'PART',procs:['Locate','Infer','Interpret','Evaluate'],nom:'Name and surname:',curs:'Class:',res:'Results',punts:'Points',pauta:'ANSWER KEY'},
 fr:{text:'TEXTE',part:'PARTIE',procs:['Repérer','Déduire','Interpréter','Évaluer'],nom:'Nom et prénom :',curs:'Classe :',res:'Tableau des résultats',punts:'Points',pauta:'CORRIGÉ'},
 de:{text:'TEXT',part:'TEIL',procs:['Finden','Schlussfolgern','Interpretieren','Bewerten'],nom:'Vor- und Nachname:',curs:'Klasse:',res:'Ergebnisse',punts:'Punkte',pauta:'LÖSUNGEN'}
};
function loc(o){return L10N[(o.lang||'ca').slice(0,2)]||L10N.ca;}

var MARCA_PAUTA=/^(?:#{1,6}\s*)?(?:\*\*)?\s*(PAUTA DE CORRECCI|ANSWER KEY|CORRIG[ÉE]|L[ÖO]SUNGEN)/i;
var R_INSTR=/ABANS DE COMEN|ANTES DE EMPEZAR|BEFORE YOU START|AVANT DE COMMENCER|BEVOR DU ANF|INSTRUCCI|INSTRUCTIONS|ANWEISUNG/i;
var R_DADES_H=/dades de l|datos del|student|[ée]l[èe]ve|sch[üu]ler|alumn/i;
var R_DADES_P=/^(?:\*\*)?(Nom|Name|Nombre|Vor-|Curs|Curso|Class|Classe|Klasse|Data|Date|Fecha|Datum)\b[^_\n]{0,30}_{2,}/i;
var R_PREG_H=/^(PREGUNTES|PREGUNTAS|QUESTIONS|FRAGEN|PREGUNTES DE COMPRENSI|COMPREHENSION QUESTIONS)/i;
var R_NUM=/^(?:\*\*)?\s*(?:(?:Pregunta|Question|Frage)\s+)?(\d{1,2})\s*(?:\*\*)?\s*[\.\):](?:\*\*)?\s*/i;

function net(s){return s.replace(/\r/g,'').replace(/\\([_*#|>\-\[\]().!])/g,'$1').replace(/\u00a0/g,' ');}

/* ---------- Analitzador de línies ---------- */
function analitza(md){
  var linies=net(md).split('\n'),blocs=[];
  var i=linies.findIndex(function(l){return /^#{1,3}\s*\S/.test(l.trim());});
  if(i<0)i=0;
  while(i<linies.length){
    var tl=linies[i].trim(),m;
    if(!tl||/^(-{3,}|\*{3,}|_{3,})$/.test(tl)){i++;continue;}
    if(MARCA_PAUTA.test(tl)){blocs.push({t:'pauta'});i++;continue;}
    if((m=tl.match(/^(#{1,4})\s+(.*)$/))){blocs.push({t:'h',n:m[1].length,text:m[2].replace(/\*\*/g,'').trim()});i++;continue;}
    if(/^\|/.test(tl)){
      var rows=[];
      while(i<linies.length&&/^\|/.test(linies[i].trim())){
        var r=linies[i].trim();
        if(!/^\|[\s:\-|]+\|?$/.test(r))rows.push(r.replace(/^\|/,'').replace(/\|\s*$/,'').split('|').map(function(c){return c.trim();}));
        i++;
      }
      if(rows.length)blocs.push({t:'tbl',rows:rows});
      continue;
    }
    if(/^>\s*/.test(tl)){var q=tl.replace(/^>\s*/,'');if(q){blocs.push({t:'p',text:q,cita:true});}i++;continue;}
    if((m=tl.match(/^\[(?:Imatge|Image|Imagen|Illustration|Bild)\s*:?\s*(.*)\]$/i))){blocs.push({t:'img',text:m[1]});i++;continue;}
    if((m=tl.match(/^(?:\*\*)?([A-D])[\)\.](?:\*\*)?\s+(.*)$/))){blocs.push({t:'opt',marca:m[1]+')',text:m[2]});i++;continue;}
    if((m=tl.match(/^(?:[-*•])\s+(?:\[\s?\]\s*)?(.*)$/))){blocs.push({t:'li',marca:'•',text:m[1]});i++;continue;}
    if((m=tl.match(/^(\d{1,2})[\.\)]\s+(.*)$/))){blocs.push({t:'li',marca:m[1]+'.',text:m[2],num:true});i++;continue;}
    blocs.push({t:'p',text:tl});i++;
  }
  return blocs;
}

/* ---------- Estructura d'una resposta ---------- */
function numDe(b){
  if(b.t==='li'&&b.num)return parseInt(b.marca,10);
  if(b.t!=='p'&&b.t!=='h')return null;
  var m=b.text.match(R_NUM);return m?parseInt(m[1],10):null;
}
function codiProc(s){
  s=(s||'').toUpperCase();
  if(/LOCALI|LOCATE|REP[ÉE]R|FINDEN/.test(s))return 0;
  if(/DEDU|INFER|SCHLUSS/.test(s))return 1;
  if(/INTERPR|DEUTEN/.test(s))return 2;
  if(/AVALU|EVALU|[ÉE]VALU|BEWERT|REFLEX/.test(s))return 3;
  return null;
}
function processos(clau){
  var map={};
  clau.forEach(function(b){
    if(b.t!=='tbl'||b.rows.length<2)return;
    var h=b.rows[0].map(function(c){return c.replace(/\*\*/g,'');});
    var cp=h.findIndex(function(c){return /proc|proz/i.test(c);});
    if(cp<0)return;
    b.rows.slice(1).forEach(function(r){
      var n=parseInt((r[0]||'').replace(/\D/g,''),10),p=codiProc(r[cp]);
      if(n&&p!=null&&map[n]==null)map[n]=p;
    });
  });
  // processos escrits fora de la taula: «Pregunta 9 ... Procés: INTERPRETAR»
  var actual=null;
  clau.forEach(function(b){
    if(b.t==='tbl'||!b.text)return;
    var m=b.text.match(/(?:pregunta|question|frage)\s*(\d{1,2})/i);if(m)actual=parseInt(m[1],10);
    if(actual&&map[actual]==null&&/proc|proz/i.test(b.text)){var c=codiProc(b.text.split(/proc[a-zé]*|proz[a-zß]*/i).pop());if(c!=null)map[actual]=c;}
  });
  return map;
}
/* Processos que falten: la darrera pregunta és d'avaluar; les altres, com l'anterior (van agrupades per procés) */
function completa(map,ns){
  var ant=null;
  ns.forEach(function(n,i){
    if(map[n]==null){if(i===ns.length-1)map[n]=3;else if(ant!=null)map[n]=ant;}
    ant=map[n];
  });
  return map;
}
function estructura(md){
  var blocs=analitza(md),k=blocs.findIndex(function(b){return b.t==='pauta';});
  var prova=k<0?blocs:blocs.slice(0,k),clau=k<0?[]:blocs.slice(k+1);
  if(clau.length&&clau[0].t==='h'&&MARCA_PAUTA.test(clau[0].text))clau=clau.slice(1);
  var E={titol:'',etiquetes:[],instr:[],titolText:null,text:[],preg:[],clau:clau,proc:processos(clau)};
  // títol general, línia de curs i dades de l'alumne
  var resta=[],vistTitol=false;
  prova.forEach(function(b,i){
    if(!vistTitol&&b.t==='h'&&b.n===1){E.titol=b.text;vistTitol=true;return;}
    if(vistTitol&&i>0&&prova[i-1]===prova.find(function(x){return x.t==='h'&&x.n===1;})&&b.t==='p'&&b.text.length<70&&/·|ESO|prim[àa]ria|primary|year|klasse|grade|\b[ABC][12]\b/i.test(b.text))return;
    if(b.t==='h'&&R_DADES_H.test(b.text)&&b.text.length<40)return;
    if(b.t==='p'&&R_DADES_P.test(b.text)){E.etiquetes.push(b.text.replace(/\*\*/g,'').replace(/_+.*$/,'').trim());return;}
    resta.push(b);
  });
  // preguntes: la darrera seqüència 1, 2, 3...
  var cand=[];resta.forEach(function(b,i){var n=numDe(b);if(n)cand.push({i:i,n:n});});
  var inici=-1;
  for(var c=cand.length-1;c>=0;c--){
    if(cand[c].n!==1)continue;
    var esp=2,ok=0;
    for(var d=c+1;d<cand.length&&ok<2;d++){if(cand[d].n===esp){esp++;ok++;}}
    if(ok>=2){inici=c;break;}
  }
  var regioText=resta;
  if(inici>=0){
    var starts=[cand[inici]],esp2=2;
    for(var e=inici+1;e<cand.length;e++)if(cand[e].n===esp2){starts.push(cand[e]);esp2++;}
    starts.forEach(function(s,ix){
      var fi=ix+1<starts.length?starts[ix+1].i:resta.length;
      E.preg.push({n:s.n,blocs:resta.slice(s.i,fi)});
    });
    regioText=resta.slice(0,starts[0].i);
    if(Object.keys(E.proc).length)completa(E.proc,E.preg.map(function(q){return q.n;}));
  }
  // instruccions i títol del text: el títol és el darrer encapçalament seguit de text llarg
  var millor=-1,llarg=0;
  regioText.forEach(function(b,i){
    if(b.t!=='h'||R_INSTR.test(b.text)||R_PREG_H.test(b.text))return;
    var tot=0;for(var j=i+1;j<regioText.length&&regioText[j].t!=='h';j++)if(regioText[j].t==='p')tot+=regioText[j].text.length;
    if(tot>llarg){llarg=tot;millor=i;}
  });
  if(millor>=0){
    E.instr=regioText.slice(0,millor);
    E.titolText=regioText[millor].text;
    E.text=regioText.slice(millor+1).filter(function(b){return !(b.t==='h'&&R_PREG_H.test(b.text));});
  }else E.instr=regioText;
  return E;
}

/* ---------- Model del document ---------- */
/* o: {lang, etapa, pt, font, alin:'left'|'both', partir, line, tipus, curs, materia, centre, nivell,
       titolQuadre, logo:{bytes,w,h}, logoSrc} */
function munta(mds,o){
  var T=loc(o),cos=[],clau=[],offset=0,resultats=[[],[],[],[]],hiHaProc=false;
  mds.filter(function(m){return m&&m.trim();}).forEach(function(md,t){
    var E=estructura(md);
    if(t===0){
      cos.push({t:'quadre',titol:(o.titolQuadre||E.titol||'').toUpperCase(),nom:E.etiquetes[0]?E.etiquetes[0].replace(/:?\s*$/,':'):T.nom,curs:E.etiquetes[1]?E.etiquetes[1].replace(/:?\s*$/,':'):T.curs});
      E.instr.forEach(function(b){cos.push(b);});
    }
    cos.push({t:'label',text:T.text+' '+(t+1)});
    if(E.titolText)cos.push({t:'ttext',text:E.titolText});
    E.text.forEach(function(b){
      if(b.t==='p'&&/^(\*)?(Font|Fuente|Source|Quelle)\s*:/i.test(b.text))cos.push({t:'p',text:b.text,dreta:true});
      else if(b.t==='p')cos.push({t:'p',text:b.text,text_:true});
      else cos.push(b);
    });
    var partAnt=null,npart=0;
    E.preg.forEach(function(q,ix){
      var nn=q.n+offset,p=E.proc[q.n];
      if(p!=null){hiHaProc=true;resultats[p].push(nn);
        if(p!==partAnt){npart++;cos.push({t:'part',text:T.part+' '+npart+' · '+T.procs[p]});partAnt=p;}}
      var teOpc=q.blocs.some(function(b){return b.t==='opt';});
      q.blocs.forEach(function(b,bi){
        if(bi===0){
          var txt=b.text.replace(R_NUM,'').replace(/^\*\*|\*\*$/g,'').trim();
          cos.push({t:'p',text:nn+'. '+txt.replace(/\*\*/g,''),bold:true,keep:true});
        }else cos.push(b);
      });
      if(ix===E.preg.length-1&&!teOpc){cos[cos.length-1].keep=true;cos.push({t:'caixa'});}
    });
    // pauta
    if(E.clau.length){
      clau.push({t:'h',n:2,text:T.pauta+(mds.length>1?' · '+T.text+' '+(t+1):''),salt:clau.length===0});
      E.clau.forEach(function(b){
        if(b.t==='tbl'&&offset){
          b={t:'tbl',rows:b.rows.map(function(r,ri){if(!ri)return r;var n=parseInt(r[0],10);return n&&String(n)===r[0].replace(/\*\*/g,'').trim()?[String(n+offset)].concat(r.slice(1)):r;})};
        }
        clau.push(b);
      });
    }
    offset+=E.preg.length;
  });
  if(hiHaProc)cos.push({t:'resultats',files:resultats.map(function(ns,p){return {nom:T.procs[p],ns:ns};}).filter(function(f){return f.ns.length;})});
  return {cos:cos,clau:clau,T:T};
}

/* ---------- Segments en línia ---------- */
function segments(text){
  var out=[],re=/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g,last=0,m;
  while((m=re.exec(text))){
    if(m.index>last)out.push({t:text.slice(last,m.index)});
    var s=m[0];if(s.slice(0,2)==='**')out.push({t:s.slice(2,-2),b:true});else out.push({t:s.slice(1,-1),i:true});
    last=m.index+s.length;
  }
  if(last<text.length)out.push({t:text.slice(last)});
  return out;
}

/* ---------- HTML (vista prèvia i còpia amb format) ---------- */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function inl(t,bold){return segments(t).map(function(s){var x=esc(s.t);return (s.b||bold)?'<b>'+x+'</b>':s.i?'<i>'+x+'</i>':x;}).join('');}
function html(model,o,ambPauta){
  var lh=o.line||1.25,st='font-family:'+o.font+';font-size:'+o.pt+'pt;line-height:'+lh+';color:#111';
  var bd='border:1px solid #333',h=['<div style="'+st+'" lang="'+esc(o.lang)+'">'];
  h.push('<p style="text-align:right;font-family:Arial,sans-serif;font-size:9pt;line-height:1.25;margin:0 0 10pt;color:#222">'+esc((o.tipus||'').toUpperCase())+'<br>'+esc(o.curs||'')+'<br>'+esc(o.materia||'')+'</p>');
  function bloc(b,i,arr){
    var m;
    switch(b.t){
    case 'quadre':
      return '<table style="width:100%;border-collapse:collapse;margin:0 0 12pt;font-family:Arial,sans-serif;font-size:10pt"><tr>'+
        (o.logoSrc?'<td rowspan="3" style="'+bd+';width:26%;text-align:center;vertical-align:middle;padding:4pt"><img src="'+o.logoSrc+'" alt="" style="max-height:52pt;max-width:100%"></td>':'')+
        '<td style="'+bd+';text-align:center;font-weight:700;padding:4pt">'+esc(b.titol)+'</td></tr><tr><td style="'+bd+';font-weight:700;padding:4pt">'+esc(b.nom)+'</td></tr><tr><td style="'+bd+';font-weight:700;padding:4pt">'+esc(b.curs)+'</td></tr></table>';
    case 'label':return '<p style="font-weight:700;margin:14pt 0 2pt">'+esc(b.text)+'</p>';
    case 'ttext':return '<p style="font-weight:700;text-align:center;margin:2pt 0 10pt;font-size:1.08em">'+inl(b.text)+'</p>';
    case 'part':return '<p style="font-weight:700;margin:16pt 0 6pt">'+esc(b.text)+'</p>';
    case 'h':return '<p style="font-weight:700;margin:'+(b.salt?'28pt':'14pt')+' 0 6pt;'+(b.salt?'border-top:2px dashed #b79d1e;padding-top:10pt':'')+'">'+inl(b.text)+'</p>';
    case 'caixa':return '<div style="'+bd+';height:150pt;margin:6pt 0 12pt"></div>';
    case 'resultats':
      var mx=Math.max.apply(null,b.files.map(function(f){return f.ns.length;}));
      return '<p style="font-weight:700;margin:16pt 0 4pt">'+esc(model.T.res)+'</p><table style="border-collapse:collapse;font-size:.9em"><tr><th style="'+bd+';padding:3pt 6pt"></th>'+Array(mx+1).join('<th style="'+bd+';padding:3pt 6pt"></th>')+'<th style="'+bd+';padding:3pt 6pt">'+esc(model.T.punts)+'</th></tr>'+
        b.files.map(function(f){var c='';for(var k=0;k<mx;k++)c+='<td style="'+bd+';padding:3pt 8pt;min-width:2.5em">'+(f.ns[k]||'')+'</td>';return '<tr><td style="'+bd+';padding:3pt 6pt;font-weight:700">'+esc(f.nom)+'</td>'+c+'<td style="'+bd+';min-width:4em"></td></tr>';}).join('')+'</table>';
    case 'tbl':
      return '<table style="width:100%;border-collapse:collapse;margin:6pt 0 10pt;font-size:.85em">'+b.rows.map(function(r,ri){return '<tr>'+r.map(function(c){return '<'+(ri?'td':'th')+' style="'+bd+';padding:3pt 5pt;text-align:left;vertical-align:top'+(ri?'':';background:#eef2f8')+'">'+inl(c)+'</'+(ri?'td':'th')+'>';}).join('')+'</tr>';}).join('')+'</table>';
    case 'cita':return '';
    case 'img':return '<p style="margin:8pt 0;padding:8pt 10pt;border-left:4px solid #b79d1e;color:#556;font-style:italic">[ '+esc(b.text)+' ]</p>';
    case 'opt':case 'li':return '<p style="margin:0 0 3pt 1.6em;text-indent:-1.6em">'+esc(b.marca)+' '+inl(b.text)+'</p>';
    default:
      if(b.cita)return '<p style="margin:4pt 0 8pt;padding:5pt 8pt;border:1px solid #333;font-weight:700">'+inl(b.text)+'</p>';
      var ant=arr[i-1],al=b.dreta?'right':(b.text_?(o.alin==='both'?'justify':'left'):'left');
      return '<p style="margin:'+((ant&&ant.t==='opt')?'10pt':'0')+' 0 '+(b.text_?'8pt':'5pt')+';text-align:'+al+';hyphens:'+(b.text_&&o.partir?'auto':'manual')+'">'+inl(b.text,b.bold)+'</p>';
    }
  }
  model.cos.forEach(function(b,i,a){h.push(bloc(b,i,a));});
  if(ambPauta)model.clau.forEach(function(b,i,a){h.push(bloc(b,i,a));});
  h.push('</div>');
  return h.join('');
}

/* ---------- DOCX ---------- */
function x(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function runs(text,rpr,bold){
  return segments(text).map(function(s){
    var p=((s.b||bold)?'<w:b/>':'')+(s.i?'<w:i/>':'')+(rpr||'');
    return '<w:r>'+(p?'<w:rPr>'+p+'</w:rPr>':'')+'<w:t xml:space="preserve">'+x(s.t)+'</w:t></w:r>';
  }).join('');
}
function par(text,ppr,rpr,bold){return '<w:p>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+runs(text,rpr,bold)+'</w:p>';}
var W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
var AMPLE=9070;
function vores(sz){return '<w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(function(s){return '<w:'+s+' w:val="single" w:sz="'+(sz||6)+'" w:space="0" w:color="333333"/>';}).join('')+'</w:tblBorders>';}
function imatge(o,hcm){
  var h=Math.round(hcm*360000),w=Math.round(h*o.logo.w/o.logo.h),maxw=Math.round(4.2*360000);
  if(w>maxw){h=Math.round(h*maxw/w);w=maxw;}
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+w+'" cy="'+h+'"/><wp:docPr id="1" name="Logo del centre"/>'+
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
    '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
}
function cel(w,contingut,extra){return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(extra||'')+'</w:tcPr>'+contingut+'</w:tc>';}
var SANS='<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
function cos(items,o,T){
  var out=[];
  items.forEach(function(b,i){
    var ant=items[i-1],seg=items[i+1];
    switch(b.t){
    case 'quadre':
      var wl=o.logo?2400:0,wr=AMPLE-wl,t='<w:tbl><w:tblPr><w:tblW w:w="'+AMPLE+'" w:type="dxa"/>'+vores(6)+'<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+(o.logo?'<w:gridCol w:w="'+wl+'"/>':'')+'<w:gridCol w:w="'+wr+'"/></w:tblGrid>';
      var cap='<w:pStyle w:val="Quadre"/>';
      [[b.titol,true],[b.nom,false],[b.curs,false]].forEach(function(r,ri){
        t+='<w:tr><w:trPr><w:cantSplit/></w:trPr>';
        if(o.logo)t+=cel(wl,ri===0?'<w:p><w:pPr><w:pStyle w:val="Quadre"/><w:jc w:val="center"/></w:pPr>'+imatge(o,1.6)+'</w:p>':'<w:p/>',(ri===0?'<w:vMerge w:val="restart"/>':'<w:vMerge/>')+'<w:vAlign w:val="center"/>');
        t+=cel(wr,par(r[0],cap+(r[1]?'<w:jc w:val="center"/>':''),'',true),'<w:vAlign w:val="center"/>');
        t+='</w:tr>';
      });
      out.push(t+'</w:tbl>');out.push('<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>');return;
    case 'label':out.push(par(b.text,'<w:keepNext/><w:spacing w:before="240" w:after="40"/>','',true));return;
    case 'ttext':out.push(par(b.text,'<w:keepNext/><w:jc w:val="center"/><w:spacing w:after="200"/>','<w:sz w:val="'+Math.round(o.pt*2+2)+'"/>',true));return;
    case 'part':out.push(par(b.text,'<w:keepNext/><w:spacing w:before="300" w:after="120"/>','',true));return;
    case 'h':out.push(par(b.text,(b.salt?'<w:pageBreakBefore/>':'')+'<w:keepNext/><w:spacing w:before="'+(b.salt?0:240)+'" w:after="120"/>','<w:sz w:val="'+Math.round(o.pt*2+2)+'"/>',true));return;
    case 'caixa':
      out.push('<w:tbl><w:tblPr><w:tblW w:w="'+AMPLE+'" w:type="dxa"/>'+vores(6)+'</w:tblPr><w:tblGrid><w:gridCol w:w="'+AMPLE+'"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="3400" w:hRule="atLeast"/><w:cantSplit/></w:trPr>'+cel(AMPLE,'<w:p/>')+'</w:tr></w:tbl>');
      out.push('<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>');return;
    case 'resultats':
      var mx=Math.max.apply(null,b.files.map(function(f){return f.ns.length;})),wn=1800,wc=Math.floor((AMPLE-wn-1300)/mx),wp=AMPLE-wn-wc*mx;
      var r='<w:tbl><w:tblPr><w:tblW w:w="'+AMPLE+'" w:type="dxa"/>'+vores(6)+'</w:tblPr><w:tblGrid><w:gridCol w:w="'+wn+'"/>';
      for(var k=0;k<mx;k++)r+='<w:gridCol w:w="'+wc+'"/>';
      r+='<w:gridCol w:w="'+wp+'"/></w:tblGrid><w:tr>'+cel(wn,'<w:p/>');for(k=0;k<mx;k++)r+=cel(wc,'<w:p/>');r+=cel(wp,par(T.punts,'<w:pStyle w:val="Taula"/>','',true))+'</w:tr>';
      b.files.forEach(function(f){
        r+='<w:tr><w:trPr><w:cantSplit/></w:trPr>'+cel(wn,par(f.nom,'<w:pStyle w:val="Taula"/>','',true));
        for(k=0;k<mx;k++)r+=cel(wc,par(f.ns[k]!=null?String(f.ns[k]):'','<w:pStyle w:val="Taula"/>','',true));
        r+=cel(wp,'<w:p/>')+'</w:tr>';
      });
      out.push(par(T.res+':','<w:keepNext/><w:spacing w:before="360" w:after="120"/>','',true));out.push(r+'</w:tbl>');return;
    case 'tbl':
      var n=Math.max.apply(null,b.rows.map(function(r){return r.length;}));
      var pes=[];for(var c0=0;c0<n;c0++){var tot=0;b.rows.forEach(function(r){tot+=Math.min(120,(r[c0]||'').length);});pes.push(Math.max(7,tot/b.rows.length));}
      var sp=pes.reduce(function(a,c){return a+c;},0),ws=pes.map(function(v){return Math.floor(AMPLE*v/sp);});
      var tb='<w:tbl><w:tblPr><w:tblW w:w="'+AMPLE+'" w:type="dxa"/><w:tblLayout w:type="fixed"/>'+vores(4)+'<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>';
      for(var c=0;c<n;c++)tb+='<w:gridCol w:w="'+ws[c]+'"/>';
      tb+='</w:tblGrid>';
      b.rows.forEach(function(rw,ri){
        tb+='<w:tr>'+(ri?'':'<w:trPr><w:tblHeader/></w:trPr>');
        for(var c=0;c<n;c++)tb+=cel(ws[c],par(rw[c]||'','<w:pStyle w:val="Taula"/>','',!ri),ri?'':'<w:shd w:val="clear" w:color="auto" w:fill="EEF2F8"/>');
        tb+='</w:tr>';
      });
      out.push(tb+'</w:tbl>');out.push('<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>');return;
    case 'img':out.push(par('[ '+b.text+' ]','<w:pStyle w:val="Imatge"/>'));return;
    case 'opt':case 'li':out.push(par(b.marca+'\t'+b.text,'<w:pStyle w:val="Opcio"/>'+((seg&&seg.t===b.t)?'<w:keepNext/>':'')));return;
    default:
      if(b.cita){out.push(par(b.text,'<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="333333"/><w:left w:val="single" w:sz="6" w:space="4" w:color="333333"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="333333"/><w:right w:val="single" w:sz="6" w:space="4" w:color="333333"/></w:pBdr><w:ind w:left="120" w:right="120"/><w:spacing w:before="120" w:after="200"/>','',true));return;}
      var pp='';
      if(b.dreta)pp+='<w:jc w:val="right"/>';
      else if(b.text_)pp+='<w:pStyle w:val="TextLectura"/>';
      if(b.keep||(seg&&seg.t==='opt'))pp+='<w:keepNext/>';
      if(ant&&ant.t==='opt')pp+='<w:spacing w:before="240"/>';
      out.push(par(b.text,pp,'',b.bold));
    }
  });
  return out.join('');
}
function estils(o){
  var f=o.fontDocx||'Arial',sz=Math.round(o.pt*2),line=Math.round(240*(o.line||1.25));
  function st(id,nom,ppr,rpr){return '<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+nom+'"/><w:basedOn w:val="Normal"/><w:qFormat/>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+'</w:style>';}
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W_NS+'>'+
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+f+'" w:hAnsi="'+f+'" w:cs="'+f+'" w:eastAsia="'+f+'"/><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/><w:lang w:val="'+o.lang+'"/></w:rPr></w:rPrDefault>'+
    '<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="'+line+'" w:lineRule="auto"/><w:jc w:val="left"/><w:suppressAutoHyphens/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
    st('TextLectura','Text de lectura','<w:spacing w:after="160"/><w:jc w:val="'+(o.alin==='both'?'both':'left')+'"/>'+(o.partir?'<w:suppressAutoHyphens w:val="0"/>':''),'')+
    st('Opcio','Opció','<w:spacing w:after="60"/><w:ind w:left="567" w:hanging="425"/><w:tabs><w:tab w:val="left" w:pos="567"/></w:tabs>','')+
    st('Taula','Taula','<w:spacing w:after="0" w:line="252" w:lineRule="auto"/>','<w:sz w:val="'+Math.max(18,sz-3)+'"/>')+
    st('Quadre','Quadre','<w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/>',SANS+'<w:sz w:val="21"/>')+
    st('Imatge','Imatge','<w:spacing w:before="120" w:after="200"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="B79D1E"/></w:pBdr><w:ind w:left="200"/>','<w:i/><w:color w:val="555566"/>')+
    st('Capcalera','Capçalera','<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="right"/>',SANS+'<w:sz w:val="17"/>')+
    '</w:styles>';
}
function capcalera(o){
  var l=[(o.tipus||'').toUpperCase(),o.curs||'',o.materia||''].filter(Boolean);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+W_NS+'>'+l.map(function(t){return par(t,'<w:pStyle w:val="Capcalera"/>');}).join('')+'</w:hdr>';
}
function peu(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+W_NS+'><w:p><w:pPr><w:pStyle w:val="Capcalera"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>';
}
function docx(model,o,JSZip,ambPauta){
  var z=new JSZip(),T=model.T;
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'+
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'+
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'+
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  z.file('docProps/core.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+x((o.tipus||'')+' · '+(o.curs||''))+'</dc:title><dc:creator>CEP de Formentera · Eina de comprensió lectora</dc:creator><dc:language>'+x(o.lang)+'</dc:language></cp:coreProperties>');
  z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'+
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'+
    '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+
    (o.logo?'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>':'')+'</Relationships>');
  z.file('word/settings.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:autoHyphenation w:val="'+(o.partir?'true':'false')+'"/><w:consecutiveHyphenLimit w:val="2"/><w:defaultTabStop w:val="709"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
  z.file('word/styles.xml',estils(o));
  z.file('word/header1.xml',capcalera(o));
  z.file('word/footer1.xml',peu());
  if(o.logo)z.file('word/media/logo.png',o.logo.bytes);
  var items=model.cos.concat(ambPauta?model.clau:[]);
  z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+W_NS+'><w:body>'+cos(items,o,T)+
    '<w:sectPr><w:headerReference w:type="default" r:id="rId3"/><w:footerReference w:type="default" r:id="rId4"/>'+
    '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1531" w:right="1418" w:bottom="1304" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return z;
}
function resum(model){
  var n=0,proc=false,txt=0,caixa=false;
  model.cos.forEach(function(b){if(b.t==='p'&&b.bold&&/^\d+\./.test(b.text))n++;if(b.t==='resultats')proc=true;if(b.t==='label')txt++;if(b.t==='caixa')caixa=true;});
  return {preguntes:n,processos:proc,textos:txt,pauta:model.clau.length>0,caixa:caixa};
}

var API={analitza:analitza,estructura:estructura,munta:munta,html:html,docx:docx,resum:resum,L10N:L10N};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.MaquetaProva=API;
})(this);
