import { NextRequest } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { listMetaPixels, saveMetaPixel } from "@/lib/meta-capi";
export const dynamic="force-dynamic";
export async function GET(){const d=await guardAdmin("api");if(d)return d;return Response.json({items:await listMetaPixels()});}
export async function POST(req:NextRequest){const d=await guardAdmin("api");if(d)return d;try{const b=await req.json();if(!/^\d{8,20}$/.test(String(b.pixelId||"")))return Response.json({error:"Pixel ID must contain 8-20 digits"},{status:400});if(!b.id&&!b.accessToken)return Response.json({error:"Access token is required"},{status:400});const row=await saveMetaPixel(b);return Response.json({ok:true,item:{...row,accessToken:row.accessToken?"••••••••":""}},{status:201});}catch(e){return Response.json({error:e instanceof Error?e.message:"Could not save Meta Pixel"},{status:500});}}
