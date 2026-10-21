/* Photo-independent, precomputed contour flow. All photo sampling stays local. */
class BAMotion {
  constructor(onChange) {
    this.onChange=onChange;this.chunks=new Map();this.pending=new Map();this.failed=new Set();this.meta=null;this.photo=null;
    this.surface=document.createElement('canvas');this.surface.width=320;this.surface.height=240;
    this.ctx=this.surface.getContext('2d');this.output=this.ctx.createImageData(320,240);
    this.ready=fetch('motion/manifest.json').then(r=>{if(!r.ok)throw Error('manifest');return r.json()}).then(m=>{
      if(m.version!==1||m.width<2||m.height<2||!m.frames)throw Error('invalid motion data');
      this.meta=m;this.cutSet=new Set(m.cuts);this.grid=new Float32Array(m.width*m.height*2);this.spatial=[];
      for(let y=0;y<240;y++)for(let x=0;x<320;x++){
        const gx=x/319*(m.width-1),gy=y/239*(m.height-1),ix=Math.min(m.width-2,Math.floor(gx)),iy=Math.min(m.height-2,Math.floor(gy));
        this.spatial.push({i:(iy*m.width+ix)*2,fx:gx-ix,fy:gy-iy});
      }
      this.onChange();return m;
    }).catch(e=>{this.error=e;this.onChange();return null});
  }
  setPhoto(canvas){this.photo=canvas.getContext('2d').getImageData(0,0,640,480).data;this.lastKey=null}
  async load(index) {
    if(this.chunks.has(index))return this.chunks.get(index);
    if(this.pending.has(index))return this.pending.get(index);
    const task=(async()=>{
      const item=this.meta.chunks[index];if(!item)return null;
      const r=await fetch('motion/'+item.file);if(!r.ok)throw Error('motion chunk '+index);
      if(!window.DecompressionStream)throw Error('gzip unsupported');
      const raw=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if(raw.byteLength!==item.frames*this.meta.width*this.meta.height*4)throw Error('motion size mismatch');
      const view=new DataView(raw),data=new Uint16Array(raw.byteLength/2);
      for(let i=0;i<data.length;i++)data[i]=view.getUint16(i*2,true);
      this.chunks.set(index,data);this.failed.delete(index);this.onChange();return data;
    })();this.pending.set(index,task);
    task.catch(()=>{this.failed.add(index);this.onChange()});return task;
  }
  request(time){
    if(!this.meta)return;
    const i=Math.min(this.meta.chunks.length-1,Math.floor(Math.max(0,time)*this.meta.fps/this.meta.chunkFrames));
    this.load(i).catch(()=>{});if(i+1<this.meta.chunks.length)this.load(i+1).catch(()=>{});
  }
  async readyForExport(){
    if(!await this.ready)throw Error('无法加载形变数据');
    // Limit concurrent downloads while guaranteeing export never silently falls back mid-clip.
    for(let i=0;i<this.meta.chunks.length;i+=2)await Promise.all([this.load(i),i+1<this.meta.chunks.length?this.load(i+1):Promise.resolve()]);
  }
  draw(target,box,time,strength){
    if(!this.meta||!this.photo)return false;
    const m=this.meta,pos=Math.max(0,Math.min(m.frames-1,time*m.fps)),a=Math.floor(pos),b=Math.min(a+1,m.frames-1);
    const ca=Math.floor(a/m.chunkFrames),cb=Math.floor(b/m.chunkFrames);
    this.request(time);const da=this.chunks.get(ca),db=this.chunks.get(cb);if(!da||!db)return false;
    const mix=this.cutSet.has(b)?0:pos-a,n=m.width*m.height*2,oa=(a%m.chunkFrames)*n,ob=(b%m.chunkFrames)*n;
    const key=`${a}:${Math.round(mix*100)}:${strength}`;
    if(key!==this.lastKey){
      const g=this.grid;
      for(let i=0;i<n;i+=2){
        const x=(i/2)%m.width,y=Math.floor(i/2/m.width),u=x/(m.width-1),v=y/(m.height-1);
        g[i]=u+((da[oa+i]*(1-mix)+db[ob+i]*mix)/65535-u)*strength;
        g[i+1]=v+((da[oa+i+1]*(1-mix)+db[ob+i+1]*mix)/65535-v)*strength;
      }
      // Locate the selected photo center in the deformed field for the preview marker.
      let nearest=Infinity;this.anchorPosition={x:.5,y:.5};
      for(let i=0;i<n;i+=2){const error=(g[i]-.5)**2+(g[i+1]-.5)**2;if(error<nearest){nearest=error;this.anchorPosition={x:((i/2)%m.width)/(m.width-1),y:Math.floor(i/2/m.width)/(m.height-1)}}}
      const out=this.output.data,src=this.photo,row=m.width*2;
      for(let pixel=0;pixel<76800;pixel++){
        const {i,fx,fy}=this.spatial[pixel];
        const u=(g[i]*(1-fx)+g[i+2]*fx)*(1-fy)+(g[i+row]*(1-fx)+g[i+row+2]*fx)*fy;
        const v=(g[i+1]*(1-fx)+g[i+3]*fx)*(1-fy)+(g[i+row+1]*(1-fx)+g[i+row+3]*fx)*fy;
        const sx=Math.max(0,Math.min(638.999,u*639)),sy=Math.max(0,Math.min(478.999,v*479));
        const ix=Math.floor(sx),iy=Math.floor(sy),tx=sx-ix,ty=sy-iy,j=(iy*640+ix)*4,k=pixel*4;
        for(let c=0;c<3;c++)out[k+c]=(src[j+c]*(1-tx)+src[j+4+c]*tx)*(1-ty)+(src[j+2560+c]*(1-tx)+src[j+2564+c]*tx)*ty;
        out[k+3]=255;
      }
      this.ctx.putImageData(this.output,0,0);this.lastKey=key;
    }
    target.drawImage(this.surface,box.x,box.y,box.width,box.height);return true;
  }
}
