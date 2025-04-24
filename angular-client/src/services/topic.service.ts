import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataType } from 'src/utils/types.utils';

/**
 * Service for communicating topic selections between components
 */
@Injectable({ providedIn: 'root' })
export class TopicService {
  // Current selected topic for single topic views
  private currentTopic = new BehaviorSubject<DataType | undefined>(undefined);

  // Collection of selected topics for multi-topic views (like graphs)
  private selectedTopics = new BehaviorSubject<DataType[]>([]);

  /**
   * Get the current selected topic as an observable
   */
  public getCurrentTopic(): Observable<DataType | undefined> {
    return this.currentTopic.asObservable();
  }

  /**
   * Get the current topic value
   */
  public getCurrentTopicValue(): DataType | undefined {
    return this.currentTopic.getValue();
  }

  /**
   * Set the current topic
   * @param topic The topic to set as current
   */
  public setCurrentTopic(topic: DataType | undefined): void {
    this.currentTopic.next(topic);
  }

  /**
   * Get selected topics as an observable
   */
  public getSelectedTopics(): Observable<DataType[]> {
    return this.selectedTopics.asObservable();
  }

  /**
   * Get the current selected topics value
   */
  public getSelectedTopicsValue(): DataType[] {
    return this.selectedTopics.getValue();
  }

  /**
   * Set the selected topics
   * @param topics Array of topics to set as selected
   */
  public setSelectedTopics(topics: DataType[]): void {
    this.selectedTopics.next([...topics]);
  }

  /**
   * Add a topic to the selected topics
   * @param topic Topic to add to selection
   */
  public addTopic(topic: DataType): void {
    const currentTopics = this.selectedTopics.getValue();
    // Check if topic already exists by id or name
    const exists = currentTopics.some((t) => t.name === topic.name);

    if (!exists) {
      this.selectedTopics.next([...currentTopics, topic]);
    }
  }

  /**
   * Remove a topic from the selected topics
   * @param topic Topic to remove from selection
   */
  public removeTopic(topic: DataType): void {
    const currentTopics = this.selectedTopics.getValue();
    const updatedTopics = currentTopics.filter((t) => t.name !== topic.name);

    this.selectedTopics.next(updatedTopics);
  }

  /**
   * Toggle a topic's selection status
   * @param topic Topic to toggle
   * @returns boolean indicating if the topic is now selected (true) or not (false)
   */
  public toggleTopic(topic: DataType): boolean {
    const currentTopics = this.selectedTopics.getValue();
    const exists = currentTopics.some((t) => t.name === topic.name);

    if (exists) {
      this.removeTopic(topic);
      return false;
    }
    this.addTopic(topic);
    return true;
  }

  /**
   * Clear all selected topics
   */
  public clearTopics(): void {
    this.selectedTopics.next([]);
  }
}
