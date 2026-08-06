// utils/markdown/markdown-it-code.js
export function codePlugin(md) {
  const defaultFenceRenderer = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const highlightedHtml = defaultFenceRenderer(
      tokens,
      idx,
      options,
      env,
      self,
    );
    const codeContent = tokens[idx].content;
    const lang = tokens[idx].info.trim();
    const mountId = `code-block-${Date.now()}-${idx}`;

    return `
    <div class="code-wrapper group" id="${mountId}" tabindex="0">
	  ${highlightedHtml}
	  ${lang ? `<span class="lang-tag">${lang}</span>` : ""}
	  <div 
	    class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity tooltip tooltip-left tooltip-accent"
	    data-tip="复制到剪贴板">
	    <button class="btn btn-sm btn-ghost btn-square"
		  onclick="(function(btn){
		    const tooltipDiv = btn.parentElement;
		    const code = decodeURIComponent(btn.getAttribute('data-code'));
		    navigator.clipboard.writeText(code).then(() => {
			  tooltipDiv.classList.add('!opacity-100');
			  btn.innerHTML = '<i class=ri-check-line></i>';
			  btn.classList.remove('btn-ghost');
			  btn.classList.add('btn-success');
			  tooltipDiv.classList.remove('tooltip-accent');
			  tooltipDiv.classList.add('tooltip-success');
			  tooltipDiv.setAttribute('data-tip', '复制成功');
			  setTimeout(() => {
			    tooltipDiv.classList.remove('!opacity-100');
			    btn.innerHTML = '<i class=ri-file-copy-line></i>';
			    btn.classList.remove('btn-success');
			    btn.classList.add('btn-ghost');
			    tooltipDiv.classList.remove('tooltip-success');
			    tooltipDiv.classList.add('tooltip-accent');
			    tooltipDiv.setAttribute('data-tip', '复制到剪贴板');
			  }, 2000);
		    });
		  })(this)"
		  data-code="${encodeURIComponent(codeContent)}">
		  <i class="ri-file-copy-line"></i>
	    </button>
	  </div>
    </div>`;
  };
}
