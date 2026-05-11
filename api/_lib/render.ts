export function withRequestPath(html: string, requestPath: string): string {
  const marker = '<div id="root"></div>';
  const bootstrap = `<div id="root" data-request-path="${requestPath}"></div>`;
  return html.includes(marker) ? html.replace(marker, bootstrap) : html;
}
