package com.omnihub.productivity.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.entity.*;
import com.omnihub.productivity.entity.TimeBlock.BlockStatus;
import com.omnihub.productivity.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class DailyPlanService {

    @Autowired private DailyPlanRepository planRepository;
    @Autowired private TimeBlockRepository blockRepository;
    @Autowired private WeeklyTemplateRepository templateRepository;
    @Autowired private TemplateBlockRepository templateBlockRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void assertOwner(DailyPlan plan, Long userId) {
        if (!plan.getUser().getId().equals(userId))
            throw new RuntimeException("Unauthorized");
    }

    /** Get plan for date, create a blank DRAFT if none exists */
    @Transactional
    public DailyPlanResponse getOrCreate(String email, LocalDate date) {
        User user = getUser(email);
        DailyPlan plan = planRepository.findByUserIdAndPlanDate(user.getId(), date)
                .orElseGet(() -> {
                    DailyPlan p = new DailyPlan();
                    p.setUser(user);
                    p.setPlanDate(date);
                    return planRepository.save(p);
                });
        return toResponse(plan);
    }

    @Transactional
    public DailyPlanResponse create(String email, DailyPlanRequest req) {
        User user = getUser(email);
        // Upsert — if already exists, return it
        return planRepository.findByUserIdAndPlanDate(user.getId(), req.getPlanDate())
                .map(this::toResponse)
                .orElseGet(() -> {
                    DailyPlan p = new DailyPlan();
                    p.setUser(user);
                    p.setPlanDate(req.getPlanDate());
                    p.setNotes(req.getNotes());
                    return toResponse(planRepository.save(p));
                });
    }

    @Transactional
    public DailyPlanResponse update(String email, Long id, DailyPlanUpdateRequest req) {
        User user = getUser(email);
        DailyPlan plan = planRepository.findById(id).orElseThrow(() -> new RuntimeException("Plan not found"));
        assertOwner(plan, user.getId());
        if (req.getNotes() != null) plan.setNotes(req.getNotes());
        if (req.getStatus() != null) plan.setStatus(req.getStatus());
        return toResponse(planRepository.save(plan));
    }

    /** Generate time blocks from the active weekly template for this plan's day-of-week */
    @Transactional
    public DailyPlanResponse generateFromTemplate(String email, Long planId) {
        User user = getUser(email);
        DailyPlan plan = planRepository.findById(planId).orElseThrow(() -> new RuntimeException("Plan not found"));
        assertOwner(plan, user.getId());

        WeeklyTemplate template = templateRepository.findFirstByUserIdAndActiveTrue(user.getId())
                .orElseThrow(() -> new RuntimeException("No active template found"));

        String dow = plan.getPlanDate().getDayOfWeek()
                .getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase(); // MON, TUE…

        // Remove existing PLANNED blocks only (keep DONE/IN_PROGRESS)
        blockRepository.deleteByDailyPlanIdAndStatus(planId, BlockStatus.PLANNED);

        List<TemplateBlock> templateBlocks = templateBlockRepository
                .findByTemplateIdAndDayOfWeekOrderBySortOrderAsc(template.getId(), dow);

        for (TemplateBlock tb : templateBlocks) {
            TimeBlock b = new TimeBlock();
            b.setDailyPlan(plan);
            b.setTitle(tb.getTitle());
            b.setCategory(tb.getCategory());
            b.setStartTime(tb.getStartTime());
            b.setEndTime(tb.getEndTime());
            b.setColor(tb.getColor());
            b.setSortOrder(tb.getSortOrder());
            blockRepository.save(b);
        }

        // Reload
        return toResponse(planRepository.findById(planId).get());
    }

    /** Copy undone tasks from yesterday as new tasks on today's plan */
    @Transactional
    public void deferIncomplete(String email, Long planId) {
        User user = getUser(email);
        DailyPlan plan = planRepository.findById(planId).orElseThrow(() -> new RuntimeException("Plan not found"));
        assertOwner(plan, user.getId());

        // Mark unfinished blocks as SKIPPED
        plan.getTimeBlocks().stream()
                .filter(b -> b.getStatus() == BlockStatus.PLANNED || b.getStatus() == BlockStatus.IN_PROGRESS)
                .forEach(b -> {
                    b.setStatus(BlockStatus.SKIPPED);
                    blockRepository.save(b);
                });

        plan.setStatus(DailyPlan.PlanStatus.COMPLETED);
        planRepository.save(plan);
    }

    // ─── Time Block CRUD ─────────────────────────────────────────────────────

    @Transactional
    public TimeBlockResponse addBlock(String email, Long planId, TimeBlockRequest req) {
        User user = getUser(email);
        DailyPlan plan = planRepository.findById(planId).orElseThrow(() -> new RuntimeException("Plan not found"));
        assertOwner(plan, user.getId());

        TimeBlock b = new TimeBlock();
        b.setDailyPlan(plan);
        applyBlockRequest(b, req);
        return toBlockResponse(blockRepository.save(b));
    }

    @Transactional
    public TimeBlockResponse updateBlock(String email, Long blockId, TimeBlockRequest req) {
        User user = getUser(email);
        TimeBlock b = blockRepository.findById(blockId).orElseThrow(() -> new RuntimeException("Block not found"));
        if (!b.getDailyPlan().getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        applyBlockRequest(b, req);
        return toBlockResponse(blockRepository.save(b));
    }

    @Transactional
    public TimeBlockResponse updateBlockStatus(String email, Long blockId, BlockStatusRequest req) {
        User user = getUser(email);
        TimeBlock b = blockRepository.findById(blockId).orElseThrow(() -> new RuntimeException("Block not found"));
        if (!b.getDailyPlan().getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        b.setStatus(req.getStatus());
        return toBlockResponse(blockRepository.save(b));
    }

    @Transactional
    public void deleteBlock(String email, Long blockId) {
        User user = getUser(email);
        TimeBlock b = blockRepository.findById(blockId).orElseThrow(() -> new RuntimeException("Block not found"));
        if (!b.getDailyPlan().getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        blockRepository.delete(b);
    }

    private void applyBlockRequest(TimeBlock b, TimeBlockRequest req) {
        b.setTitle(req.getTitle());
        b.setCategory(req.getCategory());
        b.setStartTime(req.getStartTime());
        b.setEndTime(req.getEndTime());
        b.setTaskId(req.getTaskId());
        b.setColor(req.getColor());
        b.setNotes(req.getNotes());
        b.setSortOrder(req.getSortOrder());
    }

    @Transactional(readOnly = true)
    public List<DailyPlanResponse> getRange(String email, LocalDate from, LocalDate to) {
        User user = getUser(email);
        return planRepository.findByUserIdAndPlanDateBetweenOrderByPlanDateAsc(user.getId(), from, to)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ─── Mappers ─────────────────────────────────────────────────────────────

    public DailyPlanResponse toResponse(DailyPlan p) {
        DailyPlanResponse r = new DailyPlanResponse();
        r.setId(p.getId());
        r.setPlanDate(p.getPlanDate());
        r.setNotes(p.getNotes());
        r.setStatus(p.getStatus());
        r.setCreatedAt(p.getCreatedAt());
        r.setTimeBlocks(p.getTimeBlocks().stream().map(this::toBlockResponse).collect(Collectors.toList()));
        return r;
    }

    public TimeBlockResponse toBlockResponse(TimeBlock b) {
        TimeBlockResponse r = new TimeBlockResponse();
        r.setId(b.getId());
        r.setPlanId(b.getDailyPlan().getId());
        r.setTaskId(b.getTaskId());
        r.setTitle(b.getTitle());
        r.setCategory(b.getCategory());
        r.setStartTime(b.getStartTime());
        r.setEndTime(b.getEndTime());
        r.setColor(b.getColor());
        r.setStatus(b.getStatus());
        r.setNotes(b.getNotes());
        r.setSortOrder(b.getSortOrder());

        // planned minutes from start/end
        if (b.getStartTime() != null && b.getEndTime() != null) {
            int mins = (int) java.time.Duration.between(b.getStartTime(), b.getEndTime()).toMinutes();
            r.setPlannedMinutes(mins);
        }
        return r;
    }
}
