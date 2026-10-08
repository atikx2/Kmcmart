import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { metaPixels } from "@/db/schema";
import { guardAdmin } from "@/lib/admin-api";
export const dynamic="force-dynamic";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){const d=await guardAdmin("api");if(d)return d;const id=Number((await params).id);const b=await req.json();const [r]=await db.update(metaPixels).set({isActive:Boolean(b.isActive),updatedAt:new Date()}).where(eq(metaPixels.id,id)).returning();return r?Response.json({ok:true,item:{...r,accessToken:r.accessToken?"••••••••":""}}):Response.json({error:"Pixel not found"},{status:404});}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){const d=await guardAdmin("api");if(d)return d;const id=Number((await params).id);const [r]=await db.delete(metaPixels).where(eq(metaPixels.id,id)).returning({id:metaPixels.id});return r?Response.json({ok:true}):Response.json({error:"Pixel not found"},{status:404});}
