'use strict';
// Small, local-only lexical highlighter. It never evaluates source code.
(() => {
 const keywords=new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case type'.split(' '));
 const builtins=new Set('abs all any bool bytes callable chr dict enumerate filter float format getattr hasattr hash help hex id input int isinstance issubclass iter len list map max min next object open ord pow print range repr reversed round set setattr slice sorted str sum super tuple type vars zip Exception ValueError TypeError RuntimeError StopIteration'.split(' '));
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const word=/[\p{L}_][\p{L}\p{N}_]*/uy;
 const number=/(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?)[jJ]?/y;
 const stringStart=/(?:[rRuUbBfF]{1,2})?(?:"""|'''|"|')/y;
 function highlight(text){
  let i=0,html='',definition=false;
  const add=(s,kind)=>{html+=kind?'<span class="py-'+kind+'">'+escape(s)+'</span>':escape(s);};
  while(i<text.length){
   if(text[i]==='#'){let end=text.indexOf('\n',i);if(end<0)end=text.length;add(text.slice(i,end),'comment');i=end;continue;}
   stringStart.lastIndex=i;let match=stringStart.exec(text);
   if(match){const open=match[0],quote=open.endsWith('"""')?'"""':open.endsWith("'''")?"'''":open.at(-1);let end=i+open.length;
    while(end<text.length){if(text[end]==='\\'){end=Math.min(text.length,end+2);continue;}if(text.startsWith(quote,end)){end+=quote.length;break;}if(quote.length===1&&text[end]==='\n')break;end++;}
    add(text.slice(i,end),'string');i=end;definition=false;continue;
   }
   word.lastIndex=i;match=word.exec(text);
   if(match){const name=match[0];add(name,definition?'definition':['True','False','None'].includes(name)?'literal':keywords.has(name)?'keyword':builtins.has(name)?'builtin':null);definition=name==='def'||name==='class';i+=name.length;continue;}
   number.lastIndex=i;match=number.exec(text);
   if(match){add(match[0],'number');i+=match[0].length;definition=false;continue;}
   if(/[+\-*/%=<>!&|^~:@]/.test(text[i]))add(text[i],'operator');else add(text[i]);
   if(text[i]==='\n')definition=false;i++;
  }
  return html+(text.endsWith('\n')?' ':'');
 }
 if(typeof module!=='undefined')module.exports=highlight;else window.CodyPythonColor=highlight;
})();
