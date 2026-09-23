'use client';

// ReelVault landing page — drop this file into a Next.js (App Router) project
// as app/page.tsx (or src/app/page.tsx). Plain React, no extra dependencies.

import { useEffect } from 'react';

const css = `
  :root{
    --ink:#111111;
    --paper:#FFFFFF;
    --surface:#FFFFFF;
    --surface-hover:#F4F4F4;
    --line:#E8E8E8;
    --muted:#666666;
    --muted-2:#8E8E93;
    --lime:#C5FF00;
    --danger:#FF3B30;
    --shadow: 0 1px 2px rgba(17,17,17,.04), 0 16px 32px -16px rgba(17,17,17,.16);
  }
  /* Reuses the app's own real dark theme values (DARK_COLORS in theme.ts) —
     deep pine charcoal ground, sage accent — rather than an invented dark mode. */
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --ink:#ECF4F0;
      --paper:#0D1411;
      --surface:#15201B;
      --surface-hover:#1B2B24;
      --line:#21332A;
      --muted:#9CB3A8;
      --muted-2:#6D8277;
      --lime:#C5FF00;
      --danger:#FF6B60;
      --shadow: 0 1px 2px rgba(0,0,0,.35), 0 20px 40px -18px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="dark"]{
    --ink:#ECF4F0;
    --paper:#0D1411;
    --surface:#15201B;
    --surface-hover:#1B2B24;
    --line:#21332A;
    --muted:#9CB3A8;
    --muted-2:#6D8277;
    --lime:#C5FF00;
    --danger:#FF6B60;
    --shadow: 0 1px 2px rgba(0,0,0,.35), 0 20px 40px -18px rgba(0,0,0,.6);
  }

  *{box-sizing:border-box;}
  body{
    margin:0;
    background:var(--paper);
    color:var(--ink);
    font-family:'Elms Sans', system-ui, sans-serif;
    background-image: radial-gradient(circle, color-mix(in srgb, var(--muted-2) 55%, transparent) 1.1px, transparent 1.6px);
    background-size: 22px 22px;
  }
  h1,h2,h3,.display{
    font-family:'Elms Sans', system-ui, sans-serif;
    font-weight:900;
    letter-spacing:-0.01em;
    text-wrap:balance;
    margin:0;
  }
  .label{ font-family:'Elms Sans', system-ui, sans-serif; font-weight:700; }
  p{ margin:0; line-height:1.6; color:var(--muted); }
  a{ color:inherit; }
  img{max-width:100%;}
  section{ padding-inline: max(20px, (100% - 1180px)/2); }

  /* ---------- Nav ---------- */
  .nav{
    position:sticky; top:0; z-index:40;
    display:flex; align-items:center; justify-content:space-between;
    padding-block:14px;
    padding-inline: max(20px, (100% - 1180px)/2);
    background: color-mix(in srgb, var(--paper) 85%, transparent);
    backdrop-filter: blur(10px);
    border-bottom:1px solid var(--line);
  }
  .brand{ display:flex; align-items:center; gap:9px; font-weight:900; font-size:1.05rem; }
  .brand-mark{ width:24px; height:24px; flex:none; }
  .brand-mark svg{ display:block; }
  .nav-links{ display:flex; gap:28px; font-size:.9rem; font-weight:700; }
  .nav-links a{ text-decoration:none; opacity:.75; transition:opacity .15s; }
  .nav-links a:hover{ opacity:1; }
  .nav-right{ display:flex; align-items:center; gap:18px; }

  .btn{
    display:inline-flex; align-items:center; gap:8px; justify-content:center;
    border-radius:14px; font-weight:700; font-size:.92rem; cursor:pointer;
    text-decoration:none; border:1.5px solid transparent; white-space:nowrap;
    font-family:'Elms Sans', system-ui, sans-serif;
  }
  .btn-primary{ background:var(--ink); color:var(--paper); padding:12px 20px; box-shadow:var(--shadow); }
  .btn-primary:hover{ filter:brightness(1.15); }
  .btn-ghost{ background:transparent; color:var(--ink); border-color:var(--line); padding:10.5px 18px; }
  .btn-ghost:hover{ background:var(--surface-hover); }
  .btn-sm{ padding:9px 15px; font-size:.82rem; border-radius:12px; }

  /* ---------- Hero ---------- */
  .hero{
    display:grid; grid-template-columns: 1.05fr 1fr; gap:56px; align-items:center;
    padding-block: 64px 40px;
  }
  .eyebrow{
    display:inline-flex; align-items:center; gap:8px;
    font-size:.72rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
    color:var(--ink); background:var(--surface-hover);
    border:1px solid var(--line);
    padding:6px 12px; border-radius:999px; margin-bottom:18px;
  }
  .eyebrow .dot{ width:6px; height:6px; border-radius:50%; background:var(--lime); border:1px solid color-mix(in srgb, var(--ink) 30%, transparent); }
  .hero h1{ font-size:clamp(2.3rem, 4.4vw, 3.6rem); line-height:1.05; }
  .hero p.lead{ font-size:1.08rem; max-width:46ch; margin-top:18px; }
  .hero-ctas{ display:flex; gap:12px; margin-top:28px; flex-wrap:wrap; }
  .platforms{ display:flex; align-items:center; gap:14px; margin-top:32px; flex-wrap:wrap; }
  .platform-chip{
    display:inline-flex; align-items:center; gap:7px;
    font-size:.78rem; font-weight:700; color:var(--muted);
    background:var(--surface); border:1px solid var(--line);
    padding:6px 11px; border-radius:999px;
  }
  .platform-chip .sw{ width:7px; height:7px; border-radius:2px; }

  /* ---------- Phone mockups ---------- */
  .hero-visual{ position:relative; height:520px; }
  .phone{
    position:absolute; width:238px; border-radius:34px;
    background:var(--ink); padding:9px;
    box-shadow: 0 30px 60px -20px rgba(17,17,17,.35), 0 4px 10px rgba(17,17,17,.1);
  }
  .phone-screen{
    background:var(--surface); border-radius:26px; overflow:hidden;
    height:498px; display:flex; flex-direction:column; position:relative;
  }
  .phone.back{ top:6px; left:0; transform:rotate(-7deg); z-index:1; }
  .phone.front{ top:52px; left:196px; transform:rotate(5deg); z-index:2; }
  .notch{
    position:absolute; top:9px; left:50%; transform:translateX(-50%);
    width:70px; height:16px; background:var(--ink); border-radius:0 0 12px 12px; z-index:5;
  }

  .ph-header{ display:flex; align-items:center; justify-content:space-between; padding:22px 14px 8px; }
  .ph-burger{ display:flex; flex-direction:column; gap:3px; }
  .ph-burger span{ width:13px; height:1.6px; background:var(--ink); border-radius:2px; }
  .ph-brand{ display:flex; align-items:center; gap:5px; font-weight:900; font-size:.74rem; }
  .ph-brand svg{ width:13px; height:13px; }
  .ph-avatar{ width:20px; height:20px; border-radius:50%; background:var(--surface-hover); border:1px solid var(--line); font-size:.5rem; font-weight:700; display:flex; align-items:center; justify-content:center; }

  .ph-greet{ padding:6px 14px 0; }
  .ph-greet .hi{ font-size:.6rem; color:var(--muted); font-weight:700; }
  .ph-greet .heading{ font-family:'Elms Sans'; font-weight:900; font-size:1.05rem; margin-top:2px; }

  .ph-search{
    margin:10px 14px 0; background:var(--surface-hover); border:1px solid var(--line);
    border-radius:12px; padding:8px 10px; display:flex; align-items:center; gap:6px;
    font-size:.62rem; color:var(--muted); font-weight:500;
  }
  .ph-search svg{ width:11px; height:11px; opacity:.55; flex:none; }

  .ph-pills{ display:flex; gap:6px; padding:10px 14px 0; overflow:hidden; }
  .ph-pill{
    font-size:.56rem; font-weight:700; padding:5px 9px; border-radius:999px;
    background:var(--surface-hover); color:var(--muted); white-space:nowrap; flex:none;
  }
  .ph-pill.active{ background:var(--ink); color:var(--paper); }

  .ph-card{
    margin:12px 14px 0; background:var(--surface-hover); border:1px solid var(--line);
    border-radius:14px; padding:12px; position:relative; flex:1;
  }
  .ph-ribbon{
    position:absolute; top:0; right:14px; width:11px; height:16px; background:#B0B0B5;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
  }
  .ph-card-tag{ font-size:.52rem; font-weight:700; color:var(--muted-2); letter-spacing:.06em; text-transform:uppercase; }
  .ph-card-title{ font-family:'Elms Sans'; font-weight:900; font-size:.82rem; margin-top:6px; line-height:1.25; }
  .ph-card-meta{ font-size:.56rem; color:var(--muted-2); margin-top:5px; }

  .dets-topbar{ display:flex; align-items:center; justify-content:space-between; padding:12px 12px 10px; border-bottom:1px solid var(--line); }
  .mac-dots{ display:flex; gap:4px; }
  .mac-dots span{ width:7px; height:7px; border-radius:50%; }
  .dets-platform{ display:flex; align-items:center; gap:5px; }
  .dets-platform .p-pill{ background:var(--ink); color:var(--paper); font-size:.52rem; font-weight:700; padding:2px 7px; border-radius:999px; }
  .dets-platform .handle{ font-size:.54rem; color:var(--muted-2); }

  .dets-title{ font-family:'Elms Sans'; font-weight:900; font-size:.86rem; padding:10px 12px 0; line-height:1.25; }

  .dets-tabs{ display:flex; gap:4px; padding:10px 12px 0; }
  .dets-tab{ font-size:.54rem; font-weight:700; padding:5px 8px; border-radius:8px; color:var(--muted-2); }
  .dets-tab.active{ background:var(--ink); color:var(--paper); }

  .dets-list{ padding:10px 12px; display:flex; flex-direction:column; gap:7px; flex:1; }
  .dets-item{ display:flex; align-items:flex-start; gap:6px; font-size:.6rem; }
  .dets-check{
    width:13px; height:13px; border-radius:4px; flex:none; margin-top:1px;
    display:flex; align-items:center; justify-content:center;
    border:1.4px solid #B0B0B5;
  }
  .dets-item.done .dets-check{ background:var(--ink); border-color:var(--ink); }
  .dets-item.done .dets-check svg{ width:7px; height:7px; }
  .dets-item.done span{ color:var(--ink); text-decoration:line-through; text-decoration-color:var(--muted-2); }
  .dets-item:not(.done) span{ color:var(--muted); }

  .dets-foot{ display:flex; gap:6px; padding:10px 12px 14px; margin-top:auto; }
  .dets-foot .w{ flex:1; background:var(--ink); color:var(--paper); text-align:center; font-size:.58rem; font-weight:700; padding:8px; border-radius:9px; }
  .dets-foot .d{ flex:1; border:1px solid var(--danger); color:var(--danger); text-align:center; font-size:.58rem; font-weight:700; padding:8px; border-radius:9px; }

  .float-tag{
    position:absolute; background:var(--surface); border:1px solid var(--line);
    box-shadow:var(--shadow); border-radius:12px; padding:9px 12px; font-size:.68rem;
    font-weight:700; display:flex; align-items:center; gap:7px; z-index:3;
  }
  .float-tag svg{ width:14px; height:14px; flex:none; color:var(--ink); }
  .float-tag.t1{ top:10px; left:-6px; }
  .float-tag.t2{ bottom:26px; right:-14px; }

  /* ---------- Problem section ---------- */
  .problem{ padding-block:76px; }
  .section-head{ max-width:640px; margin-inline:auto; text-align:center; }
  .section-head .eyebrow{ margin-inline:auto; }
  .section-head h2{ font-size:clamp(1.7rem, 3.4vw, 2.5rem); margin-top:14px; }
  .section-head p{ font-size:1.02rem; margin-top:14px; }

  .save-row{ display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:40px; }
  .save-chip{
    background:var(--surface); border:1px solid var(--line); border-radius:14px;
    padding:12px 16px; font-size:.86rem; font-weight:500; box-shadow:var(--shadow);
    display:flex; align-items:center; gap:8px;
  }
  .save-chip .tag{ font-weight:700; font-size:.68rem; color:var(--muted-2); }
  .save-chip.ghost{ background:transparent; border-style:dashed; color:var(--muted); box-shadow:none; }

  /* ---------- How it works ---------- */
  .how{ background:var(--ink); color:var(--paper); padding-block:80px; margin-block:8px; }
  .how .section-head p{ color:color-mix(in srgb, var(--paper) 62%, transparent); }
  .how .eyebrow{ background:color-mix(in srgb, var(--paper) 10%, transparent); border-color:color-mix(in srgb, var(--paper) 20%, transparent); color:var(--paper); }
  .steps{ display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:52px; }
  .step{ padding-inline:18px; position:relative; }
  .step:not(:first-child){ border-left:1px solid color-mix(in srgb, var(--paper) 16%, transparent); }
  .step-num{ font-weight:900; font-size:.9rem; color:var(--lime); }
  .step-icon{ width:34px; height:34px; margin-top:16px; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--paper) 9%, transparent); border-radius:10px; }
  .step-icon svg{ width:17px; height:17px; }
  .step h3{ font-family:'Elms Sans'; font-weight:900; font-size:1.02rem; margin-top:16px; color:var(--paper); }
  .step p{ font-size:.86rem; margin-top:8px; color:color-mix(in srgb, var(--paper) 58%, transparent); }

  /* ---------- Features ---------- */
  .features{ padding-block:80px; }
  .feat-layout{ display:grid; grid-template-columns: 0.85fr 1.15fr; gap:56px; align-items:start; margin-top:44px; }
  .feat-intro h2{ font-size:clamp(1.7rem,3.2vw,2.3rem); }
  .feat-intro p{ margin-top:14px; font-size:1rem; max-width:38ch; }
  .feat-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .feat-card{
    background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:20px;
    display:flex; flex-direction:column; gap:10px;
  }
  .feat-icon{ width:32px; height:32px; border-radius:9px; background:var(--surface-hover); display:flex; align-items:center; justify-content:center; }
  .feat-icon svg{ width:16px; height:16px; color:var(--ink); }
  .feat-card h3{ font-family:'Elms Sans'; font-weight:900; font-size:.98rem; }
  .feat-card p{ font-size:.84rem; }
  .feat-card.wide{ grid-column: span 2; }
  .feat-card.trust{ border-color:color-mix(in srgb, var(--danger) 40%, var(--line)); background:color-mix(in srgb, var(--danger) 5%, var(--surface)); }
  .feat-card.trust .feat-icon{ background:color-mix(in srgb, var(--danger) 14%, var(--surface)); }
  .feat-card.trust .feat-icon svg{ color:var(--danger); }

  /* ---------- CTA band ---------- */
  .cta-band{ padding-block:70px; }
  .cta-inner{
    background:var(--ink); border-radius:28px; padding:56px 40px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:16px;
    background-image: radial-gradient(circle, color-mix(in srgb, var(--paper) 10%, transparent) 1px, transparent 1.4px);
    background-size:20px 20px;
  }
  .cta-inner h2{ color:var(--paper); font-size:clamp(1.7rem,3.4vw,2.5rem); max-width:22ch; }
  .cta-inner p{ color:color-mix(in srgb, var(--paper) 60%, transparent); font-size:1rem; }
  .cta-inner .hero-ctas{ margin-top:8px; }
  .cta-inner .btn-primary{ background:var(--lime); color:#111111; }
  .cta-inner .btn-ghost{ color:var(--paper); border-color:color-mix(in srgb, var(--paper) 24%, transparent); }
  .cta-inner .btn-ghost:hover{ background:color-mix(in srgb, var(--paper) 8%, transparent); }

  /* ---------- Footer ---------- */
  footer{ padding-block:36px 46px; padding-inline: max(20px, (100% - 1180px)/2); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; border-top:1px solid var(--line); }
  footer .brand{ font-size:.92rem; }
  footer .fine{ font-size:.76rem; color:var(--muted-2); }
  .foot-links{ display:flex; gap:20px; font-size:.82rem; font-weight:700; }
  .foot-links a{ text-decoration:none; color:var(--muted); }
  .foot-links a:hover{ color:var(--ink); }

  [data-reveal]{ opacity:0; transform:translateY(14px); transition:opacity .6s ease, transform .6s ease; }
  [data-reveal].in{ opacity:1; transform:none; }
  @media (prefers-reduced-motion: reduce){
    [data-reveal]{ opacity:1; transform:none; transition:none; }
  }

  @media (max-width: 920px){
    .hero{ grid-template-columns:1fr; padding-block:44px 20px; }
    .hero-visual{ height:420px; margin-inline:auto; max-width:420px; width:100%; }
    .phone{ width:200px; }
    .phone-screen{ height:418px; }
    .phone.front{ left:140px; top:60px; }
    .steps{ grid-template-columns:1fr 1fr; row-gap:36px; }
    .step:nth-child(odd){ border-left:none; }
    .feat-layout{ grid-template-columns:1fr; }
    .feat-grid{ grid-template-columns:1fr 1fr; }
    .nav-links{ display:none; }
  }
  @media (max-width: 560px){
    .hero-visual{ height:360px; }
    .phone{ width:168px; }
    .phone-screen{ height:352px; }
    .phone.front{ left:118px; top:56px; }
    .float-tag{ display:none; }
    .steps{ grid-template-columns:1fr; }
    .step{ border-left:none !important; padding-inline:0; }
    .feat-grid{ grid-template-columns:1fr; }
    .feat-card.wide{ grid-column:span 1; }
    section{ padding-inline:18px; }
    .cta-inner{ padding:40px 22px; }
    footer{ flex-direction:column; align-items:flex-start; }
  }
`;

export default function Page() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              observer.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      io = observer;
      els.forEach((el) => observer.observe(el));
    } else {
      els.forEach((el) => el.classList.add('in'));
    }

    const visual = document.querySelector<HTMLElement>('.hero-visual');
    const back = document.querySelector<HTMLElement>('.phone.back');
    const front = document.querySelector<HTMLElement>('.phone.front');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover:hover)').matches;

    let cleanupParallax = () => {};
    if (visual && back && front && !reduced && canHover) {
      const onMove = (e: MouseEvent) => {
        const r = visual.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        back.style.transform = `rotate(-7deg) translate(${x * -6}px, ${y * -4}px)`;
        front.style.transform = `rotate(5deg) translate(${x * 10}px, ${y * 6}px)`;
      };
      const onLeave = () => {
        back.style.transform = 'rotate(-7deg)';
        front.style.transform = 'rotate(5deg)';
      };
      visual.addEventListener('mousemove', onMove);
      visual.addEventListener('mouseleave', onLeave);
      cleanupParallax = () => {
        visual.removeEventListener('mousemove', onMove);
        visual.removeEventListener('mouseleave', onLeave);
      };
    }

    return () => {
      io?.disconnect();
      cleanupParallax();
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Elms+Sans:wght@400;700;900&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <nav className="nav">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="m12 2 10 9-10 9-10-9Z" fill="#C5FF00" />
              <circle cx="12" cy="11" r="3" fill="#111111" />
            </svg>
          </span>
          ReelVault
        </div>
        <div className="nav-links">
          <a href="#problem">Problem</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
        </div>
        <div className="nav-right">
          <a className="btn btn-primary btn-sm" href="#cta">Get ReelVault</a>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow"><span className="dot"></span>AI-powered reel vault</span>
          <h1>Your saved reels,<br />finally useful.</h1>
          <p className="lead">
            Share a reel from Instagram, YouTube, or TikTok straight into ReelVault. AI watches it,
            transcribes it, and pulls out the actual useful part — so it’s there when you go looking,
            not lost in a bookmarks folder.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#cta">Get ReelVault</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
          <div className="platforms">
            <span className="platform-chip"><span className="sw" style={{ background: '#E1306C' }}></span>Instagram</span>
            <span className="platform-chip"><span className="sw" style={{ background: '#FF0000' }}></span>YouTube</span>
            <span className="platform-chip"><span className="sw" style={{ background: 'var(--ink)' }}></span>TikTok</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="phone back">
            <div className="notch"></div>
            <div className="phone-screen">
              <div className="ph-header">
                <div className="ph-burger"><span></span><span></span><span></span></div>
                <div className="ph-brand">
                  <svg viewBox="0 0 24 24">
                    <path d="m12 2 10 9-10 9-10-9Z" fill="#C5FF00" />
                    <circle cx="12" cy="11" r="3" fill="#111111" />
                  </svg>
                  ReelVault
                </div>
                <div className="ph-avatar">PK</div>
              </div>
              <div className="ph-greet">
                <div className="hi">Hey Pranav,</div>
                <div className="heading">Explore reels</div>
              </div>
              <div className="ph-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search for...
              </div>
              <div className="ph-pills">
                <span className="ph-pill active">All</span>
                <span className="ph-pill">Tech</span>
                <span className="ph-pill">Food</span>
                <span className="ph-pill">Fitness</span>
                <span className="ph-pill">Finance</span>
              </div>
              <div className="ph-card">
                <div className="ph-ribbon"></div>
                <div className="ph-card-tag">Food</div>
                <div className="ph-card-title">5-Minute Creamy Pasta</div>
                <div className="ph-card-meta">@fit_eats · saved just now</div>
              </div>
            </div>
          </div>

          <div className="phone front">
            <div className="notch"></div>
            <div className="phone-screen">
              <div className="dets-topbar">
                <div className="mac-dots">
                  <span style={{ background: '#FF5F56' }}></span>
                  <span style={{ background: '#FFBD2E' }}></span>
                  <span style={{ background: '#27C93F' }}></span>
                </div>
                <div className="dets-platform">
                  <span className="p-pill">Instagram</span>
                  <span className="handle">@fit_eats</span>
                </div>
              </div>
              <div className="dets-title">5-Minute Creamy Pasta</div>
              <div className="dets-tabs">
                <span className="dets-tab">Summary</span>
                <span className="dets-tab active">Action Steps</span>
                <span className="dets-tab">Transcript</span>
              </div>
              <div className="dets-list">
                <div className="dets-item done">
                  <span className="dets-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Boil pasta, 8–10 min</span>
                </div>
                <div className="dets-item done">
                  <span className="dets-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Sauté garlic in butter</span>
                </div>
                <div className="dets-item"><span className="dets-check"></span><span>Add cream &amp; parmesan</span></div>
                <div className="dets-item"><span className="dets-check"></span><span>Toss pasta through sauce</span></div>
                <div className="dets-item"><span className="dets-check"></span><span>Garnish, serve immediately</span></div>
              </div>
              <div className="dets-foot">
                <span className="w">Watch Original</span>
                <span className="d">Delete</span>
              </div>
            </div>
          </div>

          <div className="float-tag t1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Full transcript, timestamped
          </div>
          <div className="float-tag t2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search by meaning
          </div>
        </div>
      </section>

      <section className="problem" id="problem">
        <div className="section-head" data-reveal>
          <span className="eyebrow"><span className="dot"></span>The problem</span>
          <h2>We all save reels.<br />We never find them again.</h2>
          <p>
            Recipes, coding tips, workout routines, life advice — they pile up in a platform’s
            bookmarks tab, disconnected from each other, unsearchable, and impossible to find six
            weeks later.
          </p>
        </div>
        <div className="save-row" data-reveal>
          <span className="save-chip"><span className="tag">RECIPE</span>“I’ll try this later...”</span>
          <span className="save-chip"><span className="tag">CODE</span>“This tip looks useful...”</span>
          <span className="save-chip"><span className="tag">FITNESS</span>“Great routine, save it”</span>
          <span className="save-chip"><span className="tag">MONEY</span>“Good habit, remember this”</span>
          <span className="save-chip ghost">...and then they’re gone.</span>
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-head" data-reveal>
          <span className="eyebrow"><span className="dot"></span>How ReelVault works</span>
          <h2>From scroll-and-save to save-and-use.</h2>
          <p>One share, four automatic steps — no manual note-taking, no rewatching.</p>
        </div>
        <div className="steps" data-reveal>
          <div className="step">
            <div className="step-num">01</div>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <h3>Share any reel</h3>
            <p>Tap Share on Instagram, YouTube, or TikTok and pick ReelVault. No copy-pasting links.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.5H7a2 2 0 0 1-2-2v-.5A2.5 2.5 0 0 1 2.5 15v-1a2.5 2.5 0 0 1 0-5H3A2.5 2.5 0 0 1 5.5 6.5v-1A2.5 2.5 0 0 1 7 2.5" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.5H17a2 2 0 0 0 2-2v-.5a2.5 2.5 0 0 0 2.5-2.5v-1a2.5 2.5 0 0 0 0-5H21A2.5 2.5 0 0 0 18.5 6.5v-1A2.5 2.5 0 0 0 17 2.5" />
              </svg>
            </div>
            <h3>AI watches &amp; listens</h3>
            <p>Gemini’s vision and audio models process the video frame by frame and transcribe it in full.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3>Get a structured breakdown</h3>
            <p>Summary, key ideas, an action checklist, and full timestamped transcript, extracted automatically.</p>
          </div>
          <div className="step">
            <div className="step-num">04</div>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3>Search &amp; explore</h3>
            <p>Find anything by meaning, filter by category, or browse your saves as a visual mind map.</p>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="feat-layout">
          <div className="feat-intro" data-reveal>
            <span className="eyebrow"><span className="dot"></span>Powerful features</span>
            <h2>More than bookmarks.<br />A personal knowledge base.</h2>
            <p>Every reel you save becomes structured, searchable knowledge — not another link you’ll never open again.</p>
          </div>
          <div className="feat-grid" data-reveal>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>AI Summaries</h3>
              <p>The key takeaway of every reel, in a sentence or two — no rewatching required.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3>Action Steps</h3>
              <p>A real checklist you can act on — ingredients, code, or a workout, not just a caption.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
              </div>
              <h3>Full Transcript</h3>
              <p>Every word, timestamped and searchable, straight from the audio.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3>Semantic Search</h3>
              <p>Find reels by meaning, not exact words — “saving money on groceries” finds it either way.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                  <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
                </svg>
              </div>
              <h3>Mind Map View</h3>
              <p>Browse your whole vault as a connected map, grouped by topic instead of a flat list.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2.5 12.5V2.5h10l8.09 8.09a2 2 0 0 1 0 2.82Z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <h3>Auto Categorization</h3>
              <p>Every save is classified — Tech, Food, Fitness, Finance, Productivity — automatically.</p>
            </div>
            <div className="feat-card wide trust">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7z" />
                  <path d="M12 8v5" />
                  <circle cx="12" cy="16.3" r=".4" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <h3>Always know what’s real</h3>
              <p>If the AI pipeline is ever unreachable, ReelVault says so with a visible badge on that reel instead of quietly showing you a lower-quality guess.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band" id="cta">
        <div className="cta-inner" data-reveal>
          <span className="eyebrow"><span className="dot"></span>Start your vault</span>
          <h2>Stop losing good ideas in your bookmarks.</h2>
          <p>Share your first reel and see the breakdown in under a minute.</p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#">Get ReelVault</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
        </div>
      </section>

      <footer>
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="m12 2 10 9-10 9-10-9Z" fill="#C5FF00" />
              <circle cx="12" cy="11" r="3" fill="#111111" />
            </svg>
          </span>
          ReelVault
        </div>
        <div className="foot-links">
          <a href="#problem">Problem</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
        </div>
        <div className="fine">Not affiliated with Instagram, YouTube, or TikTok.</div>
      </footer>
    </>
  );
}
