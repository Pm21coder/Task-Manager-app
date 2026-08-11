import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEdit = false;
  taskId: string | null = null;

  // No 'nonNullable' needed – we'll handle null explicitly
  taskForm = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required]
  });

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('id');
    if (this.taskId) {
      this.isEdit = true;
      this.loadTask();
    }
  }

  loadTask(): void {
    this.taskService.getTasks().subscribe({
      next: (res) => {
        const task = res.tasks.find(t => t._id === this.taskId);
        if (task) {
          this.taskForm.patchValue({ title: task.title, description: task.description });
        }
      },
      error: (err) => console.error(err)
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) return;

    // Extract values – they may be null or empty string
    const rawTitle = this.taskForm.value.title;
    const rawDesc = this.taskForm.value.description;

    // Build a clean payload: only include if we have a truthy string (non-empty)
    const payload: { title?: string; description?: string } = {};
    if (rawTitle && rawTitle.trim()) payload.title = rawTitle.trim();
    if (rawDesc && rawDesc.trim()) payload.description = rawDesc.trim();

    // The backend expects both fields, but our validation ensures they exist
    // So we can safely cast to Partial<Task> – TypeScript now sees no null
    const taskData = payload as Partial<Task>;

    if (this.isEdit && this.taskId) {
      this.taskService.updateTask(this.taskId, taskData).subscribe({
        next: () => this.router.navigate(['/tasks']),
        error: (err) => console.error(err)
      });
    } else {
      this.taskService.createTask(taskData).subscribe({
        next: () => this.router.navigate(['/tasks']),
        error: (err) => console.error(err)
      });
    }
  }
}