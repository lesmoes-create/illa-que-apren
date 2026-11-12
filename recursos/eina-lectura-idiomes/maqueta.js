/* Maquetació de la prova: llegeix la resposta de la IA (Markdown simple)
   i en fa una vista prèvia HTML i un document Word (.docx) amb el logo del centre,
   la tipografia, la mida i l'alineació del curs. Sense dependències excepte JSZip per al .docx. */
(function(root){
'use strict';

var MARCA_PAUTA=/^(?:#{1,6}\s*)?(?:\*\*)?\s*PAUTA DE CORRECCI[OÓ]/i;

function net(s){
  return s.replace(/\r/g,'')
    .replace(/\\([_*#|>\-\[\]().!])/g,'$1')   // escapades de Markdown en copiar
    .replace(/\u00a0/g,' ');
}

/* ---------- Analitzador ---------- */
/* Blocs: {t:'h',n:1-4,text} {t:'p',text,cls?} {t:'li',text,marca} {t:'opt',text} {t:'img',text} {t:'tbl',rows:[[...]]} {t:'pauta'} */
function analitza(md){
  var linies=net(md).split('\n'),blocs=[];
  // Salta el que la IA escrigui abans del primer títol; si no n'hi ha cap, comença pel principi
  var i=linies.findIndex(function(l){return /^#{1,3}\s*\S/.test(l.trim());});
  if(i<0)i=0;
  while(i<linies.length){
    var l=linies[i],tl=l.trim();
    if(!tl||/^(-{3,}|\*{3,}|_{3,})$/.test(tl)){i++;continue;}
    if(MARCA_PAUTA.test(tl)){blocs.push({t:'pauta'});blocs.push({t:'h',n:2,text:tl.replace(/^#+\s*/,'').replace(/\*\*/g,'')});i++;continue;}
    var m;
    if((m=tl.match(/^(#{1,4})\s+(.*)$/))){blocs.push({t:'h',n:m[1].length,text:m[2].replace(/\*\*/g,'').trim()});i++;continue;}
    if(/^\|/.test(tl)){
      var rows=[];
      while(i<linies.length&&/^\|/.test(linies[i].trim())){
        var r=linies[i].trim();
        if(!/^\|[\s:\-|]+\|?$/.test(r)){
          var cells=r.replace(/^\|/,'').replace(/\|\s*$/,'').split('|').map(function(c){return c.trim();});
          rows.push(cells);
        }
        i++;
      }
      if(rows.length)blocs.push({t:'tbl',rows:rows});
      continue;
    }
    if((m=tl.match(/^\[(?:Imatge|Image|Imagen|Illustration|Bild)\s*:?\s*(.*)\]$/i))){blocs.push({t:'img',text:m[1]});i++;continue;}
    if((m=tl.match(/^(?:\*\*)?([A-D])[\)\.](?:\*\*)?\s+(.*)$/))){blocs.push({t:'opt',marca:m[1]+')',text:m[2]});i++;continue;}
    if((m=tl.match(/^(?:[-*•])\s+(?:\[\s?\]\s*)?(.*)$/))){blocs.push({t:'li',marca:'•',text:m[1]});i++;continue;}
    if((m=tl.match(/^(\d{1,2})[\.\)]\s+(.*)$/))){blocs.push({t:'li',marca:m[1]+'.',text:m[2],num:true});i++;continue;}
    blocs.push({t:'p',text:tl});i++;
  }
  return blocs;
}
function talla(blocs,ambPauta){
  if(ambPauta)return blocs;
  var k=blocs.findIndex(function(b){return b.t==='pauta';});
  return k<0?blocs:blocs.slice(0,k);
}
function teParta(blocs){return blocs.some(function(b){return b.t==='pauta';});}

/* Segments en línia: **negreta** i *cursiva* */
function segments(text){
  var out=[],re=/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g,last=0,m;
  while((m=re.exec(text))){
    if(m.index>last)out.push({t:text.slice(last,m.index)});
    var s=m[0];
    if(s.slice(0,2)==='**')out.push({t:s.slice(2,-2),b:true});else out.push({t:s.slice(1,-1),i:true});
    last=m.index+s.length;
  }
  if(last<text.length)out.push({t:text.slice(last)});
  return out;
}

/* ---------- HTML ---------- */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function inlineHTML(t){return segments(t).map(function(s){var x=esc(s.t);return s.b?'<b>'+x+'</b>':s.i?'<i>'+x+'</i>':x;}).join('');}
function html(blocs,o){
  var font=o.etapa==='P'?'Verdana, Arial, sans-serif':'Georgia, Cambria, "Times New Roman", serif';
  var st='font-family:'+font+';font-size:'+o.pt+'pt;line-height:'+(o.etapa==='P'?1.45:1.35)+';text-align:left;hyphens:manual;color:#111';
  var h=['<div style="'+st+'" lang="'+esc(o.lang)+'">'];
  h.push('<table style="width:100%;border-collapse:collapse;margin-bottom:14pt;border-bottom:1px solid #9aa;font-family:Arial,sans-serif"><tr>'+
    '<td style="width:40%;padding:0 0 6pt 0;vertical-align:middle">'+(o.logoSrc?'<img src="'+o.logoSrc+'" alt="'+esc(o.centre||'')+'" style="height:44pt;width:auto">':'')+'</td>'+
    '<td style="text-align:right;vertical-align:bottom;padding:0 0 6pt 0;font-size:9pt;color:#334">'+esc(o.centre||'')+(o.centre?'<br>':'')+esc(o.curs)+' · '+esc(o.nivell)+'</td></tr></table>');
  blocs.forEach(function(b,i){
    if(b.t==='pauta'){h.push('<hr style="border:0;border-top:2px dashed #b79d1e;margin:24pt 0 8pt">');return;}
    if(b.t==='h'){var sz={1:1.45,2:1.15,3:1.05,4:1}[b.n];h.push('<p style="font-family:Arial,sans-serif;font-weight:700;font-size:'+sz+'em;margin:'+(b.n===1?'0 0 4pt':'14pt 0 6pt')+';color:#0b2f63">'+inlineHTML(b.text)+'</p>');return;}
    if(b.t==='tbl'){
      h.push('<table style="width:100%;border-collapse:collapse;margin:6pt 0 10pt;font-size:.85em">');
      b.rows.forEach(function(r,ri){h.push('<tr>'+r.map(function(c){return '<'+(ri?'td':'th')+' style="border:1px solid #889;padding:3pt 5pt;text-align:left;vertical-align:top'+(ri?'':';background:#eef2f8')+'">'+inlineHTML(c)+'</'+(ri?'td':'th')+'>';}).join('')+'</tr>');});
      h.push('</table>');return;
    }
    if(b.t==='img'){h.push('<p style="margin:8pt 0;padding:10pt;border:1px dashed #889;color:#556;font-style:italic">[ '+esc(b.text)+' ]</p>');return;}
    if(b.t==='opt'){h.push('<p style="margin:0 0 3pt 1.4em;text-indent:-1.4em">'+esc(b.marca)+' '+inlineHTML(b.text)+'</p>');return;}
    if(b.t==='li'){h.push('<p style="margin:0 0 4pt 1.4em;text-indent:-1.4em">'+esc(b.marca)+' '+inlineHTML(b.text)+'</p>');return;}
    var ant=blocs[i-1];h.push('<p style="margin:'+((ant&&ant.t==='opt')?'12pt':'0')+' 0 8pt">'+inlineHTML(b.text)+'</p>');
  });
  h.push('</div>');
  return h.join('');
}

/* ---------- DOCX ---------- */
function x(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function runs(text,extra){
  return segments(text).map(function(s){
    var rp=(s.b?'<w:b/>':'')+(s.i?'<w:i/>':'')+(extra||'');
    return '<w:r>'+(rp?'<w:rPr>'+rp+'</w:rPr>':'')+'<w:t xml:space="preserve">'+x(s.t)+'</w:t></w:r>';
  }).join('');
}
function par(text,ppr,rpr){return '<w:p>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+runs(text,rpr)+'</w:p>';}
var W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

function cos(blocs,o){
  var out=[],salt=false;
  blocs.forEach(function(b,idx){
    if(b.t==='pauta'){salt=true;return;}
    if(b.t==='h'){out.push(par(b.text,'<w:pStyle w:val="'+(b.n===1?'Title':'Heading'+Math.min(b.n-1,3))+'"/>'+(salt?'<w:pageBreakBefore/>':'')));salt=false;return;}
    if(b.t==='tbl'){
      var n=Math.max.apply(null,b.rows.map(function(r){return r.length;}));
      var w=Math.floor(9070/n);
      var t='<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'+
        ['top','left','bottom','right','insideH','insideV'].map(function(s){return '<w:'+s+' w:val="single" w:sz="4" w:space="0" w:color="888899"/>';}).join('')+
        '</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>';
      for(var c=0;c<n;c++)t+='<w:gridCol w:w="'+w+'"/>';
      t+='</w:tblGrid>';
      b.rows.forEach(function(r,ri){
        t+='<w:tr>'+(ri?'':'<w:trPr><w:tblHeader/></w:trPr>');
        for(var c=0;c<n;c++){
          t+='<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(ri?'':'<w:shd w:val="clear" w:color="auto" w:fill="EEF2F8"/>')+'</w:tcPr>'+
            par(r[c]||'','<w:pStyle w:val="Taula"/>',ri?'':'<w:b/>')+'</w:tc>';
        }
        t+='</w:tr>';
      });
      t+='</w:tbl>';
      out.push(t);out.push('<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>');return;
    }
    if(b.t==='img'){out.push(par('[ '+b.text+' ]','<w:pStyle w:val="Imatge"/>'));return;}
    if(b.t==='opt'||b.t==='li'){out.push(par(b.marca+'\t'+b.text,'<w:pStyle w:val="Opcio"/>'));return;}
    var seg=blocs[idx+1],ant=blocs[idx-1];
    out.push(par(b.text,((seg&&seg.t==='opt')?'<w:keepNext/>':'')+((ant&&ant.t==='opt')?'<w:spacing w:before="240"/>':'')));
  });
  return out.join('');
}

function estils(o){
  var font=o.etapa==='P'?'Verdana':'Georgia',head='Arial';
  var sz=Math.round(o.pt*2),line=o.etapa==='P'?348:324; // 1,45 i 1,35
  function st(id,nom,ppr,rpr,basedOn){return '<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+nom+'"/>'+(basedOn?'<w:basedOn w:val="'+basedOn+'"/>':'')+'<w:qFormat/>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+'</w:style>';}
  var hf='<w:rFonts w:ascii="'+head+'" w:hAnsi="'+head+'" w:cs="'+head+'"/>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W_NS+'>'+
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+font+'" w:hAnsi="'+font+'" w:cs="'+font+'" w:eastAsia="'+font+'"/><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/><w:lang w:val="'+o.lang+'"/></w:rPr></w:rPrDefault>'+
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="'+line+'" w:lineRule="auto"/><w:jc w:val="left"/><w:suppressAutoHyphens/></w:pPr></w:pPrDefault></w:docDefaults>'+
    st('Normal','Normal','','')+
    st('Title','Title','<w:keepNext/><w:spacing w:before="0" w:after="80"/>',hf+'<w:b/><w:color w:val="0B2F63"/><w:sz w:val="34"/>','Normal')+
    st('Heading1','heading 1','<w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/>',hf+'<w:b/><w:color w:val="0B2F63"/><w:sz w:val="'+(sz+4)+'"/>','Normal')+
    st('Heading2','heading 2','<w:keepNext/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="1"/>',hf+'<w:b/><w:color w:val="0B2F63"/><w:sz w:val="'+(sz+2)+'"/>','Normal')+
    st('Heading3','heading 3','<w:keepNext/><w:spacing w:before="180" w:after="80"/><w:outlineLvl w:val="2"/>',hf+'<w:b/><w:sz w:val="'+sz+'"/>','Normal')+
    st('Opcio','Opció','<w:spacing w:after="60"/><w:ind w:left="567" w:hanging="425"/><w:tabs><w:tab w:val="left" w:pos="567"/></w:tabs>','','Normal')+
    st('Taula','Taula','<w:spacing w:after="0" w:line="264" w:lineRule="auto"/>','<w:sz w:val="'+Math.max(18,sz-4)+'"/>','Normal')+
    st('Imatge','Imatge','<w:spacing w:before="120" w:after="200"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="B79D1E"/></w:pBdr><w:ind w:left="200"/>','<w:i/><w:color w:val="555566"/>','Normal')+
    st('Capcalera','Capçalera','<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:tabs><w:tab w:val="right" w:pos="9070"/></w:tabs>',hf+'<w:sz w:val="17"/><w:color w:val="334455"/>','Normal')+
    '</w:styles>';
}

function capcalera(o){
  var img='';
  if(o.logo){
    var h=Math.round(1.5*360000),w=Math.round(h*o.logo.w/o.logo.h); // 1,5 cm d'alt
    var maxw=Math.round(7*360000);if(w>maxw){h=Math.round(h*maxw/w);w=maxw;}
    img='<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+w+'" cy="'+h+'"/><wp:docPr id="1" name="Logo del centre"/>'+
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
      '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  var dreta=(o.centre?o.centre+' · ':'')+o.curs+' · '+o.nivell;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+W_NS+'>'+
    '<w:p><w:pPr><w:pStyle w:val="Capcalera"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="9AA4B5"/></w:pBdr></w:pPr>'+img+
    '<w:r><w:tab/><w:t xml:space="preserve">'+x(dreta)+'</w:t></w:r></w:p></w:hdr>';
}
function peu(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+W_NS+'>'+
    '<w:p><w:pPr><w:pStyle w:val="Capcalera"/><w:jc w:val="center"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>'+
    '<w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>';
}

/* o: {etapa, pt, lang, centre, curs, nivell, logo:{bytes:Uint8Array,w,h}|null}; JSZip: constructor */
function docx(blocs,o,JSZip){
  var z=new JSZip();
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
  z.file('docProps/core.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+x(o.titol||'Prova de comprensió lectora')+'</dc:title><dc:creator>CEP de Formentera · Eina de comprensió lectora</dc:creator><dc:language>'+x(o.lang)+'</dc:language></cp:coreProperties>');
  z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'+
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'+
    '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');
  z.file('word/settings.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:autoHyphenation w:val="false"/><w:defaultTabStop w:val="709"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
  z.file('word/styles.xml',estils(o));
  z.file('word/header1.xml',capcalera(o));
  z.file('word/footer1.xml',peu());
  if(o.logo){
    z.file('word/_rels/header1.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>');
    z.file('word/media/logo.png',o.logo.bytes);
  }
  z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+W_NS+'><w:body>'+cos(blocs,o)+
    '<w:sectPr><w:headerReference w:type="default" r:id="rId3"/><w:footerReference w:type="default" r:id="rId4"/>'+
    '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1531" w:right="1418" w:bottom="1304" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return z;
}

var API={analitza:analitza,talla:talla,teParta:teParta,html:html,docx:docx};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.MaquetaLE=API;
})(this);
