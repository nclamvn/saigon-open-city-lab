import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const hero=read('outputs/hcmc-poc/hero-zone-20a.js');
const index=read('outputs/hcmc-poc/index.html');
const app=read('outputs/hcmc-poc/app.js');
const leadership=read('outputs/hcmc-poc/leadership-16.js');
const story=read('outputs/hcmc-poc/executive-story-19.js');
const tip=read('research/vibecode-20a/TIP.md');
const receipt=JSON.parse(read('outputs/hcmc-poc/research/hero20/opera-hd-receipt.json'));
const results=[];
const check=(name,value)=>results.push({name,pass:Boolean(value)});

check('Hero module is loaded',index.includes('hero-zone-20a.js?v=20a-'));
check('Hero CSS is loaded',index.includes('hero-zone-20a.css?v=20b'));
check('Hero module loads before performance instrumentation',index.indexOf('hero-zone-20a.js')<index.indexOf('performance-16b.js'));
check('Main render loop advances Hero 20',app.includes('advanceHero20(dt,now)'));
check('Performance probe includes Hero 20',read('outputs/hcmc-poc/performance-16b.js').includes("'advanceHero20'"));
check('Opera mapped id is inherited from source manifest',hero.includes('mappedBuildingId:opera.building_id'));
check('Site photo source travels with runtime status',hero.includes('sourcePhoto:{url:heroPhoto.sourceUrl,author:heroPhoto.author,license:heroPhoto.license,date:heroPhoto.date'));
check('Hero uses HD rectified Opera texture',hero.includes("asset:'assets/hero20/opera-arch-rectified-hd.jpg'")&&receipt.source_dimensions[0]===3920&&receipt.derived_dimensions[0]===1600);
check('HD transform forbids invented pixels',receipt.transform.includes('no inpainting or generated fill'));
check('Architecture is explicitly approximate',hero.includes("architecture:'photo_derived_approximation'"));
check('Public realm is explicitly illustrative',hero.includes("publicRealm:'illustrative_proxy'"));
check('Future planning geometry stays disabled',hero.includes('planningGeometryEnabled:false')&&story.includes('planningGeometryEnabled:false'));
check('Close-range micro LOD exists',hero.includes('microCutoffM:230')&&hero.includes('distance<230'));
check('Three lighting moods exist',['day','golden','blue'].every(m=>hero.includes(`data-hero-mood="${m}"`)));
check('Leadership Explore links to hero view',leadership.includes("navigate('hero20')"));
check('Trailer cluster and evidence scenes retain the hero background',story.includes("view:'district20'")&&story.includes("view:'continental20'")&&story.includes('photo:true'));
check('Acceptance and evidence policy are documented',tip.includes('Không còn một tấm ảnh phẳng')&&tip.includes('Photo-derived approximation'));
check('Sourced Opera image remains in the bundle',fs.existsSync('outputs/hcmc-poc/assets/facades15/opera-reference.jpg')&&fs.existsSync('outputs/hcmc-poc/assets/facades15/opera-rectified.jpg'));
check('HD Opera source and derivative remain auditable',fs.existsSync('outputs/hcmc-poc/assets/hero20/opera-hd-source.jpg')&&fs.existsSync('outputs/hcmc-poc/assets/hero20/opera-arch-rectified-hd.jpg'));

for(const r of results)console.log(`${r.pass?'PASS':'FAIL'} — ${r.name}`);
const passed=results.filter(r=>r.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
if(passed!==results.length)process.exit(1);
