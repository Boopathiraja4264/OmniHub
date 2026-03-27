package com.omnihub.productivity.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.entity.Task;
import com.omnihub.productivity.entity.Task.TaskStatus;
import com.omnihub.productivity.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {

    @Autowired private TaskRepository taskRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void assertOwner(Task task, Long userId) {
        if (!task.getUser().getId().equals(userId))
            throw new RuntimeException("Unauthorized");
    }

    @Transactional
    public TaskResponse create(String email, TaskRequest req) {
        User user = getUser(email);
        Task task = new Task();
        task.setUser(user);
        task.setTitle(req.getTitle());
        task.setDescription(req.getDescription());
        task.setCategory(req.getCategory());
        task.setPriority(req.getPriority() != null ? req.getPriority() : Task.TaskPriority.MEDIUM);
        task.setDueDate(req.getDueDate());
        task.setEstimatedMinutes(req.getEstimatedMinutes());
        task.setRecurring(req.getRecurring() != null ? req.getRecurring() : Task.TaskRecurring.NONE);
        task.setParentTaskId(req.getParentTaskId());
        return toResponse(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAll(String email) {
        User user = getUser(email);
        return taskRepository.findByUserIdOrderByPriorityAscCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getActive(String email) {
        User user = getUser(email);
        return taskRepository.findActiveTasks(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getToday(String email) {
        User user = getUser(email);
        return taskRepository.findTodayTasks(user.getId(), LocalDate.now())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse update(String email, Long id, TaskRequest req) {
        User user = getUser(email);
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        assertOwner(task, user.getId());
        task.setTitle(req.getTitle());
        task.setDescription(req.getDescription());
        task.setCategory(req.getCategory());
        task.setPriority(req.getPriority());
        task.setDueDate(req.getDueDate());
        task.setEstimatedMinutes(req.getEstimatedMinutes());
        task.setRecurring(req.getRecurring());
        task.setParentTaskId(req.getParentTaskId());
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(String email, Long id, TaskStatusRequest req) {
        User user = getUser(email);
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        assertOwner(task, user.getId());
        task.setStatus(req.getStatus());
        if (req.getStatus() == TaskStatus.DONE && task.getCompletedAt() == null) {
            task.setCompletedAt(LocalDateTime.now());
        } else if (req.getStatus() != TaskStatus.DONE) {
            task.setCompletedAt(null);
        }
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        assertOwner(task, user.getId());
        taskRepository.delete(task);
    }

    public TaskResponse toResponse(Task t) {
        TaskResponse r = new TaskResponse();
        r.setId(t.getId());
        r.setTitle(t.getTitle());
        r.setDescription(t.getDescription());
        r.setCategory(t.getCategory());
        r.setStatus(t.getStatus());
        r.setPriority(t.getPriority());
        r.setDueDate(t.getDueDate());
        r.setEstimatedMinutes(t.getEstimatedMinutes());
        r.setRecurring(t.getRecurring());
        r.setParentTaskId(t.getParentTaskId());
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        r.setCompletedAt(t.getCompletedAt());
        return r;
    }
}
