import { useCallback,useEffect,useRef,useState } from 'react';
import { createCardioService,type CardioService } from '../cardioService';
import { toUserFacingCardioError } from '../cardioMessages';
import type { CardioLogInput,CardioSnapshot } from '../model';
export function useCardio(injected?:CardioService){const serviceRef=useRef<CardioService|null>(null);if(!serviceRef.current)serviceRef.current=injected??createCardioService();const[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');const[snapshot,setSnapshot]=useState<CardioSnapshot|null>(null);const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setStatus('loading');setError('');try{const next=await serviceRef.current!.load();setSnapshot(next);setStatus('ready');return next}catch(caught){setError(toUserFacingCardioError(caught));setStatus('error');return null}},[]);
 useEffect(()=>{void load()},[load]);
 const log=useCallback(async(input:CardioLogInput)=>{setBusy(true);setError('');try{await serviceRef.current!.log(input);await load();return true}catch(caught){setError(toUserFacingCardioError(caught));return false}finally{setBusy(false)}},[load]);
 const remove=useCallback(async(id:string)=>{setBusy(true);setError('');try{await serviceRef.current!.remove(id);await load();return true}catch(caught){setError(toUserFacingCardioError(caught));return false}finally{setBusy(false)}},[load]);
 return{status,snapshot,error,busy,retry:load,log,remove};}
