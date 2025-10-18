import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataType } from 'src/utils/types.utils';

@Injectable({ providedIn: 'root' })
export class TopicSelectionService {
  private readonly state$ = new BehaviorSubject<DataType[]>([]);
  readonly selectedTopics$ = this.state$.asObservable();

  get selected(): DataType[] {
    return this.state$.value;
  }

  set(topics: DataType[]) {
    this.state$.next([...topics]);
  }
  add(topic: DataType) {
    const cur = this.state$.value;
    if (!cur.some((t) => t.name === topic.name)) this.state$.next([...cur, topic]);
  }
  remove(topic: DataType) {
    const cur = this.state$.value;
    this.state$.next(cur.filter((t) => t.name !== topic.name));
  }
  clear() {
    this.state$.next([]);
  }
}
