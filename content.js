(() => {
  'use strict';

  // Bearer público del cliente web de X. Rara vez cambia.
  const BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const SVGNS = "http://www.w3.org/2000/svg";
  const ARM_MS = 3000; // ventana para el segundo clic
  const LOG = "[X Quick Block]";

  // ---------- estilos ----------
  const style = document.createElement("style");
  style.textContent = `
    .xqb-wrap { display:flex; align-items:center; justify-content:center; }
    .xqb-btn {
      display:inline-flex; align-items:center; justify-content:center;
      background:none; border:none; cursor:pointer; padding:0;
      color: rgb(113,118,123);
      -webkit-tap-highlight-color: transparent;
    }
    .xqb-icon {
      display:flex; align-items:center; justify-content:center;
      width:34.75px; height:34.75px; border-radius:9999px;
      transition: background-color .15s ease, color .15s ease, transform .12s ease;
    }
    .xqb-btn:hover .xqb-icon { background-color: rgba(244,33,46,0.10); color: rgb(244,33,46); }
    .xqb-btn.armed .xqb-icon {
      color: rgb(244,33,46); background-color: rgba(244,33,46,0.15);
      animation: xqb-pulse 0.9s ease-in-out infinite;
    }
    .xqb-btn.busy .xqb-icon { color: rgb(244,33,46); opacity:.6; }
    .xqb-btn.done { cursor:default; }
    .xqb-btn.done .xqb-icon { color: rgb(120,120,120); background:none; }
    .xqb-btn.error .xqb-icon { color: rgb(255,180,0); }
    @keyframes xqb-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.18);} }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ---------- utilidades ----------
  function getCsrf() {
    const m = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function apiBlock(screenName) {
    const csrf = getCsrf();
    if (!csrf) throw new Error("no hay cookie ct0 (¿sesión iniciada?)");
    const res = await fetch("https://x.com/i/api/1.1/blocks/create.json", {
      method: "POST",
      credentials: "include",
      headers: {
        authorization: BEARER,
        "x-csrf-token": csrf,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ screen_name: screenName }).toString()
    });
    if (!res.ok) throw new Error("API " + res.status + ": " + (await res.text()).slice(0, 160));
    return res.json();
  }

  // Fallback: simular clics en el menú si la API cambia/falla.
  async function domBlock(article) {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const caret = article.querySelector('[data-testid="caret"]');
    if (!caret) throw new Error("no encuentro el menú (...)");
    caret.click();
    let clicked = false;
    for (let i = 0; i < 25 && !clicked; i++) {
      await wait(40);
      const item = document.querySelector('[data-testid="block"]');
      if (item) { item.click(); clicked = true; }
    }
    if (!clicked) throw new Error("no encuentro 'Bloquear' en el menú");
    for (let i = 0; i < 25; i++) {
      await wait(40);
      const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) { confirm.click(); return; }
    }
    // si no hubo diálogo, asumimos que ya bloqueó
  }

  function getHandle(article) {
    const un = article.querySelector('[data-testid="User-Name"]');
    if (!un) return null;
    for (const a of un.querySelectorAll('a[href]')) {
      const href = a.getAttribute("href");
      if (href && /^\/[A-Za-z0-9_]{1,15}$/.test(href)) return href.slice(1);
    }
    const at = [...un.querySelectorAll("span")].find(s => s.textContent.trim().startsWith("@"));
    return at ? at.textContent.trim().slice(1) : null;
  }

  function getActionGroup(article) {
    for (const g of article.querySelectorAll('[role="group"]')) {
      if (g.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"]')) return g;
    }
    return null;
  }

  function makeIcon() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18.75");
    svg.setAttribute("height", "18.75");
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", "12"); c.setAttribute("cy", "12"); c.setAttribute("r", "9");
    c.setAttribute("fill", "none"); c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-width", "2");
    const l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", "5.65"); l.setAttribute("y1", "5.65");
    l.setAttribute("x2", "18.35"); l.setAttribute("y2", "18.35");
    l.setAttribute("stroke", "currentColor"); l.setAttribute("stroke-width", "2");
    svg.appendChild(c); svg.appendChild(l);
    return svg;
  }

  function buildButton(article, handle) {
    const wrap = document.createElement("div");
    wrap.className = "xqb-wrap";

    const btn = document.createElement("button");
    btn.className = "xqb-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Bloquear a @" + handle);
    btn.title = "Bloquear a @" + handle + " (clic, y clic de nuevo para confirmar)";
    const iconBox = document.createElement("div");
    iconBox.className = "xqb-icon";
    iconBox.appendChild(makeIcon());
    btn.appendChild(iconBox);
    wrap.appendChild(btn);

    let armTimer = null;
    const disarm = () => {
      btn.classList.remove("armed");
      btn.dataset.state = "";
      btn.title = "Bloquear a @" + handle + " (clic, y clic de nuevo para confirmar)";
    };

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.classList.contains("done") || btn.classList.contains("busy")) return;

      if (btn.dataset.state !== "armed") {
        btn.dataset.state = "armed";
        btn.classList.add("armed");
        btn.classList.remove("error");
        btn.title = "¿Bloquear a @" + handle + "? Clic otra vez para confirmar";
        clearTimeout(armTimer);
        armTimer = setTimeout(disarm, ARM_MS);
        return;
      }

      clearTimeout(armTimer);
      btn.classList.remove("armed");
      btn.classList.add("busy");
      try {
        try {
          await apiBlock(handle);
        } catch (err) {
          console.warn(LOG, "API falló, uso fallback DOM:", err.message);
          await domBlock(article);
        }
        btn.classList.remove("busy");
        btn.classList.add("done");
        btn.title = "Bloqueado @" + handle;
        article.style.transition = "opacity .2s";
        article.style.opacity = "0.4";
        console.log(LOG, "bloqueado @" + handle);
      } catch (err2) {
        console.error(LOG, "no se pudo bloquear @" + handle + ":", err2);
        btn.classList.remove("busy");
        btn.classList.add("error");
        btn.dataset.state = "";
        btn.title = "Error al bloquear (revisa la consola)";
      }
    }, true);

    return wrap;
  }

  function processArticle(article) {
    if (article.dataset.xqbDone === "1") return;
    const group = getActionGroup(article);
    if (!group) return;                 // barra aún no renderizada, se reintenta
    const handle = getHandle(article);
    if (!handle) return;
    article.dataset.xqbDone = "1";

    const wrap = buildButton(article, handle);

    // Insertar justo antes del icono de guardar (bookmark), como en tu mockup.
    const bookmark = group.querySelector('[data-testid="bookmark"]');
    let ref = null;
    if (bookmark) {
      let n = bookmark;
      while (n.parentElement && n.parentElement !== group) n = n.parentElement;
      ref = (n.parentElement === group) ? n : null;
    }
    if (ref) group.insertBefore(wrap, ref);
    else group.appendChild(wrap);
  }

  // ---------- escaneo continuo (X es una SPA) ----------
  let queued = false;
  function scan() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.querySelectorAll('article[data-testid="tweet"]').forEach(processArticle);
    });
  }

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
  console.log(LOG, "activo");
})();
