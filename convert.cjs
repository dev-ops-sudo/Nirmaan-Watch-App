const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve('c:/Users/dm790/OneDrive/Desktop/mplads new project 2026/nirvaan-ai (1).html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let css = styleMatch[1];
  // append to globals.css
  const globalsPath = path.resolve('./app/globals.css');
  fs.appendFileSync(globalsPath, '\n/* Nirvaan AI Landing Page Styles */\n' + css);
}

// 2. Extract Body
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
if (bodyMatch) {
  let body = bodyMatch[1];

  // Fix image source (the base64 background is in the div, wait, we extracted hero-bg.jpg)
  body = body.replace(/style="background-image:url\('data:image\/jpeg;base64,[^']+'\);?"/g, 'style={{ backgroundImage: "url(\'/hero-bg.jpg\')" }}');

  // Convert HTML to JSX
  body = body.replace(/class=/g, 'className=');
  body = body.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  // Close img tags
  body = body.replace(/<img([^>]*[^/])>/g, '<img$1 />');
  
  // There's a style="background-image:url('data:...')" in a div, let's fix other styles if any
  // Wait, inline styles with multiple properties are hard to convert via regex.
  // Let's just find any remaining style="..." and print them to handle manually if needed
  const styleAttrMatch = body.match(/style="([^"]+)"/g);
  if (styleAttrMatch) {
    styleAttrMatch.forEach(s => {
       console.log("Found style:", s);
    });
  }

  // Replace a tags to dashboard with Next Link
  // Let's just keep them as a tags for now, or use next/link
  body = body.replace(/<a href="\/dashboard"/g, '<Link href="/dashboard"');
  body = body.replace(/<\/a>/g, '</a>'); // wait, if we use Link, it closes with </Link>
  // Let's do it manually for the dashboard link
  body = body.replace(/<Link href="\/dashboard" className="btn-cta">Go to Dashboard <span className="arrow">→<\/span><\/a>/g, '<Link href="/dashboard" className="btn-cta">Go to Dashboard <span className="arrow">→</span></Link>');

  const component = `import Link from 'next/link';
import React from 'react';

export default function LandingPage() {
  return (
    <div className="landing-page-container">
      ${body}
    </div>
  );
}
`;
  
  fs.writeFileSync(path.resolve('./app/page.tsx'), component);
  console.log('Component written to app/page.tsx');
}
