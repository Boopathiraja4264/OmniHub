package com.omnihub.finance.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.time.LocalDateTime;

@Entity
@Table(name = "expense_items", indexes = {
    @Index(name = "idx_item_user_cat", columnList = "user_id, category_id")
})
public class ExpenseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ExpenseCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ExpenseItem() {}

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public ExpenseCategory getCategory() { return category; }
    public void setCategory(ExpenseCategory v) { category = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
