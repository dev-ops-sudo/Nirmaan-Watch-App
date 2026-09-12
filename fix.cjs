const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');

// Fix Link tags being closed by </a>
c = c.replace(/<Link ([^>]*)>([\s\S]*?)<\/a>/g, '<Link $1>$2</Link>');
// Fix a tags being closed by </a> but wait, there are genuine <a> tags in nav!
// Let's revert any </Link> back if it was an <a> tag originally.
// Actually, earlier I replaced `<a href="/dashboard"` with `<Link href="/dashboard"`. Let's just fix the specific cases.
c = c.replace(/<Link href="\/dashboard" className="btn-cta large">Go to Dashboard <span className="arrow">→<\/span><\/a>/g, '<Link href="/dashboard" className="btn-cta large">Go to Dashboard <span className="arrow">→</span></Link>');

// Fix self-closing tags
c = c.replace(/<br>/g, '<br />');

// Fix inline styles (string to object)
// E.g. style="background-image:url('data:image/svg+xml,...')"
// We can just remove the style since it's a decorative SVG pattern or fix it.
// Let's just strip inline styles except the ones we already fixed (style={{...}})
c = c.replace(/style="([^"]+)"/g, 'style={{}}');

fs.writeFileSync('app/page.tsx', c);
console.log('Fixed page.tsx');
