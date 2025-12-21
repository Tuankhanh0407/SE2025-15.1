(function(){
  try { console.debug("[hubs-inject] loaded v13", location.href); } catch(e) {}
  function elIn(doc, tag, attrs, text){var d=doc||document; var e=d.createElement(tag); if(attrs){Object.keys(attrs).forEach(function(k){e.setAttribute(k, attrs[k]);});} if(text){e.textContent=text;} return e;}
  function decisionKey(token){ return "hubs-signin-decision:"+(token||""); }
  function getDecision(token){
    try {
      if(!token) return null;
      var v=localStorage.getItem(decisionKey(token));
      return v || null;
    } catch(e) { return null; }
  }
  function setDecision(token, value){
    try {
      if(!token) return;
      localStorage.setItem(decisionKey(token), value);
    } catch(e) {}
  }
  function safeGetIframeDocs(){
    var out=[];
    var iframes=[];
    try { iframes = Array.prototype.slice.call(document.querySelectorAll("iframe")); } catch(e) { iframes=[]; }
    for(var i=0;i<iframes.length;i++){
      try {
        var d=iframes[i].contentDocument;
        if(d && d.documentElement) out.push(d);
      } catch(e) {}
    }
    return out;
  }
  function removeUi(){
    // Remove from main doc and any same-origin iframe docs.
    try {
      var existing=document.getElementById("hubs-accept-deny");
      if(existing) existing.remove();
    } catch(e) {}
    var docs=safeGetIframeDocs();
    for(var i=0;i<docs.length;i++){
      try {
        var existing2=docs[i].getElementById("hubs-accept-deny");
        if(existing2) existing2.remove();
      } catch(e) {}
    }
  }
  function isViewPage(){
    return /^\/view\//.test(location.pathname);
  }
  function parseConfirmLink(msg){
    var candidates=[];
    try {
      if (msg && msg.HTML) candidates.push(msg.HTML);
      if (msg && msg.Text) candidates.push(msg.Text);
    } catch(e) {}
    var re=/https?:\/\/[^"\s<>]+\/confirm-signin\?[^"\s<>]+/g;
    for (var i=0;i<candidates.length;i++){
      var m=candidates[i].match(re);
      if (m && m.length) return m[0];
    }
    return null;
  }
  function parseRawQuery(link){
    // We want the raw (percent-encoded) values from the confirm link.
    // Using URLSearchParams would decode and re-encode, which can be fragile for base64 payloads.
    try {
      var q=(link.split("?")[1]||"");
      var out={};
      q.split("&").forEach(function(kv){
        if(!kv) return;
        var idx=kv.indexOf("=");
        var k=idx===-1 ? kv : kv.slice(0, idx);
        var v=idx===-1 ? "" : kv.slice(idx+1);
        out[k]=v;
      });
      return out;
    } catch(e) {
      return {};
    }
  }
  function postForm(url, data){
    // `data` values are assumed to be raw percent-encoded already.
    var body=Object.keys(data).map(function(k){return k+"="+(data[k]||"");}).join("&");
    return fetch(url, {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:body});
  }
  function createActionBar(doc){
    var d=doc || document;
    var wrap=elIn(d,"div", {id:"hubs-accept-deny",style:"margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;box-shadow:0 10px 25px rgba(0,0,0,.08);display:flex;gap:10px;align-items:center;margin-bottom:16px;"});
    var title=elIn(d,"div", {style:"font-weight:600;"}, "Sign-In Request");
    var status=elIn(d,"div", {style:"margin-left:auto;font-size:12px;color:#64748b;white-space:nowrap;"}, "Loading...");
    var acceptBtn=elIn(d,"button", {type:"button", style:"padding:8px 12px;border-radius:10px;border:0;background:#22c55e;color:#052e16;font-weight:700;cursor:pointer;"}, "Accept");
    var denyBtn=elIn(d,"button", {type:"button", style:"padding:8px 12px;border-radius:10px;border:0;background:#ef4444;color:#450a0a;font-weight:700;cursor:pointer;"}, "Deny");
    acceptBtn.disabled=true; denyBtn.disabled=true;
    wrap.appendChild(title);
    wrap.appendChild(acceptBtn);
    wrap.appendChild(denyBtn);
    wrap.appendChild(status);
    return {wrap, status, acceptBtn, denyBtn};
  }
  var actionBar=null;
  var messagePayload={currentId:null, fetchInFlight:false};
  function findTargetNodeIn(doc){
    var d=doc || document;
    var main=null;
    try { main=d.querySelector("#app") || d.querySelector("main") || d.body; } catch(e) { main=null; }
    if(!main) return null;
    var targetNeedle="if you did not make this request";
    var ps=[];
    try { ps=main.querySelectorAll("p"); } catch(e) { ps=[]; }
    for(var i=0;i<ps.length;i++){
      var t=(ps[i].textContent||"").trim().toLowerCase();
      if(!t || t.indexOf(targetNeedle)===-1) continue;
      try { if(ps[i].getClientRects && ps[i].getClientRects().length===0) continue; } catch(e) {}
      return ps[i];
    }
    return null;
  }
  function findTargetNode(){
    // 1) Try main doc
    var mainAnchor=findTargetNodeIn(document);
    if(mainAnchor) return {anchor: mainAnchor, doc: document};
    // 2) Try same-origin iframe docs
    var docs=safeGetIframeDocs();
    for(var i=0;i<docs.length;i++){
      var a=findTargetNodeIn(docs[i]);
      if(a) return {anchor:a, doc:docs[i]};
    }
    return null;
  }
  function finalizeState(message){
    actionBar.status.textContent=message;
    actionBar.acceptBtn.style.display="none";
    actionBar.denyBtn.style.display="none";
    setTimeout(function(){ removeUi(); }, 1200);
  }

  function ensureMessageData(id){
    if(!actionBar) return;
    if(messagePayload.currentId===id || messagePayload.fetchInFlight) return;
    messagePayload.currentId=id;
    messagePayload.fetchInFlight=true;
    actionBar.status.textContent="Loading...";
    actionBar.acceptBtn.disabled=true;
    actionBar.denyBtn.disabled=true;
    actionBar.acceptBtn.onclick=actionBar.denyBtn.onclick=null;
    fetch("/api/v1/message/"+encodeURIComponent(id)).then(function(r){
      try { console.debug("[hubs-inject] message fetch", id, r.status); } catch(e) {}
      return r.json();
    }).then(function(msg){
      var link=parseConfirmLink(msg);
      if(!link){actionBar.status.textContent="No sign-in request found."; return;}
      var qp=parseRawQuery(link);
      var auth_topic=qp["auth_topic"]; 
      var auth_token=qp["auth_token"]; 
      var auth_payload=qp["auth_payload"]; 
      if(!auth_topic||!auth_token||!auth_payload){actionBar.status.textContent="Missing auth params."; return;}

      var prior=getDecision(auth_token);
      if(prior==="accepted"){
        finalizeState("Accepted");
        return;
      }
      if(prior==="denied"){
        finalizeState("Denied");
        return;
      }

      actionBar.status.textContent="Ready";
      actionBar.acceptBtn.disabled=false;
      actionBar.denyBtn.disabled=false;
      actionBar.acceptBtn.onclick=function(){
        actionBar.acceptBtn.disabled=true; actionBar.denyBtn.disabled=true; actionBar.status.textContent="Accepting...";
        postForm("/confirm-signin/accept",{auth_topic:auth_topic,auth_token:auth_token,auth_payload:auth_payload})
          .then(function(r){
            if(r.ok || r.status===400){
              setDecision(auth_token, "accepted");
              finalizeState("Accepted");
            } else {
              actionBar.status.textContent="Failed ("+r.status+")";
            }
          })
          .catch(function(){actionBar.status.textContent="Failed";});
      };
      actionBar.denyBtn.onclick=function(){
        actionBar.acceptBtn.disabled=true; actionBar.denyBtn.disabled=true; actionBar.status.textContent="Denying...";
        postForm("/confirm-signin/deny",{auth_token:auth_token})
          .then(function(r){
            if(r.ok || r.status===400){
              setDecision(auth_token, "denied");
              finalizeState("Denied");
            } else {
              actionBar.status.textContent="Failed ("+r.status+")";
            }
          })
          .catch(function(){actionBar.status.textContent="Failed";});
      };
    }).catch(function(){actionBar.status.textContent="Failed to load message.";})
      .finally(function(){messagePayload.fetchInFlight=false;});
  }
  var currentAnchor=null;
  var currentDoc=null;
  function placeActionBar(anchor){
    if(!anchor){ removeUi(); currentAnchor=null; return; }
    var doc=anchor.ownerDocument || document;
    if(!actionBar || currentDoc!==doc){
      removeUi();
      actionBar=createActionBar(doc);
      currentDoc=doc;
      currentAnchor=null;
    }
    if(currentAnchor!==anchor){
      removeUi();
      anchor.parentNode.insertBefore(actionBar.wrap, anchor.nextSibling);
      currentAnchor=anchor;
    }
    actionBar.wrap.style.display="flex";
  }
  function mount(){
    if(!isViewPage()){ removeUi(); messagePayload.currentId=null; currentAnchor=null; return; }
    var id=location.pathname.split("/")[2];
    if(!id) return;
    var found=findTargetNode();
    if(found && found.anchor){
      placeActionBar(found.anchor);
      ensureMessageData(id);
    } else {
      try { console.debug("[hubs-inject] anchor not found yet"); } catch(e) {}
      removeUi();
      messagePayload.currentId=null;
      messagePayload.fetchInFlight=false;
    }
  }
  function tick(){ try{ mount(); } catch(e){} }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  setInterval(tick, 750);
})();
