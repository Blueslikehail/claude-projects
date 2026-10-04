// web/index.html is written as page content without <html>/<head>/<body>, the format an
// Artifact page is published in. For the dev server and dist/ we add the skeleton here.
export function wrapPage(content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>[hidden]{display:none!important}body{margin:0}</style>
</head>
<body>
${content}
</body>
</html>
`;
}
