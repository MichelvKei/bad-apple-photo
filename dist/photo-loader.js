// Decode one photo at a time; skip superseded selections and release stale bitmaps.
class BAPhotoLoader {
  constructor(decode,apply,onError){this.decode=decode;this.apply=apply;this.onError=onError;this.revision=0;this.pending=null;this.running=false}
  select(file){this.pending={file,revision:++this.revision};this.drain()}
  cancel(){this.revision++;this.pending=null}
  async drain(){
    if(this.running)return;
    this.running=true;
    try{while(this.pending){
      const job=this.pending;this.pending=null;
      try{
        const image=await this.decode(job.file);
        if(job.revision===this.revision)this.apply(image,job.file);
        else if(typeof image.close==='function')image.close();
      }catch(error){if(job.revision===this.revision)this.onError(error)}
    }}finally{this.running=false}
  }
}
if(typeof module!=='undefined')module.exports=BAPhotoLoader;
