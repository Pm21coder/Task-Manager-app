import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly syncStorageKey = 'task-sync-events';
  private readonly syncChannelName = 'task-sync-channel';
  private readonly windowId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  private syncChannel: BroadcastChannel | null = null;

  readonly tasks$ = this.tasksSubject.asObservable();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.syncChannel = new BroadcastChannel(this.syncChannelName);
      this.syncChannel.addEventListener('message', (event: MessageEvent) => {
        this.handleRemoteSync(event.data);
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === this.syncStorageKey && event.newValue) {
          this.handleRemoteSync(JSON.parse(event.newValue));
        }
      });
    }
  }

  getTasks(): Observable<{ tasks: Task[] }> {
    return this.http.get<{ tasks: Task[] }>(`${this.apiUrl}/tasks`).pipe(
      tap(({ tasks }) => this.tasksSubject.next(tasks))
    );
  }

  createTask(task: Partial<Task>): Observable<{ task: Task }> {
    return this.http.post<{ task: Task }>(`${this.apiUrl}/tasks`, task).pipe(
      tap(({ task: createdTask }) => {
        this.applyLocalChange((currentTasks) => [createdTask, ...currentTasks]);
        this.notifyTabs('created');
        this.refreshTasks();
      })
    );
  }

  updateTask(id: string, task: Partial<Task>): Observable<{ task: Task }> {
    return this.http.put<{ task: Task }>(`${this.apiUrl}/tasks/${id}`, task).pipe(
      tap(({ task: updatedTask }) => {
        this.applyLocalChange((currentTasks) =>
          currentTasks.map((currentTask) => (currentTask._id === updatedTask._id ? updatedTask : currentTask))
        );
        this.notifyTabs('updated');
        this.refreshTasks();
      })
    );
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`).pipe(
      tap(() => {
        this.applyLocalChange((currentTasks) => currentTasks.filter((task) => task._id !== id));
        this.notifyTabs('deleted');
        this.refreshTasks();
      })
    );
  }

  private applyLocalChange(updater: (tasks: Task[]) => Task[]): void {
    this.tasksSubject.next(updater(this.tasksSubject.value));
  }

  private refreshTasks(): void {
    this.getTasks().subscribe({
      error: (err) => console.error(err)
    });
  }

  private notifyTabs(action: 'created' | 'updated' | 'deleted'): void {
    const payload = { action, source: this.windowId, timestamp: Date.now() };
    this.syncChannel?.postMessage(payload);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.syncStorageKey, JSON.stringify(payload));
    }
  }

  private handleRemoteSync(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const syncPayload = payload as { action?: string; source?: string };
    if (!syncPayload.action || syncPayload.source === this.windowId) {
      return;
    }

    if (['created', 'updated', 'deleted'].includes(syncPayload.action)) {
      this.refreshTasks();
    }
  }
}