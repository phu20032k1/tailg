"use client";

import { FormEvent, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProgressMapUpload({ stage }: { stage:string }) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setMessage("");
    const form=new FormData(event.currentTarget); form.set("stage",stage); form.set("title",`Mặt bằng ${stage}`);
    const response=await fetch("/api/progress-map",{method:"POST",body:form}); const result=await response.json(); setBusy(false);
    if(!response.ok){setMessage(result.error||"Chưa thể tải mặt bằng.");return;} setMessage("Đã cập nhật mặt bằng"); event.currentTarget.reset(); router.refresh();
  }
  return <form className="progress-map-upload" onSubmit={submit}><label className="button secondary"><ImagePlus size={17}/> Chọn mặt bằng<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required hidden/></label><button className="button primary" disabled={busy} type="submit">{busy?"Đang tải...":"Cập nhật mặt bằng"}</button>{message?<span>{message}</span>:null}</form>;
}
