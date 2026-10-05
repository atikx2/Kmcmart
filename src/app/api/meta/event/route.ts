import { NextRequest } from "next/server";
import { sendMetaEvent, META_EVENTS, type MetaEvent } from "@/lib/meta-capi";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){try{const b=await req.json();if(!META_EVENTS.includes(b.name as MetaEvent))return Response.json({ok:false},{status:400});await sendMetaEvent(b.name,b.eventId||`${b.name}-${Date.now()}`,{custom_data:b.params||{}});return Response.json({ok:true});}catch{return Response.json({ok:false},{status:202});}}
