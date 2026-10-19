import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
// Static portable test: read final native product resources only; no SDK/browser/process calls.
const mobile=new URL('../mobile/',import.meta.url);
function read(rel){const url=new URL(rel,mobile);return fs.existsSync(url)?fs.readFileSync(url):null;}
function list(rel){const walk=prefix=>fs.readdirSync(new URL(prefix,mobile),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(prefix+e.name+'/'):[prefix+e.name]);return walk(rel+'/');}
const res='android/app/src/main/res/',ios='ios/App/App/',hash=b=>createHash('sha256').update(b).digest('hex'),text=rel=>read(rel)?.toString('utf8')??'';
const dirs=['drawable','drawable-land-hdpi','drawable-land-mdpi','drawable-land-xhdpi','drawable-land-xxhdpi','drawable-land-xxxhdpi','drawable-port-hdpi','drawable-port-mdpi','drawable-port-xhdpi','drawable-port-xxhdpi','drawable-port-xxxhdpi'];
const slotNames=['splash-2732x2732-2.png','splash-2732x2732-1.png','splash-2732x2732.png'];
const theme=()=>text(res+'values/styles.xml').match(/<style name="AppTheme.NoActionBarLaunch"[^>]*>([\s\S]*?)<\/style>/)?.[1]??'';
const item=(body,name)=>body.match(new RegExp('<item name="'+name+'">([^<]*)</item>'))?.[1]??null;
const storyboard=()=>text(ios+'Base.lproj/LaunchScreen.storyboard');
const image=()=>storyboard().match(/<imageView\b[^>]*image="Splash"[^>]*>/)?.[0]??'';
const constraints=()=>[...storyboard().matchAll(/<constraint\b[^>]*\/>/g)].map(r=>Object.fromEntries([...r[0].matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));

test('all eleven Android orientation/density splash selections have one XML resource and no PNG collision',()=>{
 const selected=list('android/app/src/main/res').filter(r=>/\/splash\.(?:png|xml)$/.test(r));assert.deepEqual(selected.sort(),dirs.map(d=>res+d+'/splash.xml').sort());
});
test('each Android qualified splash uses centered existing own-vector and a uniform cream drawable background',()=>{
 for(const dir of dirs){const value=text(res+dir+'/splash.xml');assert.match(value,/<layer-list\b/);assert.match(value,/<item android:drawable="@color\/hearth_splash_background"\/>/);assert.match(value,/android:width="160dp" android:height="160dp" android:gravity="center" android:drawable="@drawable\/hearth_foreground"/);assert.doesNotMatch(value,/<bitmap\b|\.png|capacitor/i);}
});
test('Android starting theme explicitly chooses own system-splash icon, background and existing post-launch theme',()=>{
 const body=theme();assert.equal(item(body,'android:background'),'@drawable/splash');assert.equal(item(body,'windowSplashScreenAnimatedIcon'),'@drawable/hearth_foreground');assert.equal(item(body,'windowSplashScreenBackground'),'@color/hearth_splash_background');assert.equal(item(body,'postSplashScreenTheme'),'@style/AppTheme.NoActionBar');assert.match(text(res+'values/styles.xml'),/name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"/);
});
test('splash vector remains the original own cream/red/teal/wood/flag geometry and requires no bitmap generation',()=>{
 const value=text(res+'drawable/hearth_foreground.xml');assert.match(value,/<vector\b/);for(const color of ['#FFF0CF','#DA6848','#4F8F8A','#805936','#397F4C'])assert.ok(value.includes(color));assert.doesNotMatch(value,/bitmap|capacitor/i);assert.equal(hash(read(ios+'Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png')),'52449aa9335f496e43b0cf67448f77661aa5e2be844977c0c00f6241c92ee336');
});
test('launcher activity/theme and original Capacitor bridge entry remain in place without a new splash Activity or timer',()=>{
 const manifest=text('android/app/src/main/AndroidManifest.xml');assert.match(manifest,/android:theme="@style\/AppTheme.NoActionBarLaunch"/);assert.match(manifest,/android.intent.action.MAIN/);assert.match(manifest,/android.intent.category.LAUNCHER/);const activity=text('android/app/src/main/java/com/wanderinghearth/game/MainActivity.java');assert.match(activity,/class MainActivity extends BridgeActivity \{\}/);assert.doesNotMatch(activity,/onCreate|Timer|postDelayed|SplashScreen/);assert.match(text('android/app/build.gradle'),/androidx.core:core-splashscreen/);
});
test('all three iOS splash scale slots reuse exact original own AppIcon bytes rather than default Capacitor artwork',()=>{
 const donor=read(ios+'Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png');assert.equal(donor.readUInt32BE(16),1024);assert.equal(donor.readUInt32BE(20),1024);for(const name of slotNames){const value=read(ios+'Assets.xcassets/Splash.imageset/'+name);assert.ok(value&&value.equals(donor),'selected splash bytes must equal existing brand PNG');}
});
test('iOS imageset preserves the three named universal scale mappings and all resolve to own PNGs',()=>{
 assert.match(storyboard(),/<image name="Splash" width="512" height="512"\/>/);const contents=JSON.parse(text(ios+'Assets.xcassets/Splash.imageset/Contents.json'));assert.deepEqual(contents.images.map(r=>[r.idiom,r.scale,r.filename]),slotNames.map((name,i)=>['universal',(i+1)+'x',name]));const hashes=contents.images.map(r=>hash(read(ios+'Assets.xcassets/Splash.imageset/'+r.filename)));assert.ok(hashes.every(h=>h==='52449aa9335f496e43b0cf67448f77661aa5e2be844977c0c00f6241c92ee336'));
});
test('iOS launch view has a noninteractive aspect-fit child centered by actual width/height/center constraints',()=>{
 const value=storyboard();assert.match(value,/<view key="view" contentMode="scaleToFill" id="HRT-LA-001">/);assert.match(image(),/contentMode="scaleAspectFit"/);assert.match(image(),/userInteractionEnabled="NO"/);assert.match(image(),/translatesAutoresizingMaskIntoConstraints="NO"/);assert.doesNotMatch(value,/scaleAspectFill/);const rows=constraints();assert.equal(rows.length,4);for(const axis of ['centerX','centerY'])assert.ok(rows.some(r=>r.firstItem==='snD-IY-ifK'&&r.firstAttribute===axis&&r.secondItem==='HRT-LA-001'&&r.secondAttribute===axis));
});
test('launch logo fixed160 square fits declared small/portrait/landscape viewport controls without changing source PNG pixels',()=>{
 const rows=constraints(),width=Number(rows.find(r=>r.firstAttribute==='width')?.constant),height=Number(rows.find(r=>r.firstAttribute==='height')?.constant);assert.equal(width,160);assert.equal(height,160);for(const [w,h]of [[320,568],[390,844],[844,390],[1024,768]]){const left=(w-width)/2,top=(h-height)/2;assert.ok(left>=0&&top>=0&&left+width<=w&&top+height<=h);}for(const dir of dirs)assert.match(text(res+dir+'/splash.xml'),/android:width="160dp" android:height="160dp"/);
});
test('native launch backgrounds share the declared opaque warm cream while existing app icon background is unchanged',()=>{
 assert.match(text(res+'values/hearth_splash_colors.xml'),/<color name="hearth_splash_background">#FFF4DB<\/color>/);const color=storyboard().match(/<color key="backgroundColor" red="([^"]+)" green="([^"]+)" blue="([^"]+)" alpha="([^"]+)"/);assert.ok(color,'launch root background must be explicit sRGB');const actual=color.slice(1).map(Number);assert.ok(actual.every(Number.isFinite));for(const [a,b]of actual.map((a,i)=>[a,[1,244/255,219/255,1][i]]))assert.ok(Math.abs(a-b)<1e-12);assert.match(text(res+'values/hearth_icon_colors.xml'),/#E3EBD2/);
});

test('legacy effective windowBackground explicitly selects the160 own layer rather than inherited AndroidX288 compat drawable',()=>{
 const inheritedAndroidX12='@drawable/compat_splash_screen_no_icon_background';
 const effective=item(theme(),'android:windowBackground')??inheritedAndroidX12;assert.equal(effective,'@drawable/splash');
 assert.match(text(res+'drawable/splash.xml'),/android:width="160dp" android:height="160dp"/);
});
