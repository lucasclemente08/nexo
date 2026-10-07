import type { DailyState } from './nexo';
export interface ContactMoment {before:string;after:string;count:number;complete:boolean}
export function getContactMoment(previous:DailyState|null,next:DailyState):ContactMoment|null {
  if(!previous || previous.day!==next.day || next.progress.contacts<=previous.progress.contacts || next.progress.prefix===previous.progress.prefix) return null;
  return {before:previous.progress.prefix,after:next.progress.prefix,count:next.progress.contacts-previous.progress.contacts,complete:next.progress.status==='WON'};
}
