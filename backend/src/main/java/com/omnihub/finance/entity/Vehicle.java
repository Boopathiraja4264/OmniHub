package com.omnihub.finance.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles", indexes = {
    @Index(name = "idx_vehicle_user", columnList = "user_id")
})
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String type;

    private Integer serviceIntervalKm = 3000;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Vehicle() {}

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getType() { return type; }
    public void setType(String v) { type = v; }
    public Integer getServiceIntervalKm() { return serviceIntervalKm; }
    public void setServiceIntervalKm(Integer v) { serviceIntervalKm = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
