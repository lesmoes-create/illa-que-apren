/* Espais de treball: cada recurs apareix sol quan el fitxer és a la carpeta indicada.
   No cal tocar aquest fitxer. Vegeu LLEGEIX-ME.md. */
(function(){
  var ICON={pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>',
            audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
            text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
            link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'};
  function exists(url){return fetch(url,{method:'HEAD',cache:'no-store'}).then(function(r){return r.ok}).catch(function(){return false})}
  document.querySelectorAll('[data-res]').forEach(function(el){
    var url=el.getAttribute('data-res'), kind=el.getAttribute('data-kind'), label=el.getAttribute('data-label');
    exists(url).then(function(ok){
      if(!ok) return; // queda el requadre "pendent"
      if(kind==='audio'){
        var wrap=document.createElement('div');wrap.className='player';
        wrap.innerHTML='<span class="data">'+label+'</span><audio controls preload="none" src="'+url+'"></audio>';
        el.closest('.ses-body').appendChild(wrap); el.remove(); return;
      }
      if(kind==='text'){
        fetch(url).then(function(r){return r.text()}).then(function(t){
          var d=document.createElement('details');d.className='resum';
          var s=document.createElement('summary');s.textContent=label;var b=document.createElement('div');b.textContent=t;
          d.appendChild(s);d.appendChild(b);el.closest('.ses-body').appendChild(d);el.remove();});
        return;
      }
      var a=document.createElement('a');a.className='slot ready';a.href=url;a.target='_blank';a.rel='noopener';
      a.innerHTML=(ICON[kind]||ICON.link)+'<span>'+label+'</span>';el.replaceWith(a);
    });
  });
  var fc=document.querySelector('[data-flashcards]');
  if(fc){
    fetch(fc.getAttribute('data-flashcards'),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(list){
      var g=document.createElement('div');g.className='cards';
      var bar=document.createElement('div');bar.className='cards-bar';
      bar.innerHTML='<span>'+list.length+' targetes</span>';
      var bs=document.createElement('button');bs.type='button';bs.textContent='Barreja';
      bs.addEventListener('click',function(){var a=[].slice.call(g.children);for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));g.appendChild(a[j]);a.splice(j,1);}g.querySelectorAll('.card').forEach(function(x){x.classList.remove('flip')});});
      var bt=document.createElement('button');bt.type='button';bt.textContent='Tapa-les totes';
      bt.addEventListener('click',function(){g.querySelectorAll('.card').forEach(function(x){x.classList.remove('flip')})});
      bar.appendChild(bs);bar.appendChild(bt);
      list.forEach(function(c,idx){
        var d=document.createElement('div');d.className='card';
        var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Gira la targeta');
        var f=document.createElement('span');f.className='face front';var sm=document.createElement('small');sm.textContent='Targeta '+(idx+1);var q=document.createElement('span');q.textContent=c.pregunta;f.appendChild(sm);f.appendChild(q);
        var k=document.createElement('span');k.className='face back';k.textContent=c.resposta;
        b.appendChild(f);b.appendChild(k);b.addEventListener('click',function(){d.classList.toggle('flip')});
        d.appendChild(b);g.appendChild(d);
      });
      var wrap=document.createElement('div');wrap.appendChild(bar);wrap.appendChild(g);fc.replaceWith(wrap);
    }).catch(function(){});
  }
  var tq=document.querySelector('[data-test]');
  if(tq){
    fetch(tq.getAttribute('data-test'),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(list){
      var form=document.createElement('form');form.className='quiz';form.noValidate=true;
      list.forEach(function(item,i){
        var box=document.createElement('div');box.className='q';
        var fs=document.createElement('fieldset');var lg=document.createElement('legend');lg.textContent=item.pregunta;fs.appendChild(lg);
        (item.opcions||[]).forEach(function(op,k){
          var lb=document.createElement('label');var inp=document.createElement('input');inp.type='radio';inp.name='q'+i;inp.value=k;inp.id='q'+i+'o'+k;lb.htmlFor=inp.id;
          var sp=document.createElement('span');sp.textContent=op;lb.appendChild(inp);lb.appendChild(sp);fs.appendChild(lb);
        });
        var fb=document.createElement('p');fb.className='fb';fb.hidden=true;
        box.appendChild(fs);box.appendChild(fb);form.appendChild(box);
      });
      var bar=document.createElement('div');bar.className='quiz-bar';
      var ok=document.createElement('button');ok.type='submit';ok.textContent='Comprova les respostes';
      var rs=document.createElement('button');rs.type='button';rs.className='sec';rs.textContent='Torna a començar';
      var out=document.createElement('output');out.setAttribute('aria-live','polite');
      bar.appendChild(ok);bar.appendChild(rs);bar.appendChild(out);form.appendChild(bar);
      form.addEventListener('submit',function(e){e.preventDefault();var n=0;
        list.forEach(function(item,i){var box=form.children[i];var sel=form.querySelector('input[name="q'+i+'"]:checked');
          box.querySelectorAll('label').forEach(function(l){l.classList.remove('ok','ko')});
          var labels=box.querySelectorAll('label');if(labels[item.correcta])labels[item.correcta].classList.add('ok');
          var fb=box.querySelector('.fb');
          if(sel&&+sel.value===item.correcta){n++;fb.textContent='Correcte. '+(item.explicacio||'');}
          else{if(sel)sel.parentNode.classList.add('ko');fb.textContent=(sel?'No és aquesta. ':'Sense resposta. ')+(item.explicacio||'');}
          fb.hidden=false;});
        out.textContent=n+' de '+list.length+' encerts';});
      rs.addEventListener('click',function(){form.reset();form.querySelectorAll('label').forEach(function(l){l.classList.remove('ok','ko')});form.querySelectorAll('.fb').forEach(function(f){f.hidden=true});out.textContent='';});
      tq.replaceWith(form);
    }).catch(function(){});
  }
  var md=document.querySelector('[data-media]');
  if(md){
    var base=md.getAttribute('data-base');
    fetch(md.getAttribute('data-media'),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(list){
      var g=document.createElement('div');g.className='media';
      list.forEach(function(it){
        var f=document.createElement('figure');var el;
        if(it.tipus==='video'){el=document.createElement('video');el.controls=true;el.preload='none';el.playsInline=true;if(it.poster)el.poster=base+it.poster;}
        else{el=document.createElement('audio');el.controls=true;el.preload='none';}
        el.src=base+it.fitxer;
        var c=document.createElement('figcaption');var b=document.createElement('b');b.textContent=it.titol;var s=document.createElement('span');s.textContent=[it.durada,it.descripcio].filter(Boolean).join(' · ');
        c.appendChild(b);c.appendChild(s);f.appendChild(el);f.appendChild(c);g.appendChild(f);
      });
      md.replaceWith(g);
    }).catch(function(){});
  }
  var mp=document.querySelector('[data-mapa]');
  if(mp){
    fetch(mp.getAttribute('data-mapa'),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(root){
      function items(list){var ul=document.createElement('ul');(list||[]).forEach(function(n){var li=document.createElement('li');var b=document.createElement('b');b.textContent=n.titol;li.appendChild(b);if(n.nota){var sp=document.createElement('span');sp.textContent=n.nota;li.appendChild(sp);}if(n.fills&&n.fills.length)li.appendChild(items(n.fills));ul.appendChild(li);});return ul;}
      var w=document.createElement('div');var rt=document.createElement('div');rt.className='mm-root';rt.textContent=root.titol;w.appendChild(rt);
      var g=document.createElement('div');g.className='mm';
      (root.fills||[]).forEach(function(br){var d=document.createElement('section');d.className='mm-b';var h=document.createElement('h3');h.textContent=br.titol;d.appendChild(h);if(br.nota){var p=document.createElement('p');p.className='n';p.textContent=br.nota;d.appendChild(p);}d.appendChild(items(br.fills));g.appendChild(d);});
      w.appendChild(g);mp.replaceWith(w);
    }).catch(function(){});
  }
})();
