const $=id=>document.getElementById(id), video=$('source'), canvas=$('output'), ctx=canvas.getContext('2d');
const mask=document.createElement('canvas'), photo=document.createElement('canvas');mask.width=photo.width=640;mask.height=photo.height=480;
const m=mask.getContext('2d',{willReadFrequently:true}),p=photo.getContext('2d',{willReadFrequently:true});let pic,recording=false,recorder,audioCtx,audioSource,audioDest,audioGain;
function demo(){photoLoader?.cancel();releasePhoto();const c=document.createElement('canvas');c.width=1000;c.height=750;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,1000,750);g.addColorStop(0,'#dd3533');g.addColorStop(.45,'#f9ebd9');g.addColorStop(1,'#26252a');x.fillStyle=g;x.fillRect(0,0,1000,750);for(let i=0;i<6;i++){x.beginPath();x.ellipse(120+i*175,420-i*40,110,550,-.5,0,Math.PI*2);x.fillStyle=['#b02722','#dd3533','#f9ebd9','#fbfbfb','#41363d','#26252a'][i];x.fill()}pic=c;$('filename').textContent='没交照片，先让色块顶班';$('filehint').textContent='点播放，看看今天能离谱到什么程度';reset()}
let anchorX=.5,anchorY=.5,pickerLayout;
const motion=new BAMotion(()=>{render()});
function gridDemo(){
  const c=document.createElement('canvas');c.width=800;c.height=600;const g=c.getContext('2d');
  const colors=['#dd3533','#f9ebd9','#b4afaa','#41363d'];
  for(let y=0;y<6;y++)for(let x=0;x<8;x++){
    g.fillStyle=colors[Math.floor(x/2)];g.fillRect(x*100,y*100,100,100);
    g.strokeStyle='#000000';g.lineWidth=3;g.strokeRect(x*100,y*100,100,100);
    g.fillStyle='#000000';g.font='24px sans-serif';g.fillText(String.fromCharCode(65+y)+(x+1),x*100+12,y*100+30);
    g.beginPath();g.arc(x*100+50,y*100+60,13,0,Math.PI*2);g.stroke();
  }
  photoLoader.cancel();releasePhoto();pic=c;$('filename').textContent='数学作业已被迫营业';reset();
  $('filehint').textContent='每一格都有自己的精神状态';$('follow').checked=true;$('deform').checked=true;render();
}
$('grid-demo').onclick=gridDemo;
$('deform').onchange=render;$('deform-strength').oninput=()=>{$('deform-value').textContent=Math.round(+$('deform-strength').value*100)+'%';render()};
const picker=$('anchor-picker'), pickerCtx=picker.getContext('2d');
function reset(){anchorX=anchorY=.5;for(const id of ['panx','pany'])$(id).value=0;$('zoom').value=1.5;photoDraw()}
function photoDraw(){
  if(!pic)return;
  const w=pic.naturalWidth||pic.width,h=pic.naturalHeight||pic.height;
  const crop=BATrack.crop(w,h,+$('zoom').value,anchorX,anchorY);
  // This patch is frozen in photo coordinates. Only its destination changes per frame.
  p.clearRect(0,0,640,480);p.drawImage(pic,crop.x,crop.y,crop.width,crop.height,0,0,640,480);
  motion.setPhoto(photo);
  $('zoomvalue').textContent=Math.round(+$('zoom').value*100)+'%';
  $('thumb').getContext('2d').drawImage(photo,0,0,56,56);
  const scale=Math.min(picker.width/w,picker.height/h),dw=w*scale,dh=h*scale;
  const x=(picker.width-dw)/2,y=(picker.height-dh)/2;pickerLayout={x,y,dw,dh};
  pickerCtx.fillStyle='#000000';pickerCtx.fillRect(0,0,picker.width,picker.height);
  pickerCtx.drawImage(pic,x,y,dw,dh);
  pickerCtx.fillStyle='rgba(0,0,0,.5)';pickerCtx.fillRect(x,y,dw,dh);
  const rx=x+crop.x*scale,ry=y+crop.y*scale,rw=crop.width*scale,rh=crop.height*scale;
  pickerCtx.drawImage(pic,crop.x,crop.y,crop.width,crop.height,rx,ry,rw,rh);
  pickerCtx.strokeStyle='#dd3533';pickerCtx.lineWidth=3;pickerCtx.strokeRect(rx,ry,rw,rh);
  const cx=x+crop.cx*scale,cy=y+crop.cy*scale;
  pickerCtx.beginPath();pickerCtx.arc(cx,cy,9,0,Math.PI*2);pickerCtx.stroke();
  pickerCtx.beginPath();pickerCtx.moveTo(cx-17,cy);pickerCtx.lineTo(cx+17,cy);pickerCtx.moveTo(cx,cy-17);pickerCtx.lineTo(cx,cy+17);pickerCtx.stroke();
  render();
}
let photoDrawPending=false;
function schedulePhotoDraw(){if(photoDrawPending)return;photoDrawPending=true;requestAnimationFrame(()=>{photoDrawPending=false;photoDraw()})}
function setAnchor(x,y){
  anchorX=Math.max(0,Math.min(1,x));anchorY=Math.max(0,Math.min(1,y));
  $('panx').value=anchorX*2-1;$('pany').value=anchorY*2-1;schedulePhotoDraw();
  $('anchor-hint').textContent='C 位已安排。亮框里的照片准备出道。';
}
picker.addEventListener('pointerdown',e=>{
  if(!pickerLayout)return;const rect=picker.getBoundingClientRect(),b=pickerLayout;
  const x=(e.clientX-rect.left)*picker.width/rect.width,y=(e.clientY-rect.top)*picker.height/rect.height;
  if(x<b.x||x>b.x+b.dw||y<b.y||y>b.y+b.dh)return;
  setAnchor((x-b.x)/b.dw,(y-b.y)/b.dh);
});
picker.addEventListener('keydown',e=>{const d={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]}[e.key];if(d){e.preventDefault();setAnchor(anchorX+d[0],anchorY+d[1])}});
function render(){
  if(video.readyState<2)return;
  if($('follow').checked&&$('deform').checked)motion.request(video.currentTime);
  m.drawImage(video,0,0,640,480);
  const marker=$('target-anchor');marker.hidden=true;
  if($('original').checked){ctx.drawImage(mask,0,0);return}
  const frame=m.getImageData(0,0,640,480),d=frame.data;
  const follow=$('follow').checked;
  const b=follow?BATrack.bounds(d,640,480):{x:0,y:0,width:640,height:480};
  ctx.fillStyle='#fff';ctx.fillRect(0,0,640,480);
  if(b){
    const local=follow&&$('deform').checked;
    const warped=local&&motion.draw(ctx,b,video.currentTime,+$('deform-strength').value);
    if(!warped)ctx.drawImage(photo,b.x,b.y,b.width,b.height);
    const state=$('motion-status');
    if(!local)state.textContent=follow?'面条人已下班，现在整张一起跳。':'照片已站定，演员自己发挥。';
    else if(warped)state.textContent='离谱能量已就位。请保持不严肃。';
    else if(motion.error||motion.failed.size)state.textContent='面条人堵路上了，先整张跳；刷新可重试。';
    else state.textContent='正在补充离谱能量，先整张热个身…';
    if(follow&&$('show-anchor').checked){const a=warped?motion.anchorPosition:{x:.5,y:.5};marker.hidden=false;marker.style.left=((b.x+b.width*a.x)/640*100)+'%';marker.style.top=((b.y+b.height*a.y)/480*100)+'%'}
  }
  for(let i=0;i<d.length;i+=4){const lum=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.max(0,Math.min(255,(lum-30)*255/195))}
  m.putImageData(frame,0,0);ctx.drawImage(mask,0,0);
}
let lastDraw=0;function tick(now){if(!video.paused&&!video.ended&&now-lastDraw>=1000/30){render();lastDraw=now}requestAnimationFrame(tick)}function fmt(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')}
video.addEventListener('loadeddata',()=>{$('loading').style.display='none';video.currentTime=Math.min(8,video.duration/2);$('seek').max=video.duration});video.addEventListener('seeked',render);video.addEventListener('timeupdate',()=>{$('time').textContent=fmt(video.currentTime)+' / '+fmt(video.duration||0);$('seek').value=video.currentTime});video.addEventListener('play',()=>{$('play').textContent='Ⅱ 收敛一下'});video.addEventListener('pause',()=>{$('play').textContent='▶ 开始发癫'});video.addEventListener('ended',()=>{if(recording)recorder.stop()});video.addEventListener('error',()=>{$('loading').textContent='视频载入失败，请刷新重试'});
let audioVolume=.7,audioMuted=false,lastAudibleVolume=.7;
function applyAudioLevel(){
  if(audioGain){audioGain.gain.value=audioMuted?0:audioVolume;video.volume=1;video.muted=false}
  else{video.volume=audioVolume;video.muted=audioMuted}
  const audible=!audioMuted&&audioVolume>0;
  $('sound').textContent=audible?'♪ 声音已开 · 点击静音':'♪ 当前静音 · 点击开声';
  $('sound').setAttribute('aria-pressed',String(audible));
  $('volume').value=Math.round(audioVolume*100);$('volume-value').textContent=Math.round(audioVolume*100)+'%';
}
function ensureAudioGraph(){
  if(!audioCtx){
    const AudioClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioClass)return Promise.resolve();
    audioCtx=new AudioClass();audioSource=audioCtx.createMediaElementSource(video);
    audioGain=audioCtx.createGain();audioDest=audioCtx.createMediaStreamDestination();
    audioSource.connect(audioGain);audioGain.connect(audioCtx.destination);audioGain.connect(audioDest);applyAudioLevel();
  }
  return audioCtx.resume();
}
applyAudioLevel();
$('play').onclick=()=>{
  if(!video.paused){video.pause();return}
  try{ensureAudioGraph().catch(()=>{});video.play().catch(()=>{$('status').textContent='播放未能开始，请再点一次。'})}
  catch{$('status').textContent='声音启动失败，请刷新后重试。'}
};
$('sound').onclick=()=>{
  if(audioMuted||audioVolume===0){audioMuted=false;if(audioVolume===0)audioVolume=lastAudibleVolume||.7}
  else audioMuted=true;
  applyAudioLevel();ensureAudioGraph().catch(()=>{});
};
$('volume').oninput=()=>{audioVolume=+$('volume').value/100;audioMuted=audioVolume===0;if(audioVolume>0)lastAudibleVolume=audioVolume;applyAudioLevel();ensureAudioGraph().catch(()=>{})};
$('seek').oninput=()=>{video.currentTime=+$('seek').value};$('zoom').oninput=schedulePhotoDraw;$('panx').oninput=()=>setAnchor((+$('panx').value+1)/2,anchorY);$('pany').oninput=()=>setAnchor(anchorX,(+$('pany').value+1)/2);$('follow').onchange=render;$('show-anchor').onchange=render;$('original').onchange=render;$('demo').onclick=demo;
function releasePhoto(){if(pic&&typeof pic.close==='function')pic.close()}
const photoLoader=new BAPhotoLoader(async file=>{
  if(window.createImageBitmap){
    try{
      const original=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(original.width,original.height));
      if(scale===1)return original;
      try{return await createImageBitmap(original,{resizeWidth:Math.max(1,Math.round(original.width*scale)),resizeHeight:Math.max(1,Math.round(original.height*scale)),resizeQuality:'high'})}
      finally{original.close()}
    }catch{}
  }
  const url=URL.createObjectURL(file),im=new Image();
  try{
    im.src=url;await im.decode();
    const scale=Math.min(1,1280/Math.max(im.naturalWidth,im.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c;
  }finally{URL.revokeObjectURL(url)}
},(image,file)=>{
  releasePhoto();pic=image;$('filename').textContent=file.name;
  $('filehint').textContent='主角已到场 · 在下方选个 C 位';
  $('status').textContent='照片已入职。点选要保留的位置，准备开始发癫。';reset();
},()=>{$('status').textContent='图片读取失败，请使用 JPG、PNG 或 WebP。'});
function upload(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){$('status').textContent='请选择图片文件。';return}
  $('status').textContent='正在给新主角办入职，上一位继续跳…';photoLoader.select(file);
}
$('upload').onchange=e=>{upload(e.target.files[0]);e.target.value=''};$('drop').ondragover=e=>{e.preventDefault();$('drop').classList.add('drag')};$('drop').ondragleave=()=>$('drop').classList.remove('drag');$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('drag');upload(e.dataTransfer.files[0])};
function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}$('snapshot').onclick=()=>canvas.toBlob(b=>b&&download(b,'bad-apple-photo.png'));
$('record').onclick=async()=>{if(recording){recorder.stop();return}if(!window.MediaRecorder||!canvas.captureStream){$('status').textContent='当前浏览器不支持视频导出，请用 Chrome；仍可实时预览和保存画面。';return}if(video.readyState<2)return;
try{await ensureAudioGraph()}catch{$('status').textContent='声音启动失败，请重新点击导出。';return}
if($('follow').checked&&$('deform').checked){
  $('record').disabled=true;$('status').textContent='正在召集全体面条人，到齐后自动开始录制…';
  try{await motion.readyForExport()}catch{$('status').textContent='面条人没到齐，请刷新重试，或关闭「面条人模式」再导出。';$('record').disabled=false;return}
  $('record').disabled=false;
}
try{video.pause();video.currentTime=0;await new Promise(resolve=>{if(video.currentTime===0&&!video.seeking)resolve();else video.addEventListener('seeked',resolve,{once:true})});await ensureAudioGraph();const stream=canvas.captureStream(30);audioDest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{recording=false;video.pause();stream.getVideoTracks().forEach(t=>t.stop());download(new Blob(chunks,{type:recorder.mimeType}),recorder.mimeType.includes('mp4')?'bad-apple-photo.mp4':'bad-apple-photo.webm');$('record').textContent='↓ 保存我的发癫实录';$('status').textContent='发癫实录已生成，正在下载。证据确凿。';$('seek').disabled=false};recorder.start(1000);recording=true;applyAudioLevel();$('seek').disabled=true;$('record').textContent='■ 够了，保存证据';$('status').textContent='正在录制发癫实录，请保持页面在前台。随时可停止并保存片段。';await video.play()}catch(e){if(recording&&recorder.state!=='inactive')recorder.stop();$('status').textContent='此浏览器未能录制视频，可尝试 Chrome。'}};
demo();requestAnimationFrame(tick);
