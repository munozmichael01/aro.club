import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('='))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const a=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const id='2617698c-a640-4694-917a-aa0c15d3d438'
const {data:v}=await a.from('verifications').select('kind,status,name_matches').eq('profile_id',id)
const {data:p}=await a.from('profiles').select('status').eq('id',id).maybeSingle()
const {data:c}=await a.from('scheduled_emails').select('kind,created_at,sent_at').eq('profile_id',id).order('created_at',{ascending:false}).limit(3)
console.log('verificaciones:', v.map(r=>`${r.kind}=${r.status}(coincide:${r.name_matches})`).join(' '))
console.log('estado del perfil:', p.status)
console.table(c.map(r=>({kind:r.kind, creado:String(r.created_at).slice(11,19), enviado:r.sent_at?String(r.sent_at).slice(11,19):'NO'})))
