/* ==================================================================
   IA-NAMI · DE UN VISTAZO — vista para tablet, celular y pantallas táctiles
   Los 10 indicadores principales sobre un mapa: titular que rota, periodo (Sheinbaum, Trump, año, mes, semana),
   hoja de cada indicador, búsqueda de país o estado con su ficha, e informe migratorio de la última semana.
   Se dibuja en su propio espacio (Shadow DOM) para que sus estilos no choquen con los del tablero.
   Datos: se calculan aquí con el motor de Pregunta a INAMI (window.IANAMI_MOTOR), por periodo y solo cuando se piden.
   Se abre desde el botón «Vista tablet» de la barra superior (js/app.js) o con ?vista=tablet.
   ================================================================== */
(function(){
'use strict';
const CSS = `
:host{--bg:#16231F;--ink:#FFFFFF;--k2:#CFE2DA;--k3:#A9C4BA;--ln:rgba(255,255,255,.14);--ease:cubic-bezier(.22,.8,.24,1)}
*{box-sizing:border-box;margin:0;padding:0}
*,*::before,*::after{box-sizing:border-box}
:host{all:initial;display:block;position:fixed;inset:0;z-index:110;overflow:hidden;line-height:normal;background:#16231F;color:#fff;font-family:Barlow,system-ui,sans-serif;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;user-select:none}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}
.num{font-family:'Barlow Condensed',sans-serif;font-feature-settings:"tnum"}
.home{position:fixed;inset:0;background:radial-gradient(120% 90% at 70% 30%,#24443B 0%,#16231F 60%,#101815 100%)}
#map{position:absolute;inset:0}
.shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(16,24,21,.7) 0%,rgba(16,24,21,0) 24%,rgba(16,24,21,0) 46%,rgba(16,24,21,.88) 76%,#101815 100%)}
.top{position:absolute;left:0;right:0;top:0;padding:max(14px,env(safe-area-inset-top)) 16px 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px;z-index:6;pointer-events:none}.top>*{pointer-events:auto}
.top .br{margin-right:auto;flex:1;min-width:0}.top .br .corte{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.top .br b{display:block;font:600 15px 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#CFE2DA}
.corte{display:inline-flex;align-items:center;gap:6px;margin-top:3px;font-size:12px;color:#fff;background:rgba(95,183,155,.2);border:1px solid rgba(95,183,155,.35);padding:2px 8px;border-radius:99px}.corte i{width:6px;height:6px;border-radius:50%;background:#5FB79B}
.glass{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.ib{display:flex;align-items:center;gap:7px;height:40px;padding:0 12px;border-radius:99px;font-size:13.5px;font-weight:600}.ib svg{flex:none}.ib span{white-space:nowrap}
.per{order:3;width:100%;display:flex;padding:3px;border-radius:13px;overflow-x:auto;scrollbar-width:none}.per::-webkit-scrollbar{display:none}
.per button{flex:1 0 auto;text-align:center;font-size:13px;padding:7px 10px;border-radius:10px;color:#CFE2DA;white-space:nowrap;transition:all .3s var(--ease)}
.per button.on{background:#fff;color:#1F3B33;font-weight:600}
.al{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;padding:7px 12px 7px 9px;border-radius:12px;background:rgba(242,184,178,.16);border:1px solid rgba(242,184,178,.38);font-size:13.5px;color:#fff;cursor:pointer;animation:alin .6s var(--ease)}
.al b{font-weight:600}.al i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#E58A82;color:#16231F;font:700 13px Barlow,sans-serif;font-style:normal;flex:none}
.al.ok{background:rgba(95,183,155,.14);border-color:rgba(95,183,155,.3);color:#CFE2DA}.al.ok i{background:#5FB79B}
@keyframes alin{from{opacity:0;transform:translateY(-6px)}}
.hl{position:absolute;left:0;right:0;bottom:calc(168px + env(safe-area-inset-bottom));padding:0 22px;transition:opacity .45s,transform .55s var(--ease);touch-action:pan-y;z-index:4}
.app.sel .hl{opacity:0;transform:translateY(-20px);pointer-events:none}
.hl .ey{display:flex;align-items:center;gap:8px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:#BFD8CF;font-weight:600}
.hl .ey i{width:8px;height:8px;border-radius:50%;background:var(--c);animation:lat 2s infinite}
@keyframes lat{50%{box-shadow:0 0 0 7px rgba(255,255,255,.06)}}
.hl h1{font:600 36px/1.05 'Barlow Condensed',sans-serif;margin-top:10px;max-width:760px;cursor:pointer}
.hl h1 em{font-style:normal;background:linear-gradient(transparent 62%,var(--cs) 62%);padding:0 2px}
.hl p{font-size:15px;color:#CFE2DA;margin-top:10px;display:none}
.hl .tx{transition:opacity .3s,transform .4s var(--ease)}.hl .tx.outL{opacity:0;transform:translateX(-30px)}.hl .tx.outR{opacity:0;transform:translateX(30px)}
.nav{display:flex;align-items:center;gap:12px;margin-top:16px}
.hd{display:flex;gap:2px}.hd button{width:22px;height:24px;display:grid;place-items:center}.hd button i{display:block;width:18px;height:3px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden;position:relative}
.hd button.on i::after{content:"";position:absolute;inset:0;background:#fff;transform-origin:left;animation:pr 8s linear forwards}.hd button.ya i{background:rgba(255,255,255,.7)}.hd.man button.on i::after{animation:none}
@keyframes pr{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.nav .ver{white-space:nowrap;margin-left:auto;font-size:13.5px;font-weight:600;padding:10px 16px;border-radius:99px;background:#fff;color:#1F3B33}
.row{position:absolute;left:0;right:0;bottom:0;padding:0 16px calc(18px + env(safe-area-inset-bottom));display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;transition:transform .5s var(--ease),opacity .4s;z-index:4}
.row::-webkit-scrollbar{display:none}.app.sel .row{transform:translateY(40px);opacity:0;pointer-events:none}
.ch{flex:0 0 152px;border-radius:20px;padding:12px 14px 11px;display:flex;flex-direction:column;gap:3px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .3s var(--ease),background .3s,box-shadow .35s,border-color .3s;opacity:0;translate:0 20px;animation:chIn .6s var(--ease) forwards;position:relative}
@keyframes chIn{to{opacity:1;translate:0 0}}
@keyframes up{to{opacity:1;transform:none}}
.ch:active{transform:scale(.94);background:rgba(255,255,255,.26);transition-duration:.08s}.ch.on{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.38)}
.ch .n{display:flex;align-items:center;gap:7px;font-size:14px;color:#E3EEE9}.ch .n i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.ch .v{font:600 30px/1 'Barlow Condensed',sans-serif;margin-top:4px}.ch .v small{font-size:15px;color:#CFE2DA;margin-left:2px;font-weight:500}
.ch .d{font-size:12px;color:#CFE2DA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch .bad{position:absolute;top:10px;right:10px;width:9px;height:9px;border-radius:50%;background:#E58A82;box-shadow:0 0 0 3px rgba(229,138,130,.25)}
.dch{font-weight:700;border-radius:6px;padding:1px 6px;font-size:12px}.dch.u{background:rgba(242,184,178,.2);color:#F6C6C1}.dch.dn{background:rgba(159,216,194,.18);color:#A9E2CC}.dch.eq{background:rgba(255,255,255,.12);color:#E3EEE9}
.sh{position:absolute;left:0;right:0;bottom:0;height:58%;z-index:7;border-radius:28px 28px 0 0;background:rgba(18,28,25,.88);border:1px solid rgba(255,255,255,.12);border-bottom:0;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  transform:translateY(105%);transition:transform .55s var(--ease);display:flex;flex-direction:column;box-shadow:0 -20px 60px rgba(0,0,0,.35)}
.app.sel .sh{transform:none}
.grab{width:40px;height:5px;border-radius:3px;background:rgba(255,255,255,.3);margin:8px auto 2px;flex:none}
.shh{display:flex;align-items:center;gap:8px;padding:6px 16px 0;flex:none}
.shh .ic{width:38px;height:38px;border-radius:12px;background:var(--cs);color:var(--c);display:grid;place-items:center;flex:none}.shh .ic svg{width:19px;height:19px}
.shh .t{flex:1;min-width:0}.shh .t b{display:block;font:600 24px/1 'Barlow Condensed',sans-serif}.shh .t small{display:block;font-size:12px;color:#A9C4BA;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);display:grid;place-items:center;flex:none}
.seg{display:flex;margin:12px 16px 0;padding:3px;border-radius:12px;background:rgba(255,255,255,.08);flex:none}
.seg button{flex:1;text-align:center;font-size:13px;padding:7px 4px;border-radius:9px;color:#CFE2DA;transition:all .3s var(--ease);white-space:nowrap}
.seg button.on{background:rgba(255,255,255,.92);color:#1E2B27;font-weight:600}
.vp{flex:1;min-height:0;overflow:hidden;position:relative;touch-action:pan-y}
.tr{display:flex;height:100%;transition:transform .5s var(--ease)}
.tb{flex:0 0 100%;height:100%;overflow-y:auto;padding:16px 18px 12px;display:flex;flex-direction:column}
.fr{font:500 21px/1.22 'Barlow Condensed',sans-serif;color:#EEF5F2}.fr b{color:var(--c);font-weight:600}
.big{font:600 64px/.95 'Barlow Condensed',sans-serif;letter-spacing:-.015em}
.unit{font-size:14.5px;color:#CFE2DA;margin-top:4px}
.ks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
.ks div{border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.07)}.ks span{display:block;font-size:12px;color:#A9C4BA}.ks b{display:block;font:600 24px/1 'Barlow Condensed',sans-serif;margin-top:6px}.ks em{display:block;font-style:normal;font-size:12px;color:#A9C4BA;margin-top:4px}
.gr{flex:1;min-height:150px;margin:6px -6px 0}
.ls{display:flex;flex-direction:column;gap:11px;margin-top:12px}
.it{display:grid;grid-template-columns:22px 1fr auto;align-items:center;column-gap:10px;row-gap:5px;opacity:0;transform:translateY(8px);animation:up .45s var(--ease) forwards}
.it .k{font:600 13px 'Barlow Condensed',sans-serif;color:#A9C4BA}
.it .nm{font-size:16px}.it .pc{font:600 22px/1 'Barlow Condensed',sans-serif}.it .pc small{font:400 11.5px Barlow,sans-serif;color:#A9C4BA;margin-left:4px}
.it .bb{grid-column:2 / 4;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.it .bb i{display:block;height:100%;border-radius:3px;background:var(--c);transform-origin:left;animation:gx .9s var(--ease) both}
@keyframes gx{from{transform:scaleX(0)}}
.q{flex:none;margin:0 16px calc(12px + env(safe-area-inset-bottom));display:flex;gap:8px}
.q button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 12px;border-radius:14px;background:rgba(255,255,255,.08);font-size:13.5px;color:#E3EEE9}
.pop{position:absolute;z-index:8;min-width:170px;padding:10px 12px;border-radius:14px;background:rgba(18,28,25,.92);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(12px);font-size:13px;color:#CFE2DA;pointer-events:none;opacity:0;transform:translate(-50%,calc(-100% - 12px)) scale(.96);transition:opacity .2s,transform .25s var(--ease)}
.pop.on{opacity:1;transform:translate(-50%,calc(-100% - 12px))}.pop b{display:block;font:600 17px 'Barlow Condensed',sans-serif;color:#fff}.pop strong{font:600 22px 'Barlow Condensed',sans-serif;color:#fff}
.toast{position:fixed;left:50%;bottom:30px;transform:translate(-50%,20px);opacity:0;z-index:30;background:#fff;color:#2B2926;padding:11px 16px;border-radius:12px;font-size:14px;transition:all .3s var(--ease);pointer-events:none;max-width:90vw;text-align:center}.toast.on{opacity:1;transform:translate(-50%,0)}
@media (min-width:700px){
  .top{padding:22px 40px 0;flex-wrap:nowrap}.per{order:0;width:auto;margin:0 auto}
  .hl{bottom:auto;top:26%;padding:0 40px;max-width:56%}.hl h1{font-size:52px}.hl p{display:block;font-size:17px}
  .shade{background:linear-gradient(90deg,rgba(16,24,21,.92) 0%,rgba(16,24,21,.55) 40%,rgba(16,24,21,0) 70%),linear-gradient(180deg,rgba(16,24,21,.6) 0%,transparent 16%,transparent 62%,#101815 100%)}
  .row{padding:0 40px 26px;gap:12px}.ch{flex:1 0 150px}
  .sh{left:20px;top:84px;bottom:20px;right:auto;width:440px;height:auto;border-radius:28px;border-bottom:1px solid rgba(255,255,255,.12);transform:translateX(-112%)}
  .grab{display:none}.shh{padding-top:16px}.big{font-size:78px}.tb{padding:18px 20px 12px}.fr{font-size:23px}
}
@media (max-width:699px){ .ib span{display:none}.ib{width:40px;justify-content:center;padding:0} }
@media (orientation:landscape) and (max-height:520px){
  .top{padding:10px 18px 0;flex-wrap:nowrap}.per{order:0;width:auto;margin:0 auto}.per button{padding:6px 9px;font-size:12px}.ib span{display:none}.ib{width:38px;height:38px;padding:0;justify-content:center}
  .hl{top:22%;bottom:auto;max-width:58%;padding:0 22px}.hl h1{font-size:26px}.al{margin-bottom:6px;font-size:12px}.row{padding:0 16px 12px}.ch{flex:0 0 140px;padding:9px 12px}.ch .v{font-size:24px}
  .shade{background:linear-gradient(90deg,rgba(16,24,21,.92) 0%,rgba(16,24,21,.5) 45%,rgba(16,24,21,0) 70%),linear-gradient(180deg,transparent 60%,#101815 100%)}
  .sh{left:12px;top:56px;bottom:12px;right:auto;width:380px;height:auto;border-radius:22px;transform:translateX(-112%)}.grab{display:none}.big{font-size:52px}.seg{margin-top:8px}.tb{padding:10px 14px}
}

/* periodo como chip con menú */
.pc0{display:flex;align-items:center;gap:7px;height:40px;padding:0 14px;border-radius:99px;font-size:13.5px;font-weight:600}.pc0 small{font-weight:400;color:#A9C4BA}
.pm{position:absolute;top:calc(max(14px,env(safe-area-inset-top)) + 50px);right:16px;z-index:9;width:min(320px,calc(100vw - 32px));padding:6px;border-radius:18px;background:rgba(18,28,25,.95);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px);box-shadow:0 20px 50px rgba(0,0,0,.4);opacity:0;transform:translateY(-8px) scale(.98);pointer-events:none;transition:all .25s var(--ease)}
.pm.on{opacity:1;transform:none;pointer-events:auto}
.pm button{display:flex;width:100%;align-items:center;gap:10px;padding:11px 12px;border-radius:12px}.pm button:hover,.pm button.on{background:rgba(255,255,255,.1)}
.pm button b{font-size:15px;font-weight:600}.pm button span{display:block;font-size:12px;color:#A9C4BA;margin-top:1px}.pm button i{margin-left:auto;font-style:normal;color:#5FB79B;opacity:0}.pm button.on i{opacity:1}
/* línea del periodo bajo el titular: se dibuja y cuenta */
.tl{display:flex;align-items:flex-end;gap:12px;margin-top:12px;max-width:520px}
.tl svg{flex:1;height:44px;overflow:visible}.tl .ln{fill:none;stroke:var(--c);stroke-width:2.4;stroke-linejoin:round;stroke-dasharray:var(--L);stroke-dashoffset:var(--L);animation:draw 1.6s var(--ease) .15s forwards}
.tl .ar{fill:var(--c);opacity:.14}.tl .dt{fill:#fff;stroke:var(--c);stroke-width:2;opacity:0;animation:fi .3s 1.6s forwards}
@keyframes draw{to{stroke-dashoffset:0}}@keyframes fi{to{opacity:1}}
.tl small{font-size:11.5px;color:#A9C4BA;white-space:nowrap;line-height:1.3}
/* búsqueda única: país, estado u O.R., o pregunta */
.bq{position:fixed;inset:0;z-index:20;background:rgba(10,16,14,.55);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s}
.bq.on{opacity:1;pointer-events:auto}
.bqc{margin:max(14px,env(safe-area-inset-top)) auto 0;width:min(560px,calc(100vw - 24px));border-radius:20px;background:rgba(18,28,25,.97);border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 70px rgba(0,0,0,.45);overflow:hidden;transform:translateY(-10px);transition:transform .3s var(--ease)}
.bq.on .bqc{transform:none}
.bqi{display:flex;align-items:center;gap:10px;padding:0 14px;height:56px;border-bottom:1px solid rgba(255,255,255,.08)}
.bqi input{flex:1;background:none;border:0;outline:0;color:#fff;font:500 18px Barlow,sans-serif}.bqi input::placeholder{color:#7F9E93}
.bqr{max-height:60vh;overflow:auto;padding:6px}
.bqr button{display:flex;width:100%;align-items:center;gap:12px;padding:11px 12px;border-radius:12px}.bqr button:hover,.bqr button.on{background:rgba(255,255,255,.08)}
.bqr button .tg{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#A9C4BA;margin-left:auto}.bqr button b{font-weight:600}
.bqr .hd2{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7F9E93;padding:10px 12px 4px}
/* ficha de país o estado */
.fi{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.fi button{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.05);opacity:0;animation:up .45s var(--ease) forwards}
.fi button i{width:8px;height:8px;border-radius:50%;background:var(--c)}.fi button span{font-size:15px}.fi button b{font:600 21px 'Barlow Condensed',sans-serif;text-align:right}.fi button b small{display:block;font:400 11.5px Barlow,sans-serif}
.fi .no{opacity:.45}
.q button.pu{background:#fff;color:#1F3B33;font-weight:600}

/* la cámara «respira»: vaivén lento con CSS (no redibuja el mapa, no corta las animaciones) */
#map{animation:resp 28s ease-in-out infinite alternate;transform-origin:60% 45%}
@keyframes resp{0%{transform:scale(1) translate(0,0)}50%{transform:scale(1.035) translate(-.6%,.4%)}100%{transform:scale(1.02) translate(.5%,-.4%)}}
@media (prefers-reduced-motion:reduce){#map{animation:none}}

.tl small{flex:none}.tl svg{min-width:0;width:0}
@media (max-width:699px){ .corte .rg{display:none} .tl{max-width:none} }

@media (max-width:699px){ .top{flex-wrap:nowrap} .top .br{flex:0 0 auto} .pc0{min-width:0;flex:1 1 auto;overflow:hidden}.pc0 svg{display:none}.pc0{padding:0 12px;font-size:13px;white-space:nowrap} }

/* tarjetas siempre completas */
.row{position:static;padding:0 16px}
.bot{position:absolute;left:0;right:0;bottom:0;z-index:4;padding-bottom:calc(16px + env(safe-area-inset-bottom));transition:transform .5s var(--ease),opacity .4s}
.app.sel .bot{transform:translateY(40px);opacity:0;pointer-events:none}.app.sel .row{transform:none;opacity:1}
.ley{padding:0 18px 8px;font-size:12.5px;color:#A9C4BA}.ley b{color:#E3EEE9;font-weight:600}
@media (max-width:899px){ .row{-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent)} .ch{flex:0 0 42%} }
@media (min-width:900px){ .row{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:10px;overflow:visible;padding:0 32px}.ley{padding:0 34px 8px}
  .ch{flex:none;min-width:0;padding:10px 11px}.ch .n{font-size:clamp(11.5px,1.05vw,14px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch .v{font-size:clamp(20px,2.1vw,30px)}.ch .v small{font-size:clamp(11px,1vw,15px)}.ch .d{font-size:clamp(10.5px,.9vw,12px)} }
.hl{bottom:calc(196px + env(safe-area-inset-bottom))}
@media (min-width:700px){ .hl{bottom:auto} }
/* menú de periodos con año y mes */
.pmt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7F9E93;padding:10px 12px 4px}.pmt:empty{padding:4px 0;border-top:1px solid rgba(255,255,255,.08);margin-top:6px}
.ay{display:flex;gap:4px;padding:2px 8px 6px}.ay button{flex:1;justify-content:center;padding:7px;border-radius:10px;background:rgba(255,255,255,.06);font-weight:600}.ay button.on{background:#fff;color:#1F3B33}
.mg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:4px 8px}.mg button,.mg span{justify-content:center;text-align:center;padding:8px 0;border-radius:9px;font-size:13px}.mg button{background:rgba(255,255,255,.06)}.mg button.on{background:#5FB79B;color:#10201B;font-weight:700}.mg span{color:#4F6B61}
.pmn{font-size:12px;color:#A9C4BA;padding:6px 12px 2px}
.pm{max-height:calc(100vh - 80px);overflow:auto}
/* punto final siempre redondo */
.tlg{position:relative;flex:1;min-width:0;height:44px}.tlg svg{width:100%;height:100%;display:block;overflow:visible}
.dt2{position:absolute;right:0;width:11px;height:11px;margin:-5.5px -5.5px 0 0;border-radius:50%;background:#fff;border:2.5px solid var(--c);opacity:0;animation:fi .3s 1.6s forwards;box-sizing:border-box}
/* sin alerta: palomita chica */
.corte.ok::after{content:"✓ sin alertas";margin-left:6px;color:#8FD3BA}
@media (max-width:699px){ .corte.ok::after{content:"✓"} }
.vis{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:10px;padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:#CFE2DA}.vis b{color:#fff}
/* modo sala: solo la portada, más grande, sin botones */
.app.sala .ib,.app.sala .nav .ver,.app.sala .hd{display:none}.app.sala .hl h1{font-size:clamp(40px,4.4vw,72px)}.app.sala .pc0{pointer-events:auto}
.top{z-index:9}

.top,.hl,.bot,.sh,.bq .bqc,.toast,.pop{zoom:var(--z,1)}
.nav{max-width:600px}
.ay button.sub{background:rgba(255,255,255,.18)}

/* ===== v12: integración en la plataforma ===== */
/* cargando la primera vez */
.cargav{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:radial-gradient(120% 90% at 70% 30%,#24443B 0%,#16231F 60%,#101815 100%);color:#CFE2DA;font:600 15px Barlow,sans-serif;letter-spacing:.04em;transition:opacity .45s}
.cargav.fuera{opacity:0;pointer-events:none}.cargav[hidden]{display:none}
.cargav span{display:flex;align-items:center;gap:10px}.cargav i{width:10px;height:10px;border-radius:50%;background:#5FB79B;animation:lat 1.2s infinite}
.cargav button{margin-left:8px;padding:8px 14px;border-radius:99px;background:#fff;color:#1F3B33;font-weight:600}
/* áreas táctiles de al menos 44 px */
.ib,.pc0{height:44px}.ib{padding:0 14px}
.rb{width:44px;height:44px}
.hd button{width:26px;height:44px}
.seg button{min-height:40px}
.nav .ver{min-height:44px;padding:0 18px}
.ay button,.mg button,.mg span{min-height:40px}
.pm button{min-height:48px}
.bqr button{min-height:48px}
@media (max-width:699px){ .ib{width:44px} }
@media (orientation:landscape) and (max-height:520px){ .ib{width:44px;height:44px} }
/* Pulso junto a la ✕: solo ícono en teléfono; ícono y palabra en tablet */
.rb.pb{width:auto;min-width:44px;padding:0 10px;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:600;color:#fff;background:rgba(95,183,155,.22);border:1px solid rgba(95,183,155,.45)}
.rb.pb span{display:none}
@media (min-width:700px){ .rb.pb{padding:0 14px 0 11px}.rb.pb span{display:inline} }
/* zonas seguras (muesca, barra de inicio) y giro */
.top{padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}
.hl{padding-left:max(22px,env(safe-area-inset-left));padding-right:max(22px,env(safe-area-inset-right))}
@media (min-width:700px){ .top{padding-left:max(40px,env(safe-area-inset-left));padding-right:max(40px,env(safe-area-inset-right))} .hl{padding-left:max(40px,env(safe-area-inset-left))} }
.row{padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}
/* tarjetas: se levantan y brillan con el color de su grupo (solo con mouse); al tocar se hunden */
@media (hover:hover) and (pointer:fine){
  .ch:hover{transform:translateY(-5px);background:rgba(255,255,255,.16);border-color:var(--c);box-shadow:0 14px 34px -12px var(--c),0 0 0 1px var(--cs) inset}
  .ch.on:hover{background:rgba(255,255,255,.24)}
  .fi button:hover,.fgb:hover{background:rgba(255,255,255,.1)}
  .q button:hover,.rb:hover,.ib:hover,.pc0:hover{background:rgba(255,255,255,.18)}
}
.rb:active,.ib:active,.pc0:active,.fg button:active,.seg button:active{transform:scale(.94)}
.rb,.ib,.pc0,.fg button,.seg button{transition:transform .12s,background .2s}
/* la hoja aparece en cascada */
@keyframes cas{from{opacity:0;translate:0 10px}}
.sh .shh,.sh .seg{animation:cas .5s var(--ease) both}.sh .seg{animation-delay:.06s}
.sh .tb>*{animation:cas .5s var(--ease) both}
.sh .tb>*:nth-child(2){animation-delay:.08s}.sh .tb>*:nth-child(3){animation-delay:.14s}.sh .tb>*:nth-child(4){animation-delay:.2s}.sh .tb>*:nth-child(5){animation-delay:.26s}.sh .tb>*:nth-child(n+6){animation-delay:.3s}
.sh{transition:transform .6s cubic-bezier(.2,.9,.25,1)}
.hl .tx{transition:opacity .35s,transform .45s var(--ease)}
/* ficha de país o estado */
.fley{font-size:12.5px;color:#A9C4BA;margin-top:6px}
.fg{display:flex;flex-direction:column;gap:5px;margin-top:12px}
.fgt{display:flex;align-items:center;gap:7px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:#BFD8CF;font-weight:600;margin-bottom:2px}.fgt i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.f0{margin-top:16px;font-size:13px;line-height:1.4;color:#A9C4BA;padding:10px 12px;border-radius:12px;border:1px dashed rgba(255,255,255,.16)}.f0 b{color:#E3EEE9;font-weight:600}
.fr{line-height:1.25}
/* movimiento reducido: sin animaciones */
@media (prefers-reduced-motion:reduce){ *,*::before,*::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important} }
/* teléfono: el periodo baja a su propia línea para que se lea completo */
@media (max-width:699px) and (min-height:521px){
  .top{flex-wrap:wrap;row-gap:10px}.top::after{content:"";order:4;flex-basis:100%}
  .pc0{order:5;flex:0 0 auto;max-width:100%;margin-right:auto;padding:0 14px}.pc0 svg{display:inline}
  .pm{top:calc(max(14px,env(safe-area-inset-top)) + 106px);left:max(16px,env(safe-area-inset-left));right:auto}
}

/* ficha: cada indicador se despliega con sus 5 principales */
.fgi{border-radius:12px;background:rgba(255,255,255,.06);border-left:3px solid var(--c);overflow:hidden;transition:background .25s}
.fgi.on{background:rgba(255,255,255,.08)}
.fgb{display:grid;grid-template-columns:minmax(0,1fr) auto 16px;align-items:center;gap:10px;width:100%;min-height:46px;padding:6px 10px 6px 12px}
.fgb .fn{font-size:15px;min-width:0;display:flex;align-items:baseline;flex-wrap:wrap;column-gap:8px}.fgb .fn small{font-size:11.5px;color:#A9C4BA}
.fgb b{font:600 21px/1 'Barlow Condensed',sans-serif;display:flex;align-items:center;gap:8px;justify-content:flex-end}.fgb b .dch{font:700 11.5px Barlow,sans-serif}
.fgb .cv{color:#A9C4BA;transition:transform .3s var(--ease)}.fgi.on .cv{transform:rotate(180deg);color:#fff}
.fgd{display:grid;grid-template-rows:0fr;transition:grid-template-rows .38s var(--ease)}.fgi.on .fgd{grid-template-rows:1fr}.fgdw{overflow:hidden;min-height:0}
.fgdi{padding:0 12px 10px 14px}.fgdi .it{grid-template-columns:16px 1fr auto;column-gap:8px;row-gap:3px;margin-top:6px}.fgdi .it .k{font-size:11.5px;color:#7F9E93}.fgdi .it .nm{font-size:13.5px;color:#CFE2DA}.fgdi .it .pc{font:600 15px/1 'Barlow Condensed',sans-serif;color:#E3EEE9}.fgdi .it .pc small{font-size:10.5px}.fgdi .it .bb{height:3px;opacity:.7}
.fgt2{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7F9E93;margin-top:0}
.fgv{margin-top:8px;min-height:32px;padding:0 2px;font-size:12.5px;font-weight:600;color:var(--c);display:inline-flex;align-items:center;gap:4px;background:none;opacity:.9}.fgv:hover{opacity:1;text-decoration:underline}
.fic .fr{font-size:19px}
.tb{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent;padding-bottom:22px}
.tb::-webkit-scrollbar{width:6px}.tb::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:3px}

/* compartir (solo ícono) y su menú */
.ib.ico{width:44px;padding:0;justify-content:center}
.pm.cm{width:min(280px,calc(100vw - 32px))}
/* liga compartida «Resumen INAMI»: solo esta vista; sin salidas a la plataforma */
:host([data-modo="compartido"]) [data-inf],:host([data-modo="compartido"]) [data-pulso],:host([data-modo="compartido"]) [data-salir]{display:none!important}

/* documento vigente: conteo al corte, aparte de las 10 tarjetas */
.dvh{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;margin-top:8px;font-size:15px;color:#E3EEE9}.dvh b{font:600 26px/1 'Barlow Condensed',sans-serif;color:#fff}.dvh em{font-style:normal;font-size:12.5px;color:#A9C4BA}
/* con la hoja abierta, el dato de documentos vigentes de arriba se oculta para no encimarse con ella */
.top .dvh{transition:opacity .3s}.app.sel .top .dvh{opacity:0;pointer-events:none}
.fdv{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;margin-top:12px;padding:9px 12px;border-radius:12px;border:1px dashed rgba(255,255,255,.18);font-size:13px;color:#A9C4BA}
.fdv b{font:600 20px/1 'Barlow Condensed',sans-serif;color:#fff}.fdv em{font-style:normal;font-size:12px}

/* documento vigente: en computadora y tablet, bajo la fecha; en teléfono, sobre las tarjetas (arriba no cabe) */
.dvm{display:none}
@media (max-width:699px) and (min-height:521px){ .top .dvh{display:none} .dvm{display:flex;margin-top:4px} }
.top .br .dvh b{display:inline;font:600 26px/1 'Barlow Condensed',sans-serif;letter-spacing:0;color:#fff}
`;
const BODY = `<div class="cargav" id="cargav"><span><i></i>Preparando la vista…</span></div>

<div class="app" id="app"><section class="home" id="home">
  <div id="map"></div><div class="shade"></div>
  <div class="top"><div class="br"><b>IA-NAMI</b><span class="corte" id="corte"><i></i></span><div class="dvh" id="dvh"></div></div><button class="pc0 glass" data-pm id="pc0"></button><div class="pm" id="pm"></div>
    <button class="ib glass" data-inf title="Informe migratorio de la última semana"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/></svg><span id="inft">Informe</span></button>
    <button class="ib glass" data-bq title="Busca un país, estado u O.R."><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Buscar</span></button>
    <button class="ib glass ico" data-compartir aria-label="Compartir este resumen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 14v6h14v-6"/></svg></button><div class="pm cm" id="cm"><div class="pmt">Compartir · Resumen INAMI</div><button data-cmw><div><b>WhatsApp</b><span>manda la liga del resumen</span></div></button><button data-cmc><div><b>Copiar liga</b><span>para pegarla en un correo o mensaje</span></div></button></div>
    <button class="ib glass" data-salir title="Salir de esta vista" aria-label="Salir de esta vista"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg><span>Salir</span></button></div>
  <div class="hl" id="hl"><div id="vis"></div><div id="alerta"></div><div class="tx" id="hlt"></div><div class="nav"><div class="hd" id="hd"></div><button class="ver" data-ver>Ver más</button></div></div>
  <div class="bot"><div class="ley" id="ley"></div><div class="row" id="row"></div></div>
  <section class="sh" id="sh"></section><div class="pop" id="pop"></div>
</section></div>
<div class="toast" id="toast"></div>
<div class="bq" id="bq"><div class="bqc"><div class="bqi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5FB79B" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="bqin" placeholder="Un país, estado u O.R." autocomplete="off"><button class="rb" data-bqx aria-label="Cerrar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="bqr" id="bqr"></div></div></div>
`;
let HOST = null, R = null, API = null, ACTIVA = false;
const $ = id => R.getElementById(id);
/* ---------- datos: se calculan aquí, con el mismo motor de Pregunta a INAMI, por periodo y solo cuando se piden ---------- */
const L = [['ing','Ingresos','Regular'],['rech','Rechazos','Regular'],['tram','Trámites','Regular'],['resc','Rescatados','Irregular'],['pres','Presentados','Irregular'],['nna','NNA canalizados','Irregular'],['ret','Retornados','Irregular'],['rec','Recibidos','Desde EE. UU.'],['rep','Repatriados','Desde EE. UU.'],['cbp','Encuentros','Desde EE. UU.']];
const INI = '2024-10-01', MSL0 = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const sum = (s, n) => { const d = new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0, 10); };
const anio = (s, dy) => { const d = new Date(s+'T00:00:00Z'); d.setUTCFullYear(d.getUTCFullYear()+dy); return d.toISOString().slice(0, 10); };
const ultDia = (y, m) => new Date(Date.UTC(y, m+1, 0)).toISOString().slice(0, 10);
function armaDatos(){ const M = window.IANAMI_MOTOR;
  // fin: el mismo corte que muestra el tablero («Datos al …»); si una base llega un día antes, se compara con el mismo número de días
  const FIN = (window.IANAMI_DATOS || {}).corte || L.map(([k]) => M.finBase(M.BASES[M.INDK[k].b])).sort().pop();
  let e = FIN; while (new Date(e+'T00:00:00Z').getUTCDay()!==0) e = sum(e, -1);   // última semana completa (lunes a domingo)
  const P = { sem:{ a:sum(e, -6), b:e, ca:sum(e, -13), cb:sum(e, -7), lab:'Última semana', cl:'la semana anterior' },
    shein:{ a:INI, b:FIN, lab:'Periodo Sheinbaum', cl:'' }, trump:{ a:'2025-01-20', b:FIN, lab:'Periodo Trump', cl:'' } };
  const NC = 'sin comparación: los datos empiezan en oct 2024';
  P.y2024 = { a:INI, b:'2024-12-31', lab:'2024 (oct–dic)', cl:'', nc:NC };
  for (let y=2025; y<=+FIN.slice(0, 4); y++){ const a = y+'-01-01', b = y===+FIN.slice(0, 4) ? FIN : y+'-12-31', ca = (y-1)+'-01-01', cb = anio(b, -1);
    P['y'+y] = ca>=INI ? { a, b, ca, cb, lab:String(y), cl:(y-1)+(b===FIN ? ' al mismo día' : '') } : { a, b, lab:String(y), cl:'', nc:NC }; }
  // meses: contra el mismo mes del año anterior; si no hay, contra el mes anterior
  for (let d=new Date(INI+'T00:00:00Z'); d.toISOString().slice(0, 10)<=FIN; d.setUTCMonth(d.getUTCMonth()+1)){ const y = d.getUTCFullYear(), m = d.getUTCMonth(), a = d.toISOString().slice(0, 10); let b = ultDia(y, m), inc = false; if (b>FIN){ b = FIN; inc = true; }
    const lab = MSL0[m]+' '+y+(inc ? ' (al '+(+FIN.slice(8))+')' : ''); let ca = anio(a, -1), cb = anio(b, -1), cl = MSL0[m]+' '+(y-1)+(inc ? ' al mismo día' : '');
    if (ca<INI){ const pa = new Date(Date.UTC(y, m-1, 1)).toISOString().slice(0, 10); if (pa>=INI){ ca = pa; cb = inc ? sum(pa, (+FIN.slice(8))-1) : ultDia(y, m-1); cl = MSL0[(m+11)%12]+(inc ? ' al mismo día' : '')+' (mes anterior)'; } else { ca = null; cb = null; cl = ''; } }
    P['m'+a.slice(0, 7)] = ca ? { a, b, ca, cb, lab, cl } : { a, b, lab, cl:'', nc:'sin comparación: primer mes con datos' }; }
  Object.values(P).forEach(p => { p.ca = p.ca || null; p.cb = p.cb || null; p.nc = p.nc || ''; });
  return { fin:FIN, finSem:e, per:P, ind:L.map(([k, n, g]) => ({ k, n, g, p:{} })) };
}
// un indicador en un periodo: total, comparación, listas de países y estados (completas, para el lugar que ocupa cada uno) y la serie de la gráfica
function calcula(D, x, pk){ const M = window.IANAMI_MOTOR, I = M.INDK[x.k], B = M.BASES[I.b], o = (a, b) => ({ ind:I, d0:a, d1:b, filtros:{} });
  // si esta base llega antes del corte, el periodo y su comparación se recortan los mismos días (así no se compara un día de menos contra uno completo)
  const p0 = D.per[pk], fb = M.finBase(B), lag = p0.b>fb ? Math.round((new Date(p0.b+'T00:00:00Z')-new Date(fb+'T00:00:00Z'))/864e5) : 0;
  const p = lag ? Object.assign({}, p0, { b:fb, cb:p0.cb ? sum(p0.cb, -lag) : null }) : p0;
  const dimE = x.k==='cbp' ? 'sec' : 'e', lista = (d, a, b) => B.dims[d] ? M.porDim(o(a, b), d).filter(z => z[1]>0).sort((u, v) => v[1]-u[1]).map(([i, v]) => [B.dims[d].vals[i], v]) : [];
  const r = { T:M.total(o(p.a, p.b)), W:p.ca ? M.total(o(p.ca, p.cb)) : null };
  const N = x.k==='rep' ? [] : lista('n', p.a, p.b), E = lista(dimE, p.a, p.b);
  r.n5 = N.slice(0, 5); r.e5 = E.slice(0, 5); r.nl = N; r.el = x.k==='cbp' ? [] : E; r.ea = x.k==='cbp' ? null : E;
  if (x.k!=='rep'){ r.na = Object.fromEntries(N); if (p.ca) r.naW = Object.fromEntries(lista('n', p.ca, p.cb)); }
  if (x.k!=='cbp' && B.dims.e){ r.eaM = Object.fromEntries(E); if (p.ca) r.eaW = Object.fromEntries(lista('e', p.ca, p.cb)); }
  // serie: semana → 12 semanas; mes → 13 meses; año → sus meses (y los del año pasado); periodos → meses
  let sa, sb, g2 = 'm'; if (pk==='sem'){ sa = sum(D.finSem, -83); sb = D.finSem; g2 = 's'; } else if (pk[0]==='m'){ sa = anio(p.a, -1)<INI ? INI : anio(p.a, -1); sb = p.b; } else { sa = p.a; sb = p.b; }   // p.b ya viene recortado
  const C = M.cubetas(sa, sb, g2), s = M.serie(o(sa, sb), C); r.s = C.l.map((q, i) => [q.a, s[i], !!q.inc]);
  if (pk[0]==='y' && p.ca){ const C2 = M.cubetas(p.ca, p.cb, 'm'); r.s2 = M.serie(o(p.ca, p.cb), C2); }
  return r; }
/* ---------- mapa: el del tablero, con nombres; centros de estados (promedio de sus vértices) y de países ---------- */
function armaGeo(){ const fe = window.IANAMI_GEO.features.filter(g => !(g.properties.t==='p' && g.properties.nom==='México'))
    .map(g => ({ type:'Feature', geometry:g.geometry, properties:{ name:g.properties.t==='m' && g.properties.nom==='México' ? 'Estado de México' : g.properties.nom, t:g.properties.t } }));
  return { type:'FeatureCollection', features:fe }; }
function armaCen(GEO){ const C = {}, C0 = window.IANAMI_CEN || {};
  GEO.features.filter(g => g.properties.t==='m').forEach(g => { let sx = 0, sy = 0, n = 0; const w = c => typeof c[0]==='number' ? (sx += c[0], sy += c[1], n++) : c.forEach(w); w(g.geometry.coordinates); C[g.properties.name] = [+(sx/n).toFixed(2), +(sy/n).toFixed(2)]; });
  ((window.IANAMI_DATOS || {}).nats || []).forEach(n => { const c = C0['P_'+n[1]]; if (c && !C[n[0]]) C[n[0]] = c; });
  return Object.assign(C, { 'EE. UU.':[-98, 38.5], 'Argentina':[-64, -34], 'Estado de México':[-99.51, 19.32],   // sectores de la CBP
    'San Diego':[-117.1, 32.7], 'El Centro':[-115.6, 32.8], 'Yuma':[-114.6, 32.7], 'Tucson':[-110.9, 32.2], 'El Paso':[-106.4, 31.8], 'Big Bend':[-103.2, 29.6], 'Del Rio':[-100.9, 29.4], 'Laredo':[-99.5, 27.5], 'Rio Grande':[-98.2, 26.2] }); }
/* ---------- la vista (se arma una vez, al abrirla por primera vez) ---------- */
function montar(D, GEO, CEN){

const DATA = D.ind, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GC = { 'Regular':['#5FB79B','rgba(95,183,155,.2)'], 'Irregular':['#E58A82','rgba(229,138,130,.2)'], 'Desde EE. UU.':['#D6C26A','rgba(214,194,106,.2)'] };
const U = { ing:'entradas', rech:'rechazos', tram:'trámites', resc:'rescates (eventos)', pres:'personas presentadas', nna:'niñas, niños y adolescentes canalizados', ret:'personas retornadas', rec:'personas recibidas de EE. UU.', rep:'mexicanos repatriados', cbp:'encuentros en la frontera' };
const VB = { ing:['entraron','personas por los puntos de internación'], rech:['hubo','rechazos en los puntos de internación'], tram:['se recibieron','trámites migratorios'], resc:['hubo','rescates de personas (eventos)'], pres:['se presentó a','personas ante el INM'], nna:['se canalizó a','niñas, niños y adolescentes'], ret:['retornaron','personas a su país'], rec:['se recibió a','personas desde EE. UU.'], rep:['regresaron','mexicanos repatriados'], cbp:['la CBP registró','encuentros en la frontera'] };
const DON = { ing:'Por dónde entran', rech:'Dónde', tram:'Dónde tramitan', resc:'Dónde', pres:'Dónde', nna:'Dónde', ret:'Desde dónde', rec:'Dónde', rep:'Por dónde', cbp:'Sector' };
const ICON = { ing:'M3 12h12M11 7l5 5-5 5M20 4v16', rech:'M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', tram:'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  resc:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM5.7 5.7l4.2 4.2M14.1 14.1l4.2 4.2M18.3 5.7l-4.2 4.2M9.9 14.1l-4.2 4.2', pres:'M4 21V9l8-5 8 5v12M9 21v-6h6v6',
  nna:'M12 20s-7-4.3-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6C19 15.7 12 20 12 20z', ret:'M21 12H9M13 7l-5 5 5 5M4 4v16', rec:'M12 4v10M8 10l4 4 4-4M5 19h14', rep:'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5', cbp:'M3 21V9l9-6 9 6v12M3 13h18M8 21v-4h8v4M12 3v4' };
const MS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], MSL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const f = n => Math.round(n).toLocaleString('en-US'), fp = n => n>0 && n<5 ? 'menos de 5' : f(n);
const corto = n => n>=1e6 ? [(n/1e6).toFixed(1).replace(/\.0$/, ''), n>=2e6 ? 'millones' : 'millón'] : n>=1e4 ? [(n/1e3).toFixed(n>=1e5 ? 0 : 1).replace(/\.0$/, ''), 'mil'] : [f(n), ''];
const cc = n => { const [a, b] = corto(n); return b==='millones' || b==='millón' ? [a, 'M'] : b ? [a, b] : [a]; };
const dd = s => { const d = new Date(s+'T00:00:00Z'); return d.getUTCDate()+' '+MS[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); };
const lm = s => { const d = new Date(s+'T00:00:00Z'); return MS[d.getUTCMonth()]+(d.getUTCMonth()===0 ? ' '+String(d.getUTCFullYear()).slice(2) : ''); };
const ico = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+ICON[k]+'"/></svg>';
const MX = [-102, 23.5], esEU = x => x.k==='rep' || x.k==='rec' || x.k==='cbp';
/* periodos: en el orden de siempre */
const TP = k => k==='sem' || k==='shein' || k==='trump' ? k : k[0];   // tipo de periodo: sem, shein, trump, y (año), m (mes)
const cap = t => t.replace(/^./, m => m.toUpperCase());
let PER = 'shein';
const P_ = (x, k) => x.p[k] || (x.p[k] = calcula(D, x, k)), V = x => P_(x, PER), PD = () => D.per[PER];
const r = x => V(x).W ? V(x).T/V(x).W-1 : null;
const chip = rr => rr==null ? '' : '<span class="dch '+(Math.abs(rr)<0.005 ? 'eq' : rr>0 ? 'u' : 'dn')+'">'+(Math.abs(rr)<0.005 ? '≈' : rr>0 ? '▲' : '▼')+' '+Math.abs(rr*100).toFixed(Math.abs(rr)<0.1 ? 1 : 0)+'%</span>';
const dias = () => Math.round((new Date(PD().b)-new Date(PD().a))/864e5)+1;
const nats = x => V(x).n5.filter(z => z[0]!=='Otras' && z[0]!=='México'), edos = x => V(x).e5.filter(z => z[0]!=='Otras');
const enPer = () => ({ sem:'Esta semana', shein:'En el periodo Sheinbaum', trump:'En el periodo Trump' })[PER] || 'En '+PD().lab.replace(/ \(.*\)$/, '');
const vsTxt = () => PER==='sem' ? 'que la semana anterior' : 'que en '+PD().cl;
const vsCorto = () => PER==='sem' ? 'vs. semana anterior' : 'vs. '+PD().cl.replace(' al mismo día', '').replace(' (mes anterior)', '');
const mesA = s => { const d = new Date(s+'T00:00:00Z'); return MS[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); };
echarts.registerMap('vz', GEO);

/* ---------- mapa (arena) ---------- */
const ZM = () => Math.max(1, Math.min(1.9, Math.min(innerWidth/1440, innerHeight/860)));
const fijaZ = () => HOST.style.setProperty('--z', ZM()); fijaZ();
const AS = .92, MAPEL = $('map'); if (!MAPEL.clientWidth || !MAPEL.clientHeight){ MAPEL.style.width = (innerWidth || 390)+'px'; MAPEL.style.height = (innerHeight || 844)+'px'; }
const MAP = echarts.init(MAPEL, null, { renderer:'canvas' });
const conTam = el => el && el.clientWidth>0 && el.clientHeight>0;
let BB = [180, 90, -180, -90]; GEO.features.forEach(g => { const w = c => typeof c[0]==='number' ? (BB = [Math.min(BB[0], c[0]), Math.min(BB[1], c[1]), Math.max(BB[2], c[0]), Math.max(BB[3], c[1])]) : c.forEach(w); w(g.geometry.coordinates); });
let VIEW = null;
function libre(){ const W = innerWidth, H = innerHeight, sel = $('app').classList.contains('sel');
  if (W>=700 || H<=520){ const z = ZM(), pl = sel ? (W>=700 ? 480*z : 400) : (W>=700 ? W*.42 : W*.45); return [pl, 90*z, W-24, H-(sel ? 30 : 170*z)]; }
  return sel ? [16, 110, W-16, H*.42] : [16, 110, W-16, H*.5]; }
function vista(bb){ const W = innerWidth, H = innerHeight, S = Math.min(W, H), bw = (BB[2]-BB[0])*AS, bh = BB[3]-BB[1], s0 = S/Math.max(bw, bh), [x0, y0, x1, y1] = libre();
  const tw = (bb[2]-bb[0])*AS, th = bb[3]-bb[1], z = Math.min((x1-x0)/(tw*s0), (y1-y0)/(th*s0))*.92, vx = (x0+x1)/2, vy = (y0+y1)/2;
  return { center:[((bb[0]+bb[2])/2*AS-(vx-W/2)/(s0*z))/AS, (bb[1]+bb[3])/2+(vy-H/2)/(s0*z)], zoom:z }; }
const MAPOK = () => MAPEL.clientWidth>0 && MAPEL.clientHeight>0;
let MOV = false, T0 = performance.now();
function mover(bb){ limpia(); const to = vista(bb), from = VIEW || to, t0 = performance.now(), igual = Math.abs(from.zoom-to.zoom)<0.02 && Math.abs(from.center[0]-to.center[0])<0.3 && Math.abs(from.center[1]-to.center[1])<0.3, Dd = VIEW && !RM && !igual ? 1000 : 0; VIEW = to; MOV = true;
  const step = t => { const k = Dd ? Math.min(1, (t-t0)/Dd) : 1, e = k<.5 ? 4*k*k*k : 1-Math.pow(-2*k+2, 3)/2;
    if (MAPOK()) MAP.setOption({ geo:{ center:[from.center[0]+(to.center[0]-from.center[0])*e, from.center[1]+(to.center[1]-from.center[1])*e], zoom:from.zoom+(to.zoom-from.zoom)*e } }); if (k<1) requestAnimationFrame(step); else { MOV = false; T0 = performance.now(); } };
  requestAnimationFrame(step); return Dd; }
const bbDe = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mx = Math.max(2, (Math.max(...xs)-Math.min(...xs))*.14), my = Math.max(2, (Math.max(...ys)-Math.min(...ys))*.2); return [Math.min(...xs)-mx, Math.min(...ys)-my, Math.max(...xs)+mx*1.6, Math.max(...ys)+my]; };
const BB_MX = [-117.5, 14.3, -86.5, 32.7], BB_FN = [-118, 25, -96, 34];
const regBase = () => GEO.features.filter(g => g.properties.t!=='p').map(g => ({ name:g.properties.name, itemStyle:g.properties.t==='u' ? USS : MXS }));
const TIERRA = { areaColor:'#1B2B26', borderColor:'#2A3D36', borderWidth:.7 }, MXS = { areaColor:'#24392F', borderColor:'#3F5E51', borderWidth:.7 }, USS = { areaColor:'#1B2B26', borderColor:'#1B2B26', borderWidth:1 };
MAP.setOption({ geo:{ map:'vz', roam:false, silent:false, emphasis:{ disabled:true }, select:{ disabled:true }, aspectScale:AS, layoutCenter:['50%', '50%'], layoutSize:'100%', itemStyle:TIERRA, regions:regBase() }, series:[] });
const LEJOS = c => c[0]>-30 || c[0]<-130 || c[1]>58 || c[1]<-40;
// un país lejano (India, China, España...) se pone en el borde del mapa, del lado por donde llega
const pos = n => CEN[n] || null;
const nomP = n => n;
const limpia = () => { try { const p = MAP.getZr().painter, L = p.getLayers ? p.getLayers() : {}; Object.keys(L).forEach(k => { if (+k>0 && L[k].clear) L[k].clear(true); }); } catch(e){} };
function capas(x, modo){ limpia(); const col = GC[x.g][0], N = nats(x).filter(z => pos(z[0])).slice(0, 5), E = edos(x).filter(z => CEN[z[0]]).slice(0, 6), mx = Math.max(1, ...N.map(z => z[1]), ...E.map(z => z[1]));
  const dest = E.length ? CEN[E[0][0]] : MX, L = [], P = [], lab = modo==='nat' || modo==='edo';
  if (modo!=='edo'){ if (N.length) N.forEach((o, i) => L.push({ coords:[pos(o[0]), E.length ? CEN[E[i % Math.min(E.length, 3)][0]] : dest], lineStyle:LEJOS(pos(o[0])) ? { width:2.6, opacity:.9 } : undefined }));
    else E.forEach(z => L.push({ coords:[esEU(x) ? [-100, 33.5] : MX, CEN[z[0]]] })); }
  if (modo==='nat') N.forEach(z => P.push({ name:nomP(z[0]), value:pos(z[0]).concat(z[1]) })); else E.slice(0, modo==='edo' ? 5 : 6).forEach(z => P.push({ name:z[0], value:CEN[z[0]].concat(z[1]) }));
  const regs = GEO.features.filter(g => g.properties.t!=='p').map(g => { const e = modo==='edo' && E.find(z => z[0]===g.properties.name);
    return { name:g.properties.name, itemStyle:g.properties.t==='u' ? USS : e ? { areaColor:col+Math.round(40+130*e[1]/mx).toString(16).padStart(2, '0'), borderColor:col, borderWidth:1 } : MXS }; });
  const LL = modo==='edo' ? [] : L; clearTimeout(capas.t); const sube = k => { if (!MAPOK()) return; MAP.setOption({ series:[{ id:'fl', data:LL.slice(0, k) }] }); if (k<LL.length) capas.t = setTimeout(() => sube(k+1), 260); };
  MAP.setOption({ geo:{ regions:regs }, series:[{ id:'fl', type:'lines', coordinateSystem:'geo', zlevel:1, effect:{ show:true, period:2.8, trailLength:.5, symbol:'circle', symbolSize:5, color:'#fff' }, lineStyle:{ color:col, width:1.8, opacity:.62, curveness:.28 }, data:[] },
    { type:'effectScatter', coordinateSystem:'geo', rippleEffect:{ scale:3, brushType:'stroke' }, symbolSize:p => 6+Math.sqrt(p[2]/mx)*18, itemStyle:{ color:col, shadowBlur:12, shadowColor:col },
      label:{ show:lab, position:'right', distance:6, color:'#fff', fontSize:12.5*ZM(), fontWeight:600, fontFamily:'Barlow', textBorderColor:'rgba(16,24,21,.9)', textBorderWidth:3, formatter:p => p.name+'  '+cc(p.value[2]).join(' ') }, labelLayout:{ hideOverlap:true }, data:P.map((p, j) => Object.assign(p, { label:{ show:lab || j<1 } })) }] }, { replaceMerge:['series'] });
  const pts = modo==='nat' && N.length ? N.map(z => pos(z[0])).concat(E.slice(0, 2).map(z => CEN[z[0]])) : null;
  const dur = mover(pts ? bbDe(pts) : modo==='edo' && x.k==='cbp' ? BB_FN : modo==='edo' ? BB_MX : [-121, 10, -78, 37]); capas.t = setTimeout(() => sube(1), dur ? dur+120 : 350); }

/* ---------- informe de la última semana completa (lunes a domingo) ---------- */
const INF = D.per.sem; $('inft').parentNode.title = 'Informe migratorio de la semana '+dd(INF.a)+' – '+dd(INF.b);
/* ---------- alerta: lo que se sale de lo normal (contra sus semanas previas) ---------- */
let ALR = [];
function alerta(){ const el = $('alerta'); ALR = [];
  const F = DATA.map((x, i) => { const w = P_(x, 'sem').s.map(z => z[1]), u = w[w.length-1], prev = w.slice(0, -1), m = prev.reduce((a, b) => a+b, 0)/prev.length, sd = Math.sqrt(prev.reduce((a, b) => a+(b-m)*(b-m), 0)/prev.length) || 1;
    return { i, x, z:(u-m)/sd, d:u/m-1, u, m }; }).filter(o => o.m>=300 && Math.abs(o.z)>=2 && Math.abs(o.d)>=0.1).sort((a, b) => Math.abs(b.z)-Math.abs(a.z));
  ALR = F.map(o => o.i);
  el.innerHTML = F.length ? '<div class="al" data-al="'+F[0].i+'"><i>!</i><span>Última semana, fuera de lo normal: <b>'+F[0].x.n+'</b> '+(F[0].d>0 ? 'subió' : 'bajó')+' '+Math.abs(Math.round(F[0].d*100))+'% contra su promedio de 11 semanas'+(F.length>1 ? ' · y '+(F.length-1)+' más' : '')+'</span></div>'
    : ''; $('corte').classList.toggle('ok', !F.length); }
/* ---------- desde tu última visita: lo que cambió (última semana contra lo que viste) ---------- */
function visita(){ let prev = null; const demo = false;
  try { prev = JSON.parse(localStorage.getItem('vz_visita') || 'null'); } catch(e){}
  if (demo) prev = { fin:P_(DATA[0], 'sem').ca || '', v:Object.fromEntries(DATA.map(x => [x.k, P_(x, 'sem').W])) };
  try { setTimeout(() => localStorage.setItem('vz_visita', JSON.stringify({ fin:D.per.sem.b, v:Object.fromEntries(DATA.map(x => [x.k, P_(x, 'sem').T])) })), 4000); } catch(e){}
  if (!prev || (!demo && prev.fin>=D.per.sem.b)) return '';
  const L = DATA.map(x => ({ x, d:prev.v[x.k] ? P_(x, 'sem').T/prev.v[x.k]-1 : 0, base:prev.v[x.k] || 0 })).filter(o => o.base>=300 && Math.abs(o.d)>=0.05).sort((a, b) => Math.abs(b.d)-Math.abs(a.d)).slice(0, 3);
  return L.length ? '<div class="vis"><b>Desde tu última visita</b> · '+L.map(o => o.x.n+' '+chip(o.d)).join(' · ')+'</div>' : ''; }
/* ---------- portada ---------- */
const PNOM = k => k==='sem' ? 'Última semana' : cap(D.per[k].lab);
const PDESC = k => D.per[k].nc ? D.per[k].nc : k==='shein' || k==='trump' ? 'total acumulado · sin comparación' : 'contra '+D.per[k].cl;
let AY = D.fin.slice(0, 4);
function menuPer(){ const anios = Object.keys(D.per).filter(k => k[0]==='y').map(k => k.slice(1));
  $('pm').innerHTML = '<div class="pmt">Periodos</div>'+['sem', 'shein', 'trump'].map(k => '<button data-per="'+k+'" class="'+(k===PER ? 'on' : '')+'"><div><b>'+PNOM(k)+'</b><span>'+(k==='sem' ? 'contra la semana anterior' : k==='shein' ? 'desde el 1 oct 2024 · total acumulado' : 'desde el 20 ene 2025 · total acumulado')+'</span></div><i>✓</i></button>').join('')+
    '<div class="pmt">Año y mes</div><div class="ay">'+anios.map(y => '<button data-ay="'+y+'" class="'+(PER==='y'+y ? 'on' : y===AY && TP(PER)==='m' ? 'sub' : '')+'">'+y+'</button>').join('')+'</div>'+
    '<div class="pmn">'+(PER==='y'+AY ? '✓ <b style="color:#fff">Todo '+AY+'</b> · '+PDESC('y'+AY)+'<br>Si quieres, elige un mes:' : 'Toca un año para verlo completo, o un mes:')+'</div>'+
    '<div class="mg">'+MS.map((m, j) => { const k = 'm'+AY+'-'+String(j+1).padStart(2, '0'); return D.per[k] ? '<button data-per="'+k+'" class="'+(k===PER ? 'on' : '')+'" title="'+PDESC(k)+'">'+cap(m)+'</button>' : '<span>'+cap(m)+'</span>'; }).join('')+'</div>'+
    (TP(PER)==='m' ? '<div class="pmn">✓ <b style="color:#fff">'+cap(D.per[PER].lab)+'</b> · '+PDESC(PER)+'</div>' : '')+
    '<div class="pmt"></div><button data-sala><div><b>▶ Modo sala</b><span>para pantallas de reuniones: corre sola</span></div></button>';
  $('pc0').innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'+PNOM(PER).replace(/ \(.*\)$/, '')+' <small>▾</small>';
  $('ley').innerHTML = PD().ca ? '<b>▲▼</b> '+PDESC(PER) : PD().nc ? 'Totales de '+PD().lab+' · '+PD().nc : '<b>Total acumulado</b> del '+PNOM(PER).replace('Periodo', 'periodo')+' ('+dd(PD().a)+' – '+dd(PD().b)+') · no se compara con otro periodo'; }
let ORD = [], HI = 0, HT = null, MAN = false;
const mov = x => { const s0 = V(x).s.filter(z => !z[2]); return s0.length>1 && s0[0][1] ? Math.abs(s0[s0.length-1][1]/s0[0][1]-1) : 0; };
function orden(){ ORD = DATA.map((x, i) => i).filter(i => !V(DATA[i]).W || V(DATA[i]).W>=300); ORD.sort((a, b) => PD().ca ? Math.abs(r(DATA[b]))-Math.abs(r(DATA[a])) : mov(DATA[b])-mov(DATA[a])); ORD = ORD.slice(0, 5); }
function titular(x){ const [a, b] = corto(V(x).T), rr = r(x), v = VB[x.k];
  return enPer()+' '+v[0]+' <span class="num" data-cu="'+V(x).T+'">'+a+(b ? ' '+b : '')+'</span> '+v[1]+(rr==null ? '.' : ', '+(Math.abs(rr)<0.01 ? 'casi igual '+vsTxt() : '<em>'+Math.abs(rr*100).toFixed(Math.abs(rr)<0.1 ? 1 : 0)+'% '+(rr>0 ? 'más' : 'menos')+'</em> '+vsTxt())+'.'); }
// línea del periodo: se dibuja de izquierda a derecha cada vez que cambia el titular o el periodo
function linea(x){ const s0 = V(x).s.filter(z => !z[2]), y = s0.map(z => z[1]); if (y.length<3) return ''; const me = y.reduce((a, b) => a+b, 0)/y.length, cv = Math.sqrt(y.reduce((a, b) => a+(b-me)*(b-me), 0)/y.length)/(me || 1); if (cv<0.12 && Math.abs(y[y.length-1]/(y[0] || 1)-1)<0.2) return ''; const W = 300, H = 44, mx = Math.max(...y), mn = Math.min(...y, 0);
  const P = y.map((v, i) => [(i/(y.length-1)*W).toFixed(1), (H-3-(v-mn)/((mx-mn) || 1)*(H-8)).toFixed(1)]), d = 'M'+P.map(p => p.join(',')).join('L'), Lp = Math.round(W*2.2);
  const et = z => (PER==='sem' ? dd(z[0]).replace(/ \d+$/, '') : mesA(z[0]))+'<br><b style="color:#fff;font:600 15px Barlow Condensed,sans-serif">'+cc(z[1]).join(' ')+'</b>';
  return '<div class="tl" style="--c:'+GC[x.g][0]+';--L:'+Lp+'"><small>'+et(s0[0])+'</small><div class="tlg"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><path class="ar" d="'+d+'L'+W+','+H+'L0,'+H+'Z"/><path class="ln" d="'+d+'" pathLength="'+Lp+'" vector-effect="non-scaling-stroke"/></svg><i class="dt2" style="top:'+(P[P.length-1][1]/H*100).toFixed(1)+'%"></i></div><small>'+et(s0[s0.length-1])+'</small></div>'; }
function cuenta(el){ el.querySelectorAll('[data-cu]').forEach(n => { const N = +n.dataset.cu, fin = n.textContent, t0 = performance.now(); if (N<5) return; const step = t => { const k = Math.min(1, (t-t0)/1100), e = 1-Math.pow(1-k, 3); n.textContent = k<1 ? cc(N*e).join(' ').replace(/ M$/, ' millones') : fin; if (k<1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }
function hl(i, dir){ HI = (i+ORD.length) % ORD.length; const x = DATA[ORD[HI]], tp = nats(x)[0] || edos(x)[0], el = $('hlt'), c = GC[x.g];
  const pinta = () => { el.className = 'tx'; el.innerHTML = '<div class="ey" style="--c:'+c[0]+'"><i></i>'+x.n+' · '+x.g+'</div><h1 data-ver style="--c:'+c[0]+';--cs:'+c[1]+'">'+titular(x)+'</h1>'+linea(x)+(tp ? '<p>'+tp[0]+' va primero con '+Math.round(tp[1]/V(x).T*100)+' de cada 100.</p>' : ''); cuenta(el); };
  if (dir){ el.classList.add(dir>0 ? 'outL' : 'outR'); setTimeout(pinta, 240); } else pinta();
  const hd = $('hd'); hd.classList.toggle('man', MAN); hd.innerHTML = ORD.map((z, j) => '<button data-h="'+j+'" aria-label="'+DATA[z].n+'" class="'+(j===HI ? 'on' : j<HI ? 'ya' : '')+'"><i></i></button>').join('');
  capas(x, 'mapa'); R.querySelectorAll('.ch').forEach(cc_ => cc_.classList.toggle('on', +cc_.dataset.i===ORD[HI]));
  clearTimeout(HT); HT = setTimeout(() => { MAN = false; hl(HI+1, 1); }, MAN ? 15000 : 8000); }
function fila(){ $('row').innerHTML = DATA.map((x, i) => { const [a, b] = cc(V(x).T), rr = r(x);
  return '<button class="ch" data-i="'+i+'" style="--c:'+GC[x.g][0]+';--cs:'+GC[x.g][1]+';animation-delay:'+(0.1+i*0.04)+'s"><span class="n"><i></i>'+x.n+'</span><span class="v num" data-cu="'+V(x).T+'">'+a+(b ? '<small>'+b+'</small>' : '')+'</span>'+(ALR.includes(i) ? '<span class="bad" title="Fuera de lo normal"></span>' : '')+'<span class="d">'+(rr==null ? f(V(x).T/dias())+' por día' : chip(rr)+' '+vsCorto())+'</span></button>'; }).join(''); R.querySelectorAll('.ch .v[data-cu]').forEach(n => { const N = +n.dataset.cu, html = n.innerHTML, t0 = performance.now(); if (N<5) return; const step = t => { const k = Math.min(1, (t-t0)/900), e = 1-Math.pow(1-k, 3), [a, b] = cc(N*e); n.innerHTML = k<1 ? a+(b ? '<small>'+b+'</small>' : '') : html; if (k<1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }
function setPer(p, abierto){ PER = p; if (TP(p)==='y' || TP(p)==='m') AY = p.slice(1, 5); menuPer(); $('dvh').innerHTML = docVig(); $('ley').insertAdjacentHTML('beforeend', '<span class="dvh dvm">'+docVig()+'</span>'); if (!abierto) $('pm').classList.remove('on');
  $('corte').innerHTML = '<i></i><span class="rg">'+(PER==='sem' ? 'Semana '+dd(PD().a).replace(/ \d+$/, '')+' – '+dd(PD().b) : dd(PD().a)+' – '+dd(PD().b))+' · </span>datos al '+dd(D.fin);
  orden(); alerta(); fila(); if (FICHA) ficha(FICHA[0], FICHA[1]); else if (CUR>=0) abrir(CUR); else hl(0); }

/* ---------- hoja del indicador ---------- */
let CUR = -1, TAB = 0, GCH = null;
const TABS = x => [['res', 'Cifra'], ['mes', 'Tendencia']].concat(nats(x).length ? [['nat', 'Origen']] : []).concat(edos(x).length ? [['edo', x.k==='cbp' ? 'Sector' : 'Lugar']] : []);
function abrir(i){ CUR = i; clearTimeout(HT); const x = DATA[i], c = GC[x.g], T = TABS(x), sh = $('sh'), v = V(x), rr = r(x);
  const s = v.s.filter(z => !z[2]), mxS = s.reduce((a, m) => m[1]>a[1] ? m : a, s[0]), gS = PER==='sem' ? 'Semana más alta' : 'Mes más alto';
  const lista = (l, tot) => '<div class="ls">'+l.slice(0, 5).map((z, j) => '<div class="it" style="animation-delay:'+(j*0.06)+'s"><span class="k">'+(j+1)+'</span><span class="nm">'+z[0]+'</span><span class="pc">'+(z[1]<5 ? '<small style="margin:0">menos de 5</small>' : Math.round(z[1]/tot*100)+'<small>de cada 100</small>')+'</span><span class="bb"><i style="width:'+(z[1]/l[0][1]*100).toFixed(0)+'%;animation-delay:'+(.1+j*0.06)+'s"></i></span></div>').join('')+'</div>';
  let fm; if (PER==='sem'){ const w = s.map(z => z[1]), pr = w.slice(0, -1).reduce((a, b) => a+b, 0)/(w.length-1), d = w[w.length-1]/pr-1; fm = 'Esta semana va <b>'+Math.abs(Math.round(d*100))+'% '+(d<0 ? 'abajo' : 'arriba')+'</b> del promedio de las 11 anteriores ('+cc(pr).join(' ')+').'; }
  else if (TP(PER)==='m' && v.W) fm = cap(PD().lab)+': <b>'+cc(v.T).join(' ')+'</b> contra '+cc(v.W).join(' ')+' en '+PD().cl+'.';
  else if (TP(PER)==='m') fm = cap(PD().lab)+': <b>'+cc(v.T).join(' ')+'</b>. '+cap(PD().nc)+'.';
  else if (TP(PER)==='y' && v.W && Math.abs(rr)<0.005) fm = PD().lab+' va <b>prácticamente igual</b> que '+PD().cl+'.';
  else if (TP(PER)==='y' && v.W) fm = PD().lab+' va <b>'+Math.abs(Math.round(rr*100))+'% '+(rr<0 ? 'abajo' : 'arriba')+'</b> de '+PD().cl+'.';
  else { const p0 = s[0][1], p1 = s[s.length-1][1], dl = p1/p0-1; fm = Math.abs(dl)<0.15 ? 'Se mantiene: <b>'+cc(p1).join(' ')+' al mes</b>, parecido al inicio del periodo.' : (dl<0 ? 'Bajó ' : 'Subió ')+'<b>'+Math.round(Math.abs(dl)*100)+'%</b>: de '+cc(p0).join(' ')+' al mes a <b>'+cc(p1).join(' ')+'</b>.'; }
  const body = { res:'<div class="unit">'+cap(PD().lab)+' · '+dd(PD().a)+' – '+dd(PD().b)+(PD().ca ? '' : ' · total acumulado')+'</div><div class="big num" data-n="'+v.T+'">'+(v.T<5 ? 'menos de 5' : '0')+'</div><div class="unit">'+U[x.k]+'</div><div class="ks">'+
      (v.W ? '<div><span>Contra '+PD().cl+'</span><b>'+(chip(rr) || '—')+'</b><em>'+fp(v.W)+' entonces</em></div>' : '<div><span>'+gS+'</span><b>'+cc(mxS[1]).join(' ')+'</b><em>'+mesA(mxS[0])+'</em></div>')+
      '<div><span>Promedio por día</span><b>'+fp(v.T/dias())+'</b><em>en el periodo</em></div></div>',
    mes:'<div class="fr">'+fm+'</div><div class="gr" data-g="mes"></div>',
    nat:nats(x).length ? '<div class="fr"><b>'+nats(x)[0][0]+'</b> va primero: '+Math.round(nats(x)[0][1]/v.T*100)+' de cada 100.</div>'+lista(nats(x), v.T) : '',
    edo:edos(x).length ? '<div class="fr"><b>'+edos(x)[0][0]+'</b> concentra '+Math.round(edos(x)[0][1]/v.T*100)+' de cada 100.</div>'+lista(edos(x), v.T) : '' };
  sh.style.cssText = '--c:'+c[0]+';--cs:'+c[1];
  sh.innerHTML = '<div class="grab"></div><div class="shh"><span class="ic">'+ico(x.k)+'</span><div class="t"><b>'+x.n+'</b><small>'+x.g+' · '+PD().lab+'</small></div><button class="rb pb" data-pulso title="Ver en Pulso" aria-label="Ver en Pulso"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg><span>Pulso</span></button><button class="rb" data-ip aria-label="Anterior"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><button class="rb" data-in aria-label="Siguiente"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button><button class="rb" data-x aria-label="Cerrar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="seg">'+T.map((t, j) => '<button data-tab="'+j+'">'+t[1]+'</button>').join('')+'</div><div class="vp"><div class="tr" id="tr">'+T.map(t => '<div class="tb" data-t="'+t[0]+'">'+body[t[0]]+'</div>').join('')+'</div></div>';
  const fue = $('app').classList.contains('sel'); $('app').classList.add('sel');
  tab(Math.min(TAB, T.length-1)); if (!fue){ VIEW = VIEW; setTimeout(() => tab(TAB), 60); } }
function tab(j){ const x = DATA[CUR], T = TABS(x); TAB = Math.max(0, Math.min(T.length-1, j)); const t = T[TAB][0];
  $('tr').style.transform = 'translateX('+(-TAB*100)+'%)'; R.querySelectorAll('.seg button').forEach((b, k) => b.classList.toggle('on', k===TAB));
  capas(x, t==='nat' ? 'nat' : t==='edo' ? 'edo' : 'mapa');
  const pane = R.querySelectorAll('.tb')[TAB]; pane.querySelectorAll('.it').forEach(e => { e.style.animation = 'none'; e.offsetHeight; e.style.animation = ''; });
  if (t==='res' && V(x).T>=5){ const n = pane.querySelector('[data-n]'), N = +n.dataset.n, t0 = performance.now(); const st = q => { const k = Math.min(1, (q-t0)/1100), e = 1-Math.pow(1-k, 3); n.textContent = f(N*e); if (k<1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
  if (t==='mes') requestAnimationFrame(() => graf(pane.querySelector('[data-g]'), x)); }
// gráfica con el estilo de la plataforma (cuadrícula tenue, área suave, globo de máximo)
function graf(el, x){ GCH && GCH.dispose(); GCH = null; if (!conTam(el)){ setTimeout(() => { if (conTam(el)) graf(el, x); }, 200); return; } GCH = echarts.init(el, null, { renderer:'canvas' }); const v = V(x), s = v.s, y = s.map(z => z[1]), col = GC[x.g][0], comp = s.map((z, i) => z[2] ? null : i).filter(i => i!=null), mI = comp.reduce((a, i) => y[i]>y[a] ? i : a, comp[0]);
  if (v.s2 && Math.max(...v.s2)>Math.max(...y)*3.5){ const n = y.length, a1 = y.reduce((a, b) => a+b, 0)/n, a0 = v.s2.slice(0, n).reduce((a, b) => a+b, 0)/n;
    GCH.setOption({ animationDuration:1200, grid:{ left:10, right:10, top:36, bottom:28 }, xAxis:{ type:'category', data:[cap(PD().cl), PD().lab], axisLine:{ lineStyle:{ color:'rgba(255,255,255,.2)' } }, axisTick:{ show:false }, axisLabel:{ color:'#CFE2DA', fontSize:12, fontFamily:'Barlow' } }, yAxis:{ type:'value', show:false, min:0 },
      series:[{ type:'bar', barWidth:'46%', data:[{ value:a0, itemStyle:{ color:'rgba(255,255,255,.28)', borderRadius:[8, 8, 0, 0] } }, { value:a1, itemStyle:{ color:col, borderRadius:[8, 8, 0, 0] } }],
        label:{ show:true, position:'top', color:'#fff', fontSize:15, fontWeight:600, fontFamily:'Barlow Condensed', formatter:p => cc(p.value).join(' ')+' al mes' } }] }); return; }
  const lab = s.map(z => PER==='sem' ? dd(z[0]).replace(/ \d+$/, '') : lm(z[0])+(z[2] ? '*' : '')), barras = PER==='sem' || TP(PER)==='m', iC = PD().ca && TP(PER)==='m' ? s.findIndex(z => z[0].slice(0, 7)===PD().ca.slice(0, 7)) : -1;
  const ser = barras ? [{ type:'bar', data:y.map((z, i) => ({ value:z, itemStyle:{ color:i===y.length-1 ? col : i===iC ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)', borderRadius:[4, 4, 0, 0] } })), barWidth:'58%',
      label:{ show:true, position:'top', fontSize:11, color:'#fff', fontFamily:'Barlow', formatter:p => cc(p.value).join(' ') }, labelLayout:{ hideOverlap:true } }]
    : [{ name:PD().lab, type:'line', data:y, smooth:.25, symbol:'circle', symbolSize:5, label:{ show:true, position:'top', distance:6, fontSize:10.5, color:'#E3EEE9', fontFamily:'Barlow', formatter:p => p.dataIndex===mI || (y.length>(innerWidth<700 ? 8 : 14) && (y.length-1-p.dataIndex) % (innerWidth<700 ? 3 : 2)) ? '' : cc(p.value).join(' ') }, labelLayout:{ hideOverlap:true }, lineStyle:{ width:2.8, color:col }, itemStyle:{ color:col, borderColor:'#16231F', borderWidth:1.5 },
        areaStyle:{ color:new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset:0, color:col+'55' }, { offset:1, color:col+'00' }]) },
        markPoint:{ symbol:'roundRect', symbolSize:[1, 1], label:{ show:true, position:mI<3 ? 'right' : mI>y.length-4 ? 'left' : 'top', distance:8, formatter:'máximo · '+cc(y[mI]).join(' '), backgroundColor:'#fff', color:'#1F3B33', padding:[3, 7], borderRadius:5, fontSize:11.5, fontWeight:600, fontFamily:'Barlow' }, data:[{ coord:[mI, y[mI]] }] } }]
      .concat(v.s2 ? [{ name:PD().cl.replace(' al mismo día', ''), type:'line', data:v.s2.slice(0, y.length), smooth:.25, symbol:'circle', symbolSize:3,  lineStyle:{ width:2, color:'rgba(255,255,255,.45)', type:'dashed' } }] : []);
  GCH.setOption({ animationDuration:1200, animationEasing:'cubicOut', grid:{ left:42, right:14, top:v.s2 ? 34 : 30, bottom:24 }, legend:v.s2 ? { top:0, right:0, icon:'roundRect', itemWidth:14, itemHeight:3, textStyle:{ fontSize:11, color:'#CFE2DA', fontFamily:'Barlow' } } : undefined,
    tooltip:{ trigger:'axis', confine:true, backgroundColor:'#fff', borderWidth:0, textStyle:{ color:'#2B2926', fontFamily:'Barlow', fontSize:12 }, valueFormatter:z => fp(z) },
    xAxis:{ type:'category', data:lab, axisLine:{ lineStyle:{ color:'rgba(255,255,255,.2)' } }, axisTick:{ show:false }, axisLabel:{ color:'#A9C4BA', fontSize:10.5, interval:PER==='sem' ? 1 : y.length>14 ? 3 : innerWidth<700 ? 1 : 0 }, splitLine:{ show:true, lineStyle:{ color:'rgba(255,255,255,.05)' } } },
    yAxis:{ type:'value', min:0, axisLabel:{ color:'#A9C4BA', fontSize:10, formatter:z => cc(z).join(' ') }, splitLine:{ lineStyle:{ color:'rgba(255,255,255,.08)' } } }, series:ser }); }
function cerrar(){ FICHA = null; $('app').classList.remove('sel'); CUR = -1; TAB = 0; GCH && GCH.dispose(); GCH = null; setTimeout(() => hl(HI), 50); }

/* ---------- mapa tocable: un estado dice cuántos y qué lugar ocupa ---------- */
MAP.on('click', p => { if (p.componentType!=='geo' || !GEO.features.some(g => g.properties.t==='m' && g.properties.name===p.name)) return; const x = CUR>=0 ? DATA[CUR] : DATA[ORD[HI]], ea = V(x).ea || [], k = ea.findIndex(z => z[0]===p.name), pop = $('pop');
  const v = k>=0 ? ea[k][1] : 0; pop.innerHTML = '<b>'+p.name+'</b>'+(v ? '<strong>'+fp(v)+'</strong><br>'+(v<5 ? '' : Math.round(v/V(x).T*100)+' de cada 100 · ')+'lugar '+(k+1)+' de '+ea.length : 'Sin registros')+'<br><span style="opacity:.7">'+x.n+' · '+PD().lab+'</span>';
  pop.style.left = p.event.offsetX+'px'; pop.style.top = p.event.offsetY+'px'; pop.classList.add('on'); clearTimeout(pop.t); pop.t = setTimeout(() => pop.classList.remove('on'), 3200); });
/* ---------- búsqueda única: país, estado u O.R.; si no es lugar, va a Pregunta a INAMI ---------- */
const nrm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const PAISES = [...new Set(DATA.flatMap(x => Object.keys(P_(x, 'shein').na || {})))].filter(n => n!=='Otras' && n!=='México').sort((a, b) => a.localeCompare(b, 'es'));
const ESTADOS = [...new Set(DATA.flatMap(x => Object.keys(P_(x, 'shein').eaM || {})))].filter(n => n!=='Otras').sort((a, b) => a.localeCompare(b, 'es'));
let BQSEL = 0, BQL = [];
function bqPinta(){ const t = nrm($('bqin').value), r_ = $('bqr');
  const m = l => l.filter(n => !t || nrm(n).includes(t)).sort((a, b) => (nrm(a).startsWith(t) ? 0 : 1)-(nrm(b).startsWith(t) ? 0 : 1)).slice(0, t ? 6 : 0);
  const P = m(PAISES).map(n => ['n', n]), E = m(ESTADOS).map(n => ['e', n]);
  BQL = E.concat(P); BQSEL = 0;
  r_.innerHTML = !t ? '<div class="hd2">Prueba con</div>'+[['n', 'Venezuela'], ['e', 'Chiapas'], ['n', 'India'], ['e', 'Baja California']].map((z, j) => '<button data-bqi="'+j+'"><b>'+z[1]+'</b><span class="tg">'+(z[0]==='n' ? 'país' : 'estado')+'</span></button>').join('')
    : BQL.map((z, j) => '<button data-bqi="'+j+'" class="'+(j===0 ? 'on' : '')+'">'+(z[0]==='q' ? 'Preguntar a INAMI: <b>«'+z[1]+'»</b>' : '<b>'+z[1]+'</b><span class="tg">'+(z[0]==='n' ? 'país' : 'estado / O.R.')+'</span>')+'</button>').join('') || '<div class="hd2">Sin coincidencias · escribe un país, un estado o una O.R.</div>';
  if (!t) BQL = [['n', 'Venezuela'], ['e', 'Chiapas'], ['n', 'India'], ['e', 'Baja California']]; }
function bqAbre(){ $('bq').classList.add('on'); const i = $('bqin'); i.value = ''; bqPinta(); setTimeout(() => i.focus(), 60); }
function bqCierra(){ $('bq').classList.remove('on'); }
function bqElige(z){ bqCierra();  ficha(z[0], z[1]); }
$('bqin').addEventListener('input', bqPinta);
$('bqin').addEventListener('keydown', e => { if (e.key==='Enter' && BQL[BQSEL]) bqElige(BQL[BQSEL]); if (e.key==='Escape') bqCierra(); });
// cuadro del estado en el mapa
const BBE = {}; GEO.features.filter(g => g.properties.t==='m').forEach(g => { let b = [180, 90, -180, -90]; const w = c => typeof c[0]==='number' ? (b = [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])]) : c.forEach(w); w(g.geometry.coordinates); BBE[g.properties.name] = b; });
let FICHA = null;
// Extranjeros con documento vigente: es un conteo al corte (no un flujo del periodo); total, por país o por estado
function docVig(t, nom){ const d = (window.IANAMI_DATOS || {}).docs, DN = window.IANAMI_DATOS || {}; if (!d) return ''; let v = null;
  if (!t) v = [d.total, d.h, d.m]; else if (t==='n'){ const i = (DN.nats || []).findIndex(x => x[0]===nom); v = i>=0 && d.nat[i] ? d.nat[i] : null; } else { const i = (DN.ests || []).indexOf(nom); v = i>=0 && d.est[i] != null ? [].concat(d.est[i]) : null; }
  if (!v || !v[0]) return t ? '<div class="fdv">Sin extranjeros con documento vigente registrados al '+dd(d.corte)+'.</div>' : '';
  const m = v[2]!=null && v[0]>=5 ? ' · '+Math.round(v[2]/v[0]*100)+'% mujeres' : '';
  return t ? '<div class="fdv"><span>Con documento vigente</span><b class="num">'+fp(v[0])+'</b><em>al '+dd(d.corte)+m+'</em></div>' : '<b class="num">'+fp(v[0])+'</b><span>con documento vigente</span><em>al '+dd(d.corte)+'</em>'; }
// ficha de un país o estado: agrupada como las tarjetas, con el lugar que ocupa en cada indicador y una frase de dónde pesa más.
// Cada indicador se despliega con sus 5 principales: del país, los estados (o sectores) por donde aparece; del estado, las nacionalidades.
const FXC = {};
function desglose(x, t, nom){ const key = x.k+'|'+t+'|'+nom+'|'+PER; if (FXC[key]!==undefined) return FXC[key];
  const M = window.IANAMI_MOTOR, I = M.INDK[x.k], B = M.BASES[I.b], p = PD(), fd = t==='n' ? 'n' : 'e'; let r = null;
  if (B.dims[fd]){ const i = B.dims[fd].vals.indexOf(nom), dd = t==='n' ? (x.k==='cbp' ? 'sec' : 'e') : (B.dims.n ? 'n' : B.dims.p ? 'p' : null);
    if (i>=0 && dd && B.dims[dd]){ const l = M.porDim({ ind:I, d0:p.a, d1:p.b, filtros:{ [fd]:[i] } }, dd).filter(z => z[1]>0).sort((a, b) => b[1]-a[1]).map(([j, v]) => [B.dims[dd].vals[j], v]).filter(z => z[0]!=='Otras' && z[0]!=='México' || dd!=='n');
      r = { dd, l, tit:dd==='n' ? 'Principales nacionalidades' : dd==='sec' ? 'Principales sectores' : dd==='p' ? 'Principales puntos' : 'Principales estados / O.R.' }; } }
  return FXC[key] = r; }
let FXA = -1;
function fichaMapa(t, nom, x, l){ const col = x ? GC[x.g][0] : '#5FB79B', S5 = (l || []).filter(z => t==='n' ? CEN[z[0]] : pos(z[0])).slice(0, 5), mx = Math.max(1, ...S5.map(z => z[1]));
  const regs = GEO.features.filter(g => g.properties.t!=='p').map(g => ({ name:g.properties.name, itemStyle:g.properties.t==='u' ? USS : g.properties.name===nom ? { areaColor:col+'8C', borderColor:col, borderWidth:1.5 } : MXS }));
  const lin = S5.length ? S5.map(z => ({ coords:t==='n' ? [pos(nom), CEN[z[0]]] : [pos(z[0]), CEN[nom]], lineStyle:LEJOS(t==='n' ? pos(nom) : pos(z[0])) ? { width:2.6, opacity:.9 } : undefined }))
    : t==='n' && pos(nom) ? [{ coords:[pos(nom), MX], lineStyle:LEJOS(pos(nom)) ? { width:2.6, opacity:.9 } : undefined }] : [];
  const pts = (pos(nom) ? [{ name:nom, value:pos(nom).concat(mx), label:{ show:true, formatter:nomP(nom) } }] : []).concat(S5.map(z => ({ name:z[0], value:(t==='n' ? CEN[z[0]] : pos(z[0])).concat(z[1]) })));
  MAP.setOption({ geo:{ regions:regs }, series:[{ id:'fl', type:'lines', coordinateSystem:'geo', zlevel:1, effect:{ show:true, period:2.8, trailLength:.5, symbol:'circle', symbolSize:5, color:'#fff' }, lineStyle:{ color:col, width:1.8, opacity:.62, curveness:.28 }, data:[] },
    { type:'effectScatter', coordinateSystem:'geo', rippleEffect:{ scale:3.2, brushType:'stroke' }, symbolSize:p => p[2]===mx && !S5.length ? 16 : 6+Math.sqrt(p[2]/mx)*14, itemStyle:{ color:col, shadowBlur:14, shadowColor:col },
      label:{ show:true, position:'right', color:'#fff', fontSize:12.5*ZM(), fontWeight:600, fontFamily:'Barlow', textBorderColor:'rgba(16,24,21,.9)', textBorderWidth:3, formatter:p => p.name===nom ? p.name : p.name+'  '+cc(p.value[2]).join(' ') }, labelLayout:{ hideOverlap:true }, data:pts }] }, { replaceMerge:['series'] });
  const P = pts.map(p => p.value.slice(0, 2)), dur = mover(t==='e' && BBE[nom] && !S5.length ? [BBE[nom][0]-1.5, BBE[nom][1]-1.5, BBE[nom][2]+1.5, BBE[nom][3]+1.5] : P.length>1 ? bbDe(P.concat(t==='n' ? [] : [[-104, 28], [-90, 16]])) : P.length ? bbDe([P[0], [-104, 28], [-90, 16]]) : BB_MX);
  clearTimeout(capas.t); if (lin.length) capas.t = setTimeout(() => { if (MAPOK() && FICHA) MAP.setOption({ series:[{ id:'fl', data:lin }] }); }, dur ? dur+120 : 350); }
function abreFx(i){ const t = FICHA[0], nom = FICHA[1], it = R.querySelector('.fgi[data-fx="'+i+'"]'); if (!it) return;
  R.querySelectorAll('.fgi.on').forEach(e => { if (e!==it) e.classList.remove('on'); });
  const d = it.querySelector('.fgd'); if (it.classList.contains('on')){ it.classList.remove('on'); FXA = -1; fichaMapa(t, nom); return; }
  let g = null; const x = DATA[i], a = (t==='n' ? V(x).na : V(x).eaM)[nom] || 0; try { g = desglose(x, t, nom); } catch(e){ console.error(e); }
  d.innerHTML = '<div class="fgdw"><div class="fgdi">'+(g && g.l.length ? '<div class="fgt2">'+g.tit+'</div>'+g.l.slice(0, 5).map((z, j) => '<div class="it" style="animation-delay:'+(j*0.05)+'s"><span class="k">'+(j+1)+'</span><span class="nm">'+z[0]+'</span><span class="pc">'+(z[1]<5 ? '<small style="margin:0">menos de 5</small>' : fp(z[1])+'<small>'+Math.round(z[1]/a*100)+'%</small>')+'</span><span class="bb"><i style="width:'+(z[1]/g.l[0][1]*100).toFixed(0)+'%;animation-delay:'+(.08+j*0.05)+'s"></i></span></div>').join('')
    : '<div class="fgt2">Esta base no trae el desglose para '+nom+'.</div>')+'<button class="fgv" data-i="'+i+'">Ver detalle de '+x.n.toLowerCase()+' ›</button></div></div>';
  it.classList.add('on'); FXA = i;   // se abre con CSS (sin medir alturas): funciona igual con zoom y en cualquier navegador fichaMapa(t, nom, x, g ? g.l : []);
  setTimeout(() => it.scrollIntoView({ block:'nearest', behavior:RM ? 'auto' : 'smooth' }), 380); }
function ficha(t, nom){ limpia(); FICHA = [t, nom]; CUR = -1; FXA = -1; clearTimeout(HT); const sh = $('sh');
  const fil = DATA.map((x, i) => { const v = V(x), m = t==='n' ? v.na : v.eaM, w = t==='n' ? v.naW : v.eaW, l = (t==='n' ? v.nl : v.el) || []; if (!m) return null;
    const a = m[nom] || 0, b = w ? (w[nom] || 0) : null, k = l.findIndex(z => z[0]===nom); return { x, i, a, rr:b ? a/b-1 : null, k:k+1, de:l.length, sh:v.T ? a/v.T : 0 }; }).filter(Boolean);
  const con = fil.filter(o => o.a>0), sin = fil.filter(o => !o.a), top = con.slice().sort((p, q) => p.k-q.k || q.sh-p.sh)[0];
  const res = top ? '<b>'+nom+'</b> pesa más en <b>'+top.x.n.toLowerCase()+'</b>: lugar '+top.k+' de '+top.de+(top.a>=5 && top.sh>=0.01 ? ', con '+Math.round(top.sh*100)+' de cada 100' : '')+'.' : 'Sin registros de <b>'+nom+'</b> en '+PD().lab+'.';
  const grupos = Object.keys(GC).map(g => { const l = con.filter(o => o.x.g===g); return l.length ? '<div class="fg" style="--c:'+GC[g][0]+'"><div class="fgt"><i></i>'+g+'</div>'+
    l.map(o => '<div class="fgi" data-fx="'+o.i+'"><button class="fgb" data-fx="'+o.i+'" aria-expanded="false"><span class="fn">'+o.x.n+'<small>lugar '+o.k+' de '+o.de+'</small></span><b class="num">'+fp(o.a)+(o.rr!=null ? chip(o.rr) : '')+'</b><svg class="cv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="fgd"></div></div>').join('')+'</div>' : ''; }).join('');
  sh.style.cssText = '--c:#5FB79B;--cs:rgba(95,183,155,.2)';
  sh.innerHTML = '<div class="grab"></div><div class="shh"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></span><div class="t"><b>'+nom+'</b><small>'+(t==='n' ? 'País' : 'Estado / O.R.')+' · '+PNOM(PER)+'</small></div><button class="rb pb" data-pulso title="Ver en Pulso" aria-label="Ver en Pulso"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg><span>Pulso</span></button><button class="rb" data-x aria-label="Cerrar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="vp"><div class="tb fic" style="flex:none;height:100%"><div class="fr">'+res+'</div><div class="fley">'+(PD().ca ? '▲▼ '+vsCorto() : PD().nc ? cap(PD().nc) : 'Total acumulado · '+dd(PD().a)+' – '+dd(PD().b))+' · toca un indicador para ver sus 5 principales</div>'+docVig(t, nom)+grupos+
    (sin.length ? '<div class="f0"><b>Sin registros en:</b> '+sin.map(o => o.x.n).join(', ')+'</div>' : '')+'</div></div>';
  $('app').classList.add('sel'); fichaMapa(t, nom); }
/* ---------- gestos ---------- */
function toast(t){ const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }
R.addEventListener('click', e => { const T = s => e.target.closest(s);
  if (T('[data-pm]')){ $('pm').classList.toggle('on'); return; }
  if (!T('#pm') || T('[data-per]')) {} if (!T('#pm')) $('pm').classList.remove('on');
  if (T('[data-bq]')) return bqAbre(); if (T('[data-bqx]') || e.target.id==='bq') return bqCierra();
  const bi = T('[data-bqi]'); if (bi) return bqElige(BQL[+bi.dataset.bqi]);
  if (T('[data-pulso]')) return irPulso();
  if (T('[data-inf]')) return informe();
  if (T('[data-salir]')) return salir(true);
  if (T('[data-compartir]')){ $('cm').classList.toggle('on'); return; }
  if (T('[data-cmw]')) return comparte('wa'); if (T('[data-cmc]')) return comparte('copia');
  if (!T('#cm')) $('cm').classList.remove('on');
  const ay = T('[data-ay]'); if (ay){ AY = ay.dataset.ay; setPer('y'+AY, true); return; }
  if (T('[data-sala]')){ $('app').classList.toggle('sala'); $('pm').classList.remove('on'); MAN = false; hl(HI); return; }
  const al = T('[data-al]'); if (al) return abrir(+al.dataset.al);
  const pb = T('[data-per]'); if (pb) return setPer(pb.dataset.per);
  if (T('[data-hp]')){ MAN = true; return hl(HI-1, -1); } if (T('[data-hn]')){ MAN = true; return hl(HI+1, 1); }
  const h = T('[data-h]'); if (h){ MAN = true; const j = +h.dataset.h; return hl(j, j>HI ? 1 : -1); }
  if (T('[data-ver]')) return abrir(ORD[HI]);
  const fx = T('.fgb[data-fx]'); if (fx) return abreFx(+fx.dataset.fx);
  const c = T('.ch, .fi button, .fgv'); if (c){ FICHA = null; return abrir(+c.dataset.i); }
  const tb = T('[data-tab]'); if (tb) return tab(+tb.dataset.tab);
  if (T('[data-x]')) return cerrar(); if (T('[data-in]')) return abrir((CUR+1) % DATA.length); if (T('[data-ip]')) return abrir((CUR-1+DATA.length) % DATA.length); });
function swipe(el, fx, fy){ let x0 = null, y0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive:true });
  el.addEventListener('touchend', e => { if (x0==null) return; const dx = e.changedTouches[0].clientX-x0, dy = e.changedTouches[0].clientY-y0; x0 = null;
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2) fx(dx<0 ? 1 : -1); else if (fy && dy>70 && Math.abs(dy)>Math.abs(dx)) fy(); }); }
swipe($('hl'), d => { MAN = true; hl(HI+d, d); });
swipe($('sh'), d => { if (CUR>=0) tab(TAB+d); }, () => cerrar());
addEventListener('keydown', e => { if (!ACTIVA || document.body.classList.contains('en-inf') || document.body.classList.contains('modal')) return; const bq = $('bq').classList.contains('on'); if (bq && e.key!=='Escape') return;
  const ok = () => { e.stopImmediatePropagation(); e.preventDefault(); };
  if (e.key==='Escape'){ ok(); if (bq) return bqCierra(); if ($('pm').classList.contains('on')) return $('pm').classList.remove('on'); if (CUR>=0 || FICHA) return cerrar(); return; }
  if (CUR<0 && !FICHA){ if (e.key==='ArrowRight'){ ok(); MAN = true; hl(HI+1, 1); } if (e.key==='ArrowLeft'){ ok(); MAN = true; hl(HI-1, -1); } return; }
  if (CUR>=0){ if (e.key==='ArrowRight'){ ok(); tab(TAB+1); } if (e.key==='ArrowLeft'){ ok(); tab(TAB-1); } } }, true);
addEventListener('resize', () => { if (!ACTIVA || !innerWidth || !innerHeight) return; fijaZ(); MAPEL.style.width = ''; MAPEL.style.height = ''; if (conTam(MAPEL)) MAP.resize(); GCH && conTam(GCH.getDom()) && GCH.resize(); VIEW = null; if (CUR>=0) tab(TAB); else capas(DATA[ORD[HI]], 'mapa'); });
$('vis').innerHTML = visita();
$('vis').innerHTML = visita();
/* ---------- salidas: Pulso con el mismo periodo e indicador o lugar; informe migratorio; Pregunta a INAMI ---------- */
function irPulso(){ const p = PD(), o = {}; if (PER==='shein' || PER==='trump') o.per = PER;
  else if (TP(PER)==='y'){ o.per = 'anio'; o.anio = +PER.slice(1); o.mes = 0; } else if (TP(PER)==='m'){ o.per = 'anio'; o.anio = +PER.slice(1, 5); o.mes = +PER.slice(6, 8); }
  else { o.per = 'pers'; o.desde = p.a; o.hasta = p.b; }
  if (FICHA){ o.dim = FICHA[0]; o.nom = FICHA[1]; } else if (CUR>=0) o.ind = ({ nna:'can', rec:'recib' })[DATA[CUR].k] || DATA[CUR].k;
  salir(); if (window.IANAMI_PULSO && window.IANAMI_PULSO.desdeVistazo) window.IANAMI_PULSO.desdeVistazo(o); }
function informe(){ const va = () => window.IANAMI_ANALIZAR.informe(INF.a, INF.b, 'trump');   // al cerrarlo se regresa aquí
  if (window.IANAMI_ANALIZAR) return va(); toast('Abriendo el informe…'); (window.IANAMI_CARGAR ? window.IANAMI_CARGAR('analizar') : Promise.reject()).then(va, () => toast('No se pudo abrir el informe. Revisa tu conexión.')); }
// Liga corta del resumen: abre solo esta vista (sin Informe, Pulso ni Salir); muestra los datos vigentes al abrirla
function comparte(como){ $('cm').classList.remove('on'); const u = location.origin+location.pathname+'?resumen-inami', txt = 'Resumen INAMI';
  if (como==='wa'){ window.open('https://wa.me/?text='+encodeURIComponent(txt+': '+u), '_blank', 'noopener'); return; }
  const ok = () => toast('Liga copiada: Resumen INAMI'), mal = () => { window.prompt('Copia la liga del Resumen INAMI:', u); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, mal); else mal(); }
// ECharts y el zoom: la hoja y la portada se agrandan con CSS zoom (pantallas grandes) y el mapa «respira» con una escala;
// ECharts toma el mouse sin esa escala y el globo salía lejos de la línea. Aquí se le da la posición ya corregida (zrX, zrY).
['mousemove','mousedown','mouseup','click','dblclick','mouseover','mouseout','pointermove','pointerdown','pointerup','wheel','mousewheel','contextmenu'].forEach(t => R.addEventListener(t, e => {
  if (e.zrX!=null || e.clientX==null) return; let x = e.target; while (x && x.getAttribute && !x.getAttribute('_echarts_instance_')) x = x.parentNode;
  if (!x || !x.getAttribute) return; const r = x.firstElementChild || x; if (!r.offsetWidth) return; const b = r.getBoundingClientRect(), k = b.width/r.offsetWidth; if (Math.abs(k-1)<0.01) return;
  e.zrX = (e.clientX-b.left)/k; e.zrY = (e.clientY-b.top)/k; }, { capture:true, passive:true }));
setPer('shein');
return { pausa(){ clearTimeout(HT); clearTimeout(capas.t); $('pm').classList.remove('on'); bqCierra(); },
  sigue(){ fijaZ(); MAPEL.style.width = ''; MAPEL.style.height = ''; if (conTam(MAPEL)) MAP.resize(); VIEW = null; if (FICHA || CUR>=0) cerrar(); else hl(HI); } };   // al volver a entrar abre limpio: sin la hoja o la ficha que quedó abierta (el periodo se conserva)

}
function abrir(op){ op = op || {};
  if (!HOST){ HOST = document.createElement('div'); HOST.id = 'vistazo'; HOST.setAttribute('role', 'dialog'); HOST.setAttribute('aria-label', 'De un vistazo'); document.body.appendChild(HOST);
    R = HOST.attachShadow({ mode:'open' }); R.innerHTML = '<style>'+CSS+'</style>'+BODY; R.addEventListener('click', e => { if (!API && e.target.closest('[data-salir]')) salir(true); }); }
  HOST.style.display = 'block'; ACTIVA = true; document.documentElement.classList.add('vz-on');
  if (op.compartido){ HOST.dataset.modo = 'compartido'; document.title = 'Resumen INAMI'; }
  document.documentElement.classList.remove('vz-arranque');   // la pantalla verde de arranque ya la cubre el Vistazo
  pideFS(); if (!pideFS.listo){ pideFS.listo = true; R.addEventListener('click', pideFS, true); /* en el clic y no al apoyar el dedo: si la pantalla cambia de tamaño a medio toque, el navegador cancela el clic */ }
  if (API) return API.sigue();
  if (abrir.armando) return; abrir.armando = true;   // un doble clic en «Vistazo» armaba la vista dos veces y cada toque se aplicaba doble (el desglose se abría y cerraba)
  const cv = $('cargav'); cv.hidden = false;
  setTimeout(() => { try { const D = armaDatos(), GEO = armaGeo(); API = montar(D, GEO, armaCen(GEO)); }
    catch(e){ abrir.armando = false; console.error(e); cv.innerHTML = '<span>No se pudo preparar la vista.<button data-salir>Volver</button></span>'; return; }
    cv.classList.add('fuera'); setTimeout(() => { cv.hidden = true; }, 500); }, 60); }
// «Salir» siempre lleva al Pulso; desde «Ver en Pulso» se cierra y Pulso se abre ya filtrado
function salir(alPulso){ if (!HOST || !ACTIVA) return; ACTIVA = false; if (API) API.pausa(); HOST.style.display = 'none'; document.documentElement.classList.remove('vz-on');
  const fe = document.fullscreenElement || document.webkitFullscreenElement, sal = document.exitFullscreen || document.webkitExitFullscreen;
  if (fe && sal){ try { const p = sal.call(document); if (p && p.catch) p.catch(() => {}); } catch(e){} }
  if (alPulso === true && window.IANAMI_PULSO && window.IANAMI_PULSO.ir) window.IANAMI_PULSO.ir(); }
// El Vistazo va siempre en pantalla completa: se pide al abrir y, si el navegador no la dio (al abrir una liga hace falta un toque), con el siguiente clic o toque
function pideFS(){ if (!ACTIVA || document.body.classList.contains('en-inf')) return; const d = document.documentElement, fs = d.requestFullscreen || d.webkitRequestFullscreen;
  if (fs && !(document.fullscreenElement || document.webkitFullscreenElement)){ try { const p = fs.call(d); if (p && p.catch) p.catch(() => {}); } catch(e){} } }
window.IANAMI_VISTAZO = { abrir:abrir, cerrar:salir, activa:() => ACTIVA };
})();
