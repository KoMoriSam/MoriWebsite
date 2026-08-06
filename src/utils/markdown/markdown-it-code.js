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
    <div class="code-wrapper" id="${mountId}">
	  ${highlightedHtml}
	  ${lang ? `<span class="lang-tag">${lang}</span>` : ""}
	  <div 
	    class="absolute right-2 top-2 tooltip tooltip-left"
	    data-tip="复制到剪贴板">
	    <button class="btn btn-sm btn-neutral btn-square"
		  onclick="(function(btn){
		    const tooltipDiv = btn.parentElement;
		    const code = decodeURIComponent(btn.getAttribute('data-code'));
		    navigator.clipboard.writeText(code).then(() => {;
			  btn.innerHTML = '<i class=ri-check-line font-normal></i>';
			  btn.classList.remove('btn-neutral');
			  btn.classList.add('btn-success');
			  tooltipDiv.classList.add('tooltip-success');
			  tooltipDiv.setAttribute('data-tip', '复制成功');
			  setTimeout(() => {
			    btn.innerHTML = '<i class=ri-file-copy-line font-normal></i>';
			    btn.classList.remove('btn-success');
				btn.classList.add('btn-neutral');
			    tooltipDiv.classList.remove('tooltip-success');
			    tooltipDiv.setAttribute('data-tip', '复制到剪贴板');
			  }, 2000);
		    });
		  })(this)"
		  data-code="${encodeURIComponent(codeContent)}">
		  <i class="ri-file-copy-line font-normal"></i>
	    </button>
	  </div>
    </div>`;
  };
}
