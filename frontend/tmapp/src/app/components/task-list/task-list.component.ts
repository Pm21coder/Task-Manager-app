import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit, OnDestroy {
  private taskService = inject(TaskService);
  private destroy$ = new Subject<void>();
  tasks: Task[] = [];
  filter: 'all' | 'pending' | 'completed' = 'all';

  constructor() {
    this.filter = 'all';
  }

  ngOnInit(): void {
    this.taskService.tasks$.pipe(takeUntil(this.destroy$)).subscribe((tasks) => {
      this.tasks = tasks;
    });

    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (res) => {
        this.tasks = res.tasks;
        this.taskService['tasksSubject'].next(res.tasks);
      },
      error: (err) => console.error(err)
    });
  }

  get filteredTasks(): Task[] {
    if (this.filter === 'pending') return this.tasks.filter(t => !t.completed);
    if (this.filter === 'completed') return this.tasks.filter(t => t.completed);
    return this.tasks;
  }

  toggleComplete(task: Task): void {
    const updated = { ...task, completed: !task.completed };
    this.taskService.updateTask(task._id, updated).subscribe();
  }

  deleteTask(id: string): void {
    if (confirm('Delete this task?')) {
      this.tasks = this.tasks.filter((task) => task._id !== id);
      this.taskService.deleteTask(id).subscribe({
        error: () => this.loadTasks()
      });
    }
  }
}