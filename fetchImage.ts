import { writeFileSync } from 'fs';

async function run() {
  const res = await fetch('https://ibb.co/sp5YYRCD');
  const html = await res.text();
  
  // ImgBB puts the direct image URL in a <link rel="image_src" href="..."> or <meta property="og:image" content="...">
  const matchURL = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/<link rel="image_src" href="([^"]+)"/i);
  
  if (!matchURL || !matchURL[1]) {
    console.error("Could not find image URL.");
    return;
  }
  
  const imgUrl = matchURL[1];
  console.log("Image URL found:", imgUrl);
  
  const imgRes = await fetch(imgUrl);
  const buffer = await imgRes.arrayBuffer();
  
  writeFileSync('./public/logo.png', Buffer.from(buffer));
  console.log("Saved to ./public/logo.png");
}

run().catch(console.error);