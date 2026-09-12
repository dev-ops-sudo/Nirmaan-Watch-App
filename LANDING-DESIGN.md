# Landing page assets and validation

Built-in image generation was used for both project assets, then Sharp converted them to WebP at 1400 pixels wide and quality 85.

- public/images/landing-school.webp
- public/images/landing-road.webp

School prompt: Use case: photorealistic-natural. Asset type: wide editorial website photograph for Indian public infrastructure monitoring. Create a realistic documentary photograph of a modest rural Indian government primary school under development: pale warm plaster classroom building, shaded veranda, mature neem tree, partly finished paved approach and a civil engineer in light shirt holding a clipboard surveying in the midground. Respectful lived-in setting, no poverty sensationalism, no dramatic luxury building. Wide horizontal 3:2 framing, building and landscape dominant, natural soft morning sunlight, muted olive foliage, warm earth and ivory walls, subtle film grain, architectural magazine quality, true-to-life textures. No words, signage, logos, watermark, text overlays, charts or UI. This is an illustrative generated photograph, not evidence of a real site.

Road prompt: Use case: photorealistic-natural. Asset type: wide editorial card photograph for Indian public development website. Realistic documentary architectural photograph of a small rural Indian road and concrete culvert bridge, a finished section of modest paved road leading across a seasonal stream toward a village with trees, unfinished gravel road shoulder visibly at foreground right. Wide horizontal 3:2 framing, natural subdued daylight, olive green foliage, warm earth, neutral stone, editorial photographic detail and realistic materials, calm grounded optimistic mood. No lettering, signage, logos, watermarks, text, graphics or UI. Ordinary useful public infrastructure, no monumental highway, no futuristic architecture. Illustrative generated scene.

The development comparison uses explicitly labelled illustrative values. The supplied manifest establishes 60,359 records but does not contain verified physical-progress percentages, so these examples must not be presented as actual project measurements.

Design: locally hosted DM Sans and Instrument Serif, ivory paper, deep green ink and terracotta accents. Styles use the nw prefix to isolate the landing page from the dashboard. GSAP matchMedia reverts animations and ScrollTriggers on unmount and respects reduced motion. The carousel has manual selection and a pause control.

Validation: production build passed; landing-page ESLint has no errors (two framework recommendations for img elements; assets are already optimized WebP). Browser checks at 320, 390, 768 and 1280 pixel widths found no horizontal or text overflow. Checked image loading, completed intro animation, comparison switching, mobile menu open/close and anchor navigation. Repository-wide TypeScript checking reports existing implicit-any errors in app/api/rag/route.ts lines 357 and 358.
