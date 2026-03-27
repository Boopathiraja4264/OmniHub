package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.TemplateBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TemplateBlockRepository extends JpaRepository<TemplateBlock, Long> {

    List<TemplateBlock> findByTemplateIdAndDayOfWeekOrderBySortOrderAsc(Long templateId, String dayOfWeek);

    List<TemplateBlock> findByTemplateIdOrderByDayOfWeekAscStartTimeAsc(Long templateId);
}
