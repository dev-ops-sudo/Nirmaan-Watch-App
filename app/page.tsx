'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDown, Building2, Check, ChevronRight, Menu, X, Pause, Play, ShieldCheck, ScanLine, ChartNoAxesCombined, Layers3 } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import './landing.css';

const photos = [
  { src: '/images/parliament.jpg', alt: 'Parliament of India (Sansad Bhavan) symbolizing public representation and MPLADS development funds', title: 'Sanctioned in Parliament. Delivered to communities.', category: 'Civic & public infrastructure' },
  { src: '/images/landing-road.webp', alt: 'Illustrative rural road and concrete bridge with an unfinished gravel shoulder', title: 'Connecting places. Creating possibilities.', category: 'Roads & connectivity' },
];
const examples = [
  { label: 'Construction development', title: 'The construction is a promise.', detail: 'Compare the planned milestone with the work recorded on site.', expected: 80, present: 52, planned: 'Core structure and civil works complete', recorded: 'Civil structure ready; access work pending', action: 'Verify the remaining civil work and request an updated completion schedule.' },
  { label: 'Rural connectivity', title: 'Progress should reach every village.', detail: 'Make the difference between a sanctioned road and a usable route visible.', expected: 100, present: 75, planned: 'Road, culvert and shoulders complete', recorded: 'Road and culvert ready; shoulders pending', action: 'Confirm shoulder completion and site safety before closing the project.' },
];
const links = [
  ['#problem', 'चुनौती · Challenge'],
  ['#solution', 'दृष्टिकोण · Approach'],
  ['#how-it-works', 'कार्यप्रणाली · Process'],
  ['#impact', 'प्रभाव · Impact'],
  ['#team', 'टीम · Team']
];
const challenges = [
  { Icon: Layers3, title: 'Scattered information', description: 'Project and financial records across constituencies are difficult to bring into one view.' },
  { Icon: ScanLine, title: 'Unusual patterns, unseen', description: 'Spending outliers and potential fraud risks can get lost in thousands of records.' },
  { Icon: ChartNoAxesCombined, title: 'Delays without a clear signal', description: 'A recorded allocation alone cannot tell us whether development is reaching people.' },
];
export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [example, setExample] = useState(0);
  const current = examples[example];
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.nw-hero-copy > *', { y: 22, opacity: 0, duration: .85, stagger: .09, ease: 'power2.out' });
      gsap.utils.toArray<HTMLElement>('.nw-reveal').forEach((element) => {
        gsap.from(element, { y: 26, opacity: 0, duration: .75, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
      });
      gsap.to('.nw-photo-image', { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.nw-hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    }, root);
    return () => media.revert();
  }, []);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (paused || motion.matches) return;
    const interval = window.setInterval(() => setSlide(value => (value + 1) % photos.length), 6500);
    return () => window.clearInterval(interval);
  }, [paused]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); document.getElementById('nw-menu-toggle')?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menu]);
  return (
    <div className="nw" ref={root}>
      <a href="#main" className="nw-skip">Skip to content</a>
      <header className="nw-header">
        <div className="nw-wrap nw-nav">
          <a href="#home" className="nw-logo" aria-label="Nirmaan AI home">
            <span className="nw-logo-mark" style={{ borderColor: '#FF6600', color: '#FF6600' }}><Building2 size={23} strokeWidth={1.8} /></span>
            <span>Nirmaan<span className="nw-logo-ai">AI</span><small>सार्वजनिक धन · जन विकास | PUBLIC MONEY. PUBLIC PROGRESS.</small></span>
          </a>
          <nav className="nw-desktop-links" aria-label="Main navigation">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
          <Link className="nw-btn nw-nav-cta" href="/dashboard">डैशबोर्ड खोलें · Dashboard <ArrowUpRight size={16} /></Link>
          <button id="nw-menu-toggle" className="nw-menu-button" aria-expanded={menu} aria-controls="nw-mobile-nav" aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && <nav id="nw-mobile-nav" className="nw-mobile-nav" aria-label="Mobile navigation">{[['#home', 'मुख्य पृष्ठ · Home'], ...links, ['#comparison', 'विकास तुलना · Comparison']].map(([href, label]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}<ChevronRight size={16} /></a>)}<Link href="/dashboard">डैशबोर्ड खोलें · Dashboard <ArrowUpRight size={16} /></Link></nav>}
      </header>
      <main id="main" tabIndex={-1}>
        <section className="nw-hero nw-wrap" id="home">
          <div className="nw-hero-copy">
            <div className="nw-eyebrow">
              <span className="nw-dot" /> <span style={{ color: '#FF6600', fontWeight: 700 }}>पारदर्शी जन विकास निगरानी</span> · PUBLIC DEVELOPMENT OVERSIGHT
            </div>
            <h1>
              <span className="nw-hero-hindi">हर रुपया, <span style={{ color: '#FF6600' }}>वास्तविक विकास।</span></span>
              Every rupee.<br />Real <em>progress.</em>
            </h1>
            <p><strong>जनता का धन, सीधे जनहित में।</strong><br className="nw-desktop-break" /> Follow MPLADS projects, understand spending, and see where civic development needs immediate attention.</p>
            <div className="nw-actions">
              <Link href="/dashboard" className="nw-btn">डैशबोर्ड देखें · Explore Dashboard <ArrowUpRight size={18} /></Link>
              <a href="#comparison" className="nw-text-link">विकास अंतर देखें · See gap <ArrowRight size={17} /></a>
            </div>
            <div className="nw-hero-note"><ShieldCheck size={17} /><span>पारदर्शी विश्लेषण · मानव-आधारित निर्णय (Explainable insights. Human-led decisions.)</span></div>
          </div>
          <div className="nw-hero-photo">
            <div className="nw-photo-window">
              {photos.map((photo, index) => <img key={photo.src} className={`nw-photo-image ${slide === index ? 'nw-photo-active' : ''}`} src={photo.src} alt={photo.alt} width={1536} height={1024} fetchPriority={index === 0 ? 'high' : 'auto'} aria-hidden={slide !== index} />)}
              <span className="nw-photo-label"><span className="nw-dot" /> विकास कार्य · DEVELOPMENT IN FOCUS</span>
              <div className="nw-photo-caption"><span>{photos[slide].category}</span><h2>{photos[slide].title}</h2></div>
              <div className="nw-slides">{photos.map((photo, index) => <button key={photo.src} onClick={() => { setSlide(index); setPaused(true); }} aria-label={`Show ${photo.category}`} aria-pressed={slide === index}><span className={slide === index ? 'nw-selected' : ''} /></button>)}<button onClick={() => setPaused(!paused)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div>
            </div>
            <div className="nw-photo-foot"><span>जनसरोकार से जुड़े क्षेत्र · Built around places that matter.</span></div>
          </div>
        </section>
        <div className="nw-stat-strip nw-wrap">
          <div><strong>60,359<span style={{ color: '#FF6600', fontWeight: 700 }}>स्वीकृत कार्य · works</span></strong><p>MPLADS आधिकारिक डेटासेट में दर्ज (In supplied dataset)</p></div>
          <div><strong>एकीकृत मंच<span style={{ color: '#FF6600', fontWeight: 700 }}>· Unified view</span></strong><p>परियोजनाएं, आवंटन और स्वीकृति स्थिति (Status & allocation)</p></div>
          <div><strong>जन-केंद्रित<span style={{ color: '#FF6600', fontWeight: 700 }}>· People at centre</span></strong><p>नागरिकों, समीक्षकों और नीति निर्माताओं हेतु (Citizens & leaders)</p></div>
          <a href="#problem" aria-label="Discover the challenge"><ArrowDown size={22} /></a>
        </div>
        <section id="problem" className="nw-section nw-wrap">
          <div className="nw-section-heading nw-reveal"><div><div className="nw-eyebrow">01 / चुनौती · THE CHALLENGE</div><h2>Development is local.<br /><em>Oversight should be clear.</em></h2></div><p>Behind every project record is a road, a classroom, or a community waiting. Disconnected data makes it harder to know what needs attention.</p></div>
          <div className="nw-challenges">{challenges.map(({ Icon, title, description }, index) => <article className="nw-challenge nw-reveal" key={title}><div className="nw-challenge-top"><Icon size={23} strokeWidth={1.4} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
        <section id="comparison" className="nw-comparison">
          <div className="nw-wrap">
            <div className="nw-section-heading nw-reveal"><div><div className="nw-eyebrow">02 / FROM PROMISE TO PROGRESS</div><h2>What was planned.<br /><em>Where things stand.</em></h2></div><div><p>A clearer comparison makes the next question easier to ask.</p><span className="nw-example-note">Illustrative scenarios, not live project measurements.</span></div></div>
            <div className="nw-tabs" role="group" aria-label="Choose development example">{examples.map((item, index) => <button key={item.label} aria-pressed={example === index} onClick={() => setExample(index)}>{item.label}<ArrowUpRight size={15} /></button>)}</div>
            <div className="nw-compare-grid">
              <figure className="nw-development-photo"><img src={photos[example].src} alt={photos[example].alt} width={1536} height={1024} loading="lazy" /><figcaption><span>ILLUSTRATIVE PROJECT</span><h3>{current.title}</h3></figcaption></figure>
              <div className="nw-compare-data" aria-live="polite" aria-atomic="true"><div className="nw-compare-title"><span>Development milestone</span><span>Example snapshot</span></div><p>{current.detail}</p>
                <div className="nw-progress-row"><div><span><i className="nw-key nw-key-plan" />Expected development</span><strong>{current.expected}<small>%</small></strong></div><div className="nw-track"><span className="nw-plan-bar" style={{ width: `${current.expected}%` }} /></div><p>{current.planned}</p></div>
                <div className="nw-progress-row"><div><span><i className="nw-key nw-key-present" />Present development</span><strong>{current.present}<small>%</small></strong></div><div className="nw-track"><span className="nw-present-bar" style={{ width: `${current.present}%` }} /></div><p>{current.recorded}</p></div>
                <div className="nw-gap"><strong>{current.expected - current.present}<small>percentage-point gap</small></strong><p>{current.action}</p></div>
                <div className="nw-data-note"><ShieldCheck size={16} /><p>Physical progress needs verified site evidence. Allocation and approval records alone do not establish completion.</p></div>
              </div>
            </div>
            <div className="nw-comparison-bottom"><span>Start with the records. Follow through with verification.</span><Link href="/dashboard" className="nw-text-link">Explore actual project records <ArrowUpRight size={17} /></Link></div>
          </div>
        </section>
        <section id="solution" className="nw-section nw-wrap">
          <div className="nw-section-heading nw-reveal"><div><div className="nw-eyebrow">03 / OUR APPROACH</div><h2>Less searching.<br /><em>More understanding.</em></h2></div><p>Nirmaan AI connects the details so you can move from a broad view of public spending to the projects that deserve a closer look.</p></div>
          <div className="nw-capabilities">{[
            ['01', 'Spot the unusual', 'Anomaly detection', 'Find unusual patterns in project and allocation data, with reasons you can inspect.'],
            ['02', 'Look beyond the numbers', 'Fraud risk identification', 'Surface suspicious signals for investigation, without treating a flag as proof of wrongdoing.'],
            ['03', 'Understand the bottlenecks', 'Efficiency analysis', 'Review project status and resource patterns to ask better questions about delays.'],
            ['04', 'Focus the next review', 'Intelligent risk scoring', 'Use explainable signals to prioritise attention and support informed human decisions.'],
          ].map(([number, title, label, description]) => <article className="nw-capability nw-reveal" key={number}><span className="nw-cap-number">{number}</span><div><span className="nw-eyebrow">{label}</span><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={22} strokeWidth={1.4} /></article>)}</div>
        </section>
        <section id="how-it-works" className="nw-process"><div className="nw-wrap"><div className="nw-section-heading nw-reveal"><div><div className="nw-eyebrow">04 / HOW IT WORKS</div><h2>From public data<br />to <em>informed action.</em></h2></div><Link href="/dashboard" className="nw-btn nw-btn-light">See it in the dashboard <ArrowUpRight size={17} /></Link></div><div className="nw-steps">{[['Collect', 'Bring MPLADS project and allocation records together.'], ['Analyse', 'Examine patterns across projects, locations and spending.'], ['Detect', 'Surface anomalies and explain the signals behind them.'], ['Prioritise', 'Help reviewers decide what to investigate next.']].map(([title, description], index) => <article className="nw-reveal" key={title}><div><span>0{index + 1}</span><ArrowRight size={20} /></div><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
        <section id="impact" className="nw-section nw-wrap"><div className="nw-section-heading nw-reveal"><div><div className="nw-eyebrow">05 / THE PURPOSE</div><h2>Better visibility.<br /><em>Better public decisions.</em></h2></div><p>Designed to make monitoring useful to the people who fund, review, and depend on public development.</p></div><div className="nw-impact-grid">{[['Transparency', 'A clearer view of where funds are allocated and what project records say.'], ['Accountability', 'Traceable information to support questions, audits and follow-up reviews.'], ['Efficiency', 'Less time piecing records together. More time on the issues that matter.'], ['Better decisions', 'Context and explainable signals to guide the next human decision.']].map(([title, description]) => <article key={title} className="nw-reveal"><Check size={20} /><h3>{title}</h3><p>{description}</p></article>)}</div><div className="nw-responsible nw-reveal"><ShieldCheck size={33} strokeWidth={1.3} /><div><h3>AI flags. Humans decide.</h3><p>A risk signal starts a review. It does not replace one.</p></div><ul><li>Explainable insights</li><li>Human verification</li><li>Responsible data handling</li><li>Audit-friendly reviews</li><li>Responsible deployment</li></ul></div></section>
        <section id="team" className="nw-team nw-wrap"><div className="nw-reveal"><div className="nw-eyebrow">06 / THE PEOPLE BEHIND IT</div><h2>Built by Code Crew.<br /><em>Built for public good.</em></h2><p>A multidisciplinary team bringing product, engineering and research together for Smart India Hackathon 2026.</p></div><div className="nw-team-roles">{[['Product & direction', 'Problem understanding and product fit'], ['AI / ML engineering', 'Anomaly detection and risk analysis'], ['Full-stack development', 'Dashboard and data pipelines'], ['Research & design', 'Domain research and usable interfaces']].map(([role, detail], index) => <div key={role}><span>0{index + 1}</span><div><h3>{role}</h3><p>{detail}</p></div></div>)}</div></section>
        <section className="nw-closing nw-wrap nw-reveal"><div className="nw-eyebrow">PUBLIC MONEY DESERVES A CLEARER PICTURE.</div><h2>See the bigger picture.<br /><em>Start with one project.</em></h2><Link href="/dashboard" className="nw-btn">Explore Nirmaan AI <ArrowUpRight size={19} /></Link></section>
      </main>
      <footer className="nw-footer nw-wrap"><a href="#home" className="nw-footer-brand">Nirmaan <span>AI</span></a><p>© 2026 Code Crew · Smart India Hackathon 2026</p><a href="#home">Back to top <ArrowUpRight size={15} /></a><div className="nw-footer-note">An independent MPLADS monitoring prototype. Comparison examples and project analyses are for demonstration.</div></footer>
    </div>
  );
}
