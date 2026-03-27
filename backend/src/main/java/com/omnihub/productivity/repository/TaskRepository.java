package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.Task;
import com.omnihub.productivity.entity.Task.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserIdOrderByPriorityAscCreatedAtDesc(Long userId);

    List<Task> findByUserIdAndStatusOrderByPriorityDesc(Long userId, TaskStatus status);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId AND (t.dueDate <= :today OR t.dueDate IS NULL) AND t.status NOT IN ('DONE','DEFERRED') ORDER BY t.priority DESC")
    List<Task> findTodayTasks(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId AND t.status NOT IN ('DONE','DEFERRED') ORDER BY t.priority DESC, t.createdAt ASC")
    List<Task> findActiveTasks(@Param("userId") Long userId);

    List<Task> findByUserIdAndStatusInAndDueDateBetween(Long userId, List<TaskStatus> statuses, LocalDate from, LocalDate to);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.dueDate = :date")
    long countByUserIdAndDueDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.dueDate = :date AND t.status = 'DONE'")
    long countDoneByUserIdAndDueDate(@Param("userId") Long userId, @Param("date") LocalDate date);
}
