// Nav scroll behavior
const nav = document.getElementById('nav');
const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
};
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Living Core (canvas animation)
(() => {
    const core = document.getElementById('living-core');
    const canvas = document.getElementById('core-canvas');
    const tooltip = document.getElementById('core-tooltip');
    if (!core || !canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Animation state
    let start = performance.now();
    let mouseX = 0.5, mouseY = 0.5; // normalized in [0,1]
    let tiltX = 0, tiltY = 0;

    core.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || core.classList.contains('core--mini')) return;
        const r = canvas.getBoundingClientRect();
        mouseX = (e.clientX - r.left) / r.width;
        mouseY = (e.clientY - r.top) / r.height;
        const dx = mouseX - 0.5;
        const dy = mouseY - 0.5;
        tiltX = dy * -8; // degrees (reduced)
        tiltY = dx * 8;
        canvas.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    core.addEventListener('pointerleave', () => {
        canvas.style.transform = `rotateX(0deg) rotateY(0deg)`;
    });

    const timeDots = new Array(16).fill(0).map((_, i) => ({
        angle: (i / 16) * Math.PI * 2,
        speed: 0.2 + (i % 5) * 0.01,
    }));

    function draw(now) {
        const t = (now - start) / 1000;
        const { width: W, height: H } = canvas;
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        const R = Math.min(W, H) * 0.42;

        // Parameters and colors
        const identityColor = '#36A2FF';
        const timeColor = '#6C4FFF';
        const dataCoreInner = '#8A6FFF';
        const dataCoreOuter = '#5B3FFF';

        // Pulsing intensity (breathing)
        const breath = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2) / 6);

        // Identity Ring (outer)
        const ringOuter = R;
        const ringInner = R * 0.78;
        const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2) / 5);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.05);
        for (let i = 0; i < 120; i++) {
            const a = (i / 120) * Math.PI * 2;
            const thickness = 1 + 0.6 * Math.sin(a * 6 + t * 0.8);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(54,162,255,${0.08 + 0.06 * pulse})`;
            ctx.lineWidth = thickness * dpr;
            const r1 = ringInner + (i % 2 ? 2 * dpr : 0);
            const r2 = ringOuter - (i % 3 ? 2 * dpr : 0);
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
        // Glow ring
        ctx.beginPath();
        ctx.arc(0, 0, (ringOuter + ringInner) / 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(54,162,255,${0.35 + 0.25 * breath})`;
        ctx.lineWidth = (ringOuter - ringInner) * 0.12;
        ctx.shadowColor = 'rgba(91,63,255,0.6)';
        ctx.shadowBlur = 30 * dpr;
        ctx.stroke();
        ctx.restore();

        // Time Orbit (middle ring with moving dots)
        const orbitR = R * 0.58;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.15);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(108,79,255,0.35)';
        ctx.lineWidth = 2 * dpr;
        ctx.arc(0, 0, orbitR, 0, Math.PI * 2);
        ctx.stroke();

        // moving dots + hover tooltip detection
        let showTooltip = false;
        let tooltipX = 0, tooltipY = 0;
        timeDots.forEach((dot, idx) => {
            const angle = dot.angle + t * dot.speed;
            const x = Math.cos(angle) * orbitR;
            const y = Math.sin(angle) * orbitR;

            // twinkle every ~10s per spec
            const twinkle = 0.6 + 0.4 * Math.sin((t + idx) * (Math.PI * 2) / 10);
            ctx.beginPath();
            ctx.fillStyle = `rgba(108,79,255,${0.6 + 0.4 * twinkle})`;
            const r = (4 + 2 * twinkle) * dpr;
            ctx.shadowColor = 'rgba(141,125,255,0.9)';
            ctx.shadowBlur = 12 * dpr;
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();

            // hover detection
            const nx = (x + cx) / W;
            const ny = (y + cy) / H;
            const dx = nx - mouseX;
            const dy = ny - mouseY;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.04) { // near cursor
                showTooltip = true;
                tooltipX = x + cx;
                tooltipY = y + cy;
            }
        });
        ctx.restore();

        // Data Core (center pulse + streamlines)
        ctx.save();
        ctx.translate(cx, cy);
        const pulseFast = 0.6 + 0.4 * Math.sin(t * (Math.PI * 2) / 3);
        const coreR = R * 0.18 * (0.95 + 0.05 * pulseFast);
        // radial gradient core
        const grad = ctx.createRadialGradient(0, 0, coreR * 0.2, 0, 0, coreR * 1.6);
        grad.addColorStop(0, dataCoreInner);
        grad.addColorStop(1, 'rgba(91,63,255,0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(0, 0, coreR * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // inner bright core
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.arc(0, 0, coreR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // streamlines to rings
        for (let i = 0; i < 18; i++) {
            const a = i * (Math.PI * 2 / 18) + t * 0.25;
            const r1 = coreR * (0.4 + 0.3 * Math.sin(t * 0.8 + i));
            const r2 = orbitR - 8 * dpr;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.quadraticCurveTo(Math.cos(a) * (r2 * 0.6), Math.sin(a) * (r2 * 0.6), Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.strokeStyle = `rgba(138,111,255,${0.15 + 0.1 * pulseFast})`;
            ctx.lineWidth = 1.2 * dpr;
            ctx.stroke();
        }
        ctx.restore();

        // Tooltip position update
        if (tooltip) {
            if (showTooltip) {
                core.classList.add('core--show-tooltip');
                tooltip.style.left = `${tooltipX / dpr}px`;
                tooltip.style.top = `${tooltipY / dpr}px`;
            } else {
                core.classList.remove('core--show-tooltip');
            }
        }

        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Scroll behavior to mini icon
    const hero = document.getElementById('home');
    function updateMini() {
        const trigger = (hero?.offsetHeight || 600) * 0.6;
        if (window.scrollY > trigger) core.classList.add('core--mini');
        else core.classList.remove('core--mini');
    }
    document.addEventListener('scroll', updateMini, { passive: true });
    updateMini();
    // Reset tilt while scrolling to avoid any perceived page rotation
    document.addEventListener('scroll', () => {
        canvas.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }, { passive: true });
})();

// Mobile nav toggle (extend later if needed)
document.querySelector('.nav__toggle')?.addEventListener('click', () => {
    document.querySelector('.nav__links')?.classList.toggle('is-open');
});
document.querySelectorAll('.nav__links a').forEach((a)=>{
    a.addEventListener('click', ()=>{
        document.querySelector('.nav__links')?.classList.remove('is-open');
    });
});

// removed token ticker

// i18n
const I18N = {
    en: {
        'nav.home': 'Home',
        'nav.about': 'About',
        'nav.technology': 'Technology',
        'nav.useCases': 'Use Cases',
        'nav.token': 'Token',
        'nav.join': 'Join',
        'cta.token': 'View IDRA Token',
        'cta.watch': 'Watch How It Works',
        'hero.title': 'Own Your Digital Life.',
        'hero.subtitle': 'Your identity. Your time. Your data. Yours alone.\nIDRA gives you full sovereignty over your digital existence — with a smart identity, verifiable time, and self-owned data.',
        'hero.caption': 'Every Second. Every Action. Every Byte — Signed by You.',
        'modal.brand': 'IDRA — The Era of Digital Identity.',
        'about.title': 'What is IDRA?',
        'about.text': 'IDRA means ID + ERA — the era of digital identity. We are building the first system that gives every human full ownership over their digital identity, signs their time, and preserves their data in a smart, secure ledger. In IDRA, every second of your digital life becomes your own asset.',
        'tech.title': 'The three pillars of your digital life.',
        'tech.core.title': 'IDRA Core — Central Identity',
        'tech.core.text': 'Your biometrically signed digital identity used to attest everything you do in the system.',
        'tech.time.title': 'Chrona Track — Digital Time',
        'tech.time.text': 'An intelligent time layer that verifies every productive second and turns your time into a unit of value.',
        'tech.data.title': 'VaultX — Self-Owned Data',
        'tech.data.text': 'An encrypted data vault that stores all your interactions and gives you full control to share or sell.',
        'example.title': 'A real example from inside IDRA',
        'use.title': 'The future of digital life starts here.',
        'use.card1.title': 'A global market for verified time-data',
        'use.card1.text': 'Sell your anonymized data to institutions for direct income.',
        'use.card2.title': 'Trusted skills and digital reputation',
        'use.card2.text': 'Your time-stamped resume — your data is your proof.',
        'use.card3.title': 'Hiring based on productive time',
        'use.card3.text': 'Companies pay for real output, not theoretical hours.',
        'use.card4.title': 'Smart learning that rewards real effort',
        'use.card4.text': 'Learning based on understanding and achievement, not just watching.',
        'use.card5.title': 'A personal AI built on your data',
        'use.card5.text': 'IDRA AI learns from you to advance you.',
        'use.card6.title': 'A global professional identity you can’t fake',
        'use.card6.text': 'A digital life card that proves who you are and what you’ve done.',
        'token.title': 'IDRA Token — The economy of time and identity.',
        'token.text': 'Every second, every interaction, every piece of knowledge turns into an IDRA Token representing the real value of your digital existence. Use it to pay, invest, or trade your data safely.',
        'join.eyebrow': 'We are about to enter a new era… where you own yourself.',
        'join.title': 'Be among the first to build your digital identity today.',
        'footer.brand': 'IDRA © 2025 — The Era of Digital Identity',
        'footer.about': 'About',
        'footer.docs': 'Docs',
        'footer.privacy': 'Privacy',
        'footer.contact': 'Contact'
    },
    ar: {
        'nav.home': 'الرئيسية',
        'nav.about': 'عن IDRA',
        'nav.technology': 'التقنية',
        'nav.useCases': 'الاستخدامات',
        'nav.token': 'التوكن',
        'nav.join': 'انضم',
        'cta.token': 'عرض توكن IDRA',
        'cta.watch': 'شاهد كيف تعمل',
        'hero.title': 'Own Your Digital Life.',
        'hero.subtitle': 'هويتك. زمنك. بياناتك. ملكك وحدك.\nIDRA هو النظام الذي يمنحك السيادة الكاملة على وجودك الرقمي — عبر هوية ذكية، زمن موثّق، وبيانات مملوكة لك فقط.',
        'hero.caption': 'Every Second. Every Action. Every Byte — Signed by You.',
        'modal.brand': 'IDRA — The Era of Digital Identity.',
        'about.title': 'ما هي IDRA؟',
        'about.text': 'IDRA تعني ID + ERA — عصر الهوية الرقمية. نحن نبني أول نظام في العالم يمنح كل إنسان ملكية كاملة على هويته الرقمية، يوقّع زمنه، ويحفظ بياناته داخل سجل ذكي وآمن. في IDRA، كل ثانية من حياتك الرقمية تصبح أصلًا رقميًا يخصّك أنت وحدك.',
        'tech.title': 'الركائز الثلاث التي تُكوّن حياتك الرقمية.',
        'tech.core.title': 'IDRA Core — الهوية المركزية',
        'tech.core.text': 'هويتك الرقمية الموقّعة بيومتريًا، تُستخدم لتوثيق كل نشاط تقوم به داخل النظام.',
        'tech.time.title': 'Chrona Track — الزمن الرقمي',
        'tech.time.text': 'طبقة زمنية ذكية توثّق كل ثانية إنتاجية وتحول وقتك إلى وحدة قيمة رقمية.',
        'tech.data.title': 'VaultX — البيانات المملوكة ذاتيًا',
        'tech.data.text': 'خزان بيانات مشفّر يخزّن كل تفاعلك ويمنحك التحكم الكامل بالمشاركة أو البيع.',
        'example.title': 'مثال حيّ من داخل IDRA',
        'use.title': 'مستقبل الحياة الرقمية يبدأ هنا.',
        'use.card1.title': 'سوق عالمي للبيانات الزمنية الموثّقة',
        'use.card1.text': 'بيع بياناتك المجهولة للمؤسسات مقابل دخل مباشر.',
        'use.card2.title': 'تقييم موثوق للمهارات والسمعة الرقمية',
        'use.card2.text': 'سيرتك الذاتية الزمنية — بياناتك هي دليلك.',
        'use.card3.title': 'أنظمة توظيف قائمة على الزمن المنتج',
        'use.card3.text': 'الشركات تدفع على الإنتاج الحقيقي، لا على الساعات النظرية.',
        'use.card4.title': 'تعليم ذكي يكافئك على الجهد الحقيقي',
        'use.card4.text': 'التعلم القائم على الفهم والإنجاز، لا المشاهدة.',
        'use.card5.title': 'ذكاء صناعي شخصي مبني على بياناتك',
        'use.card5.text': 'IDRA AI يتعلم منك ليطورك.',
        'use.card6.title': 'هوية مهنية عالمية لا يمكن تزويرها',
        'use.card6.text': 'بطاقة حياة رقمية تثبت من أنت وماذا أنجزت.',
        'token.title': 'IDRA Token — اقتصاد الزمن والهوية.',
        'token.text': 'كل ثانية، كل تفاعل، كل معرفة، تتحوّل إلى وحدة IDRA Token تمثل القيمة الحقيقية لوجودك الرقمي. يمكنك استخدامها للدفع، الاستثمار، أو تداول بياناتك بأمان.',
        'join.eyebrow': 'نحن على وشك دخول عصر جديد… عصر تمتلك فيه نفسك.',
        'join.title': 'كن من أوائل من يبنون هويتهم الرقمية اليوم.',
        'footer.brand': 'IDRA © 2025 — The Era of Digital Identity',
        'footer.about': 'About',
        'footer.docs': 'Docs',
        'footer.privacy': 'Privacy',
        'footer.contact': 'Contact'
    }
};

function setLanguage(lang) {
    const dict = I18N[lang] || I18N.en;
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('lang-toggle')?.setAttribute('data-lang', lang);
    document.getElementById('lang-toggle') && (document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const val = dict[key];
        if (typeof val === 'string') {
            if (val.includes('\n')) {
                el.innerHTML = val.split('\n').join('<br />');
            } else {
                el.textContent = val;
            }
        }
    });
    localStorage.setItem('idra_lang', lang);
}

const savedLang = localStorage.getItem('idra_lang') || 'ar';
setLanguage(savedLang);
document.getElementById('lang-toggle')?.addEventListener('click', () => {
    const current = localStorage.getItem('idra_lang') || 'ar';
    setLanguage(current === 'ar' ? 'en' : 'ar');
});

// Smooth scroll for internal anchors
document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// Chip ripple position
document.querySelectorAll('.chip').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--rx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--ry', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
});

// Footer links - if external placeholders, just alert for now
document.querySelectorAll('footer a[href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Coming soon.');
    });
});

// Modal demo
const modal = document.getElementById('demo-modal');
const openDemo = document.getElementById('watch-demo');
const audio = document.getElementById('demo-audio');
openDemo?.addEventListener('click', () => {
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    try { audio && audio.play && audio.play().catch(() => {}); } catch(_) {}
});
modal?.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.hasAttribute('data-close') || target.classList.contains('modal')) {
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        try { audio && audio.pause && audio.pause(); } catch(_) {}
    }
});
// Modal controls and keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.getAttribute('aria-hidden') === 'false') {
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        try { audio && audio.pause && audio.pause(); } catch(_) {}
    }
});
document.getElementById('demo-restart')?.addEventListener('click', () => {
    try { audio && (audio.currentTime = 0) && audio.play(); } catch(_) {}
});
document.getElementById('demo-mute')?.addEventListener('click', (e) => {
    if (!audio) return;
    audio.muted = !audio.muted;
    const btn = e.currentTarget;
    if (btn && btn instanceof HTMLElement) btn.textContent = audio.muted ? 'Unmute' : 'Mute';
});

// Scroll Reveal
const revealItems = Array.from(document.querySelectorAll('.sr'));
const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
        }
    }
}, { threshold: 0.12 });
revealItems.forEach((el) => io.observe(el));

// Usecases slide-in alternating
const usecases = document.querySelectorAll('.usecase');
usecases.forEach((el, i) => {
    el.style.transition = 'transform .6s ease, opacity .6s ease';
    el.style.transform = `translateX(${i % 2 === 0 ? '-18px' : '18px'})`;
});
const io2 = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            const el = entry.target;
            el.style.opacity = '1';
            el.style.transform = 'translateX(0)';
            io2.unobserve(el);
        }
    }
}, { threshold: 0.18 });
usecases.forEach((el) => io2.observe(el));

// Token particles random positions
(() => {
    const canvas = document.getElementById('token-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = new Array(24).fill(0).map((_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 60,
        speed: 0.6 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
    }));

    let start = performance.now();
    function draw(now) {
        const t = (now - start) / 1000;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0,0,W,H);
        const cx = W/2, cy = H/2;

        // coin body glow
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 100);
        grad.addColorStop(0, 'rgba(138,111,255,0.35)');
        grad.addColorStop(1, 'rgba(91,63,255,0.05)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 90 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // rotating ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.8);
        ctx.strokeStyle = 'rgba(91,63,255,0.5)';
        ctx.lineWidth = 6 * dpr;
        ctx.beginPath();
        ctx.arc(0, 0, 60 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        // gaps
        ctx.lineWidth = 8 * dpr;
        ctx.strokeStyle = 'rgba(15,15,16,1)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const a1 = (i / 8) * Math.PI * 2 + t * 0.8;
            ctx.arc(0, 0, 60 * dpr, a1, a1 + 0.2);
            ctx.stroke();
        }
        ctx.restore();

        // orbiting particles
        particles.forEach((p, i) => {
            const a = p.angle + t * p.speed;
            const r = (50 + p.radius) * dpr;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * 0.6;
            ctx.beginPath();
            ctx.fillStyle = `rgba(169,156,255,${0.6 + 0.4 * Math.sin(t * 2 + i)})`;
            ctx.arc(x, y, p.size * dpr, 0, Math.PI * 2);
            ctx.fill();
        });

        // central I mark
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 6 * dpr, cy - 26 * dpr, 12 * dpr, 48 * dpr);
        ctx.beginPath();
        ctx.arc(cx, cy + 28 * dpr, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();

        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
})();


