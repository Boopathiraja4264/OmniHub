package com.omnihub.productivity.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.entity.TemplateBlock;
import com.omnihub.productivity.entity.WeeklyTemplate;
import com.omnihub.productivity.repository.TemplateBlockRepository;
import com.omnihub.productivity.repository.WeeklyTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WeeklyTemplateService {

    @Autowired private WeeklyTemplateRepository templateRepository;
    @Autowired private TemplateBlockRepository blockRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void assertOwner(WeeklyTemplate t, Long userId) {
        if (!t.getUser().getId().equals(userId)) throw new RuntimeException("Unauthorized");
    }

    @Transactional(readOnly = true)
    public List<WeeklyTemplateResponse> getAll(String email) {
        User user = getUser(email);
        return templateRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public WeeklyTemplateResponse create(String email, WeeklyTemplateRequest req) {
        User user = getUser(email);
        WeeklyTemplate t = new WeeklyTemplate();
        t.setUser(user);
        t.setName(req.getName());
        t.setActive(req.isActive());
        return toResponse(templateRepository.save(t));
    }

    @Transactional
    public WeeklyTemplateResponse update(String email, Long id, WeeklyTemplateRequest req) {
        User user = getUser(email);
        WeeklyTemplate t = templateRepository.findById(id).orElseThrow(() -> new RuntimeException("Template not found"));
        assertOwner(t, user.getId());
        t.setName(req.getName());
        t.setActive(req.isActive());
        return toResponse(templateRepository.save(t));
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        WeeklyTemplate t = templateRepository.findById(id).orElseThrow(() -> new RuntimeException("Template not found"));
        assertOwner(t, user.getId());
        templateRepository.delete(t);
    }

    @Transactional
    public TemplateBlockResponse addBlock(String email, Long templateId, TemplateBlockRequest req) {
        User user = getUser(email);
        WeeklyTemplate t = templateRepository.findById(templateId).orElseThrow(() -> new RuntimeException("Template not found"));
        assertOwner(t, user.getId());

        TemplateBlock b = new TemplateBlock();
        b.setTemplate(t);
        applyBlockRequest(b, req);
        return toBlockResponse(blockRepository.save(b));
    }

    @Transactional
    public TemplateBlockResponse updateBlock(String email, Long blockId, TemplateBlockRequest req) {
        User user = getUser(email);
        TemplateBlock b = blockRepository.findById(blockId).orElseThrow(() -> new RuntimeException("Block not found"));
        assertOwner(b.getTemplate(), user.getId());
        applyBlockRequest(b, req);
        return toBlockResponse(blockRepository.save(b));
    }

    @Transactional
    public void deleteBlock(String email, Long blockId) {
        User user = getUser(email);
        TemplateBlock b = blockRepository.findById(blockId).orElseThrow(() -> new RuntimeException("Block not found"));
        assertOwner(b.getTemplate(), user.getId());
        blockRepository.delete(b);
    }

    private void applyBlockRequest(TemplateBlock b, TemplateBlockRequest req) {
        b.setDayOfWeek(req.getDayOfWeek().toUpperCase());
        b.setTitle(req.getTitle());
        b.setCategory(req.getCategory());
        b.setStartTime(req.getStartTime());
        b.setEndTime(req.getEndTime());
        b.setColor(req.getColor());
        b.setSortOrder(req.getSortOrder());
    }

    public WeeklyTemplateResponse toResponse(WeeklyTemplate t) {
        WeeklyTemplateResponse r = new WeeklyTemplateResponse();
        r.setId(t.getId());
        r.setName(t.getName());
        r.setActive(t.isActive());
        r.setCreatedAt(t.getCreatedAt());
        r.setBlocks(t.getBlocks().stream().map(this::toBlockResponse).collect(Collectors.toList()));
        return r;
    }

    public TemplateBlockResponse toBlockResponse(TemplateBlock b) {
        TemplateBlockResponse r = new TemplateBlockResponse();
        r.setId(b.getId());
        r.setTemplateId(b.getTemplate().getId());
        r.setDayOfWeek(b.getDayOfWeek());
        r.setTitle(b.getTitle());
        r.setCategory(b.getCategory());
        r.setStartTime(b.getStartTime());
        r.setEndTime(b.getEndTime());
        r.setColor(b.getColor());
        r.setSortOrder(b.getSortOrder());
        return r;
    }
}
