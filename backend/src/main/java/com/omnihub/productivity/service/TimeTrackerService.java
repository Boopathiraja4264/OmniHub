package com.omnihub.productivity.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.entity.TimeEntry;
import com.omnihub.productivity.repository.TimeEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TimeTrackerService {

    @Autowired private TimeEntryRepository timeEntryRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public TimeEntryResponse start(String email, StartTimerRequest req) {
        User user = getUser(email);

        // Auto-stop any running timer
        timeEntryRepository.findByUserIdAndEndedAtIsNull(user.getId())
                .ifPresent(running -> stopEntry(running));

        TimeEntry entry = new TimeEntry();
        entry.setUser(user);
        entry.setTaskId(req.getTaskId());
        entry.setBlockId(req.getBlockId());
        entry.setDescription(req.getDescription());
        entry.setStartedAt(LocalDateTime.now());
        return toResponse(timeEntryRepository.save(entry));
    }

    @Transactional
    public TimeEntryResponse stop(String email) {
        User user = getUser(email);
        TimeEntry entry = timeEntryRepository.findByUserIdAndEndedAtIsNull(user.getId())
                .orElseThrow(() -> new RuntimeException("No active timer"));
        stopEntry(entry);
        return toResponse(timeEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public Optional<TimeEntryResponse> getActive(String email) {
        User user = getUser(email);
        return timeEntryRepository.findByUserIdAndEndedAtIsNull(user.getId())
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getForDate(String email, LocalDate date) {
        User user = getUser(email);
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        return timeEntryRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), from, to)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        TimeEntry entry = timeEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        if (!entry.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        timeEntryRepository.delete(entry);
    }

    private void stopEntry(TimeEntry entry) {
        LocalDateTime now = LocalDateTime.now();
        entry.setEndedAt(now);
        int mins = (int) java.time.Duration.between(entry.getStartedAt(), now).toMinutes();
        entry.setDurationMinutes(Math.max(mins, 1));
    }

    public TimeEntryResponse toResponse(TimeEntry e) {
        TimeEntryResponse r = new TimeEntryResponse();
        r.setId(e.getId());
        r.setTaskId(e.getTaskId());
        r.setBlockId(e.getBlockId());
        r.setDescription(e.getDescription());
        r.setStartedAt(e.getStartedAt());
        r.setEndedAt(e.getEndedAt());
        r.setDurationMinutes(e.getDurationMinutes());
        r.setRunning(e.getEndedAt() == null);
        return r;
    }
}
