import type { DailyState } from './nexo';
export interface ContactMoment {before:string;after:string;count:number;complete:boolean;source?:'bonus'}
export function getContactMoment(previous:DailyState|null,next:DailyState):ContactMoment|null {
  if(!previous || previous.day!==next.day || next.progress.prefix===previous.progress.prefix) return null;
  if(!previous.progress.bonus_used && next.progress.bonus_used) return {before:previous.progress.prefix,after:next.progress.prefix,count:1,complete:next.progress.status==='WON',source:'bonus'};
  if(next.progress.contacts<=previous.progress.contacts)return null;
  return {before:previous.progress.prefix,after:next.progress.prefix,count:next.progress.contacts-previous.progress.contacts,complete:next.progress.status==='WON'};
}
