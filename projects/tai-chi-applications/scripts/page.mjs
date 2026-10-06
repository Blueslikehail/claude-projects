// web/index.html is written as page content without <html>/<head>/<body>, the format an
// Artifact page is published in. For the dev server and dist/ we add the skeleton here,
// moving the leading <title> and <link> tags into <head>.
export function wrapPage(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && /^\s*(<title|<link|$)/.test(lines[i])) i++;
  const head = lines.slice(0, i).filter((l) => l.trim()).join("\n");
  const body = lines.slice(i).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
<style>[hidden]{display:none!important}body{margin:0}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
