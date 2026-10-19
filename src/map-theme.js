export const MAP_THEMES=Object.freeze({meadow:{ground:'#a9bc70',road:'#d9cd97',enemy:'#d36b44',boss:'#a95137'},volcano:{ground:'#655251',road:'#e49a59',enemy:'#ffe29c',boss:'#ff5c43'},glacier:{ground:'#b5d9e5',road:'#eff8fb',enemy:'#597cae',boss:'#704ba5'}});
export function mapTheme(region){return MAP_THEMES[region]??MAP_THEMES.meadow;}
export function mapPoint(x,z,extent=14){return {x:Math.max(0,Math.min(100,50+x/extent*46)),y:Math.max(0,Math.min(100,50+z/extent*46))};}
