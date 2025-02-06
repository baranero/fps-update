(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[185],{6435:function(t,r,a){"use strict";a.d(r,{F:function(){return y},f:function(){return $}});var i=a(2265);let l=["light","dark"],s="(prefers-color-scheme: dark)",o="undefined"==typeof window,n=(0,i.createContext)(void 0),c={setTheme:t=>{},themes:[]},y=()=>{var t;return null!==(t=(0,i.useContext)(n))&&void 0!==t?t:c},$=t=>(0,i.useContext)(n)?i.createElement(i.Fragment,null,t.children):i.createElement(f,t),d=["light","dark"],f=({forcedTheme:t,disableTransitionOnChange:r=!1,enableSystem:a=!0,enableColorScheme:o=!0,storageKey:c="theme",themes:h=d,defaultTheme:x=a?"system":"light",attribute:u="data-theme",value:g,children:C,nonce:j})=>{let[w,k]=(0,i.useState)(()=>S(c,x)),[v,N]=(0,i.useState)(()=>S(c)),_=g?Object.values(g):h,O=(0,i.useCallback)(t=>{let i=t;if(!i)return;"system"===t&&a&&(i=p());let s=g?g[i]:i,n=r?b():null,c=document.documentElement;if("class"===u?(c.classList.remove(..._),s&&c.classList.add(s)):s?c.setAttribute(u,s):c.removeAttribute(u),o){let t=l.includes(x)?x:null,r=l.includes(i)?i:t;c.style.colorScheme=r}null==n||n()},[]),L=(0,i.useCallback)(t=>{k(t);try{localStorage.setItem(c,t)}catch(t){}},[t]),T=(0,i.useCallback)(r=>{let i=p(r);N(i),"system"===w&&a&&!t&&O("system")},[w,t]);(0,i.useEffect)(()=>{let t=window.matchMedia(s);return t.addListener(T),T(t),()=>t.removeListener(T)},[T]),(0,i.useEffect)(()=>{let e=t=>{t.key===c&&L(t.newValue||x)};return window.addEventListener("storage",e),()=>window.removeEventListener("storage",e)},[L]),(0,i.useEffect)(()=>{O(null!=t?t:w)},[t,w]);let P=(0,i.useMemo)(()=>({theme:w,setTheme:L,forcedTheme:t,resolvedTheme:"system"===w?v:w,themes:a?[...h,"system"]:h,systemTheme:a?v:void 0}),[w,L,t,v,a,h]);return i.createElement(n.Provider,{value:P},i.createElement(m,{forcedTheme:t,disableTransitionOnChange:r,enableSystem:a,enableColorScheme:o,storageKey:c,themes:h,defaultTheme:x,attribute:u,value:g,children:C,attrs:_,nonce:j}),C)},m=(0,i.memo)(({forcedTheme:t,storageKey:r,attribute:a,enableSystem:o,enableColorScheme:n,defaultTheme:c,value:d,attrs:m,nonce:h})=>{let x="system"===c,u="class"===a?`var d=document.documentElement,c=d.classList;c.remove(${m.map(t=>`'${t}'`).join(",")});`:`var d=document.documentElement,n='${a}',s='setAttribute';`,g=n?l.includes(c)&&c?`if(e==='light'||e==='dark'||!e)d.style.colorScheme=e||'${c}'`:"if(e==='light'||e==='dark')d.style.colorScheme=e":"",$=(t,r=!1,i=!0)=>{let s=d?d[t]:t,o=r?t+"|| ''":`'${s}'`,c="";return n&&i&&!r&&l.includes(t)&&(c+=`d.style.colorScheme = '${t}';`),"class"===a?c+=r||s?`c.add(${o})`:"null":s&&(c+=`d[s](n,${o})`),c},C=t?`!function(){${u}${$(t)}}()`:o?`!function(){try{${u}var e=localStorage.getItem('${r}');if('system'===e||(!e&&${x})){var t='${s}',m=window.matchMedia(t);if(m.media!==t||m.matches){${$("dark")}}else{${$("light")}}}else if(e){${d?`var x=${JSON.stringify(d)};`:""}${$(d?"x[e]":"e",!0)}}${x?"":"else{"+$(c,!1,!1)+"}"}${g}}catch(e){}}()`:`!function(){try{${u}var e=localStorage.getItem('${r}');if(e){${d?`var x=${JSON.stringify(d)};`:""}${$(d?"x[e]":"e",!0)}}else{${$(c,!1,!1)};}${g}}catch(t){}}();`;return i.createElement("script",{nonce:h,dangerouslySetInnerHTML:{__html:C}})},()=>!0),S=(t,r)=>{let a;if(!o){try{a=localStorage.getItem(t)||void 0}catch(t){}return a||r}},b=()=>{let t=document.createElement("style");return t.appendChild(document.createTextNode("*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}")),document.head.appendChild(t),()=>{window.getComputedStyle(document.body),setTimeout(()=>{document.head.removeChild(t)},1)}},p=t=>(t||(t=window.matchMedia(s)),t.matches?"dark":"light")},8474:function(t,r,a){Promise.resolve().then(a.bind(a,29))},29:function(t,r,a){"use strict";a.r(r),a.d(r,{default:function(){return RootLayout}});var i=a(7437),l=a(1371),s=a.n(l),o=a(6691),n=a.n(o),c=a(1396),d=a.n(c),m=a(8409),h=a(4873),components_Footer=()=>{let t=new Date,r=t.getFullYear();return(0,i.jsx)(i.Fragment,{children:(0,i.jsxs)("footer",{className:"wow fadeInUp relative z-10 bg-white pt-16 dark:bg-gray-dark md:pt-20 lg:pt-24","data-wow-delay":".1s",children:[(0,i.jsxs)("div",{className:"container",children:[(0,i.jsxs)("div",{className:"-mx-4 flex flex-wrap",children:[(0,i.jsx)("div",{className:"w-full px-4 md:w-1/2 lg:w-4/12 xl:w-5/12",children:(0,i.jsxs)("div",{className:"mb-12 max-w-[360px] lg:mb-16",children:[(0,i.jsxs)(d(),{href:"/",className:"mb-8 inline-block",children:[(0,i.jsxs)("div",{className:"flex items-center",children:[(0,i.jsx)(n(),{src:"/images/logo/logo.webp",alt:"logo",width:50,height:30,className:"dark:hidden"}),(0,i.jsxs)("p",{className:"w-full pl-0 font-bold dark:hidden",children:["Fire Protection"," ",(0,i.jsx)("span",{className:"text-primary",children:"Solutions"})]})]}),(0,i.jsxs)("div",{className:"flex items-center",children:[(0,i.jsx)(n(),{src:"/images/logo/logo.webp",alt:"logo",width:50,height:30,className:"hidden dark:block"}),(0,i.jsxs)("p",{className:"hidden w-full pl-0 font-bold dark:block",children:["Fire Protection"," ",(0,i.jsx)("span",{className:"text-primary",children:"Solutions"})]})]})]}),(0,i.jsx)("p",{className:"mb-9 text-base leading-relaxed text-body-color dark:text-body-color-dark",children:"Kompleksowe usługi w zakresie ochrony przeciwpożarowej obejmujące projektowanie system\xf3w, opracowywanie dokumenatcji oraz symulacje CFD."}),(0,i.jsx)("div",{className:"w-full px-4",children:(0,i.jsxs)("div",{className:"wow fadeInUp mb-12 rounded-sm py-11  ","data-wow-delay":".15s ",children:[(0,i.jsx)("h2",{className:"mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl",children:"Skontaktuj się"}),(0,i.jsx)("p",{className:"mb-12 text-base font-medium text-body-color",children:"Wybierz tradycyjną formę kontaktu."}),(0,i.jsxs)("div",{className:"mx-[-12px] flex flex-wrap",children:[(0,i.jsxs)("div",{className:"w-full p-3 flex  gap-4 items-center text-lg font-medium text-body-color",children:[(0,i.jsx)(m.I7T,{className:"text-primary",size:25}),(0,i.jsx)("a",{href:"tel:+48790782993",children:"+48 790 782 993"})]}),(0,i.jsxs)("div",{className:"w-full p-3 flex  gap-4 items-center text-lg font-medium text-body-color",children:[(0,i.jsx)(h.GX9,{className:"text-primary",size:25}),(0,i.jsx)("a",{href:"mailto:biuro@fp-solutions.pl",children:"biuro@fp-solutions.pl"})]})]})]})})]})}),(0,i.jsx)("div",{className:"w-full px-4 sm:w-1/2 md:w-1/2 lg:w-2/12 xl:w-2/12",children:(0,i.jsxs)("div",{className:"mb-12 lg:mb-16",children:[(0,i.jsx)("h2",{className:"mb-10 text-xl font-bold text-black dark:text-white",children:"Przydatne linki"}),(0,i.jsxs)("ul",{children:[(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/blogs",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Blog"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/o-mnie",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"O mnie"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/kontakt",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Kontakt"})})]})]})}),(0,i.jsx)("div",{className:"w-full px-4 sm:w-1/2 md:w-1/2 lg:w-4/12 xl:w-4/12",children:(0,i.jsxs)("div",{className:"mb-12 lg:mb-16",children:[(0,i.jsx)("h2",{className:"mb-10 text-xl font-bold text-black dark:text-white",children:"Oferta"}),(0,i.jsxs)("ul",{children:[(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/ibp",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Instrukcja Bezpieczeństwa Pożarowego"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/cfd",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Symulacje CFD"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/operat",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Operat przeciwpożarowy"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/audyt",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Audyt przeciwpożarowy"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/scenariusz",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Scenariusz rozwoju pożaru"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/ozw",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Ocena zagrożenia wybuchem"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/ssp",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Projekt Systemu Sygnalizacji Pożarowej"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/oddymianie-grawitacyjne",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Projekt systemu oddymiania grawitacyjnego"})}),(0,i.jsx)("li",{children:(0,i.jsx)("a",{href:"/oddymianie-mechaniczne",className:"mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary",children:"Projekt systemu oddymiania mechanicznego"})})]})]})})]}),(0,i.jsx)("div",{className:"h-px w-full bg-gradient-to-r from-transparent via-[#DC3545] to-transparent dark:via-[#DC3545]"}),(0,i.jsx)("div",{className:"py-8",children:(0,i.jsxs)("p",{className:"text-center text-base text-body-color dark:text-white",children:["\xa9",r," ","Fire Protection Solutions Jakub Baran"]})})]}),(0,i.jsx)("div",{className:"absolute right-0 top-14 z-[-1]",children:(0,i.jsxs)("svg",{width:"55",height:"99",viewBox:"0 0 55 99",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[(0,i.jsx)("circle",{opacity:"0.8",cx:"49.5",cy:"49.5",r:"49.5",fill:"#DC3545"}),(0,i.jsx)("mask",{id:"mask0_94:899",style:{maskType:"alpha"},maskUnits:"userSpaceOnUse",x:"0",y:"0",width:"99",height:"99",children:(0,i.jsx)("circle",{opacity:"0.8",cx:"49.5",cy:"49.5",r:"49.5",fill:"#DC3545"})}),(0,i.jsxs)("g",{mask:"url(#mask0_94:899)",children:[(0,i.jsx)("circle",{opacity:"0.8",cx:"49.5",cy:"49.5",r:"49.5",fill:"url(#paint0_radial_94:899)"}),(0,i.jsx)("g",{opacity:"0.8",filter:"url(#filter0_f_94:899)",children:(0,i.jsx)("circle",{cx:"53.8676",cy:"26.2061",r:"20.3824",fill:"white"})})]}),(0,i.jsxs)("defs",{children:[(0,i.jsxs)("filter",{id:"filter0_f_94:899",x:"12.4852",y:"-15.1763",width:"82.7646",height:"82.7646",filterUnits:"userSpaceOnUse",colorInterpolationFilters:"sRGB",children:[(0,i.jsx)("feFlood",{floodOpacity:"0",result:"BackgroundImageFix"}),(0,i.jsx)("feBlend",{mode:"normal",in:"SourceGraphic",in2:"BackgroundImageFix",result:"shape"}),(0,i.jsx)("feGaussianBlur",{stdDeviation:"10.5",result:"effect1_foregroundBlur_94:899"})]}),(0,i.jsxs)("radialGradient",{id:"paint0_radial_94:899",cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(49.5 49.5) rotate(90) scale(53.1397)",children:[(0,i.jsx)("stop",{stopOpacity:"0.47"}),(0,i.jsx)("stop",{offset:"1",stopOpacity:"0"})]})]})]})}),(0,i.jsx)("div",{className:"absolute bottom-24 left-0 z-[-1]",children:(0,i.jsxs)("svg",{width:"79",height:"94",viewBox:"0 0 79 94",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[(0,i.jsx)("rect",{opacity:"0.3",x:"-41",y:"26.9426",width:"66.6675",height:"66.6675",transform:"rotate(-22.9007 -41 26.9426)",fill:"url(#paint0_linear_94:889)"}),(0,i.jsx)("rect",{x:"-41",y:"26.9426",width:"66.6675",height:"66.6675",transform:"rotate(-22.9007 -41 26.9426)",stroke:"url(#paint1_linear_94:889)",strokeWidth:"0.7"}),(0,i.jsx)("path",{opacity:"0.3",d:"M50.5215 7.42229L20.325 1.14771L46.2077 62.3249L77.1885 68.2073L50.5215 7.42229Z",fill:"url(#paint2_linear_94:889)"}),(0,i.jsx)("path",{d:"M50.5215 7.42229L20.325 1.14771L46.2077 62.3249L76.7963 68.2073L50.5215 7.42229Z",stroke:"url(#paint3_linear_94:889)",strokeWidth:"0.7"}),(0,i.jsx)("path",{opacity:"0.3",d:"M17.9721 93.3057L-14.9695 88.2076L46.2077 62.325L77.1885 68.2074L17.9721 93.3057Z",fill:"url(#paint4_linear_94:889)"}),(0,i.jsx)("path",{d:"M17.972 93.3057L-14.1852 88.2076L46.2077 62.325L77.1884 68.2074L17.972 93.3057Z",stroke:"url(#paint5_linear_94:889)",strokeWidth:"0.7"}),(0,i.jsxs)("defs",{children:[(0,i.jsxs)("linearGradient",{id:"paint0_linear_94:889",x1:"-41",y1:"21.8445",x2:"36.9671",y2:"59.8878",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0.62"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0"})]}),(0,i.jsxs)("linearGradient",{id:"paint1_linear_94:889",x1:"25.6675",y1:"95.9631",x2:"-42.9608",y2:"20.668",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0.51"})]}),(0,i.jsxs)("linearGradient",{id:"paint2_linear_94:889",x1:"20.325",y1:"-3.98039",x2:"90.6248",y2:"25.1062",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0.62"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0"})]}),(0,i.jsxs)("linearGradient",{id:"paint3_linear_94:889",x1:"18.3642",y1:"-1.59742",x2:"113.9",y2:"80.6826",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0.51"})]}),(0,i.jsxs)("linearGradient",{id:"paint4_linear_94:889",x1:"61.1098",y1:"62.3249",x2:"-8.82468",y2:"58.2156",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0.62"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0"})]}),(0,i.jsxs)("linearGradient",{id:"paint5_linear_94:889",x1:"65.4236",y1:"65.0701",x2:"24.0178",y2:"41.6598",gradientUnits:"userSpaceOnUse",children:[(0,i.jsx)("stop",{stopColor:"#DC3545",stopOpacity:"0"}),(0,i.jsx)("stop",{offset:"1",stopColor:"#DC3545",stopOpacity:"0.51"})]})]})]})})]})})},x=a(4033),u=a(2265),g=a(6435),Header_ThemeToggler=()=>{let{theme:t,setTheme:r}=(0,g.F)();return(0,i.jsxs)("button",{"aria-label":"theme toggler",onClick:()=>r("dark"===t?"light":"dark"),className:"flex items-center justify-center text-black rounded-full cursor-pointer bg-gray-2 dark:bg-dark-bg h-9 w-9 dark:text-white md:h-14 md:w-14",children:[(0,i.jsx)("svg",{viewBox:"0 0 23 23",className:"w-5 h-5 stroke-current dark:hidden md:h-6 md:w-6",fill:"none",children:(0,i.jsx)("path",{d:"M9.55078 1.5C5.80078 1.5 1.30078 5.25 1.30078 11.25C1.30078 17.25 5.80078 21.75 11.8008 21.75C17.8008 21.75 21.5508 17.25 21.5508 13.5C13.3008 18.75 4.30078 9.75 9.55078 1.5Z",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),(0,i.jsxs)("svg",{viewBox:"0 0 25 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:"hidden w-5 h-5 dark:block md:h-6 md:w-6",children:[(0,i.jsx)("mask",{id:"path-1-inside-1_977:1934",fill:"white",children:(0,i.jsx)("path",{d:"M12.0508 16.5C10.8573 16.5 9.71271 16.0259 8.8688 15.182C8.02489 14.3381 7.55078 13.1935 7.55078 12C7.55078 10.8065 8.02489 9.66193 8.8688 8.81802C9.71271 7.97411 10.8573 7.5 12.0508 7.5C13.2443 7.5 14.3888 7.97411 15.2328 8.81802C16.0767 9.66193 16.5508 10.8065 16.5508 12C16.5508 13.1935 16.0767 14.3381 15.2328 15.182C14.3888 16.0259 13.2443 16.5 12.0508 16.5ZM12.0508 18C13.6421 18 15.1682 17.3679 16.2934 16.2426C17.4186 15.1174 18.0508 13.5913 18.0508 12C18.0508 10.4087 17.4186 8.88258 16.2934 7.75736C15.1682 6.63214 13.6421 6 12.0508 6C10.4595 6 8.93336 6.63214 7.80814 7.75736C6.68292 8.88258 6.05078 10.4087 6.05078 12C6.05078 13.5913 6.68292 15.1174 7.80814 16.2426C8.93336 17.3679 10.4595 18 12.0508 18ZM12.0508 0C12.2497 0 12.4405 0.0790176 12.5811 0.21967C12.7218 0.360322 12.8008 0.551088 12.8008 0.75V3.75C12.8008 3.94891 12.7218 4.13968 12.5811 4.28033C12.4405 4.42098 12.2497 4.5 12.0508 4.5C11.8519 4.5 11.6611 4.42098 11.5205 4.28033C11.3798 4.13968 11.3008 3.94891 11.3008 3.75V0.75C11.3008 0.551088 11.3798 0.360322 11.5205 0.21967C11.6611 0.0790176 11.8519 0 12.0508 0V0ZM12.0508 19.5C12.2497 19.5 12.4405 19.579 12.5811 19.7197C12.7218 19.8603 12.8008 20.0511 12.8008 20.25V23.25C12.8008 23.4489 12.7218 23.6397 12.5811 23.7803C12.4405 23.921 12.2497 24 12.0508 24C11.8519 24 11.6611 23.921 11.5205 23.7803C11.3798 23.6397 11.3008 23.4489 11.3008 23.25V20.25C11.3008 20.0511 11.3798 19.8603 11.5205 19.7197C11.6611 19.579 11.8519 19.5 12.0508 19.5ZM24.0508 12C24.0508 12.1989 23.9718 12.3897 23.8311 12.5303C23.6905 12.671 23.4997 12.75 23.3008 12.75H20.3008C20.1019 12.75 19.9111 12.671 19.7705 12.5303C19.6298 12.3897 19.5508 12.1989 19.5508 12C19.5508 11.8011 19.6298 11.6103 19.7705 11.4697C19.9111 11.329 20.1019 11.25 20.3008 11.25H23.3008C23.4997 11.25 23.6905 11.329 23.8311 11.4697C23.9718 11.6103 24.0508 11.8011 24.0508 12ZM4.55078 12C4.55078 12.1989 4.47176 12.3897 4.33111 12.5303C4.19046 12.671 3.99969 12.75 3.80078 12.75H0.800781C0.601869 12.75 0.411103 12.671 0.270451 12.5303C0.129799 12.3897 0.0507813 12.1989 0.0507812 12C0.0507813 11.8011 0.129799 11.6103 0.270451 11.4697C0.411103 11.329 0.601869 11.25 0.800781 11.25H3.80078C3.99969 11.25 4.19046 11.329 4.33111 11.4697C4.47176 11.6103 4.55078 11.8011 4.55078 12ZM20.5363 3.5145C20.6769 3.65515 20.7559 3.84588 20.7559 4.04475C20.7559 4.24362 20.6769 4.43435 20.5363 4.575L18.4153 6.6975C18.3455 6.76713 18.2628 6.82235 18.1717 6.86C18.0806 6.89765 17.983 6.91699 17.8845 6.91692C17.6855 6.91678 17.4947 6.83758 17.354 6.69675C17.2844 6.62702 17.2292 6.54425 17.1915 6.45318C17.1539 6.36211 17.1345 6.26452 17.1346 6.16597C17.1348 5.96695 17.214 5.77613 17.3548 5.6355L19.4758 3.5145C19.6164 3.3739 19.8072 3.29491 20.006 3.29491C20.2049 3.29491 20.3956 3.3739 20.5363 3.5145ZM6.74678 17.304C6.88738 17.4446 6.96637 17.6354 6.96637 17.8342C6.96637 18.0331 6.88738 18.2239 6.74678 18.3645L4.62578 20.4855C4.48433 20.6221 4.29488 20.6977 4.09823 20.696C3.90158 20.6943 3.71347 20.6154 3.57442 20.4764C3.43536 20.3373 3.35648 20.1492 3.35478 19.9526C3.35307 19.7559 3.42866 19.5665 3.56528 19.425L5.68628 17.304C5.82693 17.1634 6.01766 17.0844 6.21653 17.0844C6.4154 17.0844 6.60614 17.1634 6.74678 17.304ZM20.5363 20.4855C20.3956 20.6261 20.2049 20.7051 20.006 20.7051C19.8072 20.7051 19.6164 20.6261 19.4758 20.4855L17.3548 18.3645C17.2182 18.223 17.1426 18.0336 17.1443 17.8369C17.146 17.6403 17.2249 17.4522 17.3639 17.3131C17.503 17.1741 17.6911 17.0952 17.8877 17.0935C18.0844 17.0918 18.2738 17.1674 18.4153 17.304L20.5363 19.425C20.6769 19.5656 20.7559 19.7564 20.7559 19.9552C20.7559 20.1541 20.6769 20.3449 20.5363 20.4855ZM6.74678 6.6975C6.60614 6.8381 6.4154 6.91709 6.21653 6.91709C6.01766 6.91709 5.82693 6.8381 5.68628 6.6975L3.56528 4.575C3.49365 4.50582 3.43651 4.42306 3.39721 4.33155C3.3579 4.24005 3.33721 4.14164 3.33634 4.04205C3.33548 3.94247 3.35445 3.84371 3.39216 3.75153C3.42988 3.65936 3.48557 3.57562 3.55598 3.5052C3.6264 3.43478 3.71014 3.37909 3.80232 3.34138C3.89449 3.30367 3.99325 3.2847 4.09283 3.28556C4.19242 3.28643 4.29083 3.30712 4.38233 3.34642C4.47384 3.38573 4.5566 3.44287 4.62578 3.5145L6.74678 5.6355C6.81663 5.70517 6.87204 5.78793 6.90985 5.87905C6.94766 5.97017 6.96712 6.06785 6.96712 6.1665C6.96712 6.26515 6.94766 6.36283 6.90985 6.45395C6.87204 6.54507 6.81663 6.62783 6.74678 6.6975Z"})}),(0,i.jsx)("path",{d:"M12.0508 16.5C10.8573 16.5 9.71271 16.0259 8.8688 15.182C8.02489 14.3381 7.55078 13.1935 7.55078 12C7.55078 10.8065 8.02489 9.66193 8.8688 8.81802C9.71271 7.97411 10.8573 7.5 12.0508 7.5C13.2443 7.5 14.3888 7.97411 15.2328 8.81802C16.0767 9.66193 16.5508 10.8065 16.5508 12C16.5508 13.1935 16.0767 14.3381 15.2328 15.182C14.3888 16.0259 13.2443 16.5 12.0508 16.5ZM12.0508 18C13.6421 18 15.1682 17.3679 16.2934 16.2426C17.4186 15.1174 18.0508 13.5913 18.0508 12C18.0508 10.4087 17.4186 8.88258 16.2934 7.75736C15.1682 6.63214 13.6421 6 12.0508 6C10.4595 6 8.93336 6.63214 7.80814 7.75736C6.68292 8.88258 6.05078 10.4087 6.05078 12C6.05078 13.5913 6.68292 15.1174 7.80814 16.2426C8.93336 17.3679 10.4595 18 12.0508 18ZM12.0508 0C12.2497 0 12.4405 0.0790176 12.5811 0.21967C12.7218 0.360322 12.8008 0.551088 12.8008 0.75V3.75C12.8008 3.94891 12.7218 4.13968 12.5811 4.28033C12.4405 4.42098 12.2497 4.5 12.0508 4.5C11.8519 4.5 11.6611 4.42098 11.5205 4.28033C11.3798 4.13968 11.3008 3.94891 11.3008 3.75V0.75C11.3008 0.551088 11.3798 0.360322 11.5205 0.21967C11.6611 0.0790176 11.8519 0 12.0508 0V0ZM12.0508 19.5C12.2497 19.5 12.4405 19.579 12.5811 19.7197C12.7218 19.8603 12.8008 20.0511 12.8008 20.25V23.25C12.8008 23.4489 12.7218 23.6397 12.5811 23.7803C12.4405 23.921 12.2497 24 12.0508 24C11.8519 24 11.6611 23.921 11.5205 23.7803C11.3798 23.6397 11.3008 23.4489 11.3008 23.25V20.25C11.3008 20.0511 11.3798 19.8603 11.5205 19.7197C11.6611 19.579 11.8519 19.5 12.0508 19.5ZM24.0508 12C24.0508 12.1989 23.9718 12.3897 23.8311 12.5303C23.6905 12.671 23.4997 12.75 23.3008 12.75H20.3008C20.1019 12.75 19.9111 12.671 19.7705 12.5303C19.6298 12.3897 19.5508 12.1989 19.5508 12C19.5508 11.8011 19.6298 11.6103 19.7705 11.4697C19.9111 11.329 20.1019 11.25 20.3008 11.25H23.3008C23.4997 11.25 23.6905 11.329 23.8311 11.4697C23.9718 11.6103 24.0508 11.8011 24.0508 12ZM4.55078 12C4.55078 12.1989 4.47176 12.3897 4.33111 12.5303C4.19046 12.671 3.99969 12.75 3.80078 12.75H0.800781C0.601869 12.75 0.411103 12.671 0.270451 12.5303C0.129799 12.3897 0.0507813 12.1989 0.0507812 12C0.0507813 11.8011 0.129799 11.6103 0.270451 11.4697C0.411103 11.329 0.601869 11.25 0.800781 11.25H3.80078C3.99969 11.25 4.19046 11.329 4.33111 11.4697C4.47176 11.6103 4.55078 11.8011 4.55078 12ZM20.5363 3.5145C20.6769 3.65515 20.7559 3.84588 20.7559 4.04475C20.7559 4.24362 20.6769 4.43435 20.5363 4.575L18.4153 6.6975C18.3455 6.76713 18.2628 6.82235 18.1717 6.86C18.0806 6.89765 17.983 6.91699 17.8845 6.91692C17.6855 6.91678 17.4947 6.83758 17.354 6.69675C17.2844 6.62702 17.2292 6.54425 17.1915 6.45318C17.1539 6.36211 17.1345 6.26452 17.1346 6.16597C17.1348 5.96695 17.214 5.77613 17.3548 5.6355L19.4758 3.5145C19.6164 3.3739 19.8072 3.29491 20.006 3.29491C20.2049 3.29491 20.3956 3.3739 20.5363 3.5145ZM6.74678 17.304C6.88738 17.4446 6.96637 17.6354 6.96637 17.8342C6.96637 18.0331 6.88738 18.2239 6.74678 18.3645L4.62578 20.4855C4.48433 20.6221 4.29488 20.6977 4.09823 20.696C3.90158 20.6943 3.71347 20.6154 3.57442 20.4764C3.43536 20.3373 3.35648 20.1492 3.35478 19.9526C3.35307 19.7559 3.42866 19.5665 3.56528 19.425L5.68628 17.304C5.82693 17.1634 6.01766 17.0844 6.21653 17.0844C6.4154 17.0844 6.60614 17.1634 6.74678 17.304ZM20.5363 20.4855C20.3956 20.6261 20.2049 20.7051 20.006 20.7051C19.8072 20.7051 19.6164 20.6261 19.4758 20.4855L17.3548 18.3645C17.2182 18.223 17.1426 18.0336 17.1443 17.8369C17.146 17.6403 17.2249 17.4522 17.3639 17.3131C17.503 17.1741 17.6911 17.0952 17.8877 17.0935C18.0844 17.0918 18.2738 17.1674 18.4153 17.304L20.5363 19.425C20.6769 19.5656 20.7559 19.7564 20.7559 19.9552C20.7559 20.1541 20.6769 20.3449 20.5363 20.4855ZM6.74678 6.6975C6.60614 6.8381 6.4154 6.91709 6.21653 6.91709C6.01766 6.91709 5.82693 6.8381 5.68628 6.6975L3.56528 4.575C3.49365 4.50582 3.43651 4.42306 3.39721 4.33155C3.3579 4.24005 3.33721 4.14164 3.33634 4.04205C3.33548 3.94247 3.35445 3.84371 3.39216 3.75153C3.42988 3.65936 3.48557 3.57562 3.55598 3.5052C3.6264 3.43478 3.71014 3.37909 3.80232 3.34138C3.89449 3.30367 3.99325 3.2847 4.09283 3.28556C4.19242 3.28643 4.29083 3.30712 4.38233 3.34642C4.47384 3.38573 4.5566 3.44287 4.62578 3.5145L6.74678 5.6355C6.81663 5.70517 6.87204 5.78793 6.90985 5.87905C6.94766 5.97017 6.96712 6.06785 6.96712 6.1665C6.96712 6.26515 6.94766 6.36283 6.90985 6.45395C6.87204 6.54507 6.81663 6.62783 6.74678 6.6975Z",fill:"black",stroke:"white",strokeWidth:"2",mask:"url(#path-1-inside-1_977:1934)"})]})]})},C=[{id:1,title:"Strona gł\xf3wna",path:"/",newTab:!1},{id:2,title:"O mnie",path:"/o-mnie",newTab:!1},{id:33,title:"Blog",path:"/blog",newTab:!1},{id:3,title:"Kontakt",path:"/kontakt",newTab:!1},{id:4,title:"Oferta",newTab:!1,submenu:[{id:41,title:"Instrukcja Bezpieczeństwa Pożarowego",path:"/ibp",newTab:!1},{id:42,title:"Symulacje CFD",path:"/cfd",newTab:!1},{id:43,title:"Operat przeciwpożarowy",path:"/operat",newTab:!1},{id:44,title:"Audyt przeciwpożarowy",path:"/audyt",newTab:!1},{id:45,title:"Scenariusz rozwoju pożaru",path:"/scenariusz",newTab:!1},{id:46,title:"Ocena zagrożenia wybuchem",path:"/ozw",newTab:!1},{id:47,title:"Projekt Systemu Sygnalizacji Pożarowej",path:"/ssp",newTab:!1},{id:48,title:"Projekt systemu oddymiania grawitacyjnego",path:"/oddymianie-grawitacyjne",newTab:!1},{id:49,title:"Projekt systemu oddymiania mechanicznego",path:"/oddymianie-mechaniczne",newTab:!1}]}],components_Header=()=>{let[t,r]=(0,u.useState)(!1),[a,l]=(0,u.useState)(!1),handleStickyNavbar=()=>{window.scrollY>=80?l(!0):l(!1)};(0,u.useEffect)(()=>{window.addEventListener("scroll",handleStickyNavbar)});let[s,o]=(0,u.useState)(-1),handleSubmenu=t=>{s===t?o(-1):o(t)},c=(0,x.usePathname)();return(0,i.jsx)(i.Fragment,{children:(0,i.jsx)("header",{className:"header left-0 top-0 z-40 flex w-full items-center ".concat(a?"dark:bg-gray-dark dark:shadow-sticky-dark fixed z-[9999] bg-white !bg-opacity-80 shadow-sticky backdrop-blur-sm transition":"absolute bg-transparent"),children:(0,i.jsx)("div",{className:"container",children:(0,i.jsxs)("div",{className:"relative -mx-4 flex items-center justify-between",children:[(0,i.jsx)("div",{className:"w-60 max-w-full px-4 xl:mr-16 xl:whitespace-nowrap",children:(0,i.jsxs)(d(),{href:"/",className:"header-logo block w-full ".concat(a?"py-5 lg:py-2":"py-8"," "),children:[(0,i.jsxs)("div",{className:"flex items-center",children:[(0,i.jsx)(n(),{src:"/images/logo/logo.webp",alt:"logo",width:50,height:30,className:"dark:hidden"}),(0,i.jsxs)("p",{className:"font-bold w-full pl-0 dark:hidden hidden sm:block",children:["Fire Protection ",(0,i.jsx)("span",{className:"text-primary",children:"Solutions"})]})]}),(0,i.jsxs)("div",{className:"flex items-center",children:[(0,i.jsx)(n(),{src:"/images/logo/logo.webp",alt:"logo",width:50,height:30,className:"dark:block hidden"}),(0,i.jsxs)("p",{className:"font-bold w-full pl-0 sm:dark:block hidden ",children:["Fire Protection ",(0,i.jsx)("span",{className:"text-primary",children:"Solutions"})]})]})]})}),(0,i.jsxs)("div",{className:"flex w-full items-center justify-between px-4",children:[(0,i.jsxs)("div",{children:[(0,i.jsxs)("button",{onClick:()=>{r(!t)},id:"navbarToggler","aria-label":"Mobile Menu",className:"absolute right-4 top-1/2 block translate-y-[-50%] rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden",children:[(0,i.jsx)("span",{className:"relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ".concat(t?" top-[7px] rotate-45":" ")}),(0,i.jsx)("span",{className:"relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ".concat(t?"opacity-0 ":" ")}),(0,i.jsx)("span",{className:"relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ".concat(t?" top-[-8px] -rotate-45":" ")})]}),(0,i.jsx)("nav",{id:"navbarCollapse",className:"navbar absolute right-0 z-30 w-[250px] rounded border-[.5px] border-body-color/50 bg-white px-6 py-4 duration-300 dark:border-body-color/20 dark:bg-dark lg:visible lg:static lg:w-auto lg:border-none lg:!bg-transparent lg:p-0 lg:opacity-100 ".concat(t?"visibility top-full opacity-100":"invisible top-[120%] opacity-0"),children:(0,i.jsx)("ul",{className:"block lg:flex lg:space-x-12",children:C.map((t,r)=>(0,i.jsx)("li",{className:"group relative",children:t.path?(0,i.jsx)(d(),{href:t.path,className:"flex py-2 text-base lg:mr-0 lg:inline-flex lg:px-0 lg:py-6 ".concat(c===t.path?"text-primary dark:text-white":"text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"),children:t.title}):(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)("p",{onClick:()=>handleSubmenu(r),className:"flex cursor-pointer items-center justify-between py-2 text-base text-dark group-hover:text-primary dark:text-white/70 dark:group-hover:text-white lg:mr-0 lg:inline-flex lg:px-0 lg:py-6",children:[t.title,(0,i.jsx)("span",{className:"pl-3",children:(0,i.jsx)("svg",{width:"25",height:"24",viewBox:"0 0 25 24",children:(0,i.jsx)("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M6.29289 8.8427C6.68342 8.45217 7.31658 8.45217 7.70711 8.8427L12 13.1356L16.2929 8.8427C16.6834 8.45217 17.3166 8.45217 17.7071 8.8427C18.0976 9.23322 18.0976 9.86639 17.7071 10.2569L12 15.964L6.29289 10.2569C5.90237 9.86639 5.90237 9.23322 6.29289 8.8427Z",fill:"currentColor"})})})]}),(0,i.jsx)("div",{className:"submenu relative left-0 top-full rounded-sm bg-white transition-[top] duration-300 group-hover:opacity-100 dark:bg-dark lg:invisible lg:absolute lg:top-[110%] lg:block lg:w-[250px] lg:p-4 lg:opacity-0 lg:shadow-lg lg:group-hover:visible lg:group-hover:top-full ".concat(s===r?"block":"hidden"),children:t.submenu.map((t,r)=>(0,i.jsx)(d(),{href:t.path,className:"block rounded py-2.5 text-sm text-dark hover:text-primary dark:text-white/70 dark:hover:text-white lg:px-3",children:t.title},r))})]})},r))})})]}),(0,i.jsxs)("div",{className:"flex items-center justify-end pr-16 lg:pr-0",children:[(0,i.jsx)("a",{className:"text-primary hidden sm:block",href:"mailto:biuro@fp-solutions.pl",children:"biuro@fp-solutions.pl"}),(0,i.jsx)("div",{children:(0,i.jsx)(Header_ThemeToggler,{})})]})]})]})})})})};function ScrollToTop(){let[t,r]=(0,u.useState)(!1);return(0,u.useEffect)(()=>{let toggleVisibility=()=>{window.pageYOffset>300?r(!0):r(!1)};return window.addEventListener("scroll",toggleVisibility),()=>window.removeEventListener("scroll",toggleVisibility)},[]),(0,i.jsx)("div",{className:"fixed bottom-8 right-8 z-[99]",children:t&&(0,i.jsx)("div",{onClick:()=>{window.scrollTo({top:0,behavior:"smooth"})},"aria-label":"scroll to top",className:"flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-primary text-white shadow-md transition duration-300 ease-in-out hover:bg-opacity-80 hover:shadow-signUp",children:(0,i.jsx)("span",{className:"mt-[6px] h-3 w-3 rotate-45 border-l border-t border-white"})})})}function Providers(t){let{children:r}=t;return(0,i.jsx)(g.f,{attribute:"class",enableSystem:!1,defaultTheme:"dark",children:r})}function RootLayout(t){let{children:r}=t;return(0,i.jsxs)("html",{suppressHydrationWarning:!0,lang:"pl",children:[(0,i.jsx)("head",{}),(0,i.jsx)("body",{className:"bg-[#FCFCFC] dark:bg-black ".concat(s().className),children:(0,i.jsxs)(Providers,{children:[(0,i.jsx)(components_Header,{}),r,(0,i.jsx)(components_Footer,{}),(0,i.jsx)(ScrollToTop,{})]})})]})}a(8448),a(2390)},679:function(t,r,a){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),function(t,r){for(var a in r)Object.defineProperty(t,a,{enumerable:!0,get:r[a]})}(r,{unstable_getImgProps:function(){return unstable_getImgProps},default:function(){return c}});let i=a(1024),l=a(7929),s=a(2637),o=a(413),n=i._(a(9950)),unstable_getImgProps=t=>{(0,s.warnOnce)("Warning: unstable_getImgProps() is experimental and may change or be removed at any time. Use at your own risk.");let{props:r}=(0,l.getImgProps)(t,{defaultLoader:n.default,imgConf:{deviceSizes:[640,750,828,1080,1200,1920,2048,3840],imageSizes:[16,32,48,64,96,128,256,384],path:"/fps-update/_next/image",loader:"default",dangerouslyAllowSVG:!1,unoptimized:!1}});for(let[t,a]of Object.entries(r))void 0===a&&delete r[t];return{props:r}},c=o.Image},8448:function(){},2390:function(){},1371:function(t){t.exports={style:{fontFamily:"'__Inter_f4b1a6', '__Inter_Fallback_f4b1a6'",fontStyle:"normal"},className:"__className_f4b1a6"}},622:function(t,r,a){"use strict";/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var i=a(2265),l=Symbol.for("react.element"),s=Symbol.for("react.fragment"),o=Object.prototype.hasOwnProperty,n=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,c={key:!0,ref:!0,__self:!0,__source:!0};function q(t,r,a){var i,s={},d=null,m=null;for(i in void 0!==a&&(d=""+a),void 0!==r.key&&(d=""+r.key),void 0!==r.ref&&(m=r.ref),r)o.call(r,i)&&!c.hasOwnProperty(i)&&(s[i]=r[i]);if(t&&t.defaultProps)for(i in r=t.defaultProps)void 0===s[i]&&(s[i]=r[i]);return{$$typeof:l,type:t,key:d,ref:m,props:s,_owner:n.current}}r.Fragment=s,r.jsx=q,r.jsxs=q},7437:function(t,r,a){"use strict";t.exports=a(622)},6691:function(t,r,a){t.exports=a(679)},1396:function(t,r,a){t.exports=a(8326)},4033:function(t,r,a){t.exports=a(94)},3118:function(t,r,a){"use strict";a.d(r,{w_:function(){return GenIcon}});var i=a(2265),l={color:void 0,size:void 0,className:void 0,style:void 0,attr:void 0},s=i.createContext&&i.createContext(l),o=["attr","size","title"];function _extends(){return(_extends=Object.assign?Object.assign.bind():function(t){for(var r=1;r<arguments.length;r++){var a=arguments[r];for(var i in a)Object.prototype.hasOwnProperty.call(a,i)&&(t[i]=a[i])}return t}).apply(this,arguments)}function ownKeys(t,r){var a=Object.keys(t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);r&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),a.push.apply(a,i)}return a}function _objectSpread(t){for(var r=1;r<arguments.length;r++){var a=null!=arguments[r]?arguments[r]:{};r%2?ownKeys(Object(a),!0).forEach(function(r){var i,l;i=r,l=a[r],(i=function(t){var r=function(t,r){if("object"!=typeof t||!t)return t;var a=t[Symbol.toPrimitive];if(void 0!==a){var i=a.call(t,r||"default");if("object"!=typeof i)return i;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===r?String:Number)(t)}(t,"string");return"symbol"==typeof r?r:r+""}(i))in t?Object.defineProperty(t,i,{value:l,enumerable:!0,configurable:!0,writable:!0}):t[i]=l}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(a)):ownKeys(Object(a)).forEach(function(r){Object.defineProperty(t,r,Object.getOwnPropertyDescriptor(a,r))})}return t}function GenIcon(t){return r=>i.createElement(IconBase,_extends({attr:_objectSpread({},t.attr)},r),function Tree2Element(t){return t&&t.map((t,r)=>i.createElement(t.tag,_objectSpread({key:r},t.attr),Tree2Element(t.child)))}(t.child))}function IconBase(t){var elem=r=>{var a,{attr:l,size:s,title:n}=t,c=function(t,r){if(null==t)return{};var a,i,l=function(t,r){if(null==t)return{};var a={};for(var i in t)if(Object.prototype.hasOwnProperty.call(t,i)){if(r.indexOf(i)>=0)continue;a[i]=t[i]}return a}(t,r);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(t);for(i=0;i<s.length;i++)a=s[i],!(r.indexOf(a)>=0)&&Object.prototype.propertyIsEnumerable.call(t,a)&&(l[a]=t[a])}return l}(t,o),d=s||r.size||"1em";return r.className&&(a=r.className),t.className&&(a=(a?a+" ":"")+t.className),i.createElement("svg",_extends({stroke:"currentColor",fill:"currentColor",strokeWidth:"0"},r.attr,l,c,{className:a,style:_objectSpread(_objectSpread({color:t.color||r.color},r.style),t.style),height:d,width:d,xmlns:"http://www.w3.org/2000/svg"}),n&&i.createElement("title",null,n),t.children)};return void 0!==s?i.createElement(s.Consumer,null,t=>elem(t)):elem(l)}}},function(t){t.O(0,[452,240,326,413,971,472,744],function(){return t(t.s=8474)}),_N_E=t.O()}]);